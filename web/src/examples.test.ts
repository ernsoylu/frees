// @vitest-environment node
// @ts-expect-error Node built-in module not declared in Vite client tsconfig
import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { EXAMPLES, exampleFromHandoff } from './examples'
import { check, initSync, install_property_table, solve, solve_table } from './wasm/pkg/frees.js'
import { installPackedFluids } from '../scripts/packed-fluids.mjs'

initSync({ module: readFileSync(new URL('./wasm/pkg/frees_bg.wasm', import.meta.url)) })
installPackedFluids({ install_property_table })

const UNITS = new Map<string, Record<string, string>>([
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
  ['rankine-ideal-cycle', { W_pump: 'W', W_turb: 'W', Q_in: 'W', eta_th: '-', x_4: '-' }],
  ['rankine-open-feedwater-heater', { y: '-', Q_in: 'W', W_net: 'W', eta_th: '-' }],
  ['regenerative-gas-turbine', { W_C: 'W', W_T: 'W', r_bw: '-', T_2a: 'K', T_4a: 'K', Q_in: 'W', eta_th: '-' }],
  ['steam-turbine-efficiency', { m_dot: 'kg/s' }],
  ['air-compressor-efficiency', { T_2s: 'K', T_2a: 'K', W_in: 'W' }],
  ['ideal-vapor-compression-cycle', { Q_L: 'W', W_in: 'W', Q_H: 'W', COP_R: '-' }],
  ['square-duct-friction-loss', { Re: '-', f: '-', H_air: 'm', H_water: 'm' }],
  ['gravity-pipe-flow', { U: 'm/s', f: '-', Q: 'm^3/s' }],
  ['parallel-pipe-branches', { q_B: 'm^3/s', q_A: 'm^3/s', f_A: '-', f_B: '-', q_B_equal_f: 'm^3/s' }],
  ['pipeline-pump-head', { V: 'm/s', f: '-', h_f: 'm', H_pump: 'm' }],
  ['shower-heat-exchanger', { Q: 'W', A_lmtd: 'm^2', T_two_zone: 'K' }],
  ['converging-diverging-nozzle', { A_e: 'm^2', T_star: 'K', P_star: 'Pa', V_star: 'm/s', m_dot: 'kg/s', Ma_exit: '-', P_e: 'Pa', T_e: 'K', V_e: 'm/s' }],
  ['draining-tank-time-constant', { tau: 's', level_ratio: '-', Re_0: '-' }],
  ['actual-vapor-compression-cycle', { Q_L: 'W', W_in: 'W', COP_R: '-' }],
  ['refrigeration-exergy-destruction', { Q_L: 'W', W_in: 'W', Q_H: 'W', X_comp: 'W', X_cond: 'W', X_valve: 'W', X_evap: 'W', W_min: 'W', eta_II: '-', X_total: 'W' }],
  ['cascade-refrigeration', { m_B: 'kg/s', Q_L: 'W', W_in: 'W', COP_R: '-' }],
  ['flash-chamber-refrigeration', { x_6: '-', q_L: 'J/kg', w_in: 'J/kg', COP_R: '-' }],
  ['two-evaporator-refrigeration', { Q_L1: 'W', W_in: 'W', COP_R: '-' }],
  ['refrigerant-throttling-quality', { x_2: '-', DELTAT: 'K' }],
  ['steam-throttling-calorimeter', {}],
  ['ammonia-flash-intercooler', { p_i: 'Pa', w_1: 'kg/s', w_3: 'kg/s', W_low: 'W', W_high: 'W', W_total: 'W' }],
  ['ammonia-two-evaporator-intercooler', { w_1: 'kg/s', w_3: 'kg/s', W_low: 'W', W_high: 'W', W_total: 'W' }],
  ['liquid-suction-heat-exchanger', { T_liquid_F: '-', RE_ip: '-', w_ip: '-', COP: '-' }],
  ['pump-operating-cost', { W_shaft: 'W', W_elec: 'W', cost: '-' }],
  ['pipe-pressure-drop-brass', { f: '-', dP_psi: '-' }],
  ['chilled-water-coil-flow', { m: 'kg/s', gpm: '-' }],
  ['run-around-coil-loop', { Q: 'W', T_2: 'K' }],
  ['pump-npsh-available', { NPSH_a: 'm', NPSH_ft: '-' }],
  ['shower-mixing-ratio', { y: '-' }],
  ['parallel-branches-three-way-valve', { u: '-', q_A: '-', q_B: '-' }],
  ['valve-loss-coefficients', { U: 'm/s', H_velocity: 'm', H_valve: 'm', dP_valve: 'Pa', H_exit: 'm' }],
  ['closed-loop-pump-operating-point', { Q: 'm^3/s', H: 'm', W_pump: 'W', Q_chiller: 'W', T_supply: 'K', T_return: 'K' }],
  ['pipeline-hydrostatic-test', { C: 'm s^2', t_closed: 's', t_test: 's', P_end: 'Pa' }],
  ['tank-warm-up-time-constant', { T_inf: 'K', tau: 's', T_600_closed: 'K', T_600: 'K', T_end: 'K' }],
  ['thermostat-opening-flow', { m_full: 'kg/s', m_80: 'kg/s', m_85: 'kg/s', m_92: 'kg/s', u_80: '-', u_92: '-' }],
  ['small-hydro-turbine-power', { eta: '-', P_shaft: 'W', T_shaft: 'J' }],
  ['cooling-tower-range-approach', { Q: 'W', T_cold: 'K', range: 'K', approach: 'K' }],
  ['stratified-tank-charging', { T_1_1200: 'K', T_3_1200: 'K', T_3_closed: 'K' }],
  ['ice-bank-discharge', { NTU: '-', Q_plateau: 'W', t_half_closed: 's', t_half: 's' }],
  ['fans-in-series-duct', { Q: 'm^3/s', dP_A: 'Pa', dP_B: 'Pa', f: '-' }],
  ['fan-ventilation-duct', { Q: 'm^3/s', dP: 'Pa', dT: 'K' }],
  ['compressor-map-discharge', { eta: '-', T_2: 'K', W: 'W' }],
  ['pressure-reducing-valve-sizing', { CdA: 'm^2', d_eq: 'm' }],
  ['heated-duct-outlet', { Q: 'W', T_out: 'K', T_out_closed: 'K' }],
  ['gas-turbine-core-altitude', { P_amb: 'Pa', T_amb: 'K', T_2: 'K', T_3: 'K', W_c: 'W' }],
  ['methane-combustor-products', { y_CO2: '-', y_H2O: '-', y_O2: '-', y_N2: '-', excess_air: '-' }],
  ['propeller-thrust', { J: '-', thrust: 'N', P_shaft: 'W', eta_p: '-' }],
  ['turbocharger-boost', { PR_c: '-', T_boost: 'K', W: 'W' }],
  ['two-phase-line-friedel', { mdot: 'kg/s', x_2: '-', dT_glide: 'K' }],
  ['boiler-riser-lockhart-martinelli', { dP: 'Pa', X_tt: '-', phi2: '-' }],
  ['short-tube-capillary-choke', { m_A: 'kg/s', m_B: 'kg/s', m_C: 'kg/s' }],
  ['txv-evaporator-balance', { mdot: 'kg/s', P_e: 'Pa', T_e: 'K', Q: 'W' }],
  ['oil-separator-floating-head', { P_c: 'Pa', T_c: 'K', Q: 'W', h_main: 'J/kg', x_exit: '-' }],
  ['receiver-liquid-level', { P_c: 'Pa', Q: 'W' }],
  ['charge-sets-head-pressure', { P_c: 'Pa', SC: 'K', Q: 'W', m_cond: 'kg', m_line: 'kg' }],
  ['moving-boundary-coils', { L_boil: 'm', SH: 'K', Q_evap: 'W', L_cond: 'm', SC: 'K', Q_cond: 'W', T_margin_E: 'K', T_margin_C: 'K' }],
  ['reversing-valve-heating', { P_indoor: 'Pa', P_suction: 'Pa', h_suction: 'J/kg', Q_heat: 'W' }],
  ['ejector-lift-two-ratings', { P_lumped: 'Pa', h_lumped: 'J/kg', P_momentum: 'Pa', v_m: 'm/s', v_mix: 'm/s' }],
  ['co2-gas-cooler-back-pressure', { mdot: 'kg/s', Q: 'W', T_out: 'K', eps: '-' }],
  ['blend-glide-mixing', { z_mix: '-', x_mix: '-', glide: 'K', T_bubble: 'K', T_dew: 'K' }],
  ['oil-circulation-degradation', { f_deg: '-', Q: 'W', mdot: 'kg/s' }],
  ['microturbine-recuperator', { T_cold_out: 'K', T_hot_out: 'K', Q: 'W', eff: '-' }],
  ['pressure-cooker-relief', { t_crack: 's', P_end: 'Pa', m_end: 'kg', vent_end: 'kg/s' }],
  ['steam-relief-valve-capacity', { mdot: 'kg/s', opening: '-' }],
  ['suction-accumulator-carryover', { m_end: 'kg', mdot_out: 'kg/s' }],
  ['two-phase-volume-charging', { P_end: 'Pa', m_end: 'kg' }],
  ['two-phase-chamber-warm-up', { P_end: 'Pa', h_end: 'J/kg', T_end: 'K', Q_end: 'W' }],
  ['few-cell-coils', { mdot_E: 'kg/s', mdot_C: 'kg/s', h_E: 'J/kg', h_C: 'J/kg', Q_E: 'W', Q_C: 'W' }],
])

