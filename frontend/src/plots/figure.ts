import type {
  PlotlyAxisLayout,
  PlotlyFigure,
  PlotlyLayout,
  PlotlyTrace,
} from 'plotly.js-basic-dist-min'
import { DiagramCurve, DiagramResponse, PsychartResponse } from '../api'
import { PlotFormat, PropertyConfig, PsychroConfig } from './types'
import { StateTable, statesForAxes } from './stateTable'

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

/** Display transform of an SI axis property: textbook kPa/kJ scaling. */
function axisScale(property: string): number {
  return property === 'P' || property === 'h' || property === 's' ? 1e-3 : 1
}

function axisOffset(property: string, celsius: boolean): number {
  return property === 'T' && celsius ? -273.15 : 0
}

export function axisDisplayLabel(property: string, celsius: boolean): string {
  switch (property) {
    case 'T':
      return celsius ? 'T [°C]' : 'T [K]'
    case 'P':
      return 'P [kPa]'
    case 'h':
      return 'h [kJ/kg]'
    case 's':
      return 's [kJ/kg·K]'
    case 'v':
      return 'v [m³/kg]'
    default:
      return property
  }
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

function axisLayout(
  label: string,
  log: boolean,
  format: PlotFormat,
  colors: ThemeColors,
): PlotlyAxisLayout {
  return {
    title: { text: label },
    type: log ? 'log' : 'linear',
    gridcolor: colors.grid,
    zerolinecolor: colors.zero,
    color: colors.font,
    showgrid: format.grid,
    exponentformat: 'power',
  }
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
    xaxis: axisLayout(format.xLabel || xLabel, xLog, format, colors),
    yaxis: axisLayout(format.yLabel || yLabel, yLog, format, colors),
    showlegend: format.legend,
    legend: { orientation: 'h', bgcolor: 'rgba(0,0,0,0)' },
  }
}

function stateTraces(
  diagram: DiagramResponse,
  config: PropertyConfig,
  states: StateTable,
  colors: ThemeColors,
  scales: { xScale: number; xOffset: number; yScale: number; yOffset: number },
): PlotlyTrace[] {
  const points = statesForAxes(states, diagram.xProperty, diagram.yProperty)
  if (points.length === 0) return []
  const looped =
    config.closeCycle && points.length > 2 ? [...points, points[0]] : points
  return [
    {
      type: 'scatter',
      mode: config.connectStates ? 'lines+markers+text' : 'markers+text',
      name: 'States',
      x: looped.map((p) => p.x * scales.xScale + scales.xOffset),
      y: looped.map((p) => p.y * scales.yScale + scales.yOffset),
      line: { color: colors.states, width: 2 },
      marker: { color: colors.states, size: 9 },
      text: looped.map((p) => String(p.index)),
      textposition: 'top right',
      textfont: { color: colors.states },
      showlegend: true,
    },
  ]
}

export function buildPropertyFigure(
  diagram: DiagramResponse,
  config: PropertyConfig,
  format: PlotFormat,
  states: StateTable,
  theme: PlotTheme,
): PlotlyFigure {
  const colors = THEMES[theme]
  const xScale = axisScale(diagram.xProperty)
  const yScale = axisScale(diagram.yProperty)
  const xOffset = axisOffset(diagram.xProperty, format.celsius)
  const yOffset = axisOffset(diagram.yProperty, format.celsius)

  const traces: PlotlyTrace[] = []
  for (const curve of diagram.isolines) {
    if (curve.family === 'quality' && !config.quality) continue
    if (curve.family !== 'quality' && !config.isolines) continue
    const style = FAMILY_STYLES[curve.family] ?? FAMILY_STYLES.isobar
    traces.push(curveTrace(curve, style, xScale, xOffset, yScale, yOffset))
  }
  for (const dome of diagram.dome) {
    traces.push({
      ...curveTrace(
        dome,
        { color: colors.dome, width: 2.5, dash: 'solid' },
        xScale,
        xOffset,
        yScale,
        yOffset,
      ),
      showlegend: true,
    })
  }
  if (config.overlayStates) {
    traces.push(
      ...stateTraces(diagram, config, states, colors, {
        xScale,
        xOffset,
        yScale,
        yOffset,
      }),
    )
  }

  const layout = baseLayout(
    format,
    axisDisplayLabel(diagram.xProperty, format.celsius),
    axisDisplayLabel(diagram.yProperty, format.celsius),
    format.xLog ?? diagram.xLog,
    format.yLog ?? diagram.yLog,
    theme,
  )
  if (!layout.title) {
    layout.title = { text: `${diagram.fluid}` }
  }
  return { data: traces, layout }
}

export function buildPsychroFigure(
  chart: PsychartResponse,
  config: PsychroConfig,
  format: PlotFormat,
  theme: PlotTheme,
): PlotlyFigure {
  const colors = THEMES[theme]
  const xOffset = format.celsius ? -273.15 : 0
  const traces: PlotlyTrace[] = []
  for (const curve of chart.curves) {
    if (curve.family === 'wetbulb' && !config.wetBulb) continue
    if (curve.family === 'enthalpy' && !config.enthalpy) continue
    if (curve.family === 'volume' && !config.volume) continue
    const saturation = curve.family === 'saturation'
    const style: FamilyStyle = saturation
      ? { color: colors.dome, width: 2.5, dash: 'solid' }
      : (FAMILY_STYLES[curve.family] ?? FAMILY_STYLES.rh)
    const trace = curveTrace(curve, style, 1, xOffset, 1, 0)
    trace.showlegend = saturation
    traces.push(trace)
  }
  const xLabel = format.celsius
    ? 'Dry-bulb temperature [°C]'
    : 'Dry-bulb temperature [K]'
  const layout = baseLayout(
    format,
    xLabel,
    'Humidity ratio ω [kg/kg dry air]',
    format.xLog ?? false,
    format.yLog ?? false,
    theme,
  )
  if (!layout.title) {
    layout.title = {
      text: `Psychrometric chart — ${(chart.pressure / 1000).toFixed(2)} kPa`,
    }
  }
  return { data: traces, layout }
}

export interface XYSeries {
  name: string
  x: number[]
  y: number[]
}

export function buildXYFigure(
  series: XYSeries[],
  format: PlotFormat,
  xLabel: string,
  yLabel: string,
  theme: PlotTheme,
): PlotlyFigure {
  const traces: PlotlyTrace[] = series.map((s) => ({
    type: 'scatter',
    mode: 'lines+markers',
    name: s.name,
    x: s.x,
    y: s.y,
  }))
  return {
    data: traces,
    layout: baseLayout(
      format,
      format.xLabel || xLabel,
      format.yLabel || yLabel,
      format.xLog ?? false,
      format.yLog ?? false,
      theme,
    ),
  }
}
