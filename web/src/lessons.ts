import type { PinnedSlider } from './sliders'

/**
 * Phase I2: a lesson manifest beside a gallery example. The example's model
 * and its CHECKs stay the grade; the manifest adds the teaching sequence —
 * predict, change one input, observe, explain, check — around sliders the
 * lesson approves, with ranges and units. Lessons pair across domains when
 * the same mathematics governs both (an RC circuit and a thermal mass).
 */
export interface Lesson {
  /** The gallery example (`EXAMPLES` id) this lesson sits beside. */
  example: string
  title: string
  objective: string
  prerequisites: string[]
  /** The governing equation, LaTeX. */
  equation: string
  /** The approved sliders, at their baseline values; Reset returns to these. */
  sliders: PinnedSlider[]
  /** The view the lesson opens on. */
  view: 'schematic' | 'plots'
  /** The trend the lesson is about, in one sentence. */
  trend: string
  /** The one input the student changes, and to what (display units). */
  change: { variable: string; to: number; label: string }
  /** The quantity the student watches, and the direction the model must show. */
  observe: { variable: string; label: string; expect: 'rises' | 'falls' }
  /** What the student is asked to predict. */
  predict: string
  explain: string
  /** The lesson in another domain governed by the same equation. */
  pair?: string
  sources: string[]
}

export const PREDICTIONS = ['rises', 'falls', 'stays the same'] as const
export type Prediction = (typeof PREDICTIONS)[number]