const CHECK_MARKER = /\{\s*CHECK\s+(\S+)\s+(\S+)\s+(\S+)\s*\}/g

type Solved = Map<string, { units?: string; value: number }>

// A PARAMETRIC document leaves its swept column free on purpose, so it is run as
// its own table, as Solve does in the app: every row must converge, and its
// CHECKs read the table's final row.
function solveExample(text: string): Solved {
  const result = JSON.parse(solve(text, '{}'))
  const table = result.success ? undefined : JSON.parse(check(text, '{}')).parametricTables?.[0]
  if (!table) {
    expect(result.success, result.error).toBe(true)
    expect(result.unitWarnings).toEqual([])
    return new Map(result.variables.map((v: { name: string; units: string; value: number }) => [v.name.toLowerCase(), v]))
  }
  expect(JSON.parse(check(text, '{}')).unitWarnings).toEqual([])
  const vars: string[] = table.vars
  const rows = table.rows.map((r: (number | null)[]) => Object.fromEntries(vars.flatMap((v, i) => (r[i] === null ? [] : [[v, r[i]]]))))
  const swept = JSON.parse(solve_table(text, JSON.stringify({ table: { variables: vars, rows } })))
  expect(swept.results.every((r: { success: boolean }) => r.success), swept.results.find((r: { error?: string }) => r.error)?.error).toBe(true)
  return new Map(Object.entries(swept.results.at(-1).values as Record<string, number>).map(([k, value]) => [k.toLowerCase(), { value }]))
}

