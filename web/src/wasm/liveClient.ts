// Phase K2: the live-mode client.
//
// Live mode keeps a session open inside the engine between requests, so it
// runs on a worker of its own, outside the sweep pool: engineClient terminates
// every pool worker on a stop or a trap, and that must never take a live run
// with it, or the reverse. One session at a time.
//
// The main thread pulls: on each animation frame it asks for `t + speed·Δt` and
// waits for that chunk before asking again, so at most one advance is in flight
// and anything else it sends (a step, a reset) is served within one chunk's
// budget. Every request is tagged with the open's *generation*; a reply that
// arrives after a newer open, a dispose or a worker death answers `null`
// instead of reaching state that has moved on. The worker answers `gone` for a
// session it no longer holds, which reads the same way.
//
// ponytail: each chunk arrives in a fresh transferred buffer; recycle them
// back to the worker if allocation ever shows up in a long run's profile.

import type { EngineRequest, EngineResponse } from './engine.worker'

/** The ODE Table shape of an open session's rows (the batch `odeTables[]` header). */
export interface LiveTable {
  name: string
  vars: string[]
  units: string[]
  method: string
}

export interface LiveEvent {
  name: string
  time: number
}

/** One chunk: accepted rows `numRows × numCols`, row-major, from one request. */
export interface LiveChunk {
  /** Monotonic per open (a reset does not restart it), so a store can prove it saw every chunk in order. */
  seq: number
  rows: Float64Array
  numRows: number
  numCols: number
  events: LiveEvent[]
  /** A stop event ended the run in this chunk. */
  stopped: boolean
  /** The run is over (stop event or failure); later chunks are empty. */
  finished: boolean
  /** `[t, y…]` after an accepted step, between rows; `null` otherwise. */
  state: number[] | null
  /** The integrator's internal time and last step size. */
  clock: { t: number; h: number } | null
  /** The integration failed after these rows; the rows stay valid. */
  error: string | null
  /** Phase L4: the pause condition that crossed in this chunk and ended it, as written. */
  paused?: string | null
}

/** One applied live input change: the run time it took effect at, the value in SI. */
export interface LiveInputChange {
  time: number
  name: string
  value: number
}

export type LiveInputResult = { time: number; log: LiveInputChange[] } | { error: string }

export type LiveSpectrum = { freq: number[]; power: number[] } | { error: string }

export type LiveStepKind = 'sample' | 'event' | 'accepted'

export type LiveOpenResult =
  | { ok: true; session: number; table: LiveTable }
  | { ok: false; error: string }

interface Pending {
  resolve: (value: { result: string; rows: Float64Array | null }) => void
  reject: (error: Error) => void
}

export class LiveClient {
  private worker: Worker | null = null
  private nextId = 1
  private readonly pending = new Map<number, Pending>()
  private session = 0
  private generation = 0
  private seq = 0
  private advancing = false
  /** The model revision the open session was built from. */
  revision: number | null = null
  /** Called when the worker dies; the session is gone and the next open respawns it. */
  onFailure: ((error: Error) => void) | null = null

  /** Whether a session is open. */
  get isOpen(): boolean {
    return this.session !== 0
  }

  private spawn(): Worker {
    const w = new Worker(new URL('./engine.worker.ts', import.meta.url), { type: 'module' })
    w.onmessage = (event: MessageEvent<EngineResponse>) => {
      if (w !== this.worker) return
      const response = event.data
      if ('progress' in response) return
      const entry = this.pending.get(response.id)
      if (!entry) return
      this.pending.delete(response.id)
      if (response.ok) {
        entry.resolve({ result: response.result, rows: response.odeBuffers?.[0] ?? null })
      } else {
        const error = new Error(response.error)
        if (response.fatal) this.die(error)
        entry.reject(error)
      }
    }
    w.onerror = (event: ErrorEvent) => {
      if (w === this.worker) this.die(new Error(event.message || 'The live worker failed'))
    }
    w.onmessageerror = () => {
      if (w === this.worker) this.die(new Error('The live worker sent an unreadable message'))
    }
    return w
  }

  /** Retire the worker and everything that depended on it. */
  private die(error: Error): void {
    this.worker?.terminate()
    this.worker = null
    this.session = 0
    this.revision = null
    this.generation += 1
    this.advancing = false
    for (const entry of this.pending.values()) entry.reject(error)
    this.pending.clear()
    this.onFailure?.(error)
  }

