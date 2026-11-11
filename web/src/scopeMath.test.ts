import { expect, it } from 'vitest'
import { buckets, detrend, measure, resample } from './scopeMath'

const grid = (n: number, dt: number) => Array.from({ length: n }, (_, i) => i * dt)

it('measures a sine: mean, RMS, frequency and a half duty', () => {
  const t = grid(2001, 0.001)
  const y = t.map((s) => 2 + 3 * Math.sin(2 * Math.PI * 5 * s))
  const m = measure(t, y)!
  expect(m.mean).toBeCloseTo(2, 3)
  expect(m.rms).toBeCloseTo(Math.sqrt(4 + 4.5), 3)
  expect(m.peakToPeak).toBeCloseTo(6, 3)
  expect(m.peak).toBeCloseTo(5, 3)
  expect(m.frequency).toBeCloseTo(5, 2)
  expect(m.duty).toBeCloseTo(0.5, 2)
})

it('measures a square wave duty and a second-order step response', () => {
  const t = grid(1001, 0.01)
  const square = t.map((s) => ((s % 1) < 0.3 ? 1 : 0))
  expect(measure(t, square)!.duty).toBeCloseTo(0.3, 1)
  expect(measure(t, square)!.frequency).toBeCloseTo(1, 2)

  // ζ = 0.3, ωn = 4: overshoot exp(−πζ/√(1−ζ²)) = 37.2 %, 2 % settling near 4/(ζωn) = 3.3 s.
  const [z, w] = [0.3, 4]
  const wd = w * Math.sqrt(1 - z * z)
  const step = t.map((s) => 1 - Math.exp(-z * w * s) * (Math.cos(wd * s) + (z / Math.sqrt(1 - z * z)) * Math.sin(wd * s)))
  const m = measure(t, step)!
  expect(m.overshoot).toBeCloseTo(Math.exp((-Math.PI * z) / Math.sqrt(1 - z * z)), 2)
  expect(m.settling).toBeGreaterThan(2.5)
  expect(m.settling).toBeLessThan(3.5)
})

it('measures nothing without a span, and a flat trace has no step', () => {
  expect(measure([0], [1])).toBeNull()
  const flat = measure([0, 1, 2], [4, 4, 4])!
  expect([flat.overshoot, flat.settling, flat.frequency]).toEqual([null, null, null])
})

it('buckets keep each column’s extremes, apart from the samples', () => {
  const t = [0, 0.1, 0.2, 0.6, 0.7, 1]
  const y = [1, 5, 3, -2, 4, 0]
  const { min, max } = buckets(t, y, 0, 1, 2)
  expect(Array.from(min)).toEqual([1, -2])
  expect(Array.from(max)).toEqual([5, 4])
  expect(Number.isNaN(buckets([0.5], [1], 0, 1, 4).min[0])).toBe(true)
})

it('detrends a line exactly and resamples uneven rows uniformly', () => {
  const t = [0, 1, 3, 4]
  expect(detrend(t, t.map((s) => 2 * s + 1)).every((v) => Math.abs(v) < 1e-12)).toBe(true)
  const { values, dt } = resample(t, t.map((s) => 10 * s), 5)
  expect(dt).toBe(1)
  expect(Array.from(values)).toEqual([0, 10, 20, 30, 40])
})