// EC1: every example is solved and graded, so none can drop out of the gate by
// being left off a list. UNITS adds unit assertions for the examples above.
it.each(EXAMPLES.map((e) => [e.id, e] as const))('%s solves with physical units and passes its CHECKs', (id, example) => {
  const checks = [...example.text.matchAll(CHECK_MARKER)]
  expect(checks.length, `${id} carries no { CHECK }`).toBeGreaterThan(0)
  const variables = solveExample(example.text)
  for (const [name, unit] of Object.entries(UNITS.get(id) ?? {})) {
    expect(variables.get(name.toLowerCase())?.units, name).toBe(unit)
  }
  for (const [, name, value, tolerance] of checks) {
    const actual = variables.get(name.toLowerCase())?.value
    expect(actual, name).toBeDefined()
    expect(Math.abs(actual! - Number(value)), name).toBeLessThanOrEqual(Number(tolerance))
  }
  // ev-battery-cooling-pid takes ~16 s alone and ~55 s under the parallel suite
  // (NEXT_STEPS EC1); the transfer-function examples take a few seconds.
}, 120_000)

it('every example is dimensionally consistent', () => {
  const warned = EXAMPLES.map((e): [string, string] => [e.id, e.text]).flatMap(([id, text]) => {
    const warnings: string[] = JSON.parse(check(text, '{}')).unitWarnings
    return warnings.length ? [`${id}: ${warnings.join(' | ')}`] : []
  })
  expect(warned).toEqual([])
})

