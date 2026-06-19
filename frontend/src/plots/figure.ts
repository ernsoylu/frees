import type {
  PlotlyAxisLayout,
  PlotlyFigure,
  PlotlyLayout,
  PlotlyTrace,
} from 'plotly.js-dist-min'
import { DiagramCurve, DiagramResponse, PsychartResponse } from '../api'
import { PlotFormat, PropertyConfig, PsychroConfig, XYConfig } from './types'
import { StateTable, statesForAxes } from './stateTable'
import { UnitChoice, resolveUnit } from './units'

/**
 * Builds Plotly figures for every plot kind in one place so the on-screen
 * dark theme and the publication light theme stay consistent.
 */

export type PlotTheme = 'dark' | 'light'

interface ThemeColors {
  font: string
  grid: string
  zero: string
  dome: string
  states: string
}

const THEMES: Record<PlotTheme, ThemeColors> = {
  dark: {
    font: '#c1c2c5',
    grid: '#373A40',
    zero: '#5c5f66',
    dome: '#e9ecef',
    states: '#ffa94b',
  },
  light: {
    font: '#212529',
    grid: '#d4d7da',
    zero: '#9aa0a6',
    dome: '#212529',
    states: '#e8590c',
  },
}

interface FamilyStyle {
  color: string
  width: number
  dash: 'solid' | 'dot' | 'dash' | 'dashdot'
}

const FAMILY_STYLES: Record<string, FamilyStyle> = {
  quality: { color: '#868e96', width: 1, dash: 'dot' },
  isobar: { color: '#4dabf7', width: 1, dash: 'solid' },
  isotherm: { color: '#ff6b6b', width: 1, dash: 'solid' },
  isentrope: { color: '#38d9a9', width: 1, dash: 'dash' },
  rh: { color: '#4dabf7', width: 1, dash: 'solid' },
  wetbulb: { color: '#38d9a9', width: 1, dash: 'dash' },
  enthalpy: { color: '#ffa94b', width: 1, dash: 'dot' },
  volume: { color: '#b197fc', width: 1, dash: 'dashdot' },
}

/** Axis title with the active display unit, e.g. "P [kPa]". */
function axisTitle(property: string, unit: UnitChoice): string {
  const name = property === 'w' ? 'Humidity ratio ω' : property
  return `${name} [${unit.label}]`
}

function transformAxis(
  values: (number | null)[],
  scale: number,
  offset: number,
): (number | null)[] {
  return values.map((value) => (value === null ? null : value * scale + offset))
}

function curveTrace(
  curve: DiagramCurve,
  style: FamilyStyle,
  xScale: number,
  xOffset: number,
  yScale: number,
  yOffset: number,
): PlotlyTrace {
  return {
    type: 'scatter',
    mode: 'lines',
    name: curve.label,
    x: transformAxis(curve.x, xScale, xOffset),
    y: transformAxis(curve.y, yScale, yOffset),
    line: { color: style.color, width: style.width, dash: style.dash },
    showlegend: false,
    hoverinfo: 'name+x+y',
  }
}

/** Axis range bound in plot coordinates; log axes take the exponent. */
function rangeValue(value: number | null | undefined, log: boolean): number | null {
  if (value === null || value === undefined) return null
  return log ? Math.log10(Math.max(value, 1e-20)) : value
}

function axisLayout(
  label: string,
  log: boolean,
  format: PlotFormat,
  colors: ThemeColors,
  min: number | null | undefined,
  max: number | null | undefined,
  tick: number | null | undefined,
): PlotlyAxisLayout {
  const layout: PlotlyAxisLayout = {
    title: { text: label },
    type: log ? 'log' : 'linear',
    gridcolor: colors.grid,
    zerolinecolor: colors.zero,
    color: colors.font,
    showgrid: format.grid,
    exponentformat: 'power',
  }

  const rMin = rangeValue(min, log)
  const rMax = rangeValue(max, log)
  if (rMin !== null || rMax !== null) {
    ;(layout as any).range = [rMin, rMax]
  }

  if (tick !== null && tick !== undefined && tick > 0) {
    ;(layout as any).dtick = tick
  }

  return layout
}