export const LESSONS: readonly Lesson[] = [
  {
    example: 'lesson-rc-charging',
    title: 'RC charging',
    objective: 'See that one number, τ = RC, sets how fast a capacitor charges, and that a larger resistance slows it in proportion.',
    prerequisites: ['Ohm’s law', 'A capacitor’s charge q = C·v'],
    equation: 'v(t) = E\\left(1 - e^{-t/\\tau}\\right), \\qquad \\tau = RC',
    sliders: [
      { name: 'R_s', value: 1000, units: 'ohm', min: 200, max: 5000 },
      { name: 'C_s', value: 1e-6, units: 'farad', min: 2e-7, max: 5e-6 },
    ],
    view: 'plots',
    trend: 'The voltage at a fixed time falls as τ grows.',
    change: { variable: 'R_s', to: 2000, label: 'Double the resistance to 2000 Ω' },
    observe: { variable: 'v_1ms', label: 'capacitor voltage at 1 ms', expect: 'falls' },
    predict: 'If the resistance doubles, the capacitor voltage at 1 ms …',
    explain: 'Doubling R doubles τ to 2 ms, so at 1 ms only half a time constant has passed: v = 10·(1 − e^−0.5) = 3.93 V instead of 6.32 V. The shape is the same; only its time scale stretches.',
    pair: 'lesson-thermal-mass',
    sources: ['J. W. Nilsson, S. A. Riedel, Electric Circuits, 11th ed., Pearson, 2019, §7.4'],
  },
  {
    example: 'lesson-thermal-mass',
    title: 'A cooling thermal mass',
    objective: 'See that a lumped mass cools with the same exponential as a charging capacitor, with τ = C/(hA) in place of RC.',
    prerequisites: ['Heat capacity C = m·c', 'Newton’s law of cooling q = hA·ΔT'],
    equation: 'T(t) - T_\\infty = (T_0 - T_\\infty)\\, e^{-t/\\tau}, \\qquad \\tau = \\frac{C}{hA}',
    sliders: [
      { name: 'h_c', value: 20, units: 'W/m^2-K', min: 5, max: 100 },
      { name: 'C_th', value: 5000, units: 'J/K', min: 1000, max: 20000 },
    ],
    view: 'plots',
    trend: 'The block cools faster, and is cooler at a fixed time, as hA grows.',
    change: { variable: 'h_c', to: 40, label: 'Double the convection coefficient to 40 W/m²·K' },
    observe: { variable: 'T_250', label: 'block temperature at 250 s', expect: 'falls' },
    predict: 'If the convection coefficient doubles, the block temperature at 250 s …',
    explain: 'Doubling h halves τ to 125 s, so 250 s is now two time constants: the excess falls to e^−2 = 13.5 % (313.5 K) instead of e^−1 = 36.8 % (336.8 K). 1/(hA) plays the part of R and C the part of the capacitance.',
    pair: 'lesson-rc-charging',
    sources: ['F. P. Incropera, D. P. DeWitt, T. L. Bergman, A. S. Lavine, Fundamentals of Heat and Mass Transfer, 7th ed., Wiley, 2011, §5.1–5.2'],
  },
  {
    example: 'lesson-rlc-ringing',
    title: 'A ringing RLC circuit',
    objective: 'See that the damping ratio ζ = (R/2)·sqrt(C/L) alone sets how far a series RLC circuit overshoots its step.',
    prerequisites: ['RC charging', 'An inductor’s v = L·di/dt'],
    equation: 'LC\\,\\ddot v + RC\\,\\dot v + v = E, \\qquad \\zeta = \\frac{R}{2}\\sqrt{\\frac{C}{L}}, \\qquad M_p = e^{-\\pi\\zeta/\\sqrt{1-\\zeta^2}}',
    sliders: [
      { name: 'R_s', value: 4, units: 'ohm', min: 1, max: 20 },
      { name: 'L_s', value: 0.001, units: 'H', min: 2e-4, max: 5e-3 },
    ],
    view: 'plots',
    trend: 'The overshoot falls as the resistance, and with it ζ, grows.',
    change: { variable: 'R_s', to: 8, label: 'Double the resistance to 8 Ω' },
    observe: { variable: 'overshoot', label: 'overshoot past the step', expect: 'falls' },
    predict: 'If the resistance doubles, the overshoot …',
    explain: 'Doubling R doubles ζ from 0.2 to 0.4, and the overshoot exp(−πζ/√(1−ζ²)) falls from 52.7 % to 25.4 %. ω_n = 1/√(LC) is unchanged, so the ringing keeps its pace; it only dies out sooner.',
    pair: 'lesson-mass-spring-damper',
    sources: ['J. W. Nilsson, S. A. Riedel, Electric Circuits, 11th ed., Pearson, 2019, §8.4'],
  },
  {
    example: 'lesson-mass-spring-damper',
    title: 'A mass on a spring and damper',
    objective: 'See that a mass on a spring and damper overshoots by the same law as an RLC circuit, with ζ = c/(2·sqrt(k·m)).',
    prerequisites: ['Newton’s second law', 'A spring’s F = k·x and a damper’s F = c·v'],
    equation: 'm\\,\\ddot x + c\\,\\dot x + k\\,x = F, \\qquad \\zeta = \\frac{c}{2\\sqrt{km}}, \\qquad M_p = e^{-\\pi\\zeta/\\sqrt{1-\\zeta^2}}',
    sliders: [
      { name: 'c_d', value: 4, units: 'N-s/m', min: 1, max: 20 },
      { name: 'k_s', value: 100, units: 'N/m', min: 20, max: 500 },
    ],
    view: 'plots',
    trend: 'The overshoot falls as the damping grows.',
    change: { variable: 'c_d', to: 8, label: 'Double the damping to 8 N·s/m' },
    observe: { variable: 'overshoot', label: 'overshoot past F/k', expect: 'falls' },
    predict: 'If the damping coefficient doubles, the overshoot …',
    explain: 'Doubling c doubles ζ from 0.2 to 0.4: the overshoot falls from 52.7 % to 25.4 %, the same numbers as the RLC circuit, because m, c and 1/k stand where L, R and C stood.',
    pair: 'lesson-rlc-ringing',
    sources: ['K. Ogata, System Dynamics, 4th ed., Pearson, 2004 (second-order transient response)'],
  },
  {
    example: 'lesson-diode',
    title: 'A diode lets current one way',
    objective: 'See that a diode conducts forward like a small resistance and blocks reverse bias entirely.',
    prerequisites: ['Ohm’s law'],
    equation: 'I = \\begin{cases} \\dfrac{E}{R + 1/G_{on}} & E > 0 \\\\[4pt] 0 & E < 0 \\end{cases}',
    sliders: [
      { name: 'E_s', value: 5, units: 'V', min: -10, max: 10 },
      { name: 'R_s', value: 1, units: 'ohm', min: 0.2, max: 10 },
    ],
    view: 'schematic',
    trend: 'The current falls to zero when the source reverses.',
    change: { variable: 'E_s', to: -5, label: 'Reverse the source to −5 V' },
    observe: { variable: 'I_d', label: 'diode current', expect: 'falls' },
    predict: 'If the source is reversed, the current …',
    explain: 'Forward, 5 V drives 5/(1 + 0.1) = 4.55 A. Reversed, the diode blocks and the current is zero — not −4.55 A. The diode is a one-way gate on the current.',
    pair: 'lesson-check-valve',
    sources: ['A. S. Sedra, K. C. Smith, Microelectronic Circuits, 7th ed., Oxford University Press, 2015, Ch. 4'],
  },
  {
    example: 'lesson-check-valve',
    title: 'A check valve lets flow one way',
    objective: 'See that a check valve passes forward flow by the orifice law and blocks reverse pressure entirely — a diode for fluid.',
    prerequisites: ['Pressure difference drives flow', 'The orifice law ṁ = CdA·sqrt(2ρΔP)'],
    equation: '\\dot m = \\begin{cases} C_dA\\sqrt{2\\rho\\,\\Delta P} & \\Delta P > 0 \\\\[4pt] 0 & \\Delta P < 0 \\end{cases}',
    sliders: [
      { name: 'P_up', value: 300000, units: 'Pa', min: 20000, max: 500000 },
      { name: 'P_down', value: 100000, units: 'Pa', min: 50000, max: 300000 },
    ],
    view: 'schematic',
    trend: 'The flow falls to zero when the inlet pressure drops below the outlet.',
    change: { variable: 'P_up', to: 50000, label: 'Drop the inlet to 0.5 bar' },
    observe: { variable: 'mdot', label: 'mass flow through the valve', expect: 'falls' },
    predict: 'If the inlet pressure drops below the outlet, the flow …',
    explain: 'Forward, 2 bar across the valve passes 1e-5·√(2·997·200000) = 0.200 kg/s. With the inlet below the outlet the valve closes and the flow is zero, not reversed — the same one-way rule as the diode, with ΔP for voltage and ṁ for current.',
    pair: 'lesson-diode',
    sources: ['F. M. White, Fluid Mechanics, 7th ed., McGraw-Hill, 2011, §6.9'],
  },
  {
    example: 'lesson-capacitor-sharing',
    title: 'Two capacitors share their charge',
    objective: 'See that charge conservation, not the resistor, fixes the voltage two capacitors settle at.',
    prerequisites: ['RC charging', 'q = C·v'],
    equation: 'V_\\infty = \\frac{C_1 V_1 + C_2 V_2}{C_1 + C_2}',
    sliders: [
      { name: 'C_2', value: 1e-5, units: 'farad', min: 2e-6, max: 1e-4 },
      { name: 'R_s', value: 1000, units: 'ohm', min: 100, max: 5000 },
    ],
    view: 'plots',
    trend: 'The shared voltage falls as the second capacitor grows.',
    change: { variable: 'C_2', to: 3e-5, label: 'Triple the second capacitor to 30 µF' },
    observe: { variable: 'V_final', label: 'shared final voltage', expect: 'falls' },
    predict: 'If the second capacitor is three times larger, the shared voltage …',
    explain: 'C1 holds 10 µF × 10 V = 100 µC. Spread over 10 + 30 µF it reads 100/40 = 2.5 V instead of 5 V. R only sets how fast they get there: try it and the end value does not move.',
    pair: 'lesson-gas-receivers',
    sources: ['J. W. Nilsson, S. A. Riedel, Electric Circuits, 11th ed., Pearson, 2019, Ch. 6'],
  },
  {
    example: 'lesson-gas-receivers',
    title: 'Two air receivers equalize',
    objective: 'See that two receivers settle at the volume-weighted pressure, the same conservation that fixes two capacitors’ shared voltage.',
    prerequisites: ['The ideal gas law P·V = m·R·T', 'Conservation of mass'],
    equation: 'P_\\infty = \\frac{P_1 V_1 + P_2 V_2}{V_1 + V_2}',
    sliders: [
      { name: 'V_2', value: 0.02, units: 'm^3', min: 0.005, max: 0.2 },
      { name: 'V_1', value: 0.02, units: 'm^3', min: 0.005, max: 0.2 },
    ],
    view: 'plots',
    trend: 'The shared pressure falls as the second receiver grows.',
    change: { variable: 'V_2', to: 0.06, label: 'Triple the second receiver to 60 L' },
    observe: { variable: 'P_final', label: 'shared final pressure', expect: 'falls' },
    predict: 'If the second receiver is three times larger, the shared pressure …',
    explain: 'At one temperature P·V counts the gas: 10 bar × 20 L + 1 bar × 60 L = 260 bar·L, over 80 L, is 3.25 bar instead of 5.5 bar. Volume plays the part of capacitance and pressure the part of voltage.',
    pair: 'lesson-capacitor-sharing',
    sources: ['Y. A. Cengel, M. A. Boles, Thermodynamics: An Engineering Approach, 9th ed., McGraw-Hill, 2019, Ch. 5'],
  },
  {
    example: 'lesson-throttling',
    title: 'Throttling on the P-h chart',
    objective: 'See that a throttle keeps enthalpy constant, so its exit quality is read straight down the P-h chart.',
    prerequisites: ['The steady-flow energy equation', 'Quality x of a saturated mixture'],
    equation: 'h_2 = h_1, \\qquad x_2 = \\frac{h_1 - h_f(P_2)}{h_g(P_2) - h_f(P_2)}',
    sliders: [
      { name: 'P_2', value: 0.12, units: 'MPa', min: 0.06, max: 0.5 },
      { name: 'P_1', value: 0.8, units: 'MPa', min: 0.5, max: 1.4 },
    ],
    view: 'plots',
    trend: 'The exit quality falls as the evaporator pressure rises.',
    change: { variable: 'P_2', to: 0.24, label: 'Double the evaporator pressure to 0.24 MPa' },
    observe: { variable: 'x_2', label: 'exit quality', expect: 'falls' },
    predict: 'If the evaporator pressure doubles, the exit quality …',
    explain: 'The line drops from the same h1 but stops higher in the dome, where hf is larger: x2 falls from 0.340 to 0.251 and the exit is about 17 K warmer. Less of the liquid flashes, so more is left to absorb heat in the evaporator.',
    sources: ['Y. A. Cengel, M. A. Boles, Thermodynamics: An Engineering Approach, 9th ed., McGraw-Hill, 2019, §5-4, Example 5-8'],
  },
  {
    example: 'lesson-air-mixing',
    title: 'Mixing two air streams',
    objective: 'See that an adiabatic mix lies on the straight line between its two streams, at the dry-air mass-weighted point.',
    prerequisites: ['Humidity ratio W', 'Reading the psychrometric chart'],
    equation: 'W_3 = \\frac{\\dot m_1 W_1 + \\dot m_2 W_2}{\\dot m_1 + \\dot m_2}, \\qquad h_3 = \\frac{\\dot m_1 h_1 + \\dot m_2 h_2}{\\dot m_1 + \\dot m_2}',
    sliders: [
      { name: 'Vdot_2', value: 0.5, units: 'm^3/s', min: 0.1, max: 2 },
      { name: 'Vdot_1', value: 1, units: 'm^3/s', min: 0.2, max: 2 },
    ],
    view: 'plots',
    trend: 'The mixed temperature falls as the share of cool air grows.',
    change: { variable: 'Vdot_2', to: 1, label: 'Double the cool air to 1 m³/s' },
    observe: { variable: 'T_3', label: 'mixed-air temperature', expect: 'falls' },
    predict: 'If the cool stream doubles, the mixed-air temperature …',
    explain: 'The mix slides along the same straight line toward the cool state: with equal volume flows the cool air carries slightly more dry-air mass, and the mix falls from 30.3 °C to 26.6 °C (303.46 to 299.76 K).',
    sources: ['Y. A. Cengel, M. A. Boles, Thermodynamics: An Engineering Approach, 9th ed., McGraw-Hill, 2019, §14-7'],
  },
  {
    example: 'lesson-cooling-coil',
    title: 'A coil that cools and dries air',
    objective: 'See that cooling air below its dew point condenses water, and that a colder coil condenses more.',
    prerequisites: ['Dew point', 'Relative humidity and humidity ratio'],
    equation: '\\dot m_w = \\dot m_a\\,(W_{in} - W_{out})',
    sliders: [
      { name: 'T_out', value: 13, units: 'C', min: 9, max: 16 },
      { name: 'RH_in', value: 0.5, units: '-', min: 0.4, max: 0.7 },
    ],
    view: 'plots',
    trend: 'The condensate rises as the leaving air gets colder.',
    change: { variable: 'T_out', to: 10, label: 'Cool the supply to 10 °C' },
    observe: { variable: 'condensate', label: 'condensate rate', expect: 'rises' },
    predict: 'If the supply air leaves at 10 °C instead of 13 °C, the condensate …',
    explain: 'At 90 % relative humidity colder air holds less water, so W_out falls and ṁ·(W_in − W_out) rises from 5.19 to 7.49 g/s. The coil must run colder too: its apparatus dew point drops from 10.2 °C to 5.8 °C.',
    sources: ['Y. A. Cengel, M. A. Boles, Thermodynamics: An Engineering Approach, 9th ed., McGraw-Hill, 2019, §14-7'],
  },
  {
    example: 'lesson-sensor-lag',
    title: 'A slow sensor in a speed loop',
    objective: 'See that a controller acts on what its sensor reports, so a sensor lag makes a well-tuned loop overshoot.',
    prerequisites: ['Proportional-integral control', 'A first-order lag'],
    equation: 'F = K_p\\,(v_{set} - v_m) + K_i \\int (v_{set} - v_m)\\,dt, \\qquad \\tau_s\\,\\dot v_m = v - v_m',
    sliders: [
      { name: 'tau_s', value: 0.5, units: 's', min: 0.05, max: 5 },
      { name: 'Kp', value: 800, units: 'N-s/m', min: 100, max: 3000 },
    ],
    view: 'plots',
    trend: 'The overshoot rises as the sensor slows.',
    change: { variable: 'tau_s', to: 2, label: 'Slow the sensor to τ = 2 s' },
    observe: { variable: 'overshoot', label: 'speed overshoot', expect: 'rises' },
    predict: 'If the speed sensor responds four times slower, the overshoot …',
    explain: 'The controller sees the speed 2 s late, so it keeps pushing after the car has passed 20 m/s: the overshoot rises from 2.6 % to 54 %. The plant and the gains did not change — only the information did.',
    sources: ['K. J. Åström, R. M. Murray, Feedback Systems, 2nd ed., Princeton University Press, 2021 (cruise control)'],
  },
]

export const lessonFor = (exampleId: string) => LESSONS.find((l) => l.example === exampleId) ?? null

/** How the observed value moved, with a relative dead band so round-off reads as no change. */
export function directionOf(before: number, after: number): Prediction {
  const band = 1e-9 * Math.max(Math.abs(before), Math.abs(after), 1e-300)
  return after > before + band ? 'rises' : after < before - band ? 'falls' : 'stays the same'
}
