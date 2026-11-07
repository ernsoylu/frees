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
]

export const lessonFor = (exampleId: string) => LESSONS.find((l) => l.example === exampleId) ?? null

/** How the observed value moved, with a relative dead band so round-off reads as no change. */
export function directionOf(before: number, after: number): Prediction {
  const band = 1e-9 * Math.max(Math.abs(before), Math.abs(after), 1e-300)
  return after > before + band ? 'rises' : after < before - band ? 'falls' : 'stays the same'
}