function baseLayout(
  format: PlotFormat,
  xLabel: string,
  yLabel: string,
  xLog: boolean,
  yLog: boolean,
  theme: PlotTheme,
): PlotlyLayout {
  const colors = THEMES[theme]
  const background = theme === 'dark' ? 'rgba(0,0,0,0)' : '#ffffff'
  return {
    title: format.title ? { text: format.title } : undefined,
    paper_bgcolor: background,
    plot_bgcolor: background,
    font: { color: colors.font, size: format.fontSize },
    margin: { t: format.title ? 48 : 24, r: 16, b: 56, l: 64 },
    xaxis: axisLayout(format.xLabel || xLabel, xLog, format, colors, format.xMin, format.xMax, format.xTick),
    yaxis: axisLayout(format.yLabel || yLabel, yLog, format, colors, format.yMin, format.yMax, format.yTick),
    showlegend: format.legend,
    legend: legendLayout(format.legendAlign),
  }
}

/** Horizontal legend anchored per the configured alignment (default center). */
function legendLayout(align: 'left' | 'center' | 'right' | undefined) {
  const x = align === 'left' ? 0 : align === 'right' ? 1 : 0.5
  const xanchor = align ?? 'center'
  return { orientation: 'h' as const, bgcolor: 'rgba(0,0,0,0)', x, xanchor }
}

interface StateOverlay {
  xProperty: string
  yProperty: string
  connect: boolean
  close: boolean
}

/** Line trace joining the state points: the solver's cycle path when present, else the points in order. */
function connectionTrace(
  overlay: StateOverlay,
  points: { x: number; y: number }[],
  cyclePath: Record<string, number>[] | undefined,
  color: string,
  xUnit: UnitChoice,
  yUnit: UnitChoice,
): PlotlyTrace | null {
  let name = 'Cycle Connections'
  let linePoints = overlay.close && points.length > 2 ? [...points, points[0]] : points

  if (cyclePath && cyclePath.length > 0) {
    name = 'Cycle Path'
    linePoints = cyclePath
      .map((pt) => ({ x: pt[overlay.xProperty], y: pt[overlay.yProperty] }))
      .filter((p): p is { x: number; y: number } => p.x !== undefined && p.y !== undefined)
    if (linePoints.length === 0) return null
  }

  return {
    type: 'scatter',
    mode: 'lines',
    name,
    x: linePoints.map((p) => p.x * xUnit.scale + xUnit.offset),
    y: linePoints.map((p) => p.y * yUnit.scale + yUnit.offset),
    line: { color, width: 2 },
    showlegend: false,
    hoverinfo: 'none',
  }
}

function stateTraces(
  overlay: StateOverlay,
  states: StateTable,
  colors: ThemeColors,
  xUnit: UnitChoice,
  yUnit: UnitChoice,
  customStateColor?: string,
  cyclePath?: Record<string, number>[],
): PlotlyTrace[] {
  const points = statesForAxes(states, overlay.xProperty, overlay.yProperty)
  if (points.length === 0) return []

  const traces: PlotlyTrace[] = []
  const stateColor = customStateColor || colors.states

  if (overlay.connect) {
    const connection = connectionTrace(overlay, points, cyclePath, stateColor, xUnit, yUnit)
    if (connection) {
      traces.push(connection)
    }
  }

  traces.push({
    type: 'scatter',
    mode: 'markers+text',
    name: 'States',
    x: points.map((p) => p.x * xUnit.scale + xUnit.offset),
    y: points.map((p) => p.y * yUnit.scale + yUnit.offset),
    marker: { color: stateColor, size: 9 },
    text: points.map((p) => String(p.index)),
    textposition: 'top right',
    textfont: { color: stateColor },
    showlegend: true,
  })

  return traces
}

