import { describe, expect, it } from 'vitest'
import Plotly from './plotlyBundle'
import { buildXYFigure } from './figure'
import { CHART_TYPE_OPTIONS } from './PlotConfigModal'
import { defaultFormat, type ChartType } from './types'

const validate = (Plotly as unknown as { validate: (data: unknown[], layout: unknown) => { code: string; msg: string }[] | undefined }).validate

// U05: a chart type the dialog offers must draw with the trace modules the
// bundle registers; an unregistered type renders an empty plot. "unused" only
// notes a shared layout key (cartesian axes) that a pie or 3D mesh never reads.
describe('the shipped Plotly bundle', () => {
  it.each(CHART_TYPE_OPTIONS.map((o) => o.value as ChartType))('validates every trace of a %s chart', (chartType) => {
    const series = [{ name: 'p', x: [1, 2, 3, 4, 5], y: [2, 4, 3, 5, 1], z: [1, 3, 2, 4, 5] }]
    const fig = buildXYFigure(series, defaultFormat('xy'), 'X', 'Y', 'dark', { chartType, xVar: 'x', yVars: ['p'], zVar: 'z' })
    expect(fig.data.length).toBeGreaterThan(0)
    const errors = (validate(fig.data, fig.layout) ?? []).filter((e) => e.code !== 'unused')
    expect(errors.map((e) => `${e.code}: ${e.msg}`)).toEqual([])
  })
})
