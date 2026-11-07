// @vitest-environment node
// Phase K2: the compiled module's live exports. Chunks pulled through
// live_advance reassemble the batch solve's typed ODE rows exactly, and a
// stale session id is answered `gone`.
// @ts-expect-error Node built-in module not declared in Vite client tsconfig
import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { initSync, live_advance, live_dispose, live_open, live_step, solve_zerocopy } from './pkg/frees.js'

initSync({ module: readFileSync(new URL('./pkg/frees_bg.wasm', import.meta.url)) })

const BALL = `g = 9.81
k_e = 0.8
DYNAMIC ball (method = ida, time = 0 .. 2, points = 41)
  der(h) = v
  der(v) = -g
  h(0) = 1
  v(0) = 0
  EVENT bounce: h = 0 | falling -> set v = -k_e*v
END
`

it('live chunks reassemble the batch rows bit for bit', () => {
  const batch = solve_zerocopy(BALL, '{}') as { envelope: string; odeBuffers: Float64Array[] }
  const table = JSON.parse(batch.envelope).odeTables[0]
  const open = JSON.parse(live_open(BALL, '{}', 0))
  expect(open).toMatchObject({ ok: true, table: { name: table.name, vars: table.vars, units: table.units, method: 'ida' } })
  const rows: number[] = []
  const events: unknown[] = []
  for (let t = 0.17; ; t = Math.min(2, t + 0.17)) {
    for (;;) {
      const out = live_advance(open.session, t, 0) as { header: string; rows: Float64Array }
      const header = JSON.parse(out.header)
      expect(header.error).toBeNull()
      rows.push(...out.rows)
      events.push(...header.events)
      if (header.numRows === 0) break
    }
    if (t === 2) break
  }
  expect(new Float64Array(rows)).toEqual(batch.odeBuffers[0])
  expect(events).toEqual(table.events)
  live_dispose(open.session)
  const gone = live_step(open.session, 'sample', 1) as { header: string }
  expect(JSON.parse(gone.header)).toEqual({ gone: true })
})
