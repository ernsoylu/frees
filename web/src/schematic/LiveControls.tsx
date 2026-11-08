// Phase L2: a block's live inputs, drawn above it while a live run is open —
// a switch, a valve opening on a track, a setpoint knob. Each is its own focus
// stop with keyboard equivalents; its pointer and key events stop here, so
// they never drag, select or nudge the block.

import { useRef } from 'react'
import { setpointStep, type CanvasInput } from '../liveCanvas'

export interface LiveControl {
  input: CanvasInput
  value: number
}

interface Props {
  controls: readonly LiveControl[]
  /** The block's width, in drawing units. */
  width: number
  ink: { text: string; subtext: string; highlight: string; block: string; border: string }
  onSet: (input: CanvasInput, value: number) => void
}

const ROW = 16
const fmt = (v: number) => String(Number(v.toPrecision(4)))
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const stop = (e: React.SyntheticEvent) => e.stopPropagation()

/** The controls, stacked upward from just above the block. */
export default function LiveControls({ controls, width, ink, onSet }: Readonly<Props>) {
  return (
    <g data-live-controls onPointerDown={stop} onClick={stop} onKeyDown={stop} onDoubleClick={stop}>
      {controls.map((c, i) => (
        <g key={c.input.variable} transform={`translate(0, ${-(i + 1) * (ROW + 3)})`}>
          {c.input.kind === 'toggle' && <Toggle control={c} width={width} ink={ink} onSet={onSet} />}
          {c.input.kind === 'fraction' && <Fraction control={c} width={width} ink={ink} onSet={onSet} />}
          {c.input.kind === 'setpoint' && <Setpoint control={c} width={width} ink={ink} onSet={onSet} />}
        </g>
      ))}
    </g>
  )
}

interface One {
  control: LiveControl
  width: number
  ink: Props['ink']
  onSet: Props['onSet']
}

/**
 * Click or Space/Enter latches the other state. Shift held with the press
 * makes it momentary: the other state only while held, released on pointer
 * up, key up or focus loss.
 */
