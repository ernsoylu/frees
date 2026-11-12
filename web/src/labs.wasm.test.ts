// @vitest-environment node
// Phase M1: every graded live lab, run through the compiled engine's live
// exports with its timeline, passes its own grades; a reset replays it bit for
// bit, and a run cut into small frames is the same run.
// @ts-expect-error Node built-in module not declared in Vite client tsconfig
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { EXAMPLES } from './examples'
import { gradeLab, labRequest, measure, runLab, type LabDriver, type LabRun } from './labs'
import { LESSONS } from './lessons'
import { sliderOverrideEquation } from './sliders'
import type { LiveChunk, LiveOpenResult } from './wasm/liveClient'
import { initSync, live_advance, live_dispose, live_open, live_reset } from './wasm/pkg/frees.js'

initSync({ module: readFileSync(new URL('./wasm/pkg/frees_bg.wasm', import.meta.url)) })

/** The live exports as a lab driver, on the main thread. */
function direct(budgetMs = 1000): LabDriver & { session: () => number } {
  let session = 0
  return {
    session: () => session,
    open: async (source, request, block) => {
      const opened = JSON.parse(live_open(source, request, block)) as LiveOpenResult
      if (opened.ok) session = opened.session
      return opened
    },
    advance: async (t) => {
      const out = live_advance(session, t, budgetMs) as { header: string; rows: Float64Array }
      return { ...JSON.parse(out.header), seq: 0, rows: out.rows } as LiveChunk
    },
    dispose: () => live_dispose(session),
  }
}

const LABS = LESSONS.filter((l) => l.lab)

describe('graded live labs (M1)', () => {
  it('there are labs, each beside a graded example', () => {
    expect(LABS.length).toBeGreaterThanOrEqual(3)
    for (const l of LABS) expect(EXAMPLES.find((e) => e.id === l.example)?.text).toMatch(/\{\s*CHECK\s/)
  })

  it.each(LABS.map((l) => [l.example, l] as const))('%s passes its grades, and its timeline applies as written', async (_, lesson) => {
    const text = EXAMPLES.find((e) => e.id === lesson.example)!.text
    const request = JSON.stringify({ overrides: lesson.sliders.map(sliderOverrideEquation) })
    const run = await runLab(direct(), text, request, lesson.lab!)
    const results = gradeLab(lesson.lab!, run)
    for (const r of results) expect(r, `${r.label}: ${r.measured} vs ${r.expected} ± ${r.tolerance}`).toMatchObject({ pass: true })
    // The run went past the timeline's last change.
    expect(run.rows.at(-1)![0]).toBeGreaterThanOrEqual(lesson.lab!.timeline.at(-1)!.at)
  }, 30_000)

  it.each(LABS.map((l) => [l.example, l] as const))('%s: a reset and small frames reproduce the run bit for bit', async (_, lesson) => {
    const text = EXAMPLES.find((e) => e.id === lesson.example)!.text
    const request = JSON.stringify({ overrides: lesson.sliders.map(sliderOverrideEquation) })
    const whole = await runLab(direct(), text, request, lesson.lab!)
    // The same open, run in 2 ms frames, then reset and run again.
    const opened = JSON.parse(live_open(text, labRequest(request, lesson.lab!), 0)) as LiveOpenResult & { ok: true }
    const collect = (): LabRun => {
      const run: LabRun = { vars: opened.table.vars, rows: [], events: [] }
      for (let guard = 0; guard < 1e6; guard++) {
        const out = live_advance(opened.session, opened.settings!.tf, 2) as { header: string; rows: Float64Array }
        const h = JSON.parse(out.header) as LiveChunk
        expect(h.error).toBeNull()
        for (let i = 0; i < h.numRows; i++) run.rows.push(Array.from(out.rows.subarray(i * h.numCols, (i + 1) * h.numCols)))
        run.events.push(...h.events)
        if (run.rows.at(-1)![0] >= opened.settings!.tf) break
      }
      return run
    }
    const framed = collect()
    expect(framed.rows).toEqual(whole.rows)
    expect(framed.events).toEqual(whole.events)
    live_reset(opened.session)
    expect(collect().rows).toEqual(whole.rows)
    live_dispose(opened.session)
  }, 30_000)

  it('reads values, windows, events and intervals off a run', () => {
    const run: LabRun = {
      vars: ['time', 'body$port$T'],
      rows: [[0, 1], [1, 3], [2, 2]],
      events: [{ name: 'off', time: 0.5 }, { name: 'on', time: 0.7 }, { name: 'off', time: 1.5 }, { name: 'off', time: 2.75 }],
    }
    expect(measure(run, { kind: 'value', column: 'body.port.T', time: 1 })).toBe(3)
    expect(measure(run, { kind: 'max', column: 'Body.Port.T', from: 0, to: 2 })).toBe(3)
    expect(measure(run, { kind: 'min', column: 'body.port.T', from: 1, to: 2 })).toBe(2)
    expect(measure(run, { kind: 'event', event: 'off', after: 1 })).toBe(1.5)
    expect(measure(run, { kind: 'interval', event: 'off', after: 1 })).toBe(1.25)
    expect(measure(run, { kind: 'interval', event: 'off', after: 2 })).toBeNull()
    expect(measure(run, { kind: 'value', column: 'nope', time: 1 })).toBeNull()
  })
})
