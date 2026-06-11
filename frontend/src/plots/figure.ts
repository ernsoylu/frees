import type {
  PlotlyAxisLayout,
  PlotlyFigure,
  PlotlyLayout,
  PlotlyTrace,
} from 'plotly.js-basic-dist-min'
import { DiagramCurve, DiagramResponse, PsychartResponse } from '../api'
import { PlotFormat, PropertyConfig, PsychroConfig } from './types'
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

interface StateOverlay {
  xProperty: string
  yProperty: string
  connect: boolean
  close: boolean
}

function stateTraces(
  overlay: StateOverlay,
  states: StateTable,
  colors: ThemeColors,
  xUnit: UnitChoice,
  yUnit: UnitChoice,
): PlotlyTrace[] {
  const points = statesForAxes(states, overlay.xProperty, overlay.yProperty)
  if (points.length === 0) return []
  const looped =
    overlay.close && points.length > 2 ? [...points, points[0]] : points
  return [
    {
      type: 'scatter',
      mode: overlay.connect ? 'lines+markers+text' : 'markers+text',
      name: 'States',
      x: looped.map((p) => p.x * xUnit.scale + xUnit.offset),
      y: looped.map((p) => p.y * yUnit.scale + yUnit.offset),
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
  if (!layout.title) {
    layout.title = { text: `${diagram.fluid}` }
  }
  return { data: traces, layout }
}

export function buildPsychroFigure(
  chart: PsychartResponse,
  config: PsychroConfig,
  format: PlotFormat,
  states: StateTable,
  theme: PlotTheme,
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
    traces.push(
      ...stateTraces(
        { xProperty: 'T', yProperty: 'w', connect: config.connectStates, close: false },
        states,
        colors,
        xUnit,
        yUnit,
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
