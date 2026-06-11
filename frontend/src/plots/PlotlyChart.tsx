import { useEffect, useRef } from 'react'
import type { PlotlyFigure } from 'plotly.js-basic-dist-min'

/**
 * Renders a pre-built Plotly figure. Plotly is loaded on demand so the
 * main bundle does not carry the charting library.
 */
export default function PlotlyChart({ figure }: Readonly<{ figure: PlotlyFigure }>) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    async function render() {
      const { default: Plotly } = await import('plotly.js-basic-dist-min')
      const el = containerRef.current
      if (cancelled || el === null) return
      await Plotly.react(el, figure.data, figure.layout, {
        responsive: true,
        displaylogo: false,
      })
    }
    void render()
    return () => {
      cancelled = true
    }
  }, [figure])

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
