import { expect, it } from 'vitest'
import { buildFigure, type FigureInputs } from './PlotCard'
import { newPlotSpec } from './types'
import { plotDefToSpec } from './fromCode'
import { resolvePlotSource } from './sources'
import type { TableSpec } from '../tables'
import type { DiagramResponse, PsychartResponse } from '../api'

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

it('draws a dynamic run as a path on property and psychrometric diagrams (M1b)', () => {
  const spec = plotDefToSpec({ name: 'Start-up', attributes: { kind: ['property'], diagram: ['ph'], fluid: ['R134a'], x: ['h_1', 'h_2'], y: ['P_e', 'P_c'] } })
  expect(spec.property.trajectory).toEqual([{ x: 'h_1', y: 'P_e' }, { x: 'h_2', y: 'P_c' }])
  const table = { id: 'ode', name: 'run', kind: 'parametric', origin: 'ode', vars: ['time', 'h_1', 'P_e', 'h_2', 'P_c'], rows: [], results: [] } as unknown as TableSpec
  const source = resolvePlotSource(spec, [table], [])
  expect(source).toMatchObject({ kind: 'table', tableId: 'ode' })
  const tableRows = [[400e3, 3e5], [402e3, 2.5e5]].map(([h, p], i) => ({ id: String(i), values: { h_1: String(h), P_e: String(p), h_2: String(h + 30e3), P_c: String(1e6) } }))
  const diagram: DiagramResponse = { fluid: 'R134a', kind: 'ph', xProperty: 'h', yProperty: 'P', xLog: false, yLog: true, dome: [], isolines: [], markers: [] }
  const figure = buildFigure({ ...spec, source }, { ...inputs, diagram, tableRows })!
  const path = figure.data.find((t) => t.uid === 'path_P_e vs h_1')!
  // h in kJ/kg and P in kPa on the default axes; the marker sits on the last row.
  expect(path).toMatchObject({ x: [400, 402], y: [300, 250] })
  expect(figure.data.find((t) => t.uid === 'path_end_P_e vs h_1')).toMatchObject({ x: [402], y: [250] })
  expect(figure.data.some((t) => t.uid === 'path_P_c vs h_2')).toBe(true)
  // Unbound, the diagram draws no path.
  expect(buildFigure(spec, { ...inputs, diagram, tableRows })!.data.some((t) => String(t.uid).startsWith('path_'))).toBe(false)

  const air = plotDefToSpec({ name: 'Mixing', attributes: { kind: ['psychro'], x: ['T_mix'], y: ['w_mix'] } })
  const airRows = [{ id: '0', values: { T_mix: '293.15', w_mix: '0.008' } }]
  const psychart: PsychartResponse = { pressure: 101325, tMin: 273.15, tMax: 323.15, curves: [] }
  const chart = buildFigure({ ...air, source: { kind: 'table', tableId: 'ode', data: 'inputs' } }, { ...inputs, psychart, tableRows: airRows })!
  expect(chart.data.find((t) => t.uid === 'path_w_mix vs T_mix')).toMatchObject({ x: [20], y: [0.008] })
  expect(plotDefToSpec({ name: 'Odd', attributes: { kind: ['psychro'], x: ['T_mix', 'T_out'], y: ['w_mix'] } }).codeDiagnostics).toEqual([
    "PLOT 'Odd': 2 x= and 1 y= do not pair up; the extra ones are ignored",
  ])
})