// EC3: twelve categories, none thin, and descriptions that say something the
// title does not.
const CATEGORIES = [
  'Systems', 'Thermodynamics', 'HVAC & Refrigeration', 'Heat Transfer', 'Fluids & Fluid Power', 'Mechanics',
  'Electrical & Powertrain', 'Aerospace & Compressible Flow', 'Control Systems', 'Dynamics & ODEs',
  'Data & Analysis', 'Lessons & Labs',
]

it('every example sits in one of the twelve categories, each holding at least three', () => {
  expect(EXAMPLES.filter((e) => !CATEGORIES.includes(e.category)).map((e) => `${e.id}: ${e.category}`)).toEqual([])
  const thin = CATEGORIES.filter((c) => EXAMPLES.filter((e) => e.category === c).length < 3)
  expect(thin).toEqual([])
})

it('no description repeats its title or tells the reader to press Solve', () => {
  const bad = EXAMPLES.filter((e) =>
    e.description.toLowerCase().includes(e.title.toLowerCase()) || e.description.includes('Solve (F2)'))
  expect(bad.map((e) => e.id)).toEqual([])
})

// EC4: Help's Open in Editor names its example, so a lesson opens with its
// panel; an unnamed or edited snippet stays a documentation snippet.
it('a Help handoff loads the example it names', () => {
  const now = 1_000_000
  const lesson = EXAMPLES.find((e) => e.id === 'lesson-thermal-mass')!
  const handoff = (fields: object) => JSON.stringify({ title: 'T', text: lesson.text, ts: now, ...fields })
  expect(exampleFromHandoff(handoff({ example: lesson.id }), now)).toBe(lesson)
  expect(exampleFromHandoff(handoff({}), now)?.id).toBe('doc-snippet')
  expect(exampleFromHandoff(handoff({ example: lesson.id, text: 'x = 1' }), now)?.id).toBe('doc-snippet')
  expect(exampleFromHandoff(handoff({ example: lesson.id }), now + 6 * 60_000)).toBeNull()
  expect(exampleFromHandoff('{', now)).toBeNull()
})

// EC4: the picker is the curriculum — exactly these, in this order (owner
// decision 2026-11-22). EXAMPLES order is the picker's order.
it('the featured examples are the curriculum, in order', () => {
  expect(EXAMPLES.filter((e) => e.featured).map((e) => e.id)).toEqual([
    'ideal-gas', 'linear-regression-diagnostics', 'pump-valve-operating-point', 'rankine-cycle',
    'hydraulic-metering-restriction', 'tank-draining', 'sounding-rocket-trajectory', 'projectile-trajectory',
    'step-impulse-response', 'cruise-control', 'ev-battery-cooling-pid', 'ev-thermal-management',
    'multi-objective-beam', 'correlated-temperature-heat-loss', 'vibration-tone-spectrum', 'lab-air-mixing',
    'lesson-rc-charging',
  ])
})

