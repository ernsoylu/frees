// Phase K2: the live client against a fake worker — the pull discipline, the
// generation guard, `gone`, and a worker death that respawns cleanly.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LiveClient } from './liveClient'

class FakeWorker {
  static instances: FakeWorker[] = []
  onmessage: ((e: { data: unknown }) => void) | null = null
  onerror: ((e: { message?: string }) => void) | null = null
  onmessageerror: (() => void) | null = null
  posted: { id: number; method: string; args: string[] }[] = []
  terminated = false
  constructor() {
    FakeWorker.instances.push(this)
  }
  postMessage(msg: unknown) {
    this.posted.push(msg as (typeof this.posted)[number])
  }
  terminate() {
    this.terminated = true
  }
  /** Answer the last request of `method`. */
  reply(method: string, result: unknown, rows?: number[], extra: object = {}) {
    const request = [...this.posted].reverse().find((p) => p.method === method)!
    this.onmessage?.({
      data: {
        id: request.id,
        ok: true,
        result: typeof result === 'string' ? result : JSON.stringify(result),
        ...(rows ? { odeBuffers: [new Float64Array(rows)] } : {}),
        ...extra,
      },
    })
  }
}

const TABLE = { name: 'ball', vars: ['time', 'h'], units: ['s', 'm'], method: 'ida' }
const chunk = (numRows: number, extra: object = {}) => ({
  numRows, numCols: 2, events: [], stopped: false, finished: false, state: null, clock: { t: 0.1, h: 0.01 }, error: null, ...extra,
})

beforeEach(() => {
  FakeWorker.instances = []
  vi.stubGlobal('Worker', FakeWorker)
})
afterEach(() => vi.unstubAllGlobals())

async function opened() {
  const live = new LiveClient()
  const open = live.open('src', '{}', 0, 7)
  const w = FakeWorker.instances[0]
  w.reply('liveOpen', { ok: true, session: 3, table: TABLE })
  await expect(open).resolves.toEqual({ ok: true, session: 3, table: TABLE })
  return { live, w }
}

describe('LiveClient', () => {
  it('opens on its own worker and pulls chunks that carry the session and a sequence', async () => {
    const { live, w } = await opened()
    expect(live.isOpen).toBe(true)
    expect(live.revision).toBe(7)
    expect(w.posted[0]).toMatchObject({ method: 'liveOpen', args: ['src', '{}', '0'] })
    const a = live.advance(0.5, 8)
    expect(w.posted.at(-1)).toMatchObject({ method: 'liveAdvance', args: ['3', '0.5', '8'] })
    w.reply('liveAdvance', chunk(2), [0, 1, 0.1, 0.9])
    const first = await a
    expect(first).toMatchObject({ seq: 1, numRows: 2, clock: { t: 0.1, h: 0.01 } })
    expect(Array.from(first!.rows)).toEqual([0, 1, 0.1, 0.9])
    const s = live.step('event', 50)
    expect(w.posted.at(-1)).toMatchObject({ method: 'liveStep', args: ['3', 'event', '50'] })
    w.reply('liveStep', chunk(1, { events: [{ name: 'bounce', time: 0.45 }] }), [0.5, 0.2])
    expect(await s).toMatchObject({ seq: 2, events: [{ name: 'bounce', time: 0.45 }] })
  })

  it('keeps at most one advance in flight', async () => {
    const { live, w } = await opened()
    const a = live.advance(1, 8)
    await expect(live.advance(2, 8)).resolves.toBeNull()
    expect(w.posted.filter((p) => p.method === 'liveAdvance')).toHaveLength(1)
    w.reply('liveAdvance', chunk(0), [])
    await a
    const b = live.advance(2, 8)
    expect(w.posted.filter((p) => p.method === 'liveAdvance')).toHaveLength(2)
    w.reply('liveAdvance', chunk(0), [])
    await b
  })

  it('drops a reply that a newer open overtook', async () => {
    const { live, w } = await opened()
    const stale = live.advance(1, 8)
    const reopen = live.open('src2', '{}', 0, 8)
    expect(w.posted.some((p) => p.method === 'liveDispose' && p.args[0] === '3')).toBe(true)
    w.reply('liveAdvance', chunk(5), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    await expect(stale).resolves.toBeNull()
    w.reply('liveOpen', { ok: true, session: 4, table: TABLE })
    await reopen
    expect(live.revision).toBe(8)
    const next = live.advance(1, 8)
    expect(w.posted.at(-1)!.args[0]).toBe('4')
    w.reply('liveAdvance', chunk(1), [0, 1])
    expect(await next).toMatchObject({ seq: 1 })
  })

  it('reads gone as a closed session', async () => {
    const { live, w } = await opened()
    const a = live.advance(1, 8)
    w.reply('liveAdvance', { gone: true })
    await expect(a).resolves.toBeNull()
    expect(live.isOpen).toBe(false)
    await expect(live.advance(1, 8)).resolves.toBeNull()
  })

  it('a worker trap rejects what is in flight, reports it, and the next open respawns', async () => {
    const { live, w } = await opened()
    const failures: string[] = []
    live.onFailure = (e) => failures.push(e.message)
    const a = live.advance(1, 8)
    const request = w.posted.at(-1)!
    w.onmessage?.({ data: { id: request.id, ok: false, fatal: true, error: 'unreachable executed' } })
    await expect(a).rejects.toThrow('unreachable')
    expect(w.terminated).toBe(true)
    expect(failures).toEqual(['unreachable executed'])
    expect(live.isOpen).toBe(false)
    const reopen = live.open('src', '{}', 0, 9)
    expect(FakeWorker.instances).toHaveLength(2)
    // A late message from the dead worker reaches nothing.
    w.reply('liveOpen', { ok: true, session: 99, table: TABLE })
    FakeWorker.instances[1].reply('liveOpen', { ok: true, session: 1, table: TABLE })
    await expect(reopen).resolves.toMatchObject({ ok: true, session: 1 })
  })

  it('an onerror death is handled the same way', async () => {
    const { live, w } = await opened()
    const a = live.advance(1, 8)
    w.onerror?.({ message: 'script error' })
    await expect(a).rejects.toThrow('script error')
    expect(live.isOpen).toBe(false)
  })

  it('reset keeps the session and the sequence', async () => {
    const { live, w } = await opened()
    const a = live.advance(1, 8)
    w.reply('liveAdvance', chunk(1), [0, 1])
    await a
    const r = live.reset()
    w.reply('liveReset', chunk(0))
    await expect(r).resolves.toBe(true)
    const b = live.advance(1, 8)
    w.reply('liveAdvance', chunk(1), [0, 1])
    expect(await b).toMatchObject({ seq: 2 })
  })
})
