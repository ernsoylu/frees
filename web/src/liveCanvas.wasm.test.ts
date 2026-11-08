// @vitest-environment node
// Phase L2: a canvas input drives a live run through the compiled engine. The
// thermostat's setpoint, lifted out of its call, opens live with the
// document's own run, and raising it mid-run moves the regulated temperature
// to the new setpoint.
// @ts-expect-error Node built-in module not declared in Vite client tsconfig
import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { check, initSync, live_advance, live_dispose, live_open, live_set, solve } from './wasm/pkg/frees.js'
import { EXAMPLES } from './examples'
import { canvasInputLine, liftCanvasInputs } from './liveCanvas'

initSync({ module: readFileSync(new URL('./wasm/pkg/frees_bg.wasm', import.meta.url)) })

function advance(session: number, t: number): number[][] {
  const rows: number[][] = []
  for (;;) {
    const out = live_advance(session, t, 50) as { header: string; rows: Float64Array }
    const header = JSON.parse(out.header)
    expect(header.error).toBeNull()
    for (let r = 0; r < header.numRows; r++) rows.push(Array.from(out.rows.subarray(r * header.numCols, (r + 1) * header.numCols)))
    if (header.numRows === 0) return rows
  }
}

it('a lifted thermostat setpoint opens on the document run and drives it live', () => {
  const text = EXAMPLES.find((e) => e.id === 'pi-temperature-regulation')!.text
  const { instances } = JSON.parse(check(text, '{}'))
  const { source, inputs } = liftCanvasInputs(text, instances)
  expect(inputs.map((i) => [i.block, i.param, i.value, i.unit])).toEqual([['controller', 'tref', 350, '[K]']])

  const open = JSON.parse(live_open(source, '{}', 0))
  expect(open.ok).toBe(true)
  const col = open.table.vars.findIndex((v: string) => v.toLowerCase() === 'body$port$t')
  expect(col).toBeGreaterThan(0)
  // Until the change, the run is the document's batch run.
  const batch = JSON.parse(solve(text, '{}')).odeTables[0].rows as number[][]
  const before = advance(open.session, 1000)
  before.forEach((row, i) => expect(row[col]).toBeCloseTo(batch[i][col], 6))

  const set = JSON.parse(live_set(open.session, JSON.stringify([canvasInputLine(inputs[0], 450)])))
  // ode45 is explicit: the change applies at its current step, just past the row asked for.
  expect(set.time).toBeGreaterThanOrEqual(1000)
  expect(set.time).toBeLessThan(1100)
  expect(set.log).toEqual([{ time: set.time, name: inputs[0].variable.toLowerCase(), value: 450 }])
  const after = advance(open.session, 8000)
  expect(after[0][col]).toBeLessThan(360)
  expect(after.at(-1)![col]).toBeCloseTo(450, 0)
  live_dispose(open.session)
})
