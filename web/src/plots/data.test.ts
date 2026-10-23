import { expect, it } from 'vitest'
import { buildFigure, type FigureInputs } from './PlotCard'
import { newPlotSpec } from './types'

const inputs: FigureInputs = { states: { indices: [], columns: [], values: {} }, tableRows: [], tableResults: [], diagram: null, psychart: null, theme: 'dark' }
it('preserves traversal order, failed rows and original row identities', () => {
  const spec = { ...newPlotSpec('xy', 'path'), source: { kind: 'table' as const, tableId: 'table', data: 'solved' as const } }
  spec.xy = { xVar: 'x', yVars: ['y'] }
  const figure = buildFigure(spec, { ...inputs, tableRows: [3, 1, 2].map((x) => ({ id: String(x), values: { x: String(x), y: '4' } })), tableResults: [{ success: true, values: { x: 3, y: 4 }, error: null }, { success: false, values: {}, error: 'failed' }, { success: true, values: { x: 2, y: 4 }, error: null }] })!
  expect(figure.data[0]).toMatchObject({ x: [3, Number.NaN, 2], customdata: ['3', '1', '2'], connectgaps: false })
})

it('renders Y-only histogram samples and aligns array mesh channels by index', () => {
  const spec = { ...newPlotSpec('xy', 'samples'), source: { kind: 'arrays' as const } }
  spec.xy = { xVar: null, yVars: ['y'], chartType: 'histogram' }
  const variables = Object.entries({ 'x[1]': 0, 'x[2]': 1, 'x[3]': 0, 'y[1]': 0, 'y[2]': 0, 'y[3]': 1, 'z[1]': 2, 'z[2]': 3, 'z[3]': 4 }).map(([name, value]) => ({ name, value, units: '' }))
  expect(buildFigure(spec, { ...inputs, variables })!.data[0]).toMatchObject({ type: 'histogram', x: [0, 0, 1] })
  spec.xy = { xVar: 'x', yVars: ['y'], zVar: 'z', chartType: 'surface3d' }
  expect(buildFigure(spec, { ...inputs, variables })!.data[0]).toMatchObject({ type: 'mesh3d', x: [0, 1, 0], y: [0, 0, 1], z: [2, 3, 4] })
  expect(buildFigure(spec, { ...inputs, variables: variables.filter((v) => v.name !== 'z[2]') })!.data).toHaveLength(0)
})

it('labels a shared Y unit only when every series knows it', () => {
  const spec = { ...newPlotSpec('xy', 'units'), source: { kind: 'table' as const, tableId: 'table', data: 'inputs' as const } }
  spec.xy = { xVar: 'x', yVars: ['p', 'q'] }
  const tableRows = [1, 2].map((i) => ({ id: String(i), values: { x: String(i), p: String(i), q: String(i) } }))
  const yTitle = (tableUnits: Record<string, string>) => JSON.stringify((buildFigure(spec, { ...inputs, tableRows, tableUnits })!.layout as { yaxis: unknown }).yaxis)
  expect(yTitle({ x: 's', p: 'kPa' })).not.toContain('kPa')
  expect(yTitle({ x: 's', p: 'kPa', q: 'kPa' })).toContain('[kPa]')
})

it('draws the right Y axis logarithmic only when asked', () => {
  const spec = { ...newPlotSpec('xy', 'dual'), source: { kind: 'table' as const, tableId: 'table', data: 'inputs' as const } }
  spec.xy = { xVar: 'x', yVars: ['p'], y2Vars: ['q'] }
  const tableRows = [1, 2].map((i) => ({ id: String(i), values: { x: String(i), p: String(i), q: String(10 ** i) } }))
  const layout = () => buildFigure(spec, { ...inputs, tableRows })!.layout as { yaxis2: { type: string }; uirevision: string }
  expect(layout().yaxis2.type).toBe('linear')
  const linearRevision = layout().uirevision
  spec.format = { ...spec.format, y2Log: true }
  expect(layout().yaxis2.type).toBe('log')
  expect(layout().uirevision).not.toBe(linearRevision)
})
