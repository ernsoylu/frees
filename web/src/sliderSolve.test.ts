// @vitest-environment node
// Phase G: a slider drag reuses a prepared document and starts from the
// previous drag's answer. It must land on the plain solve's root within the
// solver's tolerance, and everything else the response carries must be the
// plain solve's. (The release is a plain solve.)
// @ts-expect-error Node built-in module not declared in Vite client tsconfig
import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { EXAMPLES } from './examples'
import { pinnableParameters, sliderOverrideEquation } from './sliders'
import { initSync, install_property_table, solve } from './wasm/pkg/frees.js'
import { installPackedFluids } from '../scripts/packed-fluids.mjs'

initSync({ module: readFileSync(new URL('./wasm/pkg/frees_bg.wasm', import.meta.url)) })
installPackedFluids({ install_property_table })

type Variable = { name: string; value: number; units: string }
type Response = { success: boolean; error?: string; variables: Variable[]; [key: string]: unknown }

const run = (text: string, overrides: string[], drag = false): Response =>
  JSON.parse(solve(text, JSON.stringify({ overrides, ...(drag ? { sliderSolve: 'drag' } : {}) })))

/** Everything but the numbers: a warm start reaches the root by another path. */
const shape = (r: Response) => JSON.parse(JSON.stringify(r, (_k, v) => (typeof v === 'number' ? 0 : v)))

const agree = (a: Variable[], b: Variable[], rel: number) =>
  a.flatMap((v, i) => {
    const w = b[i].value
    return Math.abs(v.value - w) <= rel * Math.max(1, Math.abs(v.value), Math.abs(w)) ? [] : [`${v.name}: ${v.value} vs ${w}`]
  })

const cases = EXAMPLES.flatMap((example) => {
  const base = run(example.text, [])
  if (!base.success) return []
  const pinnable = pinnableParameters(example.text)
  const pins = base.variables.filter((v) => pinnable.has(v.name.toLowerCase()) && v.value !== 0).slice(0, 2)
  return pins.length ? [[example.id, example.text, pins] as const] : []
})

it('covers the gallery', () => expect(cases.length).toBeGreaterThan(40))

it.each(cases)('%s: a slider drag reaches the plain solve', (_id, text, pins) => {
  for (const factor of [1.03, 1.06, 1.09]) {
    const overrides = pins.map((v) => sliderOverrideEquation({ name: v.name, value: v.value * factor, units: v.units, min: 0, max: 0 }))
    const plain = run(text, overrides)
    const drag = run(text, overrides, true)
    expect(drag.success, drag.error).toBe(plain.success)
    expect(shape(drag)).toEqual(shape(plain))
    expect(agree(drag.variables, plain.variables, 1e-6)).toEqual([])
  }
}, 120_000)
