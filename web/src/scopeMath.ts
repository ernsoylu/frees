// Phase L3: what a rolling scope computes from a live run's rows — display
// buckets, the measurement strip, detrend and uniform resampling. Pure, so the
// strip's numbers are tested apart from any drawing. The rows are the raw
// recording; buckets are display only and never feed a measurement.

import type { LiveTable } from './wasm/liveClient'

/** Per pixel column, the least and greatest sample in it (`NaN` where none falls). */
export function buckets(t: ArrayLike<number>, y: ArrayLike<number>, t0: number, t1: number, columns: number): { min: Float64Array; max: Float64Array } {
  const min = new Float64Array(columns).fill(Number.NaN)
  const max = new Float64Array(columns).fill(Number.NaN)
  const span = t1 - t0
  if (!(span > 0) || columns < 1) return { min, max }
  for (let i = 0; i < t.length; i++) {
    const c = Math.floor(((t[i] - t0) / span) * columns)
    if (c < 0 || c > columns || !Number.isFinite(y[i])) continue
    const k = Math.min(columns - 1, c)
    if (!(y[i] >= min[k])) min[k] = y[i]
    if (!(y[i] <= max[k])) max[k] = y[i]
  }
  return { min, max }
}

/**
 * The SVG path of bucketed extremes in a `width` × `height` box: each column's
 * min-to-max stroke, joined left to right, with 4 units of margin top and bottom.
 */
export function envelopePath(min: Float64Array, max: Float64Array, width: number, height: number): { d: string; lo: number; hi: number } {
  let lo = Infinity
  let hi = -Infinity
  for (let c = 0; c < min.length; c++) {
    if (Number.isNaN(min[c])) continue
    lo = Math.min(lo, min[c])
    hi = Math.max(hi, max[c])
  }
  const y = (v: number) => (hi > lo ? height - 4 - ((v - lo) / (hi - lo)) * (height - 8) : height / 2)
  let d = ''
  for (let c = 0; c < min.length; c++) {
    if (Number.isNaN(min[c])) continue
    const x = (((c + 0.5) / min.length) * width).toFixed(1)
    d += `${d ? 'L' : 'M'}${x},${y(max[c]).toFixed(1)}L${x},${y(min[c]).toFixed(1)}`
  }
  return { d, lo, hi }
}

/** `y` less its least-squares line in `t`. */
export function detrend(t: ArrayLike<number>, y: ArrayLike<number>): number[] {
  const n = t.length
  if (n === 0) return []
  let mt = 0
  let my = 0
  for (let i = 0; i < n; i++) {
    mt += t[i] / n
    my += y[i] / n
  }
  let sxy = 0
  let sxx = 0
  for (let i = 0; i < n; i++) {
    sxy += (t[i] - mt) * (y[i] - my)
    sxx += (t[i] - mt) ** 2
  }
  const slope = sxx > 0 ? sxy / sxx : 0
  return Array.from({ length: n }, (_, i) => y[i] - (my + slope * (t[i] - mt)))
}

/** `n` samples of `y(t)` at uniform spacing over `[t[0], t[last]]`, linearly interpolated. */
export function resample(t: ArrayLike<number>, y: ArrayLike<number>, n: number): { values: Float64Array; dt: number } {
  const values = new Float64Array(n)
  const span = t[t.length - 1] - t[0]
  const dt = n > 1 ? span / (n - 1) : 0
  let j = 0
  for (let i = 0; i < n; i++) {
    const at = t[0] + i * dt
    while (j < t.length - 2 && t[j + 1] < at) j++
    const h = t[j + 1] - t[j]
    values[i] = h > 0 ? y[j] + ((y[j + 1] - y[j]) * (at - t[j])) / h : y[j]
  }
  return { values, dt }
}

/**
 * The window's rows as uniform samples for a spectrum, at their own mean
 * spacing, so nothing the rows resolve folds back to a lower frequency. Past
 * `max` samples, each run of `k` is averaged into one: a boxcar ahead of the
 * decimation, so content above the new Nyquist frequency is attenuated
 * rather than aliased at full strength.
 * ponytail: a boxcar leaks sidelobes; a proper FIR decimator if a long window's spectrum needs to be clean.
 */