  private call(method: EngineRequest['method'], args: string[]) {
    const id = this.nextId++
    return new Promise<{ result: string; rows: Float64Array | null }>((resolve, reject) => {
      this.worker ??= this.spawn()
      this.pending.set(id, { resolve, reject })
      try {
        this.worker.postMessage({ id, method, args } satisfies EngineRequest)
      } catch (error) {
        this.pending.delete(id)
        reject(error instanceof Error ? error : new Error(String(error)))
      }
    })
  }

  /**
   * Open DYNAMIC block `block` (0-based) of `source` at `t0`, closing any open
   * session. `request` is the solve request JSON. `null` when a newer open or
   * a dispose overtook this one.
   */
  async open(source: string, request: string, block: number, revision: number): Promise<LiveOpenResult | null> {
    this.dispose()
    const generation = this.generation
    const { result } = await this.call('liveOpen', [source, request, String(block)])
    if (generation !== this.generation) return null
    const header = JSON.parse(result) as LiveOpenResult
    if (header.ok) {
      this.session = header.session
      this.revision = revision
      this.seq = 0
    }
    return header
  }

  private async chunk(method: 'liveAdvance' | 'liveStep', args: string[]): Promise<LiveChunk | null> {
    if (!this.session) return null
    const generation = this.generation
    const { result, rows } = await this.call(method, [String(this.session), ...args])
    if (generation !== this.generation) return null
    const header = JSON.parse(result) as Omit<LiveChunk, 'seq' | 'rows'> & { gone?: boolean }
    if (header.gone) {
      this.session = 0
      return null
    }
    return { ...header, seq: ++this.seq, rows: rows ?? new Float64Array(0) }
  }

  /**
   * Integrate toward `tTarget` within `budgetMs` of engine time (after the
   * first row). Answers `null` without sending while an advance is already in
   * flight, or when the session has moved on.
   */
  async advance(tTarget: number, budgetMs: number): Promise<LiveChunk | null> {
    if (this.advancing) return null
    this.advancing = true
    const generation = this.generation
    try {
      return await this.chunk('liveAdvance', [String(tTarget), String(budgetMs)])
    } finally {
      if (generation === this.generation) this.advancing = false
    }
  }

  /** One step: the next sample, the next event (within `maxRows`), or one accepted step. */
  step(kind: LiveStepKind, maxRows = 100_000): Promise<LiveChunk | null> {
    return this.chunk('liveStep', [kind, String(maxRows)])
  }

  /** Back to `t0`; the next chunk starts with the `t0` row again. */
  async reset(): Promise<boolean> {
    if (!this.session) return false
    const generation = this.generation
    const { result } = await this.call('liveReset', [String(this.session)])
    if (generation !== this.generation) return false
    const gone = (JSON.parse(result) as { gone?: boolean }).gone === true
    if (gone) this.session = 0
    return !gone
  }

  /**
   * Phase L1: change inputs live — literal assignments as the sliders write
   * them (`Q = 50 [W]`). The run carries on from the time the change applies
   * at; a refused change leaves it as it was. `null` when the session moved on.
   */
  async setInputs(lines: string[]): Promise<LiveInputResult | null> {
    if (!this.session) return null
    const generation = this.generation
    const { result } = await this.call('liveSet', [String(this.session), JSON.stringify(lines)])
    if (generation !== this.generation) return null
    const reply = JSON.parse(result) as LiveInputResult & { gone?: boolean }
    if (reply.gone) {
      this.session = 0
      return null
    }
    return reply
  }

  /**
   * Phase L3: the Welch power spectrum of uniformly spaced samples at `fs`
   * (`signal.rs`), linearly detrended first when asked. Needs no session.
   */
  async spectrum(values: ArrayLike<number>, fs: number, detrend: boolean): Promise<LiveSpectrum> {
    const { result } = await this.call('liveSpectrum', [JSON.stringify(Array.from(values)), String(fs), detrend ? '1' : '0'])
    return JSON.parse(result) as LiveSpectrum
  }

  /** Close the session; replies still in flight for it answer `null`. */
  dispose(): void {
    this.generation += 1
    this.advancing = false
    this.revision = null
    if (this.session && this.worker) {
      void this.call('liveDispose', [String(this.session)]).catch(() => {})
    }
    this.session = 0
  }

  /** Close the session and the worker. */
  terminate(): void {
    this.dispose()
    this.worker?.terminate()
    this.worker = null
    for (const entry of this.pending.values()) entry.reject(new Error('Live mode closed'))
    this.pending.clear()
  }
}