function Toggle({ control: { input, value }, width, ink, onSet }: Readonly<One>) {
  const held = useRef<number | null>(null)
  const on = value >= 0.5
  const press = (shift: boolean) => {
    if (shift) {
      held.current = value
      onSet(input, on ? 0 : 1)
    } else if (held.current === null) onSet(input, on ? 0 : 1)
  }
  const release = () => {
    if (held.current === null) return
    const back = held.current
    held.current = null
    onSet(input, back)
  }
  return (
    <g
      role="switch"
      tabIndex={0}
      aria-checked={on}
      aria-label={`${input.block}.${input.param}`}
      data-live-input={input.variable}
      style={{ cursor: 'pointer' }}
      onPointerDown={(e) => {
        stop(e)
        if (e.shiftKey) {
          ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
          press(true)
        }
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onClick={(e) => {
        stop(e)
        if (!e.shiftKey) press(false)
      }}
      onKeyDown={(e) => {
        stop(e)
        if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
          e.preventDefault()
          press(e.shiftKey)
        }
      }}
      onKeyUp={(e) => {
        if (e.key === ' ' || e.key === 'Enter') release()
      }}
      onBlur={release}
    >
      <rect width={width} height={ROW} rx={ROW / 2} fill={on ? ink.highlight : ink.block} stroke={ink.border} />
      <circle cx={on ? width - ROW / 2 : ROW / 2} cy={ROW / 2} r={ROW / 2 - 2.5} fill={on ? ink.block : ink.subtext} />
      <text x={width / 2} y={ROW / 2} fontSize={9.5} textAnchor="middle" dominantBaseline="central" fill={on ? ink.block : ink.text} pointerEvents="none">
        {input.param} {on ? 'on' : 'off'}
      </text>
    </g>
  )
}

/** A 0–1 opening: drag along the track; arrows ±0.05, Page ±0.25, Home/End. */
function Fraction({ control: { input, value }, width, ink, onSet }: Readonly<One>) {
  const track = useRef<SVGRectElement>(null)
  const at = (clientX: number) => {
    const box = track.current?.getBoundingClientRect()
    if (!box || box.width === 0) return value
    return clamp01((clientX - box.left) / box.width)
  }
  const keys: Record<string, (v: number) => number> = {
    ArrowRight: (v) => v + 0.05,
    ArrowUp: (v) => v + 0.05,
    ArrowLeft: (v) => v - 0.05,
    ArrowDown: (v) => v - 0.05,
    PageUp: (v) => v + 0.25,
    PageDown: (v) => v - 0.25,
    Home: () => 0,
    End: () => 1,
  }
  const v = clamp01(value)
  return (
    <g
      role="slider"
      tabIndex={0}
      aria-label={`${input.block}.${input.param}`}
      aria-valuemin={0}
      aria-valuemax={1}
      aria-valuenow={v}
      data-live-input={input.variable}
      style={{ cursor: 'ew-resize' }}
      onPointerDown={(e) => {
        stop(e)
        ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
        onSet(input, Number(at(e.clientX).toFixed(3)))
      }}
      onPointerMove={(e) => {
        if (e.buttons & 1) onSet(input, Number(at(e.clientX).toFixed(3)))
      }}
      onKeyDown={(e) => {
        stop(e)
        const next = keys[e.key]
        if (!next) return
        e.preventDefault()
        onSet(input, Number(clamp01(next(v)).toFixed(3)))
      }}
    >
      <rect ref={track} width={width} height={ROW} rx={3} fill={ink.block} stroke={ink.border} />
      <rect width={width * v} height={ROW} rx={3} fill={ink.highlight} opacity={0.35} pointerEvents="none" />
      <text x={4} y={ROW / 2} fontSize={9.5} dominantBaseline="central" fill={ink.text} pointerEvents="none">
        {input.param} {fmt(v)}
      </text>
    </g>
  )
}

/** A setpoint knob: drag up/down, arrows ± one step, Page ± ten steps, or the − / + ends. */
function Setpoint({ control: { input, value }, width, ink, onSet }: Readonly<One>) {
  const step = setpointStep(input.value)
  const drag = useRef<{ y: number; from: number } | null>(null)
  const snap = (v: number) => Number((Math.round(v / step) * step).toPrecision(12))
  const by = (n: number) => onSet(input, snap(value + n * step))
  return (
    <g
      role="spinbutton"
      tabIndex={0}
      aria-label={`${input.block}.${input.param}`}
      aria-valuenow={value}
      aria-valuetext={`${fmt(value)}${input.unit ? ` ${input.unit}` : ''}`}
      data-live-input={input.variable}
      style={{ cursor: 'ns-resize' }}
      onPointerDown={(e) => {
        stop(e)
        ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
        drag.current = { y: e.clientY, from: value }
      }}
      onPointerMove={(e) => {
        const d = drag.current
        if (d && e.buttons & 1) onSet(input, snap(d.from + Math.round((d.y - e.clientY) / 4) * step))
      }}
      onPointerUp={() => {
        drag.current = null
      }}
      onKeyDown={(e) => {
        stop(e)
        const n = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: 10, PageDown: -10 }[e.key]
        if (n === undefined) return
        e.preventDefault()
        by(n)
      }}
    >
      <rect width={width} height={ROW} rx={3} fill={ink.block} stroke={ink.border} />
      <text x={6} y={ROW / 2} fontSize={11} dominantBaseline="central" fill={ink.subtext} style={{ cursor: 'pointer' }} onClick={(e) => { stop(e); by(-1) }} onPointerDown={stop}>−</text>
      <text x={width / 2} y={ROW / 2} fontSize={9.5} textAnchor="middle" dominantBaseline="central" fill={ink.text} pointerEvents="none">
        {input.param} {fmt(value)}{input.unit ? ` ${input.unit.slice(1, -1)}` : ''}
      </text>
      <text x={width - 6} y={ROW / 2} fontSize={11} textAnchor="end" dominantBaseline="central" fill={ink.subtext} style={{ cursor: 'pointer' }} onClick={(e) => { stop(e); by(1) }} onPointerDown={stop}>+</text>
    </g>
  )
}
