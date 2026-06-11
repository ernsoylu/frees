/**
 * Minimal typings for the basic Plotly bundle (scatter/line charts only).
 * The dist packages ship without their own type definitions.
 */
declare module 'plotly.js-basic-dist-min' {
  export interface PlotlyTrace {
    type: 'scatter'
    mode: string
    name: string
    x: number[]
    y: number[]
  }

  export interface PlotlyAxisLayout {
    title?: { text: string }
    type?: 'linear' | 'log'
    gridcolor?: string
    zerolinecolor?: string
    color?: string
  }

  export interface PlotlyLayout {
    paper_bgcolor?: string
    plot_bgcolor?: string
    font?: { color?: string; family?: string }
    margin?: { t?: number; r?: number; b?: number; l?: number }
    xaxis?: PlotlyAxisLayout
    yaxis?: PlotlyAxisLayout
    showlegend?: boolean
    legend?: { orientation?: 'h' | 'v' }
  }

  export interface PlotlyConfig {
    responsive?: boolean
    displaylogo?: boolean
  }

  const Plotly: {
    react: (
      el: HTMLElement,
      data: PlotlyTrace[],
      layout?: PlotlyLayout,
      config?: PlotlyConfig,
    ) => Promise<unknown>
    purge: (el: HTMLElement) => void
  }
  export default Plotly
}
