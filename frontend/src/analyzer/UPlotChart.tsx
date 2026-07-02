// Imperative uPlot wrapper, modeled on plots/PlotlyChart.tsx in LIFECYCLE only
// (create/destroy on mount, ResizeObserver, no bespoke CSS) — uPlot's
// aligned-arrays data shape and cursor.sync API differ materially from Plotly.
//
// uPlot and its CSS are statically imported here: this module is only reached
// through the code-split DataAnalyzerTab chunk, so the main bundle never
// carries the charting engine (the same goal PlotlyChart achieves with a
// dynamic import).
//
// The ResizeObserver callback is rAF-throttled and hands uPlot explicit pixel
// dimensions (as PlotlyChart already does): uPlot in a flex/grid dock tile can
// otherwise trigger a "ResizeObserver loop limit exceeded" feedback loop.
//
// TIMING TRAP (found in live testing): uPlot flushes its hook queue via
// queueMicrotask, so a setScale caused by our own setData fires AFTER the
// synchronous call returns. A naive set-flag/call/clear-flag guard therefore
// misses it, every programmatic auto-fit gets reported as a user zoom, and —
// because the decimated envelope's bucket midpoints are inset from the
// requested window — the view ratchets inward forever. Two defenses:
//  1. the guard flag is cleared in a microtask queued after uPlot's flush;
//  2. the x scale is pinned to the REQUESTED window (xRange prop) through a
//     scale range() function, so auto-fit can never drift from what the
//     reducer asked for.

import { useEffect, useRef } from 'react'
import uPlot from 'uplot'
import 'uplot/dist/uPlot.min.css'

/** Measurement cursors A + B (§2.5e), drawn as labeled vertical lines. */
export interface AbCursors {
  a: number | null
  b: number | null
}

const CURSOR_COLORS = { a: '#ffd43b', b: '#3bc9db' } as const

interface Props {
  /** Chart options sans width/height (owned by the wrapper's ResizeObserver). */
  options: Omit<uPlot.Options, 'width' | 'height'>
  data: uPlot.AlignedData
  /** Requested x window; null = fit the full data extents. */
  xRange: [number, number] | null
  /** A/B measurement cursor positions (time values) to draw. */
  cursors?: AbCursors
  /** User changed the x scale (drag-zoom or wheel); NOT fired for setData. */
  onUserZoom?: (min: number, max: number) => void
  /** Double-click — reset to the full recording. */
  onResetZoom?: () => void
  /** Plain click placed a cursor: A on click, B on Shift+click. */
  onCursorSet?: (t: number, which: 'a' | 'b') => void
}