export function buildPropertyFigure(
  diagram: DiagramResponse,
  config: PropertyConfig,
  format: PlotFormat,
  states: StateTable,
  theme: PlotTheme,
  cyclePath?: Record<string, number>[],
): PlotlyFigure {
  const colors = THEMES[theme]
  const xUnit = resolveUnit(diagram.xProperty, format.xUnit, format.celsius)
  const yUnit = resolveUnit(diagram.yProperty, format.yUnit, format.celsius)

  const traces: PlotlyTrace[] = []
  for (const curve of diagram.isolines) {
    if (curve.family === 'quality' && !config.quality) continue
    if (curve.family !== 'quality' && !config.isolines) continue
    const style = FAMILY_STYLES[curve.family] ?? FAMILY_STYLES.isobar
    traces.push(curveTrace(curve, style, xUnit.scale, xUnit.offset, yUnit.scale, yUnit.offset))
  }
  for (const dome of diagram.dome) {
    traces.push({
      ...curveTrace(
        dome,
        { color: colors.dome, width: 2.5, dash: 'solid' },
        xUnit.scale,
        xUnit.offset,
        yUnit.scale,
        yUnit.offset,
      ),
      showlegend: true,
    })
  }
  if (config.overlayStates) {
    const customStateColor = format.lineColors?.['states']
    traces.push(
      ...stateTraces(
        {
          xProperty: diagram.xProperty,
          yProperty: diagram.yProperty,
          connect: config.connectStates,
          close: config.closeCycle,
        },
        states,
        colors,
        xUnit,
        yUnit,
        customStateColor,
        cyclePath,
      ),
    )
  }

  const layout = baseLayout(
    format,
    axisTitle(diagram.xProperty, xUnit),
    axisTitle(diagram.yProperty, yUnit),
    format.xLog ?? diagram.xLog,
    format.yLog ?? diagram.yLog,
    theme,
  )
  layout.title ??= { text: `${diagram.fluid}` }
  return { data: traces, layout }
}

export function buildPsychroFigure(
  chart: PsychartResponse,
  config: PsychroConfig,
  format: PlotFormat,
  states: StateTable,
  theme: PlotTheme,
  cyclePath?: Record<string, number>[],
): PlotlyFigure {
  const colors = THEMES[theme]
  const xUnit = resolveUnit('T', format.xUnit, format.celsius)
  const yUnit = resolveUnit('w', format.yUnit, false)
  const traces: PlotlyTrace[] = []
  for (const curve of chart.curves) {
    if (curve.family === 'wetbulb' && !config.wetBulb) continue
    if (curve.family === 'enthalpy' && !config.enthalpy) continue
    if (curve.family === 'volume' && !config.volume) continue
    const saturation = curve.family === 'saturation'
    const style: FamilyStyle = saturation
      ? { color: colors.dome, width: 2.5, dash: 'solid' }
      : (FAMILY_STYLES[curve.family] ?? FAMILY_STYLES.rh)
    const trace = curveTrace(curve, style, xUnit.scale, xUnit.offset, yUnit.scale, yUnit.offset)
    trace.showlegend = saturation
    traces.push(trace)
  }
  if (config.overlayStates) {
    const customStateColor = format.lineColors?.['states']
    traces.push(
      ...stateTraces(
        { xProperty: 'T', yProperty: 'w', connect: config.connectStates, close: false },
        states,
        colors,
        xUnit,
        yUnit,
        customStateColor,
        cyclePath,
      ),
    )
  }
  const layout = baseLayout(
    format,
    `Dry-bulb temperature [${xUnit.label}]`,
    axisTitle('w', yUnit),
    format.xLog ?? false,
    format.yLog ?? false,
    theme,
  )
  layout.title ??= {
    text: `Psychrometric chart — ${(chart.pressure / 1000).toFixed(2)} kPa`,
  }
  return { data: traces, layout }
}

export interface XYSeries {
  name: string
  x: number[]
  y: number[]
  z?: number[]
  size?: number[]
  /** Which Y axis the series belongs to; 'y2' is the secondary right axis. */
  axis?: 'y' | 'y2'
}

function scaleSizes(values: number[]): number[] {
  const min = Math.min(...values)
  const max = Math.max(...values)
  if (max === min) return values.map(() => 15)
  return values.map((v) => 8 + ((v - min) / (max - min)) * 32)
}

