import { useEffect, useRef } from 'react'
import type { PlotlyAxisLayout, PlotlyTrace } from 'plotly.js-basic-dist-min'

export interface PlotSeries {
  name: string
  x: number[]
  y: number[]
}

interface Props {
  series: PlotSeries[]
  xLabel: string
  yLabel: string
  xLog: boolean
  yLog: boolean
}

function axisLayout(label: string, log: boolean): PlotlyAxisLayout {
  return {
    title: { text: label },
    type: log ? 'log' : 'linear',
    gridcolor: '#373A40',
    zerolinecolor: '#5c5f66',
    color: '#c1c2c5',
  }
}

/**
 * X-Y scatter/line chart over the parametric table data. Plotly is loaded
 * on demand so the main bundle does not carry the charting library.
 */
export default function Plot({
  series,
  xLabel,
  yLabel,
  xLog,
  yLog,
}: Readonly<Props>) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false

    async function render() {
      const { default: Plotly } = await import('plotly.js-basic-dist-min')
      const el = containerRef.current
      if (cancelled || el === null) return
      const data: PlotlyTrace[] = series.map((s) => ({
        type: 'scatter',
        mode: 'lines+markers',
        name: s.name,
        x: s.x,
        y: s.y,
      }))
      await Plotly.react(
        el,
        data,
        {
          paper_bgcolor: 'rgba(0,0,0,0)',
          plot_bgcolor: 'rgba(0,0,0,0)',
          font: { color: '#c1c2c5' },
          margin: { t: 24, r: 16, b: 48, l: 56 },
          xaxis: axisLayout(xLabel, xLog),
          yaxis: axisLayout(yLabel, yLog),
          showlegend: true,
          legend: { orientation: 'h' },
        },
        { responsive: true, displaylogo: false },
      )
    }

    void render()
    return () => {
      cancelled = true
    }
  }, [series, xLabel, yLabel, xLog, yLog])

  useEffect(() => {
    const el = containerRef.current
    return () => {
      if (el) {
        void import('plotly.js-basic-dist-min').then(({ default: Plotly }) =>
          Plotly.purge(el),
        )
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', minHeight: 380 }}
    />
  )
}