export default function UPlotChart({
  options,
  data,
  xRange,
  cursors,
  onUserZoom,
  onResetZoom,
  onCursorSet,
}: Readonly<Props>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<uPlot | null>(null)
  const dataRef = useRef(data)
  dataRef.current = data
  const xRangeRef = useRef(xRange)
  xRangeRef.current = xRange
  const cursorsRef = useRef(cursors)
  cursorsRef.current = cursors
  // True while a programmatic update (create/setData/setSize) is in flight,
  // including the microtask in which uPlot flushes the resulting hooks.
  const internalUpdate = useRef(false)
  const cbRef = useRef({ onUserZoom, onResetZoom, onCursorSet })
  cbRef.current = { onUserZoom, onResetZoom, onCursorSet }

  /** Run a programmatic chart mutation without it registering as a user zoom. */
  const guarded = (fn: () => void) => {
    internalUpdate.current = true
    fn()
    // uPlot queues its hook flush as a microtask inside fn(); queueing ours
    // afterwards guarantees the flag outlives that flush.
    queueMicrotask(() => {
      internalUpdate.current = false
    })
  }

  // (Re)create the chart when the options change (series set, scales, sync).
  useEffect(() => {
    const el = containerRef.current
    if (el === null) return

    const opts: uPlot.Options = {
      ...options,
      width: Math.max(el.clientWidth, 100),
      height: Math.max(el.clientHeight, 80),
      scales: {
        ...options.scales,
        x: {
          ...options.scales?.x,
          // Pin the view to the requested window; with no request, fit data.
          range: (_u, dataMin, dataMax) =>
            xRangeRef.current ?? ([dataMin, dataMax] as [number, number]),
        },
      },
      hooks: {
        ...options.hooks,
        setScale: [
          ...(options.hooks?.setScale ?? []),
          (u: uPlot, key: string) => {
            if (key !== 'x' || internalUpdate.current) return
            const { min, max } = u.scales.x
            if (min != null && max != null) cbRef.current.onUserZoom?.(min, max)
          },
        ],
        // Measurement cursors A/B: labeled vertical lines over the plot area,
        // read from a ref so cursor moves only need a redraw, not a rebuild.
        draw: [
          ...(options.hooks?.draw ?? []),
          (u: uPlot) => {
            const cur = cursorsRef.current
            if (!cur) return
            const ctx = u.ctx
            const dpr = window.devicePixelRatio || 1
            for (const which of ['a', 'b'] as const) {
              const t = cur[which]
              if (t == null) continue
              const { min, max } = u.scales.x
              if (min == null || max == null || t < min || t > max) continue
              const x = u.valToPos(t, 'x', true)
              ctx.save()
              ctx.strokeStyle = CURSOR_COLORS[which]
              ctx.lineWidth = dpr
              ctx.setLineDash([4 * dpr, 4 * dpr])
              ctx.beginPath()
              ctx.moveTo(x, u.bbox.top)
              ctx.lineTo(x, u.bbox.top + u.bbox.height)
              ctx.stroke()
              ctx.setLineDash([])
              ctx.fillStyle = CURSOR_COLORS[which]
              ctx.font = `${11 * dpr}px sans-serif`
              ctx.fillText(which.toUpperCase(), x + 3 * dpr, u.bbox.top + 11 * dpr)
              ctx.restore()
            }
          },
        ],
      },
    }
    let chart: uPlot
    guarded(() => {
      chart = new uPlot(opts, dataRef.current, el)
    })
    chartRef.current = chart!

    // Double-click resets to the full recording. uPlot's own dblclick only
    // refits the (already windowed) current data, so intercept in capture
    // phase and stop it reaching uPlot's bubble listener.
    const onDblClick = (e: MouseEvent) => {
      e.stopPropagation()
      cbRef.current.onResetZoom?.()
    }
    chart!.over.addEventListener('dblclick', onDblClick, { capture: true })

    // Plain click (no drag) places measurement cursor A; Shift+click places B.
    // A drag-select is distinguished by pointer travel, so zoom-box still works.
    let downPos: { x: number; y: number } | null = null
    const onMouseDown = (e: MouseEvent) => {
      downPos = { x: e.clientX, y: e.clientY }
    }
    const onMouseUp = (e: MouseEvent) => {
      const down = downPos
      downPos = null
      if (!down || Math.abs(e.clientX - down.x) > 3 || Math.abs(e.clientY - down.y) > 3) return
      const c = chartRef.current
      if (!c) return
      const rect = c.over.getBoundingClientRect()
      const t = c.posToVal(e.clientX - rect.left, 'x')
      if (Number.isFinite(t)) cbRef.current.onCursorSet?.(t, e.shiftKey ? 'b' : 'a')
    }
    chart!.over.addEventListener('mousedown', onMouseDown)
    chart!.over.addEventListener('mouseup', onMouseUp)

    // Wheel = x-zoom centered on the cursor.
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const c = chartRef.current
      if (!c) return
      const { min, max } = c.scales.x
      if (min == null || max == null) return
      const rect = c.over.getBoundingClientRect()
      const xVal = c.posToVal(e.clientX - rect.left, 'x')
      const factor = e.deltaY < 0 ? 0.8 : 1.25
      cbRef.current.onUserZoom?.(xVal - (xVal - min) * factor, xVal + (max - xVal) * factor)
    }
    chart!.over.addEventListener('wheel', onWheel, { passive: false })

    let frame = 0
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const c = chartRef.current
        const host = containerRef.current
        if (!c || !host) return
        guarded(() =>
          c.setSize({ width: Math.max(host.clientWidth, 100), height: Math.max(host.clientHeight, 80) }),
        )
      })
    })
    observer.observe(el)

    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
      chart.over.removeEventListener('dblclick', onDblClick, { capture: true })
      chart.over.removeEventListener('wheel', onWheel)
      chart.over.removeEventListener('mousedown', onMouseDown)
      chart.over.removeEventListener('mouseup', onMouseUp)
      chartRef.current = null
      // Destroy can fire hooks too — keep it guarded.
      guarded(() => chart.destroy())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options])

  // Cursor moves only repaint (draw hooks re-run); no data or scale change.
  useEffect(() => {
    chartRef.current?.redraw(false)
  }, [cursors])

  // Data-only updates keep the chart instance (cursor state survives). The
  // scale range() function re-applies xRangeRef during the reset.
  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return
    guarded(() => chart.setData(data, true))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  return <div ref={containerRef} style={{ width: '100%', height: '100%', minHeight: 0 }} />
}
