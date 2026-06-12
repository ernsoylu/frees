/**
 * Minimal typings for the full Plotly bundle (supporting 2D & 3D charts).
 * The dist packages ship without their own type definitions.
 */
declare module 'plotly.js-dist-min' {
  export interface PlotlyLineStyle {
    color?: string
    width?: number
    dash?: 'solid' | 'dot' | 'dash' | 'dashdot'
  }

  export interface PlotlyMarkerStyle {
    color?: string
    size?: number | number[]
    symbol?: string
  }

  export interface PlotlyTrace {
    type: 'scatter' | 'bar' | 'pie' | 'histogram' | 'mesh3d' | 'scatter3d'
    mode?: string
    name: string
    x?: (number | null)[]
    y?: (number | null)[]
    z?: (number | null)[]
    labels?: string[]
    values?: number[]
    intensity?: (number | null)[]
    colorscale?: string
    opacity?: number
    line?: PlotlyLineStyle
    marker?: PlotlyMarkerStyle
    text?: string[]
    textposition?: string
    textfont?: { color?: string; size?: number }
    showlegend?: boolean
    hoverinfo?: string
    connectgaps?: boolean
  }

  export interface PlotlyAxisLayout {
    title?: { text: string } | string
    type?: 'linear' | 'log'
    gridcolor?: string
    zerolinecolor?: string
    color?: string
    showgrid?: boolean
    linecolor?: string
    mirror?: boolean
    ticks?: 'outside' | 'inside' | ''
    exponentformat?: 'power' | 'e' | 'none'
  }

  export interface PlotlyLayout {
    title?: { text: string; font?: { size?: number } }
    paper_bgcolor?: string
    plot_bgcolor?: string
    font?: { color?: string; family?: string; size?: number }
    margin?: { t?: number; r?: number; b?: number; l?: number }
    xaxis?: PlotlyAxisLayout
    yaxis?: PlotlyAxisLayout
    showlegend?: boolean
    legend?: {
      orientation?: 'h' | 'v'
      font?: { size?: number }
      bgcolor?: string
    }
    barmode?: 'group' | 'stack' | 'overlay' | 'relative'
    scene?: {
      xaxis?: PlotlyAxisLayout
      yaxis?: PlotlyAxisLayout
      zaxis?: PlotlyAxisLayout
    }
  }

  export interface PlotlyConfig {
    responsive?: boolean
    displaylogo?: boolean
  }

  export interface PlotlyFigure {
    data: PlotlyTrace[]
    layout: PlotlyLayout
  }

  export interface PlotlyImageOptions {
    format: 'svg' | 'png' | 'jpeg'
    width: number
    height: number
    scale?: number
  }

  const Plotly: {
    react: (
      el: HTMLElement,
      data: PlotlyTrace[],
      layout?: PlotlyLayout,
      config?: PlotlyConfig,
    ) => Promise<unknown>
    purge: (el: HTMLElement) => void
    toImage: (
      figure: PlotlyFigure | HTMLElement,
      options: PlotlyImageOptions,
    ) => Promise<string>
  }
  export default Plotly
}
