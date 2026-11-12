// Phase L6: preferred-value stepping. A wheel notch (or an arrow key in the
// card editor) moves a value to the next value of a preferred series instead
// of a linear step: an E-series resistance, the next nominal pipe size, the
// next stock insulation thickness.

export type SeriesId = 'linear' | 'e6' | 'e12' | 'e24' | 'dn' | 'insulation'

/** IEC 60063 E-series mantissas, one decade. */
const E: Record<'e6' | 'e12' | 'e24', number[]> = {
  e6: [1.0, 1.5, 2.2, 3.3, 4.7, 6.8],
  e12: [1.0, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2],
  e24: [1.0, 1.1, 1.2, 1.3, 1.5, 1.6, 1.8, 2.0, 2.2, 2.4, 2.7, 3.0, 3.3, 3.6, 3.9, 4.3, 4.7, 5.1, 5.6, 6.2, 6.8, 7.5, 8.2, 9.1],
}

/** In mm. DN: the ISO 6708 nominal sizes, stepped as diameters in mm. Insulation: common stock thicknesses of pipe and slab insulation, not a standard series. */
const MM: Record<'dn' | 'insulation', number[]> = {
  dn: [6, 8, 10, 15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600, 700, 800, 900, 1000, 1200],
  insulation: [10, 13, 19, 25, 32, 40, 50, 60, 70, 80, 100, 120, 140, 160, 180, 200],
}

export const SERIES_LABELS: Record<SeriesId, string> = { linear: 'linear', e6: 'E6', e12: 'E12', e24: 'E24', dn: 'DN', insulation: 'insulation' }

/** Millimetres per unit, for the length units DN and insulation steps take. */
const MM_PER: Record<string, number> = { m: 1000, cm: 10, mm: 1 }

const ELECTRICAL = /^[pnuµmkMG]?(ohm|Ω|F|farad|H|henry)$/i

/** The series a value in `units` can step through. */
export function seriesOptions(units: string): SeriesId[] {
  return ['linear', 'e6', 'e12', 'e24', ...(MM_PER[units.trim()] ? (['dn', 'insulation'] as const) : [])]
}

/** The series a variable steps through unless chosen otherwise: E24 for a resistance, capacitance or inductance; DN for a diameter; insulation for a thickness; linear otherwise. */
export function defaultSeries(name: string, units: string): SeriesId {
  const u = units.trim()
  if (ELECTRICAL.test(u)) return 'e24'
  if (!MM_PER[u]) return 'linear'
  const last = name.split(/[.$]/).at(-1) ?? name
  if (/thick|insul|^t_?ins|^delta/i.test(last)) return 'insulation'
  if (/(^d(n|i|h|ia|iam|iameter)?(_|\d|$))|diam/i.test(last)) return 'dn'
  return 'linear'
}

const tidy = (v: number) => Number(v.toPrecision(12))
const lastOf = (list: number[], ok: (c: number) => boolean) => [...list].reverse().find(ok)

/**
 * The next value of `series` above (`dir` 1) or below (`dir` -1) `value`, in
 * `units`; `null` for a linear series, a non-positive value, or past the
 * series' ends.
 */
export function stepPreferred(value: number, series: SeriesId, units: string, dir: 1 | -1): number | null {
  if (series === 'linear' || !Number.isFinite(value) || value <= 0) return null
  const above = (c: number) => c > value * (1 + 1e-9)
  const below = (c: number) => c < value * (1 - 1e-9)
  if (series === 'dn' || series === 'insulation') {
    const scale = MM_PER[units.trim()]
    if (!scale) return null
    const list = MM[series].map((mm) => mm / scale)
    const next = dir > 0 ? list.find(above) : lastOf(list, below)
    return next === undefined ? null : tidy(next)
  }
  const decade = Math.floor(Math.log10(value))
  const candidates = [decade - 1, decade, decade + 1].flatMap((d) => E[series].map((m) => tidy(m * 10 ** d)))
  return (dir > 0 ? candidates.find(above) : lastOf(candidates, below)) ?? null
}
