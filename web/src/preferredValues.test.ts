import { expect, it } from 'vitest'
import { defaultSeries, seriesOptions, stepPreferred } from './preferredValues'

it('steps E-series values across decades, from on-series and off-series values', () => {
  expect(stepPreferred(4.7, 'e12', 'kohm', 1)).toBe(5.6)
  expect(stepPreferred(8.2, 'e12', 'ohm', 1)).toBe(10)
  expect(stepPreferred(1000, 'e24', 'ohm', -1)).toBe(910)
  expect(stepPreferred(0.0012, 'e6', 'F', -1)).toBe(0.001)
  // Between two values, the next one in the direction asked.
  expect(stepPreferred(5, 'e24', 'ohm', 1)).toBe(5.1)
  expect(stepPreferred(5, 'e24', 'ohm', -1)).toBe(4.7)
  expect(stepPreferred(0, 'e24', 'ohm', 1)).toBeNull()
  expect(stepPreferred(3, 'linear', 'ohm', 1)).toBeNull()
})

it('steps nominal pipe sizes and insulation thicknesses in the value’s length unit, and stops at the ends', () => {
  expect(stepPreferred(0.05, 'dn', 'm', 1)).toBe(0.065)
  expect(stepPreferred(0.06, 'dn', 'm', -1)).toBe(0.05)
  expect(stepPreferred(2.5, 'dn', 'cm', 1)).toBe(3.2)
  expect(stepPreferred(1.2, 'dn', 'm', 1)).toBeNull()
  expect(stepPreferred(25, 'insulation', 'mm', 1)).toBe(32)
  expect(stepPreferred(10, 'insulation', 'mm', -1)).toBeNull()
  expect(stepPreferred(0.05, 'dn', 'in', 1)).toBeNull()
})

it('picks a series by unit and name, and offers length series only for lengths', () => {
  expect(defaultSeries('R1', 'ohm')).toBe('e24')
  expect(defaultSeries('C', 'uF')).toBe('e24')
  expect(defaultSeries('L', 'henry')).toBe('e24')
  expect(defaultSeries('D', 'm')).toBe('dn')
  expect(defaultSeries('pipe.D_h', 'm')).toBe('dn')
  expect(defaultSeries('t_ins', 'mm')).toBe('insulation')
  expect(defaultSeries('L', 'm')).toBe('linear')
  expect(defaultSeries('T', 'K')).toBe('linear')
  expect(seriesOptions('m')).toContain('dn')
  expect(seriesOptions('K')).toEqual(['linear', 'e6', 'e12', 'e24'])
})
