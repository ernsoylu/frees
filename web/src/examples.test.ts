// @vitest-environment node
// @ts-expect-error Node built-in module not declared in Vite client tsconfig
import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { EXAMPLES } from './examples'
import { CYCLE_EXAMPLES } from './helpExamples'
import { check, initSync, solve } from './wasm/pkg/frees.js'

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
  ['pneumatic-diaphragm-fill', { z_final: 'm', dP_final: 'Pa', z_static: 'm' }],
  ['pneumatic-cylinder-stall-force', { F_chambers: 'N', F_rod_end: 'N', F_net: 'N' }],
  ['pneumatic-accumulator-equalization', { P1_final: 'Pa', P2_final: 'Pa', P3_final: 'Pa', P_mass_balance: 'Pa' }],
  ['hydraulic-vertical-cylinder', { P_oil: 'Pa', P_hand: 'Pa' }],
  ['hydraulic-orifice-lpm', { Q: 'm^3/s', Q_lpm: '-', Q_hand: 'm^3/s' }],
  ['tank-orifice-draining', { t_quarter: 's', t_empty_hand: 's', t_quarter_hand: 's' }],
  ['gear-impedance-reflection', { GR: '-', K_e: 'J', T2: 'J', theta2_static: '-', theta2_peak: '-', theta2_at_peak: '-' }],
  ['vehicle-launch-equivalent-mass', { a_sim: 'm/s^2', a_hand: 'm/s^2', m_eq: 'kg' }],
  ['capstan-belt-friction', { P: 'N', P_lbf: '-' }],
  ['second-order-step-metrics', { omega_n: '-', zeta: '-', Tp: '-', OS: '-', Ts: '-', Tp_formula: '-', OS_formula: '-', Ts_formula: '-' }],
  ['pi-zero-overshoot', { OS: '-', e_ss: '-', y_80: '-', y_peak: '-' }],
  ['first-order-motor-step', { t_63: 's', w_at_tau: 'Hz', fraction_at_tau: '-' }],
  ['moist-air-adiabatic-mixing', { W_3: '-', h_3: 'J/kg', T_3: 'K' }],
  ['cooling-coil-dehumidification', { T_adp: 'K', Q_total: 'W', Q_sensible: 'W', Q_latent: 'W', SHR: '-', condensate: 'kg/s' }],
  ['preheat-steam-humidifier-ip', { Q_coil: 'W', Q_btu_hr: '-', steam_lbm_hr: '-', balance: 'W' }],
  ['crossflow-hx-effectiveness', { C_r: '-', NTU: '-', epsilon: '-', q: 'W', T_c_out: 'K', T_h_out: 'K', eps_counterflow: '-' }],
  ['annular-fin-efficiency', { mL: '-', eta_f: '-', eta_o: '-', Q_per_m: 'kg m/s^3' }],
  ['shell-tube-lmtd-sizing', { dT_lm: 'K', F: '-', F_one_shell: '-', A: 'm^2', N_tubes: '-' }],
  ['beam-deflection-uncertainty', { y: 'm', u_y: 'm', rel_rss: '-', rel_worst: '-', u_y_worst: 'm' }],
  ['linear-regression-diagnostics', { r: '-' }],
  ['quadratic-regression', { s_yx: '-', r_sq: '-' }],
  ['power-law-log-fit', {}],
  ['damping-sensitivity-oscillators', { x_soft: 'm', x_stiff: 'm', dxdb_soft: 'm s/kg', dxdb_stiff: 'm s/kg' }],
  ['drive-cycle-energy-sensitivity', { E0: 'J', S_m: '-', S_CdA: '-', S_cr: '-', E_hand: 'J', S_m_hand: '-' }],
  ['feedback-error-sensitivity', { e_ss: '-', e_ss_hi: '-', S_a: '-', S_a_numeric: '-', S_K: '-' }],
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
  // The transfer-function examples take a few seconds alone, more under a parallel suite.
}, 30_000)

it('every gallery and Help example is dimensionally consistent', () => {
  const documents: [string, string][] = [
    ...EXAMPLES.map((e): [string, string] => [e.id, e.text]),
    ...CYCLE_EXAMPLES.map((e): [string, string] => [e.value, e.code]),
  ]
  const warned = documents.flatMap(([id, text]) => {
    const warnings: string[] = JSON.parse(check(text, '{}')).unitWarnings
    return warnings.length ? [`${id}: ${warnings.join(' | ')}`] : []
  })
  expect(warned).toEqual([])
})
