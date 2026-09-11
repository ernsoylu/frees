import { describe, expect, it } from 'vitest'
import { buildXYFigure, type XYSeries } from './figure'
import { buildFigure, type FigureInputs } from './PlotCard'
import { defaultFormat, newPlotSpec } from './types'

function getAxisTitle(title: unknown): string {
  if (typeof title === 'string') return title
  if (typeof title === 'object' && title !== null && 'text' in title) {
    return String((title as { text: unknown }).text)
  }
  return ''
}

describe('Phase 2.2: Advanced Scientific Plot Overlays & Interaction', () => {
  const defaultTheme = 'light' as const

  it('generates Box Plot traces with outliers and proper axis labels', () => {
    const series: XYSeries[] = [
      {
        name: 'temperature',
        x: [1, 1, 1, 1, 1],
        y: [20.1, 22.4, 21.8, 28.5, 21.2],
      },
    ]

    const fig = buildXYFigure(
      series,
      { ...defaultFormat('xy'), title: 'Box Plot Test' },
      'Group',
      'Temperature [degC]',
      defaultTheme,
      { chartType: 'box', xVar: null, yVars: ['temperature'] },
    )

    expect(fig.data.length).toBe(1)
    const trace = fig.data[0]
    expect(trace.type).toBe('box')
    expect(trace.name).toBe('temperature')
    expect(trace.y).toEqual([20.1, 22.4, 21.8, 28.5, 21.2])
    expect(trace.boxpoints).toBe('outliers')
    expect(getAxisTitle(fig.layout.xaxis?.title)).toBe('Category')
    expect(getAxisTitle(fig.layout.yaxis?.title)).toBe('Temperature [degC]')
  })

  it('generates grouped Box Plot traces when x category variable is present', () => {
    const series: XYSeries[] = [
      {
        name: 'yield',
        x: ['Batch A', 'Batch A', 'Batch B', 'Batch B'],
        y: [85.2, 88.1, 92.4, 94.0],
      },
    ]

    const fig = buildXYFigure(
      series,
      defaultFormat('xy'),
      'Batch',
      'Yield [%]',
      defaultTheme,
      { chartType: 'box', xVar: 'batch', yVars: ['yield'] },
    )

    expect(fig.data.length).toBe(1)
    const trace = fig.data[0]
    expect(trace.type).toBe('box')
    expect(trace.x).toEqual(['Batch A', 'Batch A', 'Batch B', 'Batch B'])
    expect(trace.y).toEqual([85.2, 88.1, 92.4, 94.0])
    expect(fig.layout.boxmode).toBe('group')
  })

  it('generates Empirical Cumulative Distribution Function (ECDF) step traces', () => {
    const series: XYSeries[] = [
      {
        name: 'pressure',
        x: [0, 1, 2, 3],
        y: [100, 105, 95, 110],
      },
    ]

    const fig = buildXYFigure(
      series,
      defaultFormat('xy'),
      'Sample Index',
      'Pressure [kPa]',
      defaultTheme,
      { chartType: 'ecdf', xVar: null, yVars: ['pressure'] },
    )

    expect(fig.data.length).toBe(1)
    const trace = fig.data[0]
    expect(trace.type).toBe('scatter')
    expect(trace.mode).toBe('lines')
    expect((trace.line as { shape?: string } | undefined)?.shape).toBe('hv') // step curve
    // Sorted sample values
    expect(trace.x).toEqual([95, 100, 105, 110])
    // Cumulative probabilities: 1/4, 2/4, 3/4, 4/4
    expect(trace.y).toEqual([0.25, 0.5, 0.75, 1.0])
    expect(getAxisTitle(fig.layout.yaxis?.title)).toBe('Cumulative Probability P(X ≤ x)')
    expect(fig.layout.yaxis?.rangemode).toBe('tozero')
  })

  it('renders translucent confidence / prediction ribbons atop data', () => {
    const series: XYSeries[] = [
      {
        name: 'fit',
        x: [0, 1, 2],
        y: [10, 20, 30],
      },
      {
        name: 'ci_lo',
        x: [0, 1, 2],
        y: [8, 17, 26],
        isRibbonLower: true,
      },
      {
        name: 'ci_hi',
        x: [0, 1, 2],
        y: [12, 23, 34],
        isRibbonUpper: true,
      },
    ]

    const fig = buildXYFigure(
      series,
      defaultFormat('xy'),
      'Time [s]',
      'Response',
      defaultTheme,
      {
        chartType: 'line',
        xVar: 'time',
        yVars: ['fit'],
        ribbonLowerVar: 'ci_lo',
        ribbonUpperVar: 'ci_hi',
      },
    )

    // Three traces: lower bound, upper bound (fill), and main fit line
    expect(fig.data.length).toBe(3)

    const lowerTrace = fig.data[0]
    expect(lowerTrace.type).toBe('scatter')
    expect(lowerTrace.line?.width).toBe(0)
    expect(lowerTrace.showlegend).toBe(false)
    expect(lowerTrace.hoverinfo).toBe('skip')

    const upperTrace = fig.data[1]
    expect(upperTrace.type).toBe('scatter')
    expect(upperTrace.fill).toBe('tonexty')
    expect(upperTrace.fillcolor).toBe('rgba(51, 154, 240, 0.2)')
    expect(upperTrace.name).toContain('CI Ribbon')

    const mainTrace = fig.data[2]
    expect(mainTrace.name).toBe('fit')
  })

  it('buildFigure renders box and ecdf charts without mandatory xVar', () => {
    const spec = newPlotSpec('xy', 'Test Box')
    spec.xy.chartType = 'box'
    spec.xy.xVar = null
    spec.xy.yVars = ['measured']
    spec.source = { kind: 'table', tableId: 't1', data: 'inputs' }

    const inputs: FigureInputs = {
      tableRows: [
        { id: '1', values: { measured: '10' } },
        { id: '2', values: { measured: '12' } },
        { id: '3', values: { measured: '15' } },
      ],
      tableResults: [],
      variables: [],
      states: { indices: [], columns: [], values: {} },
      tableUnits: { measured: 'V' },
      theme: defaultTheme,
    }

    const fig = buildFigure(spec, inputs)
    expect(fig).not.toBeNull()
    expect(fig!.data.length).toBe(1)
    expect(fig!.data[0].type).toBe('box')
  })
})