export function buildXYFigure(
  series: XYSeries[],
  format: PlotFormat,
  xLabel: string,
  yLabel: string,
  theme: PlotTheme,
  config?: XYConfig,
): PlotlyFigure {
  const chartType = config?.chartType || 'line'
  const traces: PlotlyTrace[] = []

  if (chartType === 'pie') {
    if (series.length > 0) {
      const s = series[0]
      traces.push({
        type: 'pie',
        labels: s.x.map(String),
        values: s.y,
        name: s.name,
        textposition: 'inside',
        hoverinfo: 'label+value+percent',
      })
    }
  } else if (chartType === 'histogram') {
    series.forEach((s) => {
      traces.push({
        type: 'histogram',
        x: s.y,
        name: s.name,
        opacity: 0.75,
        marker: { color: format.lineColors?.[s.name] || undefined },
      })
    })
  } else if (chartType === 'bar') {
    series.forEach((s) => {
      traces.push({
        type: 'bar',
        name: s.name,
        x: s.x.map((val) => val as any),
        y: s.y.map((val) => val as any),
        marker: { color: format.lineColors?.[s.name] || undefined },
        ...(s.axis === 'y2' ? { yaxis: 'y2' } : {}),
      } as PlotlyTrace)
    })
  } else if (chartType === 'scatter') {
    series.forEach((s) => {
      const markerSize = s.size && s.size.length > 0 ? scaleSizes(s.size) : 10
      traces.push({
        type: 'scatter',
        mode: 'markers',
        name: s.name,
        x: s.x,
        y: s.y,
        marker: {
          size: markerSize,
          color: format.lineColors?.[s.name] || undefined,
        },
        ...(s.axis === 'y2' ? { yaxis: 'y2' } : {}),
      } as PlotlyTrace)
    })
  } else if (chartType === 'surface3d') {
    series.forEach((s) => {
      if (s.z && s.z.length > 0) {
        traces.push({
          type: 'mesh3d',
          name: s.name,
          x: s.x,
          y: s.y,
          z: s.z,
          intensity: s.z,
          colorscale: 'Viridis',
          opacity: 0.8,
        })
      }
    })
  } else {
    // Default: 'line'
    series.forEach((s) => {
      traces.push({
        type: 'scatter',
        mode: 'lines+markers',
        name: s.name,
        x: s.x,
        y: s.y,
        line: { color: format.lineColors?.[s.name] || undefined },
        ...(s.axis === 'y2' ? { yaxis: 'y2' } : {}),
      } as PlotlyTrace)
    })
  }

  const layout = baseLayout(
    format,
    chartType === 'histogram' ? 'Value' : (format.xLabel || xLabel),
    chartType === 'histogram' ? 'Frequency' : (format.yLabel || yLabel),
    chartType === 'histogram' ? false : (format.xLog ?? false),
    chartType === 'histogram' ? false : (format.yLog ?? false),
    theme,
  )

  if (chartType === 'bar') {
    layout.barmode = 'group'
  }

  // Secondary right Y axis for the series tagged 'y2'.
  if (traces.some((t) => (t as any).yaxis === 'y2')) {
    const colors = THEMES[theme]
    const y2Names = series.filter((s) => s.axis === 'y2').map((s) => s.name)
    ;(layout as any).yaxis2 = {
      title: { text: format.y2Label || y2Names.join(', ') },
      overlaying: 'y',
      side: 'right',
      type: 'linear',
      color: colors.font,
      showgrid: false,
      exponentformat: 'power',
    }
    layout.margin = { ...layout.margin, r: 64 }
  }

  if (chartType === 'surface3d') {
    layout.scene = {
      xaxis: { title: format.xLabel || xLabel, color: THEMES[theme].font, gridcolor: THEMES[theme].grid },
      yaxis: { title: format.yLabel || yLabel, color: THEMES[theme].font, gridcolor: THEMES[theme].grid },
      zaxis: { title: config?.zVar || 'Z', color: THEMES[theme].font, gridcolor: THEMES[theme].grid },
    }
  }

  return { data: traces, layout }
}

export function buildBodeFigure(
  omega: number[],
  mag: number[],
  phase: number[],
  format: PlotFormat,
  theme: PlotTheme,
): PlotlyFigure {
  const colors = THEMES[theme]
  const background = theme === 'dark' ? 'rgba(0,0,0,0)' : '#ffffff'
  const traces: PlotlyTrace[] = [
    {
      type: 'scatter',
      mode: 'lines',
      name: 'Magnitude',
      x: omega,
      y: mag,
      yaxis: 'y2',
      line: { color: '#4dabf7', width: 2 },
      showlegend: false,
    },
    {
      type: 'scatter',
      mode: 'lines',
      name: 'Phase',
      x: omega,
      y: phase,
      yaxis: 'y',
      line: { color: '#ff6b6b', width: 2 },
      showlegend: false,
    },
  ]

  const layout: PlotlyLayout = {
    title: format.title ? { text: format.title } : undefined,
    paper_bgcolor: background,
    plot_bgcolor: background,
    font: { color: colors.font, size: format.fontSize },
    margin: { t: format.title ? 48 : 24, r: 24, b: 56, l: 64 },
    xaxis: {
      title: format.xLabel || 'Frequency [rad/s]',
      type: 'log',
      color: colors.font,
      gridcolor: colors.grid,
      zerolinecolor: colors.zero,
      showgrid: format.grid,
    },
    yaxis: {
      title: 'Phase [deg]',
      domain: [0.0, 0.45],
      color: colors.font,
      gridcolor: colors.grid,
      zerolinecolor: colors.zero,
      showgrid: format.grid,
    },
    yaxis2: {
      title: 'Magnitude [dB]',
      domain: [0.55, 1.0],
      color: colors.font,
      gridcolor: colors.grid,
      zerolinecolor: colors.zero,
      showgrid: format.grid,
    },
    showlegend: false,
  }

  return { data: traces, layout }
}

