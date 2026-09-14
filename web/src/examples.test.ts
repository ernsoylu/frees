// @vitest-environment node
// @ts-expect-error Node built-in module not declared in Vite client tsconfig
import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { EXAMPLES } from './examples'
import { initSync, solve } from './wasm/pkg/frees.js'

initSync({ module: readFileSync(new URL('./wasm/pkg/frees_bg.wasm', import.meta.url)) })

it.each<[string, Record<string, string>]>([
  ['series-rlc-resonance', { omega_n: 'Hz', zeta: '-' }],
  ['rc-step-charging', { tau: 's', v_2ms: 'V', i_2ms: 'A' }],
  ['resistor-bridge-equivalent', { current: 'A', R_eq: 'Ω' }],
  ['resistor-bridge-parametric', { r5: 'Ω', R_eq: 'Ω' }],
  ['pneumatic-spring-actuator', { stroke: 'm', force: 'N' }],
  ['hydraulic-spring-actuator', { stroke: 'm', load: 'N' }],
  ['reduction-gear-viscous-load', { load_power: 'W' }],
  ['hydraulic-metering-restriction', { mass_flow: 'kg/s', volume_flow: 'm^3/s', hydraulic_power: 'W' }],
  ['glazed-opening-heat-loss', { heat_loss: 'W', expected_heat: 'W', balance_error: 'W' }],
  ['transport-delay-peak-detection', { delay_seconds: 's', lag_samples: '-' }],
  ['correlated-temperature-heat-loss', { inside_temp: 'K', heat_loss: 'W', heat_sigma: 'W' }],
  ['uniform-area-tolerance', { area: 'm^2', force: 'N', force_sigma: 'N' }],
  ['uncertain-tank-inventory', { pressure: 'Pa', volume: 'm^3', temperature: 'K', mass: 'kg', mass_sigma: 'kg' }],
  ['newton-cooling-transient', { T_final: 'K', T_peak: 'K', t_half: 's' }],
  ['transient-heat-rod', { L: 'm', alpha: 'm^2/s', T_mid_final: 'K' }],
  ['damped-oscillator-ode', { m: 'kg', x_settled: 'm', E0: 'J' }],
  ['sounding-rocket-trajectory', { apogee: 'm', v_burnout: 'm/s', m_final: 'kg' }],
  ['damped-actuator-motion', { final_stroke: 'm' }],
  ['pi-temperature-regulation', { final_temperature: 'K', final_heat: 'W' }],
  ['engine-cycle-wiebe', { p_max: 'Pa' }],
])('%s solves with physical units and preserves its checked results', (id, units) => {
  const example = EXAMPLES.find(example => example.id === id)!
  const result = JSON.parse(solve(example.text, '{}'))
  expect(result.success, result.error).toBe(true)
  expect(result.unitWarnings).toEqual([])
  const variables = new Map<string, { units: string; value: number }>(
    result.variables.map((v: { name: string; units: string; value: number }) => [v.name.toLowerCase(), v]),
  )
  for (const [name, unit] of Object.entries(units)) {
    expect(variables.get(name.toLowerCase())?.units, name).toBe(unit)
  }
  for (const [, name, value, tolerance] of example.text.matchAll(/\{\s*CHECK\s+(\S+)\s+(\S+)\s+(\S+)\s*\}/g)) {
    const actual = variables.get(name.toLowerCase())?.value
    expect(actual, name).toBeDefined()
    expect(Math.abs(actual! - Number(value)), name).toBeLessThanOrEqual(Number(tolerance))
  }
  // Celsius annotations must change absolute temperatures, not the transient.
  if (id === 'newton-cooling-transient') {
    expect(variables.get('t_peak')?.value).toBeCloseTo(363.15, 8)
    expect(variables.get('t_final')?.value).toBeCloseTo(295.15 + 68 * Math.exp(-0.012 * 300), 4)
    expect(variables.get('t_half')?.value).toBeCloseTo(Math.log(2) / 0.012, 2)
  }
  if (id === 'transient-heat-rod') expect(variables.get('t_mid_final')?.value).toBeCloseTo(313.15, 4)
})
