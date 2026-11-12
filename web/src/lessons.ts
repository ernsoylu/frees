import type { LiveLab } from './labs'
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
  /** The engineering domain, for the Book's lesson filters. */
  domain: string
  /** The ideas the lesson teaches, for the Book's lesson filters. */
  concepts: string[]
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
  /** Phase M1: the lesson run live, with an input timeline and graded measures. */
  lab?: LiveLab
}

export const PREDICTIONS = ['rises', 'falls', 'stays the same'] as const
export type Prediction = (typeof PREDICTIONS)[number]

export const LESSONS: readonly Lesson[] = [
  {
    example: 'lesson-rc-charging',
    title: 'RC charging',
    domain: 'Electrical',
    concepts: ['time constant', 'first-order response'],
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
    domain: 'Heat transfer',
    concepts: ['time constant', 'first-order response', 'lumped capacitance'],
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
    domain: 'Electrical',
    concepts: ['second-order response', 'damping ratio', 'overshoot'],
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
    domain: 'Mechanical',
    concepts: ['second-order response', 'damping ratio', 'overshoot'],
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
    domain: 'Electrical',
    concepts: ['one-way element'],
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
    domain: 'Fluid',
    concepts: ['one-way element', 'orifice flow'],
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
    domain: 'Electrical',
    concepts: ['conservation', 'equalization'],
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
    domain: 'Pneumatic',
    concepts: ['conservation', 'equalization', 'ideal gas'],
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
    domain: 'Thermodynamics',
    concepts: ['throttling', 'P-h chart', 'quality'],
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
    domain: 'HVAC',
    concepts: ['psychrometrics', 'mixing', 'conservation'],
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
    domain: 'HVAC',
    concepts: ['psychrometrics', 'dehumidification', 'dew point'],
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
    domain: 'Control',
    concepts: ['feedback', 'sensor lag', 'overshoot'],
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
  {
    example: 'lab-thermostat',
    title: 'A thermostat limit cycle',
    domain: 'Control',
    concepts: ['on-off control', 'hysteresis', 'limit cycle', 'time constant'],
    objective: 'See that an on-off thermostat never settles: the room cycles between its two switching temperatures, and a wider band makes a slower, larger cycle.',
    prerequisites: ['A lumped thermal mass, τ = C/UA', 'Switching a heater on and off'],
    equation: 't_{heat} = \\tau \\ln\\frac{T_{on} - T_{lo}}{T_{on} - T_{hi}}, \\qquad t_{cool} = \\tau \\ln\\frac{T_{hi} - T_a}{T_{lo} - T_a}',
    sliders: [
      { name: 'dT_band', value: 2, units: 'K', min: 0.5, max: 6 },
      { name: 'Q_h', value: 2000, units: 'W', min: 1000, max: 4000 },
    ],
    view: 'plots',
    trend: 'The cycle period rises as the hysteresis band widens.',
    change: { variable: 'dT_band', to: 4, label: 'Widen the band to 4 K' },
    observe: { variable: 'P_cycle', label: 'cycle period', expect: 'rises' },
    predict: 'If the thermostat’s band doubles from 2 K to 4 K, the cycle period …',
    explain: 'The room must now heat and cool through 4 K instead of 2 K, along the same exponentials, so each half takes about twice as long: the period goes from 267.4 s to 539.0 s. The heater’s duty barely moves, because the average heat it must supply is the same.',
    sources: [
      'F. P. Incropera et al., Fundamentals of Heat and Mass Transfer, 7th ed., Wiley, 2011, §5.2',
      'K. J. Åström, R. M. Murray, Feedback Systems, 2nd ed., Princeton University Press, 2021, ch. 1 (on-off control)',
    ],
    lab: {
      brief: 'The room cycles in a 2 K band; at 3000 s the band widens to 4 K. The grades time the cycle before and after.',
      timeline: [{ at: 3000, set: ['dT_band = 4 [K]'] }],
      grades: [
        { label: 'Period in the 2 K band', measure: { kind: 'interval', event: 'off', after: 1000 }, expected: 267.36207, tolerance: 0.1, unit: 's' },
        { label: 'Period in the 4 K band', measure: { kind: 'interval', event: 'off', after: 3600 }, expected: 538.99650, tolerance: 0.2, unit: 's' },
      ],
      reference: 'The analytic period t_heat + t_cool of each band, from the two exponentials between switchings. The first cycle after the change is partial, so the second band is timed from 3600 s.',
      speed: 100,
    },
  },
  {
    example: 'lab-accumulator',
    title: 'Charging a hydraulic accumulator',
    domain: 'Fluid power',
    concepts: ['accumulator', 'gas spring', 'nonlinear response'],
    objective: 'See that an accumulator charges quickly at first and ever more slowly, because the gas stiffens as it is compressed, and that a higher supply pressure stores more oil.',
    prerequisites: ['Boyle’s law, p·V = constant', 'Laminar flow through a restriction, q = Δp/R'],
    equation: 't = \\frac{R}{p_s^2}\\left[(u_1 - u_2) + a \\ln\\frac{u_1}{u_2}\\right], \\qquad a = p_0 V_0, \\quad u = a\\left(\\frac{p_s}{p} - 1\\right)',
    sliders: [
      { name: 'p_s', value: 100, units: 'bar', min: 60, max: 200 },
      { name: 'R_line', value: 5e9, units: 'Pa-s/m^3', min: 1e9, max: 2e10 },
    ],
    view: 'plots',
    trend: 'The stored oil rises with the supply pressure.',
    change: { variable: 'p_s', to: 150, label: 'Raise the supply to 150 bar' },
    observe: { variable: 'V_oil', label: 'stored oil volume', expect: 'rises' },
    predict: 'If the supply pressure rises from 100 to 150 bar, the oil the accumulator stores …',
    explain: 'The gas is squeezed until it matches the supply: V_g = p₀V₀/p_s falls from 5 L to 3.33 L, so the stored oil rises from 5 L to 6.67 L. Each extra bar admits less oil than the last, because the gas is stiffer the more it is compressed.',
    sources: ['J. Watton, Fundamentals of Fluid Power Control, Cambridge University Press, 2009 (accumulators)'],
    lab: {
      brief: 'The accumulator charges from its 50 bar precharge toward a 100 bar supply; at 20 s the supply steps to 150 bar. The run pauses where the pressure passes 95 bar and 142.5 bar.',
      timeline: [{ at: 20, set: ['p_s = 150 [bar]'] }],
      watches: ['p > 95 [bar]', 'p > 142.5 [bar]'],
      grades: [
        { label: 'Time to 95 bar', measure: { kind: 'event', event: 'p > 95 [bar]', after: 0 }, expected: 9.72952, tolerance: 0.01, unit: 's' },
        { label: 'Time to 142.5 bar', measure: { kind: 'event', event: 'p > 142.5 [bar]', after: 20 }, expected: 23.00306, tolerance: 0.01, unit: 's' },
      ],
      reference: 'The closed-form isothermal charging time above, from 50 bar to 95 bar under 100 bar, and from the pressure at 20 s (99.909 bar, from the same formula) to 142.5 bar under 150 bar.',
    },
  },
  {
    example: 'lab-quarter-car',
    title: 'Quarter-car resonance',
    domain: 'Mechanical',
    concepts: ['base excitation', 'resonance', 'transmissibility'],
    objective: 'See that a car body barely follows a slow road wave, but moves more than twice the road amplitude when the wave meets the body resonance.',
    prerequisites: ['A mass–spring–damper', 'Steady sinusoidal response'],
    equation: 'H(j\\omega) = \\frac{k_t\\,(k_s + c_s s)}{(m_s s^2 + c_s s + k_s)(m_u s^2 + c_s s + k_s + k_t) - (c_s s + k_s)^2}\\Bigg|_{s = j\\omega}',
    sliders: [
      { name: 'f_road', value: 0.5, units: 'Hz', min: 0.2, max: 3 },
      { name: 'c_s', value: 1000, units: 'N-s/m', min: 300, max: 3000 },
    ],
    view: 'plots',
    trend: 'The body amplitude rises as the road frequency nears the body resonance.',
    change: { variable: 'f_road', to: 1.2, label: 'Drive the road at 1.2 Hz' },
    observe: { variable: 'X_body', label: 'steady body amplitude', expect: 'rises' },
    predict: 'If the road wave arrives at 1.2 Hz instead of 0.5 Hz, the body amplitude …',
    explain: 'The body on its suspension and tyre resonates near 1.18 Hz. At 0.5 Hz it follows the road with H = 1.20; at 1.2 Hz H = 2.61, so a 20 mm road wave moves the body 52 mm. The damper limits the peak: more c_s lowers it and spreads it.',
    sources: ['T. D. Gillespie, Fundamentals of Vehicle Dynamics, SAE, 1992, ch. 5 (ride)'],
    lab: {
      brief: 'The road runs at 0.5 Hz; at 12 s it moves to 1.2 Hz, onto the body resonance. The grades read the steady body amplitude before and after.',
      timeline: [{ at: 12, set: ['f_road = 1.2 [Hz]'] }],
      grades: [
        { label: 'Body amplitude at 0.5 Hz', measure: { kind: 'max', column: 'z_s', from: 8, to: 12 }, expected: 0.0239665, tolerance: 2.5e-4, unit: 'm' },
        { label: 'Body amplitude at 1.2 Hz', measure: { kind: 'max', column: 'z_s', from: 20, to: 24 }, expected: 0.0522409, tolerance: 5e-4, unit: 'm' },
      ],
      reference: 'A_road·|H(jω)| at each frequency, from the transfer function above; the transients have decayed (ζ ≈ 0.25 on the body mode) by each window.',
    },
  },
  {
    example: 'lab-refrigeration',
    title: 'Refrigeration start-up on P-h',
    domain: 'Thermal',
    concepts: ['vapour compression', 'pull-down', 'suction density'],
    objective: 'See that a fixed-displacement compressor loses capacity as the room it cools gets colder, because the vapour it draws thins, so the room settles where the shrinking capacity meets the heat gain.',
    prerequisites: ['The vapour-compression cycle on P-h', 'A lumped heat capacity, C·dT/dt = Q̇'],
    equation: 'C\\frac{dT}{dt} = UA\\,(T_{amb} - T) - \\dot V \\rho_1(T - \\Delta T_e)\\,(h_1 - h_4)',
    sliders: [
      { name: 'V_dot', value: 0.004, units: 'm^3/s', min: 0.001, max: 0.008 },
      { name: 'UA', value: 150, units: 'W/K', min: 50, max: 400 },
    ],
    view: 'plots',
    trend: 'A smaller compressor leaves the room warmer.',
    change: { variable: 'V_dot', to: 0.002, label: 'Halve the compressor displacement' },
    observe: { variable: 'T_ss', label: 'steady room temperature', expect: 'rises' },
    predict: 'If the compressor displacement is halved, the temperature the room settles at …',
    explain: 'Half the displacement moves half the vapour at a given suction state, so the room warms until the denser suction vapour and the larger envelope gain balance again: from 270.52 K to 279.49 K. On the P-h chart the evaporator states climb back up as the evaporating pressure rises.',
    sources: ['Y. A. Cengel and M. A. Boles, Thermodynamics: An Engineering Approach, McGraw-Hill (vapour-compression refrigeration)'],
    lab: {
      brief: 'The unit pulls the room down from 303 K while the four states slide down the P-h chart; at 5000 s the compressor drops to half its displacement. The grades read the room where it settles each time.',
      timeline: [{ at: 5000, set: ['V_dot = 0.002 [m^3/s]'] }],
      grades: [
        { label: 'Room at full displacement', measure: { kind: 'value', column: 'T_room', time: 5000 }, expected: 270.52185, tolerance: 0.02, unit: 'K' },
        { label: 'Room at half displacement', measure: { kind: 'value', column: 'T_room', time: 10000 }, expected: 279.48631, tolerance: 0.02, unit: 'K' },
      ],
      reference: 'The steady balance UA·(T_amb − T) = V̇·ρ₁·(h₁ − h₄), solved with R134a properties at V̇ = 0.004 and 0.002 m³/s (the document solves the first as T_ss); about nine time constants have passed by each grade.',
      speed: 200,
    },
  },
  {
    example: 'lab-battery-windup',
    title: 'A battery load step and PID anti-windup',
    domain: 'Control',
    concepts: ['PI control', 'actuator saturation', 'integrator windup'],
    objective: 'See that a PI controller whose valve saturates winds up its integrator and then undercools the pack, and that back-calculation stops it.',
    prerequisites: ['A PI controller, u = K_p·e + ∫K_p·e/T_i dt', 'A lumped heat capacity'],
    equation: '\\dot z = \\frac{K_p e}{T_i} + \\frac{u - v}{T_t}, \\qquad v = K_p e + z, \\qquad u = \\min(\\max(v, 0), 1)',
    sliders: [
      { name: 'Q_load', value: 1500, units: 'W', min: 500, max: 5000 },
      { name: 'T_t', value: 20, units: 's', min: 2, max: 2000 },
    ],
    view: 'plots',
    trend: 'A heavier load opens the chiller valve further.',
    change: { variable: 'Q_load', to: 2000, label: 'Raise the pack heat to 2000 W' },
    observe: { variable: 'u_0', label: 'valve opening at the set point', expect: 'rises' },
    predict: 'If the pack makes 2000 W instead of 1500 W, the valve opening that holds 308 K …',
    explain: 'At the set point the chiller must remove the load less the small loss to the ambient, so u rises from 0.577 to 0.776. Live, a 4000 W load is more than the open valve removes, so the pack climbs toward 319.15 K. With T_t = 20 s the integrator follows the saturated valve and the pack returns to 308.15 K without undershoot; with a tracking time of hours it winds up and the pack falls below 300 K.',
    sources: ['K. J. Astrom and T. Hagglund, Advanced PID Control, ISA, 2006 (integrator windup and back-calculation)'],
    lab: {
      brief: 'The pack sits at 308 K under 1500 W; at 100 s the load steps to 4000 W, beyond the chiller, and at 1600 s it drops back. Move T_t up and run it again to see the windup.',
      timeline: [{ at: 100, set: ['Q_load = 4000 [W]'] }, { at: 1600, set: ['Q_load = 1500 [W]'] }],
      grades: [
        { label: 'Pack with the valve saturated', measure: { kind: 'value', column: 'T_pack', time: 1600 }, expected: 319.15035, tolerance: 0.01, unit: 'K' },
        { label: 'Lowest pack temperature after the load drops', measure: { kind: 'min', column: 'T_pack', from: 1600, to: 2400 }, expected: 308.15, tolerance: 0.3, unit: 'K' },
        { label: 'Pack back at the set point', measure: { kind: 'value', column: 'T_pack', time: 2400 }, expected: 308.15, tolerance: 0.02, unit: 'K' },
      ],
      reference: 'T_hot from the fully open balance Q_peak = m_max·c_p·ε·(T − T_in) + UA·(T − T_amb), solved in the document; the set point; and a 0.3 K bound on the undershoot the anti-windup must keep (a plain integrator undercools the pack by about 8 K).',
      speed: 50,
    },
  },
  {
    example: 'lab-air-mixing',
    title: 'Outdoor-air mixing on the psychrometric chart',
    domain: 'HVAC',
    concepts: ['adiabatic mixing', 'ventilation', 'humidity ratio'],
    objective: 'See that the mixed air lies on the line between outdoor and room air, and that more outdoor air carries the room’s heat and moisture away, so the room settles closer to the outdoor state.',
    prerequisites: ['Humidity ratio and enthalpy per kg of dry air', 'Mass and energy balances on a well-mixed room'],
    equation: 'w_{ss} = w_{out} + \\frac{\\dot m_w}{f_{oa}\\,\\dot m}, \\qquad h_{ss} = h_{out} + \\frac{\\dot Q_{int} + \\dot m_w h_w}{f_{oa}\\,\\dot m}',
    sliders: [
      { name: 'f_oa', value: 0.2, units: '', min: 0.05, max: 1 },
      { name: 'Q_int', value: 800, units: 'W', min: 0, max: 3000 },
    ],
    view: 'plots',
    trend: 'More outdoor air makes the room drier.',
    change: { variable: 'f_oa', to: 0.5, label: 'Raise the outdoor-air fraction to 0.5' },
    observe: { variable: 'w_ss', label: 'steady room humidity ratio', expect: 'falls' },
    predict: 'If half the supply is outdoor air instead of a fifth, the room’s humidity ratio …',
    explain: 'Only the outdoor part of the supply removes the gains, so the room sits above the outdoor state by the gains over f_oa·ṁ. At f_oa = 0.5 that excess is 2.5 times smaller: w falls from 0.01053 to 0.00933 and the room from 295.90 K to 291.26 K.',
    sources: ['ASHRAE Handbook, Fundamentals, ch. 1 (psychrometrics: adiabatic mixing)'],
    lab: {
      brief: 'The room starts at 24 °C and 50 % and settles under a fifth outdoor air; at 6000 s the damper opens to half. The chart traces the room and the mixed air.',
      timeline: [{ at: 6000, set: ['f_oa = 0.5'] }],
      grades: [
        { label: 'Room temperature at f_oa = 0.2', measure: { kind: 'value', column: 'T_room', time: 6000 }, expected: 295.89533, tolerance: 0.01, unit: 'K' },
        { label: 'Room humidity ratio at f_oa = 0.5', measure: { kind: 'value', column: 'w_room', time: 8000 }, expected: 0.0093257, tolerance: 2e-6, unit: 'kg/kg' },
        { label: 'Room temperature at f_oa = 0.5', measure: { kind: 'value', column: 'T_room', time: 8000 }, expected: 291.25516, tolerance: 0.01, unit: 'K' },
      ],
      reference: 'The steady balances above with AirH2O properties at f_oa = 0.2 and 0.5 (the document solves the first as w_ss and T_ss); ten and eight time constants m_room/(f_oa·ṁ) have passed by the grades.',
      speed: 200,
    },
  },
]

export const lessonFor = (exampleId: string) => LESSONS.find((l) => l.example === exampleId) ?? null

/** How the observed value moved, with a relative dead band so round-off reads as no change. */
export function directionOf(before: number, after: number): Prediction {
  const band = 1e-9 * Math.max(Math.abs(before), Math.abs(after), 1e-300)
  return after > before + band ? 'rises' : after < before - band ? 'falls' : 'stays the same'
}