export function buildNyquistFigure(
  real: number[],
  imag: number[],
  format: PlotFormat,
  theme: PlotTheme,
): PlotlyFigure {
  const colors = THEMES[theme]
  const background = theme === 'dark' ? 'rgba(0,0,0,0)' : '#ffffff'
  const traces: PlotlyTrace[] = [
    {
      type: 'scatter',
      mode: 'lines',
      name: 'Nyquist Curve',
      x: real,
      y: imag,
      line: { color: '#38d9a9', width: 2 },
      hoverinfo: 'x+y',
    },
    {
      type: 'scatter',
      mode: 'markers',
      name: 'Critical Point (-1+j0)',
      x: [-1.0],
      y: [0.0],
      marker: { symbol: 'x', color: '#ff6b6b', size: 12 },
      hoverinfo: 'name',
    },
  ]

  const layout: PlotlyLayout = {
    title: format.title ? { text: format.title } : undefined,
    paper_bgcolor: background,
    plot_bgcolor: background,
    font: { color: colors.font, size: format.fontSize },
    margin: { t: format.title ? 48 : 24, r: 24, b: 56, l: 64 },
    xaxis: {
      title: format.xLabel || 'Real Axis',
      color: colors.font,
      gridcolor: colors.grid,
      zerolinecolor: colors.zero,
      showgrid: format.grid,
    },
    yaxis: {
      title: format.yLabel || 'Imaginary Axis',
      scaleanchor: 'x',
      color: colors.font,
      gridcolor: colors.grid,
      zerolinecolor: colors.zero,
      showgrid: format.grid,
    },
    showlegend: format.legend,
    legend: legendLayout(format.legendAlign),
  }

  return { data: traces, layout }
}

export function buildPoleZeroFigure(
  pr: number[],
  pi: number[],
  zr: number[],
  zi: number[],
  format: PlotFormat,
  theme: PlotTheme,
): PlotlyFigure {
  const colors = THEMES[theme]
  const background = theme === 'dark' ? 'rgba(0,0,0,0)' : '#ffffff'
  const traces: PlotlyTrace[] = []

  if (pr.length > 0) {
    traces.push({
      type: 'scatter',
      mode: 'markers',
      name: 'Poles',
      x: pr,
      y: pi,
      marker: { symbol: 'x', size: 10, color: '#ff6b6b' },
      hoverinfo: 'name+x+y',
    })
  }

  if (zr.length > 0) {
    traces.push({
      type: 'scatter',
      mode: 'markers',
      name: 'Zeros',
      x: zr,
      y: zi,
      marker: {
        symbol: 'circle',
        size: 10,
        color: background,
        line: { width: 2, color: '#4dabf7' },
      },
      hoverinfo: 'name+x+y',
    })
  }

  const layout: PlotlyLayout = {
    title: format.title ? { text: format.title } : undefined,
    paper_bgcolor: background,
    plot_bgcolor: background,
    font: { color: colors.font, size: format.fontSize },
    margin: { t: format.title ? 48 : 24, r: 24, b: 56, l: 64 },
    xaxis: {
      title: format.xLabel || 'Real Axis [1/s]',
      color: colors.font,
      gridcolor: colors.grid,
      zerolinecolor: colors.zero,
      showgrid: format.grid,
    },
    yaxis: {
      title: format.yLabel || 'Imaginary Axis [rad/s]',
      scaleanchor: 'x',
      color: colors.font,
      gridcolor: colors.grid,
      zerolinecolor: colors.zero,
      showgrid: format.grid,
    },
    showlegend: format.legend,
    legend: legendLayout(format.legendAlign),
  }

  return { data: traces, layout }
}