export function spectrumSamples(t: ArrayLike<number>, y: ArrayLike<number>, max: number): { values: Float64Array; dt: number } {
  const fine = resample(t, y, t.length)
  const k = Math.ceil(t.length / max)
  if (k <= 1) return fine
  const values = new Float64Array(Math.floor(t.length / k))
  for (let i = 0; i < values.length; i++) {
    let sum = 0
    for (let j = 0; j < k; j++) sum += fine.values[i * k + j]
    values[i] = sum / k
  }
  return { values, dt: fine.dt * k }
}

export interface Measurements {
  min: number
  max: number
  /** The largest magnitude. */
  peak: number
  peakToPeak: number
  /** Time-weighted (trapezoidal) over the window. */
  mean: number
  rms: number
  /** Rising crossings of the mid level per unit time; `null` with fewer than two. */
  frequency: number | null
  /** Fraction of the window above the mid level. */
  duty: number
  /** Beyond the final value in the step's direction, as a fraction of the step; `null` without a step. */
  overshoot: number | null
  /** From the window's start to the last exit from ±2 % of the step around the final value. */
  settling: number | null
}

/**
 * The measurement strip over one window: rows `t`, `y` (at least two). The
 * step for overshoot and settling runs from the first sample to the last.
 */
export function measure(t: ArrayLike<number>, y: ArrayLike<number>): Measurements | null {
  const n = t.length
  if (n < 2 || !(t[n - 1] > t[0])) return null
  const span = t[n - 1] - t[0]
  let min = Infinity
  let max = -Infinity
  let area = 0
  let square = 0
  for (let i = 0; i < n; i++) {
    min = Math.min(min, y[i])
    max = Math.max(max, y[i])
    if (i > 0) {
      const h = t[i] - t[i - 1]
      area += (h * (y[i] + y[i - 1])) / 2
      square += (h * (y[i] ** 2 + y[i - 1] ** 2)) / 2
    }
  }
  const mid = (min + max) / 2
  let rising: number[] = []
  let above = 0
  for (let i = 1; i < n; i++) {
    const [a, b] = [y[i - 1] - mid, y[i] - mid]
    if (a < 0 && b >= 0) rising.push(t[i - 1] + ((t[i] - t[i - 1]) * -a) / (b - a))
    // Time above mid, splitting an interval at its crossing.
    if (a > 0 && b > 0) above += t[i] - t[i - 1]
    else if (a > 0 !== b > 0) above += ((t[i] - t[i - 1]) * Math.max(a, b)) / Math.abs(b - a)
  }
  rising = rising.filter((r, i) => i === 0 || r > rising[i - 1])
  const frequency = rising.length >= 2 ? (rising.length - 1) / (rising.at(-1)! - rising[0]) : null
  const first = y[0]
  const last = y[n - 1]
  const step = last - first
  let overshoot: number | null = null
  let settling: number | null = null
  if (max > min && Math.abs(step) > 1e-9 * (max - min)) {
    overshoot = Math.max(0, (step > 0 ? max - last : last - min) / Math.abs(step))
    const band = 0.02 * Math.abs(step)
    let lastOut = -1
    for (let i = 0; i < n; i++) if (Math.abs(y[i] - last) > band) lastOut = i
    settling = lastOut < 0 ? 0 : t[Math.min(n - 1, lastOut + 1)] - t[0]
  }
  return { min, max, peak: Math.max(Math.abs(min), Math.abs(max)), peakToPeak: max - min, mean: area / span, rms: Math.sqrt(square / span), frequency, duty: above / span, overshoot, settling }
}

/** The live table's column for a lower-case variable name (`body.port.t` is column `body$port$T`), or -1. */
export function columnOf(header: LiveTable, variable: string): number {
  return header.vars.findIndex((v, i) => i > 0 && v.toLowerCase().replaceAll('$', '.') === variable)
}

/** The live table's columns that belong to `block` (`body.port.t` for block `body`), as lower-case dotted names. */
export function liveColumnsOf(header: LiveTable, block: string): string[] {
  const prefix = `${block.toLowerCase()}.`
  return header.vars.slice(1).map((v) => v.toLowerCase().replaceAll('$', '.')).filter((v) => v.startsWith(prefix))
}
