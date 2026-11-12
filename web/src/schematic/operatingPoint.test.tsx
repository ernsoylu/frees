// Phase M4: operating-point cards — the curve from a block's parameters (or its
// map table), rebuilt only when they change, and the point the values give.

import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { afterEach, expect, it, vi } from 'vitest'
import type { ComponentParamResult } from '../api'
import { curveExtent, curveSpec, niceCeil } from './operatingPoint'
import OperatingPointChart from './OperatingPointChart'
import { indexVariables } from './readouts'

vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
afterEach(cleanup)

const p = (name: string, ref: string, value: number | null = Number(ref)): ComponentParamResult => ({ name, ref, value })
const none = indexVariables([])
const reader = (m: Record<string, number>) => (k: string) => m[k]

it('draws a fan curve from dP0 and Q0, to its free-delivery flow, and reads its point', () => {
  const spec = curveSpec('FanCurve', [p('rho', '1.2'), p('dp0', '500'), p('q0', '1.5')], none)!
  expect('f' in spec.curve && spec.curve.f(0.75)).toBe(375)
  expect('f' in spec.curve && spec.curve.f(1.5)).toBe(0)
  expect(spec.xmax).toBe(1.5)
  expect(spec.point(reader({ q: 0.7506, dp: 374.79 }))).toEqual([0.7506, 374.79])
  expect(spec.point(reader({ q: 0.7506 }))).toBeNull()
})

it('draws a valve at its present opening, from a live or solved value of the variable it is bound to', () => {
  const params = [p('cv', '0.01'), p('rho', '1000'), p('u', 'u_v', 0.5), p('model$', 'linear', null)]
  const solved = curveSpec('Valve', params, none)!
  // ṁ|ṁ| = (u·Cv)²·ρ·ΔP → ΔP = 1 / (0.005² · 1000) = 40 Pa at 1 kg/s.
  expect('f' in solved.curve && solved.curve.f(1)).toBeCloseTo(40, 9)
  const live = curveSpec('Valve', params, indexVariables([{ name: 'u_v', value: 1, units: '' }]))!
  expect('f' in live.curve && live.curve.f(1)).toBeCloseTo(10, 9)
  expect(live.key).not.toBe(solved.key)
  expect(live.title).toBe('Valve at u = 1')
  expect(live.point(reader({ 'in.mdot': 2, 'in.p': 3e5, 'out.p': 2.5e5 }))).toEqual([2, 5e4])
  // Equal-percentage: Cv·R^(u−1).
  const eq = curveSpec('Valve', [p('cv', '0.01'), p('rho', '1000'), p('u', '0'), p('r', '50'), p('model$', 'eqpct', null)], none)!
  expect('f' in eq.curve && eq.curve.f(1)).toBeCloseTo(1 / ((0.01 / 50) ** 2 * 1000), 6)
  // A valve whose opening the solve did not resolve has no curve.
  expect(curveSpec('Valve', [p('cv', '0.01'), p('rho', '1000'), p('u', 'u_x', null), p('model$', 'linear', null)], none)).toBeNull()
})

it('reads a map pump through its table, and takes its extent from the point in 1-2-5 steps', () => {
  const spec = curveSpec('PumpMap', [p('rho', '998'), p('map$', 'hmap', null)], none)!
  expect(spec.curve).toEqual({ table: 'hmap' })
  expect(spec.y).toEqual({ label: 'head', unit: 'm' })
  expect(curveExtent(spec, [0.01, 20])).toBe(0.02)
  expect(curveExtent(spec, [0.011, 20])).toBe(0.05)
  expect([niceCeil(0.3), niceCeil(1), niceCeil(7), niceCeil(0)]).toEqual([0.5, 1, 10, 1])
  // Not a name: no table call is built from it.
  expect(curveSpec('PumpMap', [p('map$', 'x); y(', null)], none)).toBeNull()
  expect(curveSpec('Pipe', [], none)).toBeNull()
})

it('evaluates a map table once per extent, and moves only the point as the values change', async () => {
  const spec = curveSpec('PumpMap', [p('rho', '998'), p('map$', 'hmap', null)], none)!
  const evaluate = vi.fn(async (_: string, x: number) => 25 - 500 * x)
  const { rerender } = render(<MantineProvider><OperatingPointChart spec={spec} at={[0.01, 20]} evaluate={evaluate} /></MantineProvider>)
  await waitFor(() => expect(document.querySelector('[data-curve]')).toHaveAttribute('data-curve', '41'))
  expect(evaluate).toHaveBeenCalledTimes(41)
  expect(evaluate).toHaveBeenCalledWith('hmap', 0.02)
  rerender(<MantineProvider><OperatingPointChart spec={spec} at={[0.009, 20.5]} evaluate={evaluate} /></MantineProvider>)
  expect(document.querySelector('[data-point]')).toHaveAttribute('data-point', '0.009,20.5')
  expect(screen.getByRole('img', { name: 'Pump curve: Q = 0.009 m^3/s, head = 20.5 m' })).toBeInTheDocument()
  expect(evaluate).toHaveBeenCalledTimes(41)
})