// EC4 gate: every fundamental the curriculum teaches, and the pattern that
// finds it in a featured example's id, description or text. Dropping
// `featured` from the only example that teaches one fails here. The five
// `open` rows are not taught yet; NEXT_STEPS (EC4) says what each waits on.
const FUNDAMENTALS: [string, RegExp | 'open'][] = [
  ['equations and units', /\[[\w^/.-]+\]/],
  ['implicit unknowns', /^\s*[\w.]+\s*[*/]\s*[\w.]+[^={\n]*=[^=]/m],
  ['Convert()', 'open'],
  ['CHECK', /\{\s*CHECK\s/],
  ['the REPL', 'open'],
  ['arrays', /\w\[(i|\d+(:\d+)?)\]/],
  ['FOR loops', /^\s*FOR\s+\w+\s*=.*\bTO\b/m],
  ['multi-output calls', /^\s*\[[\w\s,]+\]\s*=\s*\w+\(/m],
  ['linfit', /\blinfit\(/],
  ['statistics', /\b(pearson|corrcoef|mean|stdev)\(/],
  ['the Curve Fit dialog', 'open'],
  ['TABLE lookup', /^\s*TABLE\s+\w+\(/m],
  ['model$ variants', /\b(model|map|domain)\$\s*=/],
  ['components and connect()', /^\s*connect\(\s*\w+\.\w+/m],
  ['operating point', /operating point/i],
  ['real-fluid properties', /\b(Enthalpy|Entropy|Temperature|Quality)\((Water|R134a|R1234yf|Air)\b/],
  ['property diagram', /kind\s*=\s*property/],
  ['GUESS', /^\s*GUESS\s/m],
  ['Integral()', /\bIntegral\(/],
  ['DYNAMIC', /^\s*DYNAMIC\s/m],
  ['EVENT', /\bEVENT\b/],
  ['trajectory accessors', /\b(MaxValue|MinValue|FinalValue|ValueAt)\(/],
  ['PARAMETRIC', /^\s*PARAMETRIC\b/m],
  ['PLOT xy', /^\s*PLOT\s+'[^']*'\s*\n\s*(kind\s*=\s*xy|y\s*=)/m],
  ['step and impulse responses', /=\s*(step|impulse)\(/],
  ['LTI models', /\b(ss2tf|feedback)\(/],
  ['Bode and pole-zero plots', /kind\s*=\s*(bode|polezero)/],
  ['FUNCTION', /^\s*function\s/im],
  ['stiff solver', /method\s*=\s*(ode23s|ode15s|radau5|radauiia)/],
  ['DAE (IDA)', /method\s*=\s*ida\b/],
  ['Min/Max', /Min\/Max/],
  ['Pareto', /Pareto/],
  ['solid materials', /\b(E_|rho_|k_)\((Steel|Aluminum|Copper)\)/],
  ['uncertainty', /UncertaintyOf\(/],
  ['Correlation()', /\bCorrelation\(/],
  ['Monte Carlo', 'open'],
  ['Sobol/Morris sensitivity', 'open'],
  ['FFT', /\bFFT\(/i],
  ['Welch', /\bWelch\(/],
  ['psychrometrics', /\(AirH2O,/],
  ['psychrometric chart', /psychrometric chart/i],
  ['sliders', /slider/i],
  ['live mode', /^lab-/m],
  ['the lesson sequence', /^lesson-/m],
]

it('the featured examples teach every fundamental', () => {
  const featured = EXAMPLES.filter((e) => e.featured).map((e) => `${e.id}\n${e.description}\n${e.text}`)
  const untaught = FUNDAMENTALS.filter(([, re]) => re !== 'open' && !featured.some((t) => re.test(t))).map(([name]) => name)
  expect(untaught).toEqual([])
  // An open row that starts matching is closed: drop 'open' and give it its pattern.
  expect(FUNDAMENTALS.filter(([, re]) => re === 'open').map(([name]) => name)).toEqual(
    ['Convert()', 'the REPL', 'the Curve Fit dialog', 'Monte Carlo', 'Sobol/Morris sensitivity'])
})
