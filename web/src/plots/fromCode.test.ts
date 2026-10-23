import { expect, it } from 'vitest'
import { plotDefToSpec } from './fromCode'

it('reports unknown kinds, chart types, booleans and ignored slices', () => {
  const spec = plotDefToSpec({
    name: 'Cycle',
    attributes: {
      kind: ['heatmap'],
      type: ['violin'],
      x: ['T[2:5]'],
      y: ['P'],
      grid: ['sometimes'],
    },
  })
  expect(spec.kind).toBe('xy')
  expect(spec.xy.chartType).toBe('line')
  expect(spec.format.grid).toBe(true)
  expect(spec.codeDiagnostics).toEqual([
    "PLOT 'Cycle': kind=heatmap is not supported; drawn as XY",
    "PLOT 'Cycle': x=T[2:5] slice is ignored; the whole array is plotted",
    "PLOT 'Cycle': type=violin is not supported; drawn as a line",
    "PLOT 'Cycle': grid=sometimes is not a recognised boolean",
  ])
})

it('keeps a valid declaration silent', () => {
  const spec = plotDefToSpec({
    name: 'Line',
    attributes: { kind: ['xy'], x: ['t'], y: ['y'], type: ['scatter'], grid: ['off'] },
  })
  expect(spec.xy.chartType).toBe('scatter')
  expect(spec.format.grid).toBe(false)
  expect(spec.codeDiagnostics).toBeUndefined()
})

it('maps y2log onto the right axis', () => {
  const spec = plotDefToSpec({ name: 'Dual', attributes: { x: ['t'], y: ['p'], y2: ['q'], y2log: ['on'] } })
  expect(spec.xy.y2Vars).toEqual(['q'])
  expect(spec.format.y2Log).toBe(true)
  expect(spec.codeDiagnostics).toBeUndefined()
})
