import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActionIcon,
  Button,
  Checkbox,
  ColorInput,
  Divider,
  Group,
  Menu,
  MultiSelect,
  NumberInput,
  Paper,
  ScrollArea,
  SegmentedControl,
  Select,
  Slider,
  Stack,
  Text,
  Textarea,
  TextInput,
  Tooltip,
} from '@mantine/core'
import {
  IconAdjustmentsHorizontal,
  IconArrowBackUp,
  IconArrowForwardUp,
  IconArrowNarrowRight,
  IconBroadcast,
  IconHandStop,
  IconChartLine,
  IconCheckbox,
  IconCircle,
  IconCopy,
  IconEye,
  IconEyeOff,
  IconFolderMinus,
  IconFolderPlus,
  IconForms,
  IconGripVertical,
  IconLock,
  IconLockOpen,
  IconStack3,
  IconLayoutAlignBottom,
  IconLayoutAlignCenter,
  IconLayoutAlignLeft,
  IconLayoutAlignMiddle,
  IconLayoutAlignRight,
  IconLayoutAlignTop,
  IconLayoutDistributeHorizontal,
  IconLayoutDistributeVertical,
  IconLine,
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconPlayerSkipBackFilled,
  IconPlayerSkipForwardFilled,
  IconPointer,
  IconRectangle,
  IconRepeat,
  IconRepeatOff,
  IconSelector,
  IconStack2,
  IconStackPop,
  IconStackPush,
  IconTag,
  IconTags,
  IconTrash,
  IconTypography,
  IconZoomScan,
} from '@tabler/icons-react'
import { VariableResult } from '../api'
import { formatValue } from '../format'
import { evalFormula, formulaVars } from './formula'
import { LIBRARY_ICONS, libraryIcon } from './library'
import {
  AttributeBindings,
  ChartElement,
  ControlElement,
  controlBindings,
  DEFAULT_DIAGRAM_STATE,
  DEFAULT_STYLE,
  DiagramElement,
  DiagramRun,
  DiagramState,
  elementLabel,
  expandGroups,
  isControl,
  LabelElement,
  LineElement,
  elementBounds,
} from './types'

const STORAGE_KEY = 'frees-diagram-v1'

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

function loadState(): DiagramState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_DIAGRAM_STATE
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed.elements)) return DEFAULT_DIAGRAM_STATE
    return { ...DEFAULT_DIAGRAM_STATE, ...parsed }
  } catch {
    return DEFAULT_DIAGRAM_STATE
  }
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

interface ViewTransform {
  x: number
  y: number
  k: number
}

type Handle = 'nw' | 'ne' | 'sw' | 'se'
type Box = { x: number; y: number; w: number; h: number }

type DragState =
  | { type: 'pan'; startClientX: number; startClientY: number; startView: ViewTransform }
  | { type: 'create'; id: string; startX: number; startY: number }
  | { type: 'move'; startX: number; startY: number; originals: DiagramElement[] }
  | { type: 'resize'; id: string; handle: Handle; original: DiagramElement }
  | { type: 'groupResize'; handle: Handle; originals: DiagramElement[]; bbox: Box }
  | { type: 'endpoint'; id: string; which: 1 | 2 }
  | { type: 'rotate'; id: string; original: DiagramElement; cx: number; cy: number }
  | { type: 'marquee'; startX: number; startY: number; additive: boolean }

const HISTORY_LIMIT = 100

/** Identity-compares two diagram states' element lists (cheap; drags reuse refs). */
function elementsChanged(a: DiagramState, b: DiagramState): boolean {
  if (a.elements.length !== b.elements.length) return true
  for (let i = 0; i < a.elements.length; i++) {
    if (a.elements[i] !== b.elements[i]) return true
  }
  return false
}

/** Translates an element by (dx, dy), handling line endpoints vs x/y origin. */
function translateElement(el: DiagramElement, dx: number, dy: number): DiagramElement {
  if (el.kind === 'line') {
    return { ...el, x1: el.x1 + dx, y1: el.y1 + dy, x2: el.x2 + dx, y2: el.y2 + dy }
  }
  return { ...el, x: el.x + dx, y: el.y + dy }
}

/** Combined bounding box of several elements. */
function combinedBounds(els: DiagramElement[]): Box {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const el of els) {
    const b = elementBounds(el)
    minX = Math.min(minX, b.x)
    minY = Math.min(minY, b.y)
    maxX = Math.max(maxX, b.x + b.w)
    maxY = Math.max(maxY, b.y + b.h)
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
}

/** Scales an element about a fixed point (for proportional group resize). */
function scaleElement(
  el: DiagramElement,
  fixedX: number,
  fixedY: number,
  sx: number,
  sy: number,
): DiagramElement {
  const tx = (x: number) => fixedX + (x - fixedX) * sx
  const ty = (y: number) => fixedY + (y - fixedY) * sy
  if (el.kind === 'line') {
    return { ...el, x1: tx(el.x1), y1: ty(el.y1), x2: tx(el.x2), y2: ty(el.y2) }
  }
  if (el.kind === 'label') {
    return { ...el, x: tx(el.x), y: ty(el.y) } // don't scale text box geometry
  }
  return { ...el, x: tx(el.x), y: ty(el.y), w: Math.max(1, el.w * sx), h: Math.max(1, el.h * sy) }
}

const SNAP_THRESHOLD_PX = 6

interface SnapResult {
  dx: number
  dy: number
  vGuides: number[]
  hGuides: number[]
}

/**
 * Aligns a moving box's left/center/right and top/middle/bottom to the nearest
 * matching edge of any static box within the threshold (Story 10.2 smart
 * guides). Returns the adjustment to add to the raw delta and the guide lines.
 */
function computeSnap(moving: Box, statics: Box[], threshold: number): SnapResult {
  const movingXs = [moving.x, moving.x + moving.w / 2, moving.x + moving.w]
  const movingYs = [moving.y, moving.y + moving.h / 2, moving.y + moving.h]
  let bestX: { delta: number; line: number } | null = null
  let bestY: { delta: number; line: number } | null = null
  for (const s of statics) {
    const sx = [s.x, s.x + s.w / 2, s.x + s.w]
    const sy = [s.y, s.y + s.h / 2, s.y + s.h]
    for (const mx of movingXs) {
      for (const tx of sx) {
        const d = tx - mx
        if (Math.abs(d) <= threshold && (!bestX || Math.abs(d) < Math.abs(bestX.delta))) {
          bestX = { delta: d, line: tx }
        }
      }
    }
    for (const my of movingYs) {
      for (const ty of sy) {
        const d = ty - my
        if (Math.abs(d) <= threshold && (!bestY || Math.abs(d) < Math.abs(bestY.delta))) {
          bestY = { delta: d, line: ty }
        }
      }
    }
  }
  return {
    dx: bestX?.delta ?? 0,
    dy: bestY?.delta ?? 0,
    vGuides: bestX ? [bestX.line] : [],
    hGuides: bestY ? [bestY.line] : [],
  }
}

function elementCenter(el: DiagramElement): { cx: number; cy: number } {
  const b = elementBounds(el)
  return { cx: b.x + b.w / 2, cy: b.y + b.h / 2 }
}

const BINDABLE_LABELS: Record<keyof AttributeBindings, string> = {
  dx: 'Δx (shift X)',
  dy: 'Δy (shift Y)',
  w: 'Width',
  h: 'Height',
  rotation: 'Rotation °',
  opacity: 'Opacity',
}

/**
 * Applies an element's attribute bindings (Story 6.3) against solved values.
 * Off-run-mode or when a formula can't yet be evaluated, the authored value is
 * kept, so the diagram still renders before a solve.
 */
function resolveElement(
  el: DiagramElement,
  numValues: Map<string, number>,
  runMode: boolean,
): DiagramElement {
  if (!runMode || !el.bind) return el
  const b = el.bind
  const num = (f: string | undefined, fallback: number) => {
    const v = evalFormula(f, numValues)
    return v === null ? fallback : v
  }
  const opacity = b.opacity ? Math.max(0, Math.min(1, num(b.opacity, el.opacity))) : el.opacity
  const rotation = b.rotation ? num(b.rotation, el.rotation) : el.rotation
  const dx = b.dx ? num(b.dx, 0) : 0
  const dy = b.dy ? num(b.dy, 0) : 0

  if (el.kind === 'line') {
    return { ...el, opacity, rotation, x1: el.x1 + dx, y1: el.y1 + dy, x2: el.x2 + dx, y2: el.y2 + dy }
  }
  if (el.kind === 'label') {
    return { ...el, opacity, rotation, x: el.x + dx, y: el.y + dy }
  }
  const w = b.w ? num(b.w, el.w) : el.w
  const h = b.h ? num(b.h, el.h) : el.h
  return { ...el, opacity, rotation, x: el.x + dx, y: el.y + dy, w, h }
}

/** The solved variables an element references — for the Run-mode hover tooltip. */
function elementVars(el: DiagramElement): string[] {
  const out = new Set<string>()
  if (el.bind) {
    for (const f of Object.values(el.bind)) formulaVars(f).forEach((v) => out.add(v))
  }
  if (el.kind === 'line' && el.flow) formulaVars(el.flow.speed).forEach((v) => out.add(v))
  if (el.kind === 'label') {
    for (const m of el.text.matchAll(/\{([A-Za-z][\w$]*)\}/g)) out.add(m[1].toLowerCase())
  }
  if (isControl(el) && el.varName.trim()) out.add(el.varName.trim().toLowerCase())
  return [...out]
}

// ---------------------------------------------------------------------------
// Element rendering
// ---------------------------------------------------------------------------

const FLOW_DASH = '10 6'
const FLOW_KEYFRAMES = '@keyframes frees-flow { to { stroke-dashoffset: -16; } }'

/**
 * Dash + animation props for a flowing pipe line (Story 6.3). The flow speed
 * is a formula of solved variables; its magnitude sets the animation rate and
 * its sign the direction. Returns nothing when not flowing.
 */
function flowDashProps(
  el: LineElement,
  runMode: boolean,
  numValues: Map<string, number>,
): React.SVGProps<SVGLineElement> {
  if (!runMode || !el.flow) return {}
  const speed = evalFormula(el.flow.speed, numValues) ?? 0
  if (Math.abs(speed) < 1e-9) return { strokeDasharray: FLOW_DASH }
  const duration = Math.max(0.1, Math.min(20, 6 / Math.abs(speed)))
  return {
    strokeDasharray: FLOW_DASH,
    style: {
      animation: `frees-flow ${duration}s linear infinite`,
      animationDirection: speed < 0 ? 'reverse' : 'normal',
    },
  }
}

function interpolateLabel(text: string, values: Map<string, VariableResult>): string {
  return text.replace(/\{([A-Za-z][\w$]*)\}/g, (match, name: string) => {
    const v = values.get(name.toLowerCase())
    if (!v) return match
    const unit = v.units && v.units !== '-' ? ` ${v.units}` : ''
    return `${formatValue(v.value)}${unit}`
  })
}

function LabelText({
  el,
  text,
}: Readonly<{ el: LabelElement; text: string }>) {
  const lines = text.split('\n')
  return (
    <text
      x={el.x}
      y={el.y}
      fill={el.stroke}
      fontSize={el.fontSize}
      fontWeight={el.bold ? 700 : 400}
      fontFamily="system-ui, sans-serif"
      opacity={el.opacity}
      style={{ userSelect: 'none' }}
    >
      {lines.map((line, i) => (
        <tspan key={`${el.id}-${line}-${i}`} x={el.x} dy={i === 0 ? '1em' : '1.3em'}>
          {line}
        </tspan>
      ))}
    </text>
  )
}

// ── Form controls (Story 6.2) ─────────────────────────────────────────────

const fieldStyle: React.CSSProperties = {
  width: '100%',
  background: '#2C2E33',
  color: '#e9ecef',
  border: '1px solid #495057',
  borderRadius: 4,
  padding: '2px 6px',
  fontSize: 12,
  boxSizing: 'border-box',
}

const captionStyle: React.CSSProperties = {
  color: '#909296',
  fontSize: 11,
  marginBottom: 2,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}

/** A short descriptor of a control's binding, shown on the develop-mode box. */
function controlSummary(el: ControlElement): string {
  const v = el.varName.trim() || '(unbound)'
  switch (el.kind) {
    case 'ctl-input':
      return `${v} = ${el.value || '?'}`
    case 'ctl-output':
      return `▸ ${v}`
    case 'ctl-dropdown':
      return `${v} ⌄ ${el.value || el.options[0] || ''}`
    case 'ctl-checkbox':
      return `${el.checked ? '☑' : '☐'} ${v}`
    case 'ctl-slider':
      return `${v} = ${el.value}`
  }
}

/** Live HTML widget rendered inside an SVG foreignObject in Run mode. */
function ControlWidget({
  el,
  values,
  onValue,
}: Readonly<{
  el: ControlElement
  values: Map<string, VariableResult>
  onValue: (patch: Partial<ControlElement>) => void
}>) {
  const caption = el.label || el.varName
  if (el.kind === 'ctl-output') {
    const v = values.get(el.varName.trim().toLowerCase())
    const unit = v && v.units && v.units !== '-' ? ` ${v.units}` : ''
    return (
      <div style={{ fontFamily: 'system-ui, sans-serif' }}>
        <div style={captionStyle}>{caption}</div>
        <div
          style={{
            ...fieldStyle,
            background: '#1A1B1E',
            color: '#69db7c',
            fontFamily: 'monospace',
          }}
        >
          {v ? `${formatValue(v.value)}${unit}` : '—'}
        </div>
      </div>
    )
  }
  if (el.kind === 'ctl-checkbox') {
    return (
      <label
               style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          color: '#e9ecef',
          fontSize: 12,
          fontFamily: 'system-ui, sans-serif',
          cursor: 'pointer',
        }}
      >
        <input
          type="checkbox"
          checked={el.checked}
          onChange={(e) => onValue({ checked: e.currentTarget.checked })}
        />
        {caption}
      </label>
    )
  }
  if (el.kind === 'ctl-dropdown') {
    return (
      <div style={{ fontFamily: 'system-ui, sans-serif' }}>
        <div style={captionStyle}>{caption}</div>
        <select
          value={el.value}
          onChange={(e) => onValue({ value: e.currentTarget.value })}
          style={fieldStyle}
        >
          <option value="" disabled>
            choose…
          </option>
          {el.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    )
  }
  if (el.kind === 'ctl-slider') {
    return (
      <div style={{ fontFamily: 'system-ui, sans-serif' }}>
        <div style={captionStyle}>
          {caption}: <span style={{ color: '#e9ecef' }}>{el.value}</span>
        </div>
        <input
          type="range"
          min={el.min}
          max={el.max}
          step={el.step}
          value={el.value}
          onChange={(e) => onValue({ value: Number(e.currentTarget.value) })}
          style={{ width: '100%' }}
        />
      </div>
    )
  }
  // ctl-input
  const isString = el.varName.trim().endsWith('$')
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>
      <div style={captionStyle}>{caption}</div>
      <input
        type={isString ? 'text' : 'number'}
        value={el.value}
        onChange={(e) => onValue({ value: e.currentTarget.value })}
        style={fieldStyle}
      />
    </div>
  )
}

const CHART_PALETTE = ['#4dabf7', '#ff8787', '#69db7c', '#ffd43b', '#da77f2', '#3bc9db']

/** Inline SVG line chart of yVars vs xVar across the parametric table runs (6.4). */
function ChartView({
  el,
  runs,
  activeIndex,
}: Readonly<{ el: ChartElement; runs: DiagramRun[]; activeIndex: number | null }>) {
  const pad = 24
  const innerW = Math.max(1, el.w - pad * 1.5)
  const innerH = Math.max(1, el.h - pad * 1.6)
  const x0 = el.x + pad
  const y0 = el.y + el.h - pad

  const frame = (
    <>
      <rect
        x={el.x}
        y={el.y}
        width={el.w}
        height={el.h}
        rx={6}
        fill="#1A1B1E"
        stroke="#373A40"
        strokeWidth={1}
      />
      <line x1={x0} y1={el.y + pad * 0.6} x2={x0} y2={y0} stroke="#495057" strokeWidth={1} />
      <line x1={x0} y1={y0} x2={el.x + el.w - pad * 0.5} y2={y0} stroke="#495057" strokeWidth={1} />
    </>
  )

  const points = (varName: string) =>
    runs.map((r) => ({ x: r.values[el.xVar], y: r.values[varName] }))

  const usableYVars = el.yVars.filter((v) =>
    runs.some((r) => Number.isFinite(r.values[v])),
  )
  const hasX = !!el.xVar && runs.some((r) => Number.isFinite(r.values[el.xVar]))

  if (!hasX || usableYVars.length === 0 || runs.length === 0) {
    return (
      <g opacity={el.opacity}>
        {frame}
        <text
          x={el.x + el.w / 2}
          y={el.y + el.h / 2}
          fill="#868e96"
          fontSize={11}
          textAnchor="middle"
          fontFamily="system-ui, sans-serif"
          style={{ userSelect: 'none' }}
        >
          {runs.length === 0 ? 'Solve a parametric table' : 'Pick X and Y variables'}
        </text>
      </g>
    )
  }

  const xs = runs.map((r) => r.values[el.xVar]).filter(Number.isFinite)
  const ys = usableYVars.flatMap((v) =>
    runs.map((r) => r.values[v]).filter(Number.isFinite),
  )
  const xMin = Math.min(...xs)
  const xMax = Math.max(...xs)
  const yMin = Math.min(...ys)
  const yMax = Math.max(...ys)
  const sx = (v: number) => x0 + (xMax === xMin ? innerW / 2 : ((v - xMin) / (xMax - xMin)) * innerW)
  const sy = (v: number) => y0 - (yMax === yMin ? innerH / 2 : ((v - yMin) / (yMax - yMin)) * innerH)

  return (
    <g opacity={el.opacity}>
      {frame}
      {usableYVars.map((v, i) => {
        const pts = points(v)
          .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
          .map((p) => `${sx(p.x)},${sy(p.y)}`)
          .join(' ')
        return (
          <polyline
            key={v}
            points={pts}
            fill="none"
            stroke={CHART_PALETTE[i % CHART_PALETTE.length]}
            strokeWidth={1.5}
          />
        )
      })}
      {activeIndex !== null && Number.isFinite(runs[activeIndex]?.values[el.xVar]) && (
        <line
          x1={sx(runs[activeIndex].values[el.xVar])}
          y1={el.y + pad * 0.6}
          x2={sx(runs[activeIndex].values[el.xVar])}
          y2={y0}
          stroke="#ffa94b"
          strokeWidth={1}
          strokeDasharray="3 2"
        />
      )}
      <text x={x0} y={el.y + pad * 0.5} fill="#909296" fontSize={9} fontFamily="system-ui">
        {usableYVars.join(', ')} vs {el.xVar}
      </text>
      <text x={x0 - 2} y={el.y + pad * 0.6 + 8} fill="#868e96" fontSize={8} textAnchor="end" fontFamily="monospace">
        {formatValue(yMax)}
      </text>
      <text x={x0 - 2} y={y0} fill="#868e96" fontSize={8} textAnchor="end" fontFamily="monospace">
        {formatValue(yMin)}
      </text>
    </g>
  )
}

function ElementView({
  el,
  runMode,
  values,
  numValues,
  runs,
  activeIndex,
  onMouseDown,
  onControlValue,
  onHover,
}: Readonly<{
  el: DiagramElement
  runMode: boolean
  values: Map<string, VariableResult>
  numValues: Map<string, number>
  runs: DiagramRun[]
  activeIndex: number | null
  onMouseDown: (e: React.MouseEvent, el: DiagramElement) => void
  onControlValue: (id: string, patch: Partial<ControlElement>) => void
  onHover: (id: string | null, clientX: number, clientY: number) => void
}>) {
  const { cx, cy } = elementCenter(el)
  const transform = el.rotation ? `rotate(${el.rotation} ${cx} ${cy})` : undefined
  const handleDown = (e: React.MouseEvent) => {
    if (!runMode) onMouseDown(e, el)
  }

  let body: React.ReactNode = null
  if (el.kind === 'line') {
    const marker = el.arrow ? `url(#diagram-arrow-${el.id})` : undefined
    body = (
      <>
        {el.arrow && (
          <defs>
            <marker
              id={`diagram-arrow-${el.id}`}
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill={el.stroke} />
            </marker>
          </defs>
        )}
        <line
          x1={el.x1}
          y1={el.y1}
          x2={el.x2}
          y2={el.y2}
          stroke={el.stroke}
          strokeWidth={el.strokeWidth}
          opacity={el.opacity}
          markerEnd={marker}
          {...flowDashProps(el, runMode, numValues)}
        />
        {/* wide invisible hit area */}
        <line
          x1={el.x1}
          y1={el.y1}
          x2={el.x2}
          y2={el.y2}
          stroke="transparent"
          strokeWidth={Math.max(12, el.strokeWidth + 8)}
        />
      </>
    )
  } else if (el.kind === 'rect') {
    body = (
      <rect
        x={el.x}
        y={el.y}
        width={el.w}
        height={el.h}
        rx={el.rx}
        stroke={el.stroke}
        strokeWidth={el.strokeWidth}
        fill={el.fill === 'transparent' ? 'rgba(0,0,0,0.001)' : el.fill}
        opacity={el.opacity}
      />
    )
  } else if (el.kind === 'ellipse') {
    body = (
      <ellipse
        cx={el.x + el.w / 2}
        cy={el.y + el.h / 2}
        rx={el.w / 2}
        ry={el.h / 2}
        stroke={el.stroke}
        strokeWidth={el.strokeWidth}
        fill={el.fill === 'transparent' ? 'rgba(0,0,0,0.001)' : el.fill}
        opacity={el.opacity}
      />
    )
  } else if (el.kind === 'label') {
    const text = runMode ? interpolateLabel(el.text, values) : el.text
    body = <LabelText el={el} text={text} />
  } else if (el.kind === 'icon') {
    const icon = libraryIcon(el.icon)
    if (!icon) return null
    body = (
      <g
        transform={`translate(${el.x} ${el.y}) scale(${el.w / 100} ${el.h / 100})`}
        opacity={el.opacity}
      >
        {icon.render(el.stroke, (el.strokeWidth * 100) / Math.max(el.w, el.h), el.fill)}
        <rect x="0" y="0" width="100" height="100" fill="rgba(0,0,0,0.001)" stroke="none" />
      </g>
    )
  } else if (el.kind === 'chart') {
    body = <ChartView el={el} runs={runs} activeIndex={runMode ? activeIndex : null} />
  } else if (isControl(el)) {
    if (runMode) {
      body = (
        <foreignObject x={el.x} y={el.y} width={el.w} height={el.h} opacity={el.opacity}>
          <div
                       style={{ width: '100%', height: '100%', padding: 2, boxSizing: 'border-box' }}
          >
            <ControlWidget
              el={el}
              values={values}
              onValue={(patch) => onControlValue(el.id, patch)}
            />
          </div>
        </foreignObject>
      )
    } else {
      // Development mode: static, draggable placeholder box.
      body = (
        <g opacity={el.opacity}>
          <rect
            x={el.x}
            y={el.y}
            width={el.w}
            height={el.h}
            rx={6}
            fill="#1f2937"
            fillOpacity={0.55}
            stroke="#4dabf7"
            strokeWidth={1}
            strokeDasharray="4 3"
          />
          <text
            x={el.x + 8}
            y={el.y + 18}
            fill="#909296"
            fontSize={11}
            fontFamily="system-ui, sans-serif"
            style={{ userSelect: 'none' }}
          >
            {el.label || el.kind.replace('ctl-', '')}
          </text>
          <text
            x={el.x + 8}
            y={el.y + 36}
            fill="#e9ecef"
            fontSize={13}
            fontFamily="monospace"
            style={{ userSelect: 'none' }}
          >
            {controlSummary(el)}
          </text>
        </g>
      )
    }
  }

  const hoverable = runMode && elementVars(el).length > 0
  return (
    <g
      transform={transform}
      onMouseDown={handleDown}
      onMouseMove={hoverable ? (e) => onHover(el.id, e.clientX, e.clientY) : undefined}
      onMouseLeave={hoverable ? () => onHover(null, 0, 0) : undefined}
      style={{ cursor: runMode ? 'default' : 'move' }}
    >
      {body}
    </g>
  )
}

function SelectionHandles({
  el,
  view,
  onHandleDown,
  onEndpointDown,
  onRotateDown,
}: Readonly<{
  el: DiagramElement
  view: ViewTransform
  onHandleDown: (e: React.MouseEvent, handle: 'nw' | 'ne' | 'sw' | 'se') => void
  onEndpointDown: (e: React.MouseEvent, which: 1 | 2) => void
  onRotateDown: (e: React.MouseEvent) => void
}>) {
  const size = 8 / view.k
  const color = '#4dabf7'
  const { cx, cy } = elementCenter(el)
  const transform = el.rotation ? `rotate(${el.rotation} ${cx} ${cy})` : undefined

  if (el.kind === 'line') {
    return (
      <g transform={transform}>
        {[1, 2].map((which) => {
          const x = which === 1 ? el.x1 : el.x2
          const y = which === 1 ? el.y1 : el.y2
          return (
            <circle
              key={which}
              cx={x}
              cy={y}
              r={size * 0.7}
              fill={color}
              stroke="#1a1b1e"
              strokeWidth={1 / view.k}
              style={{ cursor: 'crosshair' }}
              onMouseDown={(e) => onEndpointDown(e, which as 1 | 2)}
            />
          )
        })}
      </g>
    )
  }

  const b = elementBounds(el)
  const handles: { id: 'nw' | 'ne' | 'sw' | 'se'; x: number; y: number; cursor: string }[] = [
    { id: 'nw', x: b.x, y: b.y, cursor: 'nwse-resize' },
    { id: 'ne', x: b.x + b.w, y: b.y, cursor: 'nesw-resize' },
    { id: 'sw', x: b.x, y: b.y + b.h, cursor: 'nesw-resize' },
    { id: 'se', x: b.x + b.w, y: b.y + b.h, cursor: 'nwse-resize' },
  ]
  return (
    <g transform={transform}>
      <rect
        x={b.x}
        y={b.y}
        width={b.w}
        height={b.h}
        fill="none"
        stroke={color}
        strokeWidth={1 / view.k}
        strokeDasharray={`${4 / view.k} ${3 / view.k}`}
        pointerEvents="none"
      />
      {el.kind !== 'label' &&
        handles.map((h) => (
          <rect
            key={h.id}
            x={h.x - size / 2}
            y={h.y - size / 2}
            width={size}
            height={size}
            fill={color}
            stroke="#1a1b1e"
            strokeWidth={1 / view.k}
            style={{ cursor: h.cursor }}
            onMouseDown={(e) => onHandleDown(e, h.id)}
          />
        ))}
      {/* Rotate handle above the top edge (Shift snaps to 15°). */}
      <line
        x1={b.x + b.w / 2}
        y1={b.y}
        x2={b.x + b.w / 2}
        y2={b.y - 22 / view.k}
        stroke={color}
        strokeWidth={1 / view.k}
        pointerEvents="none"
      />
      <circle
        cx={b.x + b.w / 2}
        cy={b.y - 22 / view.k}
        r={size * 0.7}
        fill="#1a1b1e"
        stroke={color}
        strokeWidth={1.5 / view.k}
        style={{ cursor: 'grab' }}
        onMouseDown={onRotateDown}
      />
    </g>
  )
}

/** Combined bounding box with corner handles for a multi-element selection. */
function GroupHandles({
  els,
  view,
  onHandleDown,
}: Readonly<{
  els: DiagramElement[]
  view: ViewTransform
  onHandleDown: (e: React.MouseEvent, handle: Handle) => void
}>) {
  const b = combinedBounds(els)
  const size = 8 / view.k
  const color = '#4dabf7'
  const handles: { id: Handle; x: number; y: number; cursor: string }[] = [
    { id: 'nw', x: b.x, y: b.y, cursor: 'nwse-resize' },
    { id: 'ne', x: b.x + b.w, y: b.y, cursor: 'nesw-resize' },
    { id: 'sw', x: b.x, y: b.y + b.h, cursor: 'nesw-resize' },
    { id: 'se', x: b.x + b.w, y: b.y + b.h, cursor: 'nwse-resize' },
  ]
  return (
    <>
      <rect
        x={b.x}
        y={b.y}
        width={b.w}
        height={b.h}
        fill="none"
        stroke={color}
        strokeWidth={1 / view.k}
        pointerEvents="none"
      />
      {handles.map((h) => (
        <rect
          key={h.id}
          x={h.x - size / 2}
          y={h.y - size / 2}
          width={size}
          height={size}
          fill={color}
          stroke="#1a1b1e"
          strokeWidth={1 / view.k}
          style={{ cursor: h.cursor }}
          onMouseDown={(e) => onHandleDown(e, h.id)}
        />
      ))}
    </>
  )
}

/** Run-mode hover tooltip listing the solved values an element references. */
function HoverTooltip({
  el,
  values,
  x,
  y,
}: Readonly<{
  el: DiagramElement | undefined
  values: Map<string, VariableResult>
  x: number
  y: number
}>) {
  if (!el) return null
  const vars = elementVars(el)
  if (vars.length === 0) return null
  return (
    <div
      style={{
        position: 'fixed',
        left: x + 14,
        top: y + 14,
        zIndex: 400,
        pointerEvents: 'none',
        background: '#1A1B1E',
        border: '1px solid #373A40',
        borderRadius: 6,
        padding: '6px 8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        fontSize: 12,
        fontFamily: 'system-ui, sans-serif',
        color: '#e9ecef',
        maxWidth: 260,
      }}
    >
      {vars.map((name) => {
        const v = values.get(name)
        const unit = v && v.units && v.units !== '-' ? ` ${v.units}` : ''
        const display = v ? v.name : name
        return (
          <div key={name} style={{ whiteSpace: 'nowrap' }}>
            <span style={{ color: '#909296' }}>{display} = </span>
            <span style={{ fontFamily: 'monospace', color: v ? '#69db7c' : '#868e96' }}>
              {v ? `${formatValue(v.value)}${unit}` : 'unsolved'}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Properties panel
// ---------------------------------------------------------------------------

const CONTROL_LABELS: Record<ControlElement['kind'], string> = {
  'ctl-input': 'Input',
  'ctl-output': 'Output',
  'ctl-dropdown': 'Dropdown',
  'ctl-checkbox': 'Checkbox',
  'ctl-slider': 'Slider',
}

function ControlFields({
  el,
  set,
}: Readonly<{ el: ControlElement; set: (patch: Partial<DiagramElement>) => void }>) {
  return (
    <>
      <TextInput
        label="Bound variable"
        description="A trailing $ binds a string variable"
        size="xs"
        value={el.varName}
        placeholder="e.g. T1 or fluid$"
        onChange={(e) => set({ varName: e.currentTarget.value })}
      />
      <TextInput
        label="Caption"
        size="xs"
        value={el.label}
        onChange={(e) => set({ label: e.currentTarget.value })}
      />
      {el.kind === 'ctl-input' && (
        <TextInput
          label="Default value"
          size="xs"
          value={el.value}
          onChange={(e) => set({ value: e.currentTarget.value })}
        />
      )}
      {el.kind === 'ctl-dropdown' && (
        <Textarea
          label="Options (one per line)"
          size="xs"
          autosize
          minRows={2}
          value={el.options.join('\n')}
          onChange={(e) =>
            set({
              options: e.currentTarget.value
                .split('\n')
                .map((o) => o.trim())
                .filter((o) => o !== ''),
            })
          }
        />
      )}
      {el.kind === 'ctl-checkbox' && (
        <Checkbox
          label="Checked by default"
          size="xs"
          checked={el.checked}
          onChange={(e) => set({ checked: e.currentTarget.checked })}
        />
      )}
      {el.kind === 'ctl-slider' && (
        <>
          <Group grow>
            <NumberInput
              label="Min"
              size="xs"
              value={el.min}
              onChange={(v) => set({ min: typeof v === 'number' ? v : el.min })}
            />
            <NumberInput
              label="Max"
              size="xs"
              value={el.max}
              onChange={(v) => set({ max: typeof v === 'number' ? v : el.max })}
            />
          </Group>
          <Group grow>
            <NumberInput
              label="Step"
              size="xs"
              min={0}
              value={el.step}
              onChange={(v) => set({ step: typeof v === 'number' && v > 0 ? v : el.step })}
            />
            <NumberInput
              label="Value"
              size="xs"
              value={el.value}
              onChange={(v) => set({ value: typeof v === 'number' ? v : el.value })}
            />
          </Group>
        </>
      )}
      <NumberInput
        label="Opacity"
        size="xs"
        min={0.1}
        max={1}
        step={0.1}
        value={el.opacity}
        onChange={(v) => set({ opacity: typeof v === 'number' ? v : el.opacity })}
      />
    </>
  )
}

function BindingFields({
  el,
  set,
}: Readonly<{ el: DiagramElement; set: (patch: Partial<DiagramElement>) => void }>) {
  const keys: (keyof AttributeBindings)[] =
    el.kind === 'line' || el.kind === 'label'
      ? ['dx', 'dy', 'rotation', 'opacity']
      : ['dx', 'dy', 'w', 'h', 'rotation', 'opacity']

  const setBind = (key: keyof AttributeBindings, value: string) =>
    set({ bind: { ...el.bind, [key]: value.trim() === '' ? undefined : value } })

  return (
    <>
      <Divider label="Run-mode bindings" labelPosition="left" />
      <Text size="10px" c="dimmed">
        Formulas of solved variables drive these attributes when you Solve in
        Run mode (e.g. <code>{'30*sin(theta)'}</code>). Δx/Δy offset the position.
      </Text>
      {keys.map((key) => (
        <TextInput
          key={key}
          label={BINDABLE_LABELS[key]}
          size="xs"
          placeholder="(static)"
          value={el.bind?.[key] ?? ''}
          onChange={(e) => setBind(key, e.currentTarget.value)}
          styles={{ input: { fontFamily: 'monospace' } }}
        />
      ))}
      {el.kind === 'line' && (
        <>
          <Checkbox
            label="Flow animation"
            size="xs"
            checked={!!el.flow}
            onChange={(e) =>
              set({ flow: e.currentTarget.checked ? { speed: el.flow?.speed ?? '1' } : undefined })
            }
          />
          {el.flow && (
            <TextInput
              label="Flow speed (formula; sign = direction)"
              size="xs"
              placeholder="e.g. m_dot or 2"
              value={el.flow.speed}
              onChange={(e) => set({ flow: { speed: e.currentTarget.value } })}
              styles={{ input: { fontFamily: 'monospace' } }}
            />
          )}
        </>
      )}
    </>
  )
}

/** Layers / outline panel (Story 10.3): reorder, rename, hide, lock elements. */
function LayersPanel({
  elements,
  selectedSet,
  onSelect,
  onFlag,
  onRename,
  onReorder,
}: Readonly<{
  elements: DiagramElement[]
  selectedSet: Set<string>
  onSelect: (id: string, additive: boolean) => void
  onFlag: (id: string, patch: Partial<DiagramElement>) => void
  onRename: (id: string, name: string) => void
  onReorder: (fromId: string, beforeId: string | null) => void
}>) {
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const ordered = [...elements].reverse() // top-most first

  if (elements.length === 0) {
    return (
      <Text size="xs" c="dimmed">
        No elements yet.
      </Text>
    )
  }

  return (
    <Stack gap={1}>
      {ordered.map((el) => (
        <Group
          key={el.id}
          gap={4}
          wrap="nowrap"
          draggable
          onDragStart={() => setDragId(el.id)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => {
            if (dragId && dragId !== el.id) onReorder(dragId, el.id)
            setDragId(null)
          }}
          onClick={(e) => onSelect(el.id, e.shiftKey || e.ctrlKey || e.metaKey)}
          style={{
            padding: '1px 3px',
            borderRadius: 4,
            cursor: 'pointer',
            background: selectedSet.has(el.id)
              ? 'var(--mantine-color-blue-light)'
              : undefined,
          }}
        >
          <IconGripVertical size={12} style={{ cursor: 'grab', opacity: 0.4, flexShrink: 0 }} />
          <ActionIcon
            size="xs"
            variant="subtle"
            color="gray"
            onClick={(e) => {
              e.stopPropagation()
              onFlag(el.id, { hidden: !el.hidden })
            }}
          >
            {el.hidden ? <IconEyeOff size={13} /> : <IconEye size={13} />}
          </ActionIcon>
          <ActionIcon
            size="xs"
            variant="subtle"
            color={el.locked ? 'orange' : 'gray'}
            onClick={(e) => {
              e.stopPropagation()
              onFlag(el.id, { locked: !el.locked })
            }}
          >
            {el.locked ? <IconLock size={13} /> : <IconLockOpen size={13} />}
          </ActionIcon>
          {renamingId === el.id ? (
            <TextInput
              size="xs"
              variant="unstyled"
              autoFocus
              defaultValue={el.name ?? ''}
              placeholder={elementLabel(el)}
              onClick={(e) => e.stopPropagation()}
              onBlur={(e) => {
                onRename(el.id, e.currentTarget.value)
                setRenamingId(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onRename(el.id, e.currentTarget.value)
                  setRenamingId(null)
                } else if (e.key === 'Escape') {
                  setRenamingId(null)
                }
                e.stopPropagation()
              }}
              style={{ flex: 1 }}
            />
          ) : (
            <Text
              size="xs"
              flex={1}
              truncate
              c={el.hidden ? 'dimmed' : undefined}
              onDoubleClick={(e) => {
                e.stopPropagation()
                setRenamingId(el.id)
              }}
            >
              {el.groupId ? '⛓ ' : ''}
              {elementLabel(el)}
            </Text>
          )}
        </Group>
      ))}
    </Stack>
  )
}

function PropertiesPanel({
  el,
  varNames,
  onChange,
  onDuplicate,
  onDelete,
  onZOrder,
}: Readonly<{
  el: DiagramElement
  varNames: string[]
  onChange: (next: DiagramElement) => void
  onDuplicate: () => void
  onDelete: () => void
  onZOrder: (direction: 'front' | 'back') => void
}>) {
  const set = (patch: Partial<DiagramElement>) =>
    onChange({ ...el, ...patch } as DiagramElement)

  return (
    <Stack gap="xs">
      <Text fw={600} size="sm" c="blue.4">
        {el.kind === 'icon'
          ? (libraryIcon(el.icon)?.label ?? 'Component')
          : isControl(el)
            ? CONTROL_LABELS[el.kind]
            : el.kind === 'chart'
              ? 'Chart'
              : el.kind}
      </Text>

      {isControl(el) && <ControlFields el={el} set={set} />}

      {el.kind === 'chart' && (
        <>
          <Select
            label="X-axis variable"
            size="xs"
            data={varNames}
            value={el.xVar || null}
            onChange={(v) => set({ xVar: v ?? '' })}
            searchable
          />
          <MultiSelect
            label="Y-axis variables"
            size="xs"
            data={varNames}
            value={el.yVars}
            onChange={(v) => set({ yVars: v })}
            searchable
          />
        </>
      )}

      {!isControl(el) && (
        <>
      {el.kind === 'label' && (
        <>
          <Textarea
            label="Text"
            description="Use {varname} to show a solved value in Run mode"
            size="xs"
            autosize
            minRows={2}
            value={el.text}
            onChange={(e) => set({ text: e.currentTarget.value })}
          />
          <Group grow>
            <NumberInput
              label="Font size"
              size="xs"
              min={6}
              max={96}
              value={el.fontSize}
              onChange={(v) => set({ fontSize: typeof v === 'number' ? v : el.fontSize })}
            />
            <Checkbox
              label="Bold"
              size="xs"
              mt={22}
              checked={el.bold}
              onChange={(e) => set({ bold: e.currentTarget.checked })}
            />
          </Group>
        </>
      )}

      {el.kind === 'line' && (
        <Checkbox
          label="Arrow head"
          size="xs"
          checked={el.arrow}
          onChange={(e) => set({ arrow: e.currentTarget.checked })}
        />
      )}

      {el.kind === 'rect' && (
        <NumberInput
          label="Corner radius"
          size="xs"
          min={0}
          value={el.rx}
          onChange={(v) => set({ rx: typeof v === 'number' ? v : el.rx })}
        />
      )}

      <ColorInput
        label={el.kind === 'label' ? 'Color' : 'Stroke color'}
        size="xs"
        value={el.stroke}
        onChange={(stroke) => set({ stroke })}
      />
      {(el.kind === 'rect' || el.kind === 'ellipse' || el.kind === 'icon') && (
        <ColorInput
          label="Fill color"
          size="xs"
          value={el.fill === 'transparent' ? '' : el.fill}
          placeholder="transparent"
          onChange={(fill) => set({ fill: fill || 'transparent' })}
        />
      )}
      {el.kind !== 'label' && (
        <NumberInput
          label="Stroke width"
          size="xs"
          min={0.5}
          step={0.5}
          value={el.strokeWidth}
          onChange={(v) => set({ strokeWidth: typeof v === 'number' ? v : el.strokeWidth })}
        />
      )}
      <Group grow>
        <NumberInput
          label="Rotation °"
          size="xs"
          min={-360}
          max={360}
          value={el.rotation}
          onChange={(v) => set({ rotation: typeof v === 'number' ? v : el.rotation })}
        />
        <NumberInput
          label="Opacity"
          size="xs"
          min={0.1}
          max={1}
          step={0.1}
          value={el.opacity}
          onChange={(v) => set({ opacity: typeof v === 'number' ? v : el.opacity })}
        />
      </Group>
      <BindingFields el={el} set={set} />
        </>
      )}

      <Divider />
      <Group gap="xs">
        <Tooltip label="Bring to front">
          <ActionIcon variant="default" size="md" onClick={() => onZOrder('front')}>
            <IconStackPop size={16} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Send to back">
          <ActionIcon variant="default" size="md" onClick={() => onZOrder('back')}>
            <IconStackPush size={16} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Duplicate">
          <ActionIcon variant="default" size="md" onClick={onDuplicate}>
            <IconCopy size={16} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Delete (Del)">
          <ActionIcon variant="default" color="red" size="md" onClick={onDelete}>
            <IconTrash size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Stack>
  )
}

// ---------------------------------------------------------------------------
// Main tab
// ---------------------------------------------------------------------------

type Tool =
  | 'select'
  | 'pan'
  | 'line'
  | 'arrow'
  | 'rect'
  | 'ellipse'
  | 'label'
  | 'chart'
  | ControlElement['kind']
  | `icon:${string}`

interface Props {
  variables: VariableResult[]
  /** Solved parametric-table runs for playback animation (Story 6.4). */
  runs?: DiagramRun[]
  /** Reports the `var = value` lines contributed by input-type controls. */
  onBindingsChange?: (lines: string[]) => void
}

const PLAYBACK_SPEEDS: { label: string; value: string; ms: number }[] = [
  { label: '0.5×', value: 'slow', ms: 1000 },
  { label: '1×', value: 'normal', ms: 550 },
  { label: '2×', value: 'fast', ms: 280 },
]

export default function DiagramTab({ variables, runs = [], onBindingsChange }: Readonly<Props>) {
  const [state, setStateRaw] = useState<DiagramState>(loadState)
  const [tool, setTool] = useState<Tool>('select')
  const [mode, setMode] = useState<'develop' | 'run'>('develop')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [view, setView] = useState<ViewTransform>({ x: 60, y: 40, k: 1 })
  const [drag, setDrag] = useState<DragState | null>(null)
  const [hover, setHover] = useState<{ id: string; x: number; y: number } | null>(null)
  const [marquee, setMarquee] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [guides, setGuides] = useState<{ v: number[]; h: number[] } | null>(null)
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null)
  const [showLayers, setShowLayers] = useState(true)

  // ── Undo/redo history (Story 10.1) ───────────────────────────────────
  // Refs (not state) hold the stacks; every history change rides on a state
  // change that re-renders, so the buttons reflect the latest stack depth.
  const pastRef = useRef<DiagramState[]>([])
  const futureRef = useRef<DiagramState[]>([])
  const coalesceRef = useRef<{ key: string; time: number }>({ key: '', time: 0 })
  const stateRef = useRef(state)
  stateRef.current = state
  const marqueeRef = useRef(marquee)
  marqueeRef.current = marquee
  const gestureBaseRef = useRef<DiagramState | null>(null)
  const clipboardRef = useRef<DiagramElement[]>([])

  /** Commit a state change to history (with optional coalescing of rapid edits). */
  const commit = useCallback(
    (updater: DiagramState | ((s: DiagramState) => DiagramState), coalesceKey?: string) => {
      setStateRaw((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater
        if (next === prev) return prev
        const now = Date.now()
        const c = coalesceRef.current
        if (coalesceKey && coalesceKey === c.key && now - c.time < 700) {
          c.time = now // same rapid edit: extend the existing history entry
        } else {
          pastRef.current = [...pastRef.current, prev].slice(-HISTORY_LIMIT)
          futureRef.current = []
          coalesceRef.current = { key: coalesceKey ?? '', time: now }
        }
        return next
      })
    },
    [],
  )

  const undo = useCallback(() => {
    if (pastRef.current.length === 0) return
    const prev = pastRef.current[pastRef.current.length - 1]
    pastRef.current = pastRef.current.slice(0, -1)
    futureRef.current = [stateRef.current, ...futureRef.current].slice(0, HISTORY_LIMIT)
    coalesceRef.current = { key: '', time: 0 }
    setStateRaw(prev)
    setSelectedIds([])
  }, [])

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return
    const next = futureRef.current[0]
    futureRef.current = futureRef.current.slice(1)
    pastRef.current = [...pastRef.current, stateRef.current].slice(-HISTORY_LIMIT)
    coalesceRef.current = { key: '', time: 0 }
    setStateRaw(next)
    setSelectedIds([])
  }, [])

  /** End a drag/create gesture: record one history entry for the whole gesture. */
  const endGesture = useCallback(() => {
    const base = gestureBaseRef.current
    gestureBaseRef.current = null
    if (base && elementsChanged(base, stateRef.current)) {
      pastRef.current = [...pastRef.current, base].slice(-HISTORY_LIMIT)
      futureRef.current = []
      coalesceRef.current = { key: '', time: 0 }
    }
  }, [])

  // Playback: null = show the live single solve; a number = that table run.
  const [playIndex, setPlayIndex] = useState<number | null>(null)
  const [playing, setPlaying] = useState(false)
  const [loop, setLoop] = useState(true)
  const [speed, setSpeed] = useState('normal')
  const svgRef = useRef<SVGSVGElement | null>(null)

  const runMode = mode === 'run'
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])
  const selectedElements = state.elements.filter((el) => selectedSet.has(el.id))
  const selected = selectedElements.length === 1 ? selectedElements[0] : null
  const editingLabel =
    editingLabelId !== null
      ? (state.elements.find((e) => e.id === editingLabelId && e.kind === 'label') as
          | LabelElement
          | undefined)
      : undefined
  const editLabelWidth = editingLabel
    ? Math.max(1, ...editingLabel.text.split('\n').map((l) => l.length)) *
      editingLabel.fontSize *
      0.62
    : 0

  // The active run during playback (clamped); null means use the live solve.
  const activeIndex =
    playIndex !== null && runs.length > 0 ? Math.min(playIndex, runs.length - 1) : null
  const activeRun = activeIndex !== null ? runs[activeIndex] : null

  // Variable names available to chart pickers: from the table runs, else the
  // live solve.
  const varNames = useMemo(() => {
    const names = new Set<string>()
    for (const r of runs) for (const k of Object.keys(r.values)) names.add(k)
    if (names.size === 0) for (const v of variables) names.add(v.name)
    return [...names].sort((a, b) => a.localeCompare(b))
  }, [runs, variables])

  // Units come from the last live solve even while scrubbing table runs (the
  // run values are unit-less numbers).
  const liveUnits = useMemo(() => {
    const map = new Map<string, string>()
    for (const v of variables) map.set(v.name.toLowerCase(), v.units)
    return map
  }, [variables])

  const valueMap = useMemo(() => {
    const map = new Map<string, VariableResult>()
    if (activeRun) {
      for (const [name, value] of Object.entries(activeRun.values)) {
        const key = name.toLowerCase()
        map.set(key, { name, value, units: liveUnits.get(key) ?? '' })
      }
    } else {
      for (const v of variables) map.set(v.name.toLowerCase(), v)
    }
    return map
  }, [activeRun, variables, liveUnits])

  const numValues = useMemo(() => {
    const map = new Map<string, number>()
    if (activeRun) {
      for (const [name, value] of Object.entries(activeRun.values)) {
        map.set(name.toLowerCase(), value)
      }
    } else {
      for (const v of variables) map.set(v.name.toLowerCase(), v.value)
    }
    return map
  }, [activeRun, variables])

  const onHover = useCallback((id: string | null, x: number, y: number) => {
    setHover(id ? { id, x, y } : null)
  }, [])

  const onSelectLayer = useCallback((id: string, additive: boolean) => {
    const grp = expandGroups([id], stateRef.current.elements)
    setSelectedIds((prev) => {
      if (additive) {
        const all = grp.every((g) => prev.includes(g))
        return all ? prev.filter((p) => !grp.includes(p)) : [...new Set([...prev, ...grp])]
      }
      return grp
    })
  }, [])

  // ── Playback (Story 6.4) ─────────────────────────────────────────────
  const runCount = runs.length

  useEffect(() => {
    if (!playing || runCount === 0) return
    const ms = PLAYBACK_SPEEDS.find((s) => s.value === speed)?.ms ?? 550
    const id = setInterval(() => {
      setPlayIndex((prev) => {
        const next = (prev ?? -1) + 1
        return next >= runCount ? (loop ? 0 : runCount - 1) : next
      })
    }, ms)
    return () => clearInterval(id)
  }, [playing, runCount, speed, loop])

  // Stop at the final run when not looping.
  useEffect(() => {
    if (!loop && playing && playIndex !== null && playIndex >= runCount - 1) {
      setPlaying(false)
    }
  }, [playIndex, loop, playing, runCount])

  // Leaving Run mode or losing the runs returns to the live solve.
  useEffect(() => {
    if (!runMode || runCount === 0) {
      setPlaying(false)
      setPlayIndex(null)
    }
  }, [runMode, runCount])

  const togglePlay = () => {
    if (runCount === 0) return
    if (playIndex === null) setPlayIndex(0)
    setPlaying((p) => !p)
  }

  const stepRun = (dir: 1 | -1) => {
    if (runCount === 0) return
    setPlaying(false)
    setPlayIndex((prev) => {
      const base = prev ?? 0
      return Math.max(0, Math.min(runCount - 1, base + dir))
    })
  }

  const goLive = () => {
    setPlaying(false)
    setPlayIndex(null)
  }

  // Persist on every change.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Quota exceeded: diagram simply won't persist.
    }
  }, [state])

  // Report the input-control bindings to the host so they participate in
  // Check/Solve (Story 6.2). Joined string compared to avoid redundant calls.
  const bindingsKey = useMemo(
    () => controlBindings(state.elements).join('\n'),
    [state.elements],
  )
  useEffect(() => {
    onBindingsChange?.(bindingsKey === '' ? [] : bindingsKey.split('\n'))
  }, [bindingsKey, onBindingsChange])

  // Run-mode control interaction is not design editing → transient (no history).
  const onControlValue = useCallback(
    (id: string, patch: Partial<ControlElement>) => {
      setStateRaw((s) => ({
        ...s,
        elements: s.elements.map((el) =>
          el.id === id ? ({ ...el, ...patch } as DiagramElement) : el,
        ),
      }))
    },
    [],
  )

  const snap = useCallback(
    (v: number) => (state.snap ? Math.round(v / state.gridSize) * state.gridSize : v),
    [state.snap, state.gridSize],
  )

  const toWorld = useCallback(
    (clientX: number, clientY: number) => {
      const rect = svgRef.current?.getBoundingClientRect()
      if (!rect) return { x: 0, y: 0 }
      return {
        x: (clientX - rect.left - view.x) / view.k,
        y: (clientY - rect.top - view.y) / view.k,
      }
    },
    [view],
  )

  /** History-recording element update (property panel, nudge); coalesces rapid edits. */
  const updateElement = useCallback(
    (id: string, next: DiagramElement, coalesceKey?: string) => {
      commit(
        (s) => ({ ...s, elements: s.elements.map((el) => (el.id === id ? next : el)) }),
        coalesceKey,
      )
    },
    [commit],
  )

  /** Transient element update (during drag); history is recorded once on gesture end. */
  const updateElementLive = useCallback((id: string, next: DiagramElement) => {
    setStateRaw((s) => ({
      ...s,
      elements: s.elements.map((el) => (el.id === id ? next : el)),
    }))
  }, [])

  const deleteSelected = useCallback(() => {
    if (selectedIds.length === 0) return
    commit((s) => ({ ...s, elements: s.elements.filter((el) => !selectedSet.has(el.id)) }))
    setSelectedIds([])
  }, [selectedIds, selectedSet, commit])

  const duplicateElements = useCallback(
    (els: DiagramElement[], offset: number) => {
      if (els.length === 0) return
      const copies = els.map((el) => {
        const copy = structuredClone(el)
        copy.id = crypto.randomUUID()
        return translateElement(copy, offset, offset)
      })
      commit((s) => ({ ...s, elements: [...s.elements, ...copies] }))
      setSelectedIds(copies.map((c) => c.id))
    },
    [commit],
  )

  const duplicateSelected = useCallback(() => {
    duplicateElements(selectedElements, state.gridSize * 2)
  }, [duplicateElements, selectedElements, state.gridSize])

  const copySelected = useCallback(() => {
    clipboardRef.current = selectedElements.map((el) => structuredClone(el))
  }, [selectedElements])

  const cutSelected = useCallback(() => {
    if (selectedElements.length === 0) return
    clipboardRef.current = selectedElements.map((el) => structuredClone(el))
    deleteSelected()
  }, [selectedElements, deleteSelected])

  const pasteClipboard = useCallback(() => {
    const els = clipboardRef.current
    if (els.length === 0) return
    duplicateElements(els, state.gridSize * 2)
  }, [duplicateElements, state.gridSize])

  const zOrder = useCallback(
    (direction: 'front' | 'back') => {
      if (selectedIds.length === 0) return
      commit((s) => {
        const picked = s.elements.filter((e) => selectedSet.has(e.id))
        const rest = s.elements.filter((e) => !selectedSet.has(e.id))
        return {
          ...s,
          elements: direction === 'front' ? [...rest, ...picked] : [...picked, ...rest],
        }
      })
    },
    [selectedIds, selectedSet, commit],
  )

  // ── alignment & distribution (Story 10.2) ────────────────────────────

  type AlignMode = 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom'

  const alignSelection = useCallback(
    (mode: AlignMode) => {
      if (selectedElements.length < 2) return
      const box = combinedBounds(selectedElements)
      commit((s) => ({
        ...s,
        elements: s.elements.map((el) => {
          if (!selectedSet.has(el.id)) return el
          const b = elementBounds(el)
          let dx = 0
          let dy = 0
          if (mode === 'left') dx = box.x - b.x
          else if (mode === 'right') dx = box.x + box.w - (b.x + b.w)
          else if (mode === 'hcenter') dx = box.x + box.w / 2 - (b.x + b.w / 2)
          else if (mode === 'top') dy = box.y - b.y
          else if (mode === 'bottom') dy = box.y + box.h - (b.y + b.h)
          else dy = box.y + box.h / 2 - (b.y + b.h / 2)
          return translateElement(el, dx, dy)
        }),
      }))
    },
    [selectedElements, selectedSet, commit],
  )

  const distributeSelection = useCallback(
    (axis: 'h' | 'v') => {
      if (selectedElements.length < 3) return
      const items = selectedElements.map((el) => ({ el, b: elementBounds(el) }))
      const center = (b: Box) => (axis === 'h' ? b.x + b.w / 2 : b.y + b.h / 2)
      items.sort((a, c) => center(a.b) - center(c.b))
      const first = center(items[0].b)
      const last = center(items[items.length - 1].b)
      const step = (last - first) / (items.length - 1)
      const moves = new Map<string, { dx: number; dy: number }>()
      items.forEach((it, i) => {
        if (i === 0 || i === items.length - 1) return
        const delta = first + step * i - center(it.b)
        moves.set(it.el.id, axis === 'h' ? { dx: delta, dy: 0 } : { dx: 0, dy: delta })
      })
      commit((s) => ({
        ...s,
        elements: s.elements.map((el) => {
          const m = moves.get(el.id)
          return m ? translateElement(el, m.dx, m.dy) : el
        }),
      }))
    },
    [selectedElements, commit],
  )

  // ── grouping, lock/hide, layers (Story 10.3) ─────────────────────────

  const groupSelection = useCallback(() => {
    if (selectedElements.length < 2) return
    const gid = crypto.randomUUID()
    commit((s) => ({
      ...s,
      elements: s.elements.map((el) =>
        selectedSet.has(el.id) ? ({ ...el, groupId: gid } as DiagramElement) : el,
      ),
    }))
  }, [selectedElements, selectedSet, commit])

  const ungroupSelection = useCallback(() => {
    if (selectedElements.length === 0) return
    commit((s) => ({
      ...s,
      elements: s.elements.map((el) =>
        selectedSet.has(el.id) && el.groupId
          ? ({ ...el, groupId: undefined } as DiagramElement)
          : el,
      ),
    }))
  }, [selectedElements, selectedSet, commit])

  const setElementFlag = useCallback(
    (id: string, patch: Partial<DiagramElement>, coalesceKey?: string) => {
      commit(
        (s) => ({
          ...s,
          elements: s.elements.map((el) =>
            el.id === id ? ({ ...el, ...patch } as DiagramElement) : el,
          ),
        }),
        coalesceKey,
      )
    },
    [commit],
  )

  /** Reorder the z-stack: move `fromId` to just before `beforeId` (or to the end). */
  const reorderElement = useCallback(
    (fromId: string, beforeId: string | null) => {
      commit((s) => {
        const from = s.elements.find((e) => e.id === fromId)
        if (!from) return s
        const without = s.elements.filter((e) => e.id !== fromId)
        const idx = beforeId ? without.findIndex((e) => e.id === beforeId) : without.length
        const at = idx === -1 ? without.length : idx
        return { ...s, elements: [...without.slice(0, at), from, ...without.slice(at)] }
      })
    },
    [commit],
  )

  // ── element creation ─────────────────────────────────────────────────

  const createElement = useCallback(
    (worldX: number, worldY: number): DiagramElement | null => {
      const x = snap(worldX)
      const y = snap(worldY)
      const id = crypto.randomUUID()
      const base = { id, rotation: 0, ...DEFAULT_STYLE }
      if (tool === 'line' || tool === 'arrow') {
        return { ...base, kind: 'line', x1: x, y1: y, x2: x, y2: y, arrow: tool === 'arrow' }
      }
      if (tool === 'rect') {
        return { ...base, kind: 'rect', x, y, w: 0, h: 0, rx: 0 }
      }
      if (tool === 'ellipse') {
        return { ...base, kind: 'ellipse', x, y, w: 0, h: 0 }
      }
      if (tool === 'label') {
        return { ...base, kind: 'label', x, y, text: 'Label', fontSize: 16, bold: false }
      }
      if (tool === 'chart') {
        return { ...base, kind: 'chart', x, y, w: 240, h: 160, xVar: '', yVars: [] }
      }
      if (tool.startsWith('icon:')) {
        const iconId = tool.slice(5)
        return { ...base, kind: 'icon', icon: iconId, x, y, w: 100, h: 100 }
      }
      const ctlBase = { ...base, x, y, varName: '' }
      if (tool === 'ctl-input') {
        return { ...ctlBase, kind: 'ctl-input', w: 150, h: 48, label: 'Input', value: '' }
      }
      if (tool === 'ctl-output') {
        return { ...ctlBase, kind: 'ctl-output', w: 150, h: 48, label: 'Output' }
      }
      if (tool === 'ctl-dropdown') {
        return {
          ...ctlBase,
          kind: 'ctl-dropdown',
          w: 160,
          h: 48,
          label: 'Select',
          options: ['Option A', 'Option B'],
          value: '',
        }
      }
      if (tool === 'ctl-checkbox') {
        return { ...ctlBase, kind: 'ctl-checkbox', w: 150, h: 30, label: 'Option', checked: false }
      }
      if (tool === 'ctl-slider') {
        return {
          ...ctlBase,
          kind: 'ctl-slider',
          w: 190,
          h: 52,
          label: 'Slider',
          min: 0,
          max: 100,
          step: 1,
          value: 50,
        }
      }
      return null
    },
    [tool, snap],
  )

  // ── mouse interactions ───────────────────────────────────────────────

  const startPan = (e: React.MouseEvent) => {
    setDrag({ type: 'pan', startClientX: e.clientX, startClientY: e.clientY, startView: view })
  }

  const onBackgroundDown = (e: React.MouseEvent) => {
    // Middle mouse pans regardless of tool/mode.
    if (e.button === 1) {
      e.preventDefault()
      startPan(e)
      return
    }
    if (e.button !== 0) return
    if (runMode || tool === 'pan') {
      startPan(e)
      return
    }
    if (tool === 'select') {
      // Rubber-band marquee; Shift/Ctrl keeps the existing selection (additive).
      const additive = e.shiftKey || e.ctrlKey || e.metaKey
      if (!additive) setSelectedIds([])
      const world = toWorld(e.clientX, e.clientY)
      setMarquee({ x: world.x, y: world.y, w: 0, h: 0 })
      setDrag({ type: 'marquee', startX: world.x, startY: world.y, additive })
      return
    }
    // A drawing tool: create a new element (one gesture in history).
    gestureBaseRef.current = stateRef.current
    const world = toWorld(e.clientX, e.clientY)
    const el = createElement(world.x, world.y)
    if (!el) return
    setStateRaw((s) => ({ ...s, elements: [...s.elements, el] }))
    setSelectedIds([el.id])
    if (el.kind === 'label' || el.kind === 'icon' || el.kind === 'chart' || isControl(el)) {
      setDrag({ type: 'move', startX: world.x, startY: world.y, originals: [el] })
    } else {
      setDrag({ type: 'create', id: el.id, startX: snap(world.x), startY: snap(world.y) })
    }
  }

  const onElementDown = (e: React.MouseEvent, el: DiagramElement) => {
    if (e.button !== 0 || tool !== 'select' || el.locked) return
    e.stopPropagation()
    const additive = e.shiftKey || e.ctrlKey || e.metaKey
    const els = stateRef.current.elements
    // Clicking any group member selects the whole group.
    const clickGroup = expandGroups([el.id], els)
    let ids: string[]
    if (additive) {
      const allSelected = clickGroup.every((id) => selectedSet.has(id))
      ids = allSelected
        ? selectedIds.filter((id) => !clickGroup.includes(id))
        : [...new Set([...selectedIds, ...clickGroup])]
    } else {
      ids = clickGroup.every((id) => selectedSet.has(id)) ? selectedIds : clickGroup
    }
    setSelectedIds(ids)
    if (ids.length === 0) return
    // Drag moves the whole current selection (locked elements excluded).
    gestureBaseRef.current = stateRef.current
    const originals = els.filter((x) => ids.includes(x.id) && !x.locked)
    const world = toWorld(e.clientX, e.clientY)
    setDrag({ type: 'move', startX: world.x, startY: world.y, originals })
  }

  const onHandleDown = (e: React.MouseEvent, handle: Handle) => {
    e.stopPropagation()
    gestureBaseRef.current = stateRef.current
    if (selectedElements.length > 1) {
      setDrag({
        type: 'groupResize',
        handle,
        originals: selectedElements,
        bbox: combinedBounds(selectedElements),
      })
    } else if (selected) {
      setDrag({ type: 'resize', id: selected.id, handle, original: selected })
    }
  }

  const onEndpointDown = (e: React.MouseEvent, which: 1 | 2) => {
    if (!selected) return
    e.stopPropagation()
    gestureBaseRef.current = stateRef.current
    setDrag({ type: 'endpoint', id: selected.id, which })
  }

  const onRotateDown = (e: React.MouseEvent) => {
    if (!selected) return
    e.stopPropagation()
    gestureBaseRef.current = stateRef.current
    const { cx, cy } = elementCenter(selected)
    setDrag({ type: 'rotate', id: selected.id, original: selected, cx, cy })
  }

  const applyMove = useCallback(
    (d: Extract<DragState, { type: 'move' }>, world: { x: number; y: number }) => {
      const ids = new Set(d.originals.map((o) => o.id))
      const baseBox = combinedBounds(d.originals)
      let dx = world.x - d.startX
      let dy = world.y - d.startY
      let vGuides: number[] = []
      let hGuides: number[] = []
      if (state.snap) {
        // Smart guides first: align to other elements' edges/centers.
        const statics = stateRef.current.elements
          .filter((e) => !ids.has(e.id))
          .map(elementBounds)
        const moving = { x: baseBox.x + dx, y: baseBox.y + dy, w: baseBox.w, h: baseBox.h }
        const sr = computeSnap(moving, statics, SNAP_THRESHOLD_PX / view.k)
        dx = sr.vGuides.length ? dx + sr.dx : Math.round(dx / state.gridSize) * state.gridSize
        dy = sr.hGuides.length ? dy + sr.dy : Math.round(dy / state.gridSize) * state.gridSize
        vGuides = sr.vGuides
        hGuides = sr.hGuides
      }
      setGuides(vGuides.length || hGuides.length ? { v: vGuides, h: hGuides } : null)
      setStateRaw((s) => {
        const moved = new Map(
          d.originals.map((orig) => [orig.id, translateElement(orig, dx, dy)]),
        )
        return { ...s, elements: s.elements.map((el) => moved.get(el.id) ?? el) }
      })
    },
    [state.snap, state.gridSize, view.k],
  )

  const applyCreate = useCallback(
    (d: Extract<DragState, { type: 'create' }>, world: { x: number; y: number }) => {
      const el = stateRef.current.elements.find((e) => e.id === d.id)
      if (!el) return
      const wx = snap(world.x)
      const wy = snap(world.y)
      if (el.kind === 'line') {
        updateElementLive(d.id, { ...el, x2: wx, y2: wy })
      } else if (el.kind === 'rect' || el.kind === 'ellipse') {
        updateElementLive(d.id, {
          ...el,
          x: Math.min(d.startX, wx),
          y: Math.min(d.startY, wy),
          w: Math.abs(wx - d.startX),
          h: Math.abs(wy - d.startY),
        })
      }
    },
    [snap, updateElementLive],
  )

  const applyResize = useCallback(
    (d: Extract<DragState, { type: 'resize' }>, world: { x: number; y: number }, lockAspect: boolean) => {
      const orig = d.original
      if (orig.kind === 'line' || orig.kind === 'label') return
      const b = { x: orig.x, y: orig.y, w: orig.w, h: orig.h }
      const fixedX = d.handle === 'nw' || d.handle === 'sw' ? b.x + b.w : b.x
      const fixedY = d.handle === 'nw' || d.handle === 'ne' ? b.y + b.h : b.y
      const wx = snap(world.x)
      const wy = snap(world.y)
      let newW = Math.max(state.gridSize, Math.abs(wx - fixedX))
      let newH = Math.max(state.gridSize, Math.abs(wy - fixedY))
      if (lockAspect && b.w > 0 && b.h > 0) {
        // Hold Shift: preserve the original aspect ratio.
        const ratio = b.w / b.h
        if (newW / b.w >= newH / b.h) newH = newW / ratio
        else newW = newH * ratio
      }
      const dirX = Math.sign(wx - fixedX) || 1
      const dirY = Math.sign(wy - fixedY) || 1
      const cornerX = fixedX + dirX * newW
      const cornerY = fixedY + dirY * newH
      updateElementLive(d.id, {
        ...orig,
        x: Math.min(fixedX, cornerX),
        y: Math.min(fixedY, cornerY),
        w: newW,
        h: newH,
      })
    },
    [snap, state.gridSize, updateElementLive],
  )

  const applyGroupResize = useCallback(
    (d: Extract<DragState, { type: 'groupResize' }>, world: { x: number; y: number }, lockAspect: boolean) => {
      const { bbox, handle } = d
      const fixedX = handle === 'nw' || handle === 'sw' ? bbox.x + bbox.w : bbox.x
      const fixedY = handle === 'nw' || handle === 'ne' ? bbox.y + bbox.h : bbox.y
      const wx = snap(world.x)
      const wy = snap(world.y)
      let sx = bbox.w === 0 ? 1 : Math.max(0.05, Math.abs(wx - fixedX) / bbox.w)
      let sy = bbox.h === 0 ? 1 : Math.max(0.05, Math.abs(wy - fixedY) / bbox.h)
      if (lockAspect) {
        const s = Math.max(sx, sy)
        sx = s
        sy = s
      }
      setStateRaw((s) => {
        const scaled = new Map(
          d.originals.map((orig) => [orig.id, scaleElement(orig, fixedX, fixedY, sx, sy)]),
        )
        return { ...s, elements: s.elements.map((el) => scaled.get(el.id) ?? el) }
      })
    },
    [snap],
  )

  const applyEndpoint = useCallback(
    (d: Extract<DragState, { type: 'endpoint' }>, world: { x: number; y: number }) => {
      const el = stateRef.current.elements.find((e) => e.id === d.id)
      if (!el || el.kind !== 'line') return
      const wx = snap(world.x)
      const wy = snap(world.y)
      const next: LineElement =
        d.which === 1 ? { ...el, x1: wx, y1: wy } : { ...el, x2: wx, y2: wy }
      updateElementLive(d.id, next)
    },
    [snap, updateElementLive],
  )

  const applyMarquee = useCallback(
    (d: Extract<DragState, { type: 'marquee' }>, world: { x: number; y: number }) => {
      setMarquee({
        x: Math.min(d.startX, world.x),
        y: Math.min(d.startY, world.y),
        w: Math.abs(world.x - d.startX),
        h: Math.abs(world.y - d.startY),
      })
    },
    [],
  )

  const applyRotate = useCallback(
    (d: Extract<DragState, { type: 'rotate' }>, world: { x: number; y: number }, snap15: boolean) => {
      let angle = (Math.atan2(world.y - d.cy, world.x - d.cx) * 180) / Math.PI + 90
      angle = snap15 ? Math.round(angle / 15) * 15 : Math.round(angle)
      // Normalize to [-180, 180].
      if (angle > 180) angle -= 360
      if (angle < -180) angle += 360
      updateElementLive(d.id, { ...d.original, rotation: angle })
    },
    [updateElementLive],
  )

  useEffect(() => {
    if (!drag) return
    const onMove = (e: MouseEvent) => {
      if (drag.type === 'pan') {
        setView({
          ...drag.startView,
          x: drag.startView.x + (e.clientX - drag.startClientX),
          y: drag.startView.y + (e.clientY - drag.startClientY),
        })
        return
      }
      const world = toWorld(e.clientX, e.clientY)
      const shift = e.shiftKey
      if (drag.type === 'move') applyMove(drag, world)
      else if (drag.type === 'create') applyCreate(drag, world)
      else if (drag.type === 'resize') applyResize(drag, world, shift)
      else if (drag.type === 'groupResize') applyGroupResize(drag, world, shift)
      else if (drag.type === 'endpoint') applyEndpoint(drag, world)
      else if (drag.type === 'rotate') applyRotate(drag, world, shift)
      else if (drag.type === 'marquee') applyMarquee(drag, world)
    }
    const onUp = () => {
      if (drag.type === 'create') {
        // A click without a drag: give the shape a sensible default size.
        setStateRaw((s) => ({
          ...s,
          elements: s.elements.map((el) => {
            if (el.id !== drag.id) return el
            if (el.kind === 'line' && Math.hypot(el.x2 - el.x1, el.y2 - el.y1) < 4) {
              return { ...el, x2: el.x1 + 80 }
            }
            if ((el.kind === 'rect' || el.kind === 'ellipse') && (el.w < 4 || el.h < 4)) {
              return { ...el, w: 100, h: 60 }
            }
            return el
          }),
        }))
        endGesture()
        setTool('select')
      } else if (drag.type === 'move') {
        endGesture()
        if (tool !== 'select') setTool('select')
      } else if (
        drag.type === 'resize' ||
        drag.type === 'groupResize' ||
        drag.type === 'endpoint' ||
        drag.type === 'rotate'
      ) {
        endGesture()
      } else if (drag.type === 'marquee') {
        const box = marqueeRef.current
        if (box && (box.w > 2 || box.h > 2)) {
          const els = stateRef.current.elements
          const hit = els
            .filter((el) => !el.locked && !el.hidden)
            .filter((el) => {
              const b = elementBounds(el)
              return (
                b.x < box.x + box.w &&
                b.x + b.w > box.x &&
                b.y < box.y + box.h &&
                b.y + b.h > box.y
              )
            })
            .map((el) => el.id)
          const expanded = expandGroups(hit, els)
          setSelectedIds((prev) =>
            drag.additive ? [...new Set([...prev, ...expanded])] : expanded,
          )
        }
        setMarquee(null)
      }
      setGuides(null)
      setDrag(null)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [
    drag,
    toWorld,
    applyMove,
    applyCreate,
    applyResize,
    applyGroupResize,
    applyEndpoint,
    applyRotate,
    applyMarquee,
    endGesture,
    tool,
  ])

  const onWheel = (e: React.WheelEvent) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const factor = Math.exp(-e.deltaY * 0.0012)
    const k = Math.min(5, Math.max(0.15, view.k * factor))
    const px = e.clientX - rect.left
    const py = e.clientY - rect.top
    // Keep the world point under the cursor stationary.
    setView({
      k,
      x: px - ((px - view.x) / view.k) * k,
      y: py - ((py - view.y) / view.k) * k,
    })
  }

  const zoomToFit = () => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect || state.elements.length === 0) {
      setView({ x: 60, y: 40, k: 1 })
      return
    }
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const el of state.elements) {
      const b = elementBounds(el)
      minX = Math.min(minX, b.x)
      minY = Math.min(minY, b.y)
      maxX = Math.max(maxX, b.x + b.w)
      maxY = Math.max(maxY, b.y + b.h)
    }
    const pad = 40
    const w = Math.max(1, maxX - minX)
    const h = Math.max(1, maxY - minY)
    const k = Math.min(5, Math.min((rect.width - pad * 2) / w, (rect.height - pad * 2) / h))
    setView({
      k,
      x: (rect.width - w * k) / 2 - minX * k,
      y: (rect.height - h * k) / 2 - minY * k,
    })
  }

  // ── keyboard shortcuts ───────────────────────────────────────────────

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
      const mod = e.ctrlKey || e.metaKey
      // Undo/redo and clipboard work regardless of mode.
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
        return
      }
      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        redo()
        return
      }
      if (runMode) return
      if (mod && e.key.toLowerCase() === 'c') {
        copySelected()
        return
      }
      if (mod && e.key.toLowerCase() === 'x') {
        e.preventDefault()
        cutSelected()
        return
      }
      if (mod && e.key.toLowerCase() === 'v') {
        e.preventDefault()
        pasteClipboard()
        return
      }
      if (mod && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        duplicateSelected()
        return
      }
      if (mod && e.key.toLowerCase() === 'a') {
        e.preventDefault()
        setSelectedIds(state.elements.filter((el) => !el.locked).map((el) => el.id))
        return
      }
      if (mod && e.key.toLowerCase() === 'g') {
        e.preventDefault()
        if (e.shiftKey) ungroupSelection()
        else groupSelection()
        return
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0) {
        e.preventDefault()
        deleteSelected()
      } else if (e.key === 'Escape') {
        setSelectedIds([])
        setTool('select')
      } else if (e.key.startsWith('Arrow') && selectedElements.length > 0) {
        e.preventDefault()
        const step = e.shiftKey ? 1 : state.gridSize
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0
        commit(
          (s) => ({
            ...s,
            elements: s.elements.map((el) =>
              selectedSet.has(el.id) ? translateElement(el, dx, dy) : el,
            ),
          }),
          'nudge',
        )
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    runMode,
    selectedIds,
    selectedSet,
    selectedElements.length,
    deleteSelected,
    duplicateSelected,
    copySelected,
    cutSelected,
    pasteClipboard,
    groupSelection,
    ungroupSelection,
    undo,
    redo,
    state.elements,
    state.gridSize,
    commit,
  ])

  // ── render ───────────────────────────────────────────────────────────

  const TOOL_BUTTONS: { tool: Tool; label: string; icon: React.ReactNode }[] = [
    { tool: 'select', label: 'Select / Move (Esc); drag a marquee to multi-select', icon: <IconPointer size={18} /> },
    { tool: 'pan', label: 'Pan (or middle-mouse drag)', icon: <IconHandStop size={18} /> },
    { tool: 'line', label: 'Line', icon: <IconLine size={18} /> },
    { tool: 'arrow', label: 'Arrow', icon: <IconArrowNarrowRight size={18} /> },
    { tool: 'rect', label: 'Rectangle', icon: <IconRectangle size={18} /> },
    { tool: 'ellipse', label: 'Circle / Ellipse', icon: <IconCircle size={18} /> },
    { tool: 'label', label: 'Rich Label', icon: <IconTypography size={18} /> },
    { tool: 'chart', label: 'Embedded Chart (table runs)', icon: <IconChartLine size={18} /> },
  ]

  const CONTROL_TOOLS: { tool: ControlElement['kind']; label: string; icon: React.ReactNode }[] = [
    { tool: 'ctl-input', label: 'Input (fixes a variable)', icon: <IconForms size={16} /> },
    { tool: 'ctl-output', label: 'Output (shows a solved value)', icon: <IconTag size={16} /> },
    { tool: 'ctl-dropdown', label: 'Dropdown selector', icon: <IconSelector size={16} /> },
    { tool: 'ctl-checkbox', label: 'Checkbox (0 / 1)', icon: <IconCheckbox size={16} /> },
    { tool: 'ctl-slider', label: 'Slider', icon: <IconAdjustmentsHorizontal size={16} /> },
  ]

  const gridStep = state.gridSize * view.k

  return (
    <Group align="stretch" gap="sm" h="100%" wrap="nowrap">
      <Stack gap="sm" flex={1} miw={0}>
        <Group gap="xs" wrap="wrap">
          <SegmentedControl
            size="xs"
            value={mode}
            onChange={(v) => {
              setMode(v as 'develop' | 'run')
              setSelectedIds([])
              setTool('select')
            }}
            data={[
              { label: 'Development', value: 'develop' },
              {
                label: (
                  <Group gap={4} wrap="nowrap">
                    <IconPlayerPlayFilled size={12} />
                    <span>Run</span>
                  </Group>
                ),
                value: 'run',
              },
            ]}
          />
          {!runMode && (
            <>
              <Group gap={4}>
                {TOOL_BUTTONS.map((tb) => (
                  <Tooltip key={tb.tool} label={tb.label}>
                    <ActionIcon
                      variant={tool === tb.tool ? 'filled' : 'default'}
                      size="lg"
                      onClick={() => setTool(tb.tool)}
                    >
                      {tb.icon}
                    </ActionIcon>
                  </Tooltip>
                ))}
                <Menu shadow="md" position="bottom-start">
                  <Menu.Target>
                    <Tooltip label="Component Library">
                      <ActionIcon
                        variant={tool.startsWith('icon:') ? 'filled' : 'default'}
                        size="lg"
                      >
                        <IconStack2 size={18} />
                      </ActionIcon>
                    </Tooltip>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Label>Engineering components</Menu.Label>
                    {LIBRARY_ICONS.map((icon) => (
                      <Menu.Item
                        key={icon.id}
                        leftSection={
                          <svg width="22" height="22" viewBox="0 0 100 100">
                            {icon.render('#c1c2c5', 6, 'none')}
                          </svg>
                        }
                        onClick={() => setTool(`icon:${icon.id}`)}
                      >
                        {icon.label}
                      </Menu.Item>
                    ))}
                  </Menu.Dropdown>
                </Menu>
                <Menu shadow="md" position="bottom-start">
                  <Menu.Target>
                    <Tooltip label="Form Controls (variable binding)">
                      <ActionIcon
                        variant={tool.startsWith('ctl-') ? 'filled' : 'default'}
                        size="lg"
                      >
                        <IconForms size={18} />
                      </ActionIcon>
                    </Tooltip>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Label>Form controls</Menu.Label>
                    {CONTROL_TOOLS.map((ct) => (
                      <Menu.Item
                        key={ct.tool}
                        leftSection={ct.icon}
                        onClick={() => setTool(ct.tool)}
                      >
                        {ct.label}
                      </Menu.Item>
                    ))}
                  </Menu.Dropdown>
                </Menu>
              </Group>
              <Divider orientation="vertical" />
              <Checkbox
                label="Grid"
                size="xs"
                checked={state.showGrid}
                onChange={(e) => setStateRaw({ ...state, showGrid: e.currentTarget.checked })}
              />
              <Checkbox
                label="Snap"
                size="xs"
                checked={state.snap}
                onChange={(e) => setStateRaw({ ...state, snap: e.currentTarget.checked })}
              />
              <NumberInput
                size="xs"
                w={70}
                min={2}
                max={100}
                value={state.gridSize}
                onChange={(v) =>
                  setStateRaw({ ...state, gridSize: typeof v === 'number' ? v : state.gridSize })
                }
                aria-label="Grid size"
              />
            </>
          )}
          {!runMode && (
            <Group gap={4}>
              <Tooltip label="Undo (Ctrl+Z)">
                <ActionIcon
                  variant="default"
                  size="lg"
                  onClick={undo}
                  disabled={pastRef.current.length === 0}
                >
                  <IconArrowBackUp size={18} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Redo (Ctrl+Y)">
                <ActionIcon
                  variant="default"
                  size="lg"
                  onClick={redo}
                  disabled={futureRef.current.length === 0}
                >
                  <IconArrowForwardUp size={18} />
                </ActionIcon>
              </Tooltip>
            </Group>
          )}
          <Tooltip label="Zoom to fit">
            <ActionIcon variant="default" size="lg" onClick={zoomToFit}>
              <IconZoomScan size={18} />
            </ActionIcon>
          </Tooltip>
          {runMode && runCount === 0 && (
            <Group gap={6}>
              <IconTags size={14} color="var(--mantine-color-dimmed)" />
              <Text size="xs" c="dimmed">
                Set inputs/sliders/dropdowns, then press Solve — outputs and{' '}
                {'{varname}'} labels update with the results.
              </Text>
            </Group>
          )}
        </Group>

        {runMode && runCount > 0 && (
          <Paper withBorder px="sm" py={6}>
            <Group gap="sm" wrap="nowrap">
              <Group gap={2} wrap="nowrap">
                <Tooltip label="Previous run">
                  <ActionIcon variant="default" onClick={() => stepRun(-1)}>
                    <IconPlayerSkipBackFilled size={16} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label={playing ? 'Pause' : 'Play runs'}>
                  <ActionIcon variant="filled" onClick={togglePlay}>
                    {playing ? (
                      <IconPlayerPauseFilled size={16} />
                    ) : (
                      <IconPlayerPlayFilled size={16} />
                    )}
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="Next run">
                  <ActionIcon variant="default" onClick={() => stepRun(1)}>
                    <IconPlayerSkipForwardFilled size={16} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label={loop ? 'Looping' : 'Loop off'}>
                  <ActionIcon
                    variant={loop ? 'light' : 'default'}
                    onClick={() => setLoop((l) => !l)}
                  >
                    {loop ? <IconRepeat size={16} /> : <IconRepeatOff size={16} />}
                  </ActionIcon>
                </Tooltip>
              </Group>
              <Slider
                flex={1}
                min={0}
                max={runCount - 1}
                step={1}
                value={playIndex ?? 0}
                label={(v) => runs[v]?.label ?? ''}
                onChange={(v) => {
                  setPlaying(false)
                  setPlayIndex(v)
                }}
              />
              <Text size="xs" c="dimmed" w={64} ta="center" style={{ flexShrink: 0 }}>
                {playIndex === null ? 'live' : `${playIndex + 1} / ${runCount}`}
              </Text>
              <SegmentedControl
                size="xs"
                value={speed}
                onChange={setSpeed}
                data={PLAYBACK_SPEEDS.map((s) => ({ label: s.label, value: s.value }))}
              />
              <Tooltip label="Show the live single solve">
                <ActionIcon
                  variant={playIndex === null ? 'light' : 'default'}
                  onClick={goLive}
                >
                  <IconBroadcast size={16} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Paper>
        )}

        <Paper
          withBorder
          flex={1}
          mih={0}
          style={{ overflow: 'hidden', background: '#141517', position: 'relative' }}
        >
          <style>{FLOW_KEYFRAMES}</style>
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            onMouseDown={onBackgroundDown}
            onWheel={onWheel}
            style={{
              display: 'block',
              cursor:
                drag?.type === 'pan'
                  ? 'grabbing'
                  : tool === 'pan'
                    ? 'grab'
                    : tool === 'select'
                      ? 'default'
                      : 'crosshair',
            }}
          >
            <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
              {state.showGrid && !runMode && gridStep > 4 && (
                <GridPattern gridSize={state.gridSize} view={view} />
              )}
              {state.elements.map((el) => {
                if (el.hidden && runMode) return null
                return (
                  <g
                    key={el.id}
                    opacity={el.hidden ? 0.25 : 1}
                    onDoubleClick={
                      !runMode && el.kind === 'label' && !el.locked
                        ? (e) => {
                            e.stopPropagation()
                            setEditingLabelId(el.id)
                          }
                        : undefined
                    }
                  >
                    <ElementView
                      el={resolveElement(el, numValues, runMode)}
                      runMode={runMode}
                      values={valueMap}
                      numValues={numValues}
                      runs={runs}
                      activeIndex={activeIndex}
                      onMouseDown={onElementDown}
                      onControlValue={onControlValue}
                      onHover={onHover}
                    />
                  </g>
                )
              })}
              {!runMode && selectedElements.length > 1 &&
                selectedElements.map((el) => {
                  const b = elementBounds(el)
                  return (
                    <rect
                      key={`sel-${el.id}`}
                      x={b.x}
                      y={b.y}
                      width={b.w}
                      height={b.h}
                      fill="none"
                      stroke="#4dabf7"
                      strokeWidth={1 / view.k}
                      strokeDasharray={`${3 / view.k} ${2 / view.k}`}
                      pointerEvents="none"
                    />
                  )
                })}
              {!runMode && selectedElements.length > 1 && (
                <GroupHandles els={selectedElements} view={view} onHandleDown={onHandleDown} />
              )}
              {!runMode && selected && (
                <SelectionHandles
                  el={selected}
                  view={view}
                  onHandleDown={onHandleDown}
                  onEndpointDown={onEndpointDown}
                  onRotateDown={onRotateDown}
                />
              )}
              {!runMode && guides &&
                guides.v.map((x) => (
                  <line
                    key={`gv-${x}`}
                    x1={x}
                    y1={-view.y / view.k}
                    x2={x}
                    y2={(-view.y + 4000) / view.k}
                    stroke="#f783ac"
                    strokeWidth={1 / view.k}
                    pointerEvents="none"
                  />
                ))}
              {!runMode && guides &&
                guides.h.map((y) => (
                  <line
                    key={`gh-${y}`}
                    x1={-view.x / view.k}
                    y1={y}
                    x2={(-view.x + 6000) / view.k}
                    y2={y}
                    stroke="#f783ac"
                    strokeWidth={1 / view.k}
                    pointerEvents="none"
                  />
                ))}
              {!runMode && marquee && (
                <rect
                  x={marquee.x}
                  y={marquee.y}
                  width={marquee.w}
                  height={marquee.h}
                  fill="rgba(77,171,247,0.12)"
                  stroke="#4dabf7"
                  strokeWidth={1 / view.k}
                  strokeDasharray={`${4 / view.k} ${3 / view.k}`}
                  pointerEvents="none"
                />
              )}
              {!runMode && editingLabel && (
                <foreignObject
                  x={editingLabel.x}
                  y={editingLabel.y}
                  width={Math.max(120, editLabelWidth)}
                  height={Math.max(28, (editingLabel.fontSize ?? 16) * 2.4)}
                >
                  <textarea
                    autoFocus
                    value={editingLabel.text}
                    onChange={(e) =>
                      updateElement(
                        editingLabel.id,
                        { ...editingLabel, text: e.currentTarget.value },
                        `labeltext:${editingLabel.id}`,
                      )
                    }
                    onBlur={() => setEditingLabelId(null)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape' || (e.key === 'Enter' && !e.shiftKey)) {
                        e.preventDefault()
                        setEditingLabelId(null)
                      }
                      e.stopPropagation()
                    }}
                    style={{
                      width: '100%',
                      height: '100%',
                      resize: 'none',
                      fontSize: editingLabel.fontSize ?? 16,
                      fontWeight: editingLabel.bold ? 700 : 400,
                      fontFamily: 'system-ui, sans-serif',
                      color: editingLabel.stroke,
                      background: 'rgba(26,27,30,0.95)',
                      border: '1px solid #4dabf7',
                      borderRadius: 4,
                      padding: 2,
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                </foreignObject>
              )}
            </g>
          </svg>
          {runMode && hover && (
            <HoverTooltip
              el={state.elements.find((e) => e.id === hover.id)}
              values={valueMap}
              x={hover.x}
              y={hover.y}
            />
          )}
        </Paper>
      </Stack>

      {!runMode && (
        <Paper withBorder p="sm" w={250} style={{ flexShrink: 0 }}>
          <ScrollArea h="100%" type="auto">
            {selected ? (
              <PropertiesPanel
                el={selected}
                varNames={varNames}
                onChange={(next) => updateElement(selected.id, next, `prop:${selected.id}`)}
                onDuplicate={duplicateSelected}
                onDelete={deleteSelected}
                onZOrder={zOrder}
              />
            ) : selectedElements.length > 1 ? (
              <Stack gap="xs">
                <Text fw={600} size="sm" c="blue.4">
                  {selectedElements.length} elements selected
                </Text>
                <Text size="xs" c="dimmed" style={{ lineHeight: 1.6 }}>
                  Drag to move them together, or drag a corner handle to resize
                  the group (Shift locks aspect). Arrow keys nudge; Ctrl+D
                  duplicates; Del removes.
                </Text>
                <Divider label="Align" labelPosition="left" />
                <Group gap={4}>
                  <Tooltip label="Align left">
                    <ActionIcon variant="default" size="md" onClick={() => alignSelection('left')}>
                      <IconLayoutAlignLeft size={16} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Align horizontal centers">
                    <ActionIcon variant="default" size="md" onClick={() => alignSelection('hcenter')}>
                      <IconLayoutAlignCenter size={16} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Align right">
                    <ActionIcon variant="default" size="md" onClick={() => alignSelection('right')}>
                      <IconLayoutAlignRight size={16} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Align top">
                    <ActionIcon variant="default" size="md" onClick={() => alignSelection('top')}>
                      <IconLayoutAlignTop size={16} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Align vertical centers">
                    <ActionIcon variant="default" size="md" onClick={() => alignSelection('vcenter')}>
                      <IconLayoutAlignMiddle size={16} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Align bottom">
                    <ActionIcon variant="default" size="md" onClick={() => alignSelection('bottom')}>
                      <IconLayoutAlignBottom size={16} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
                {selectedElements.length > 2 && (
                  <Group gap={4}>
                    <Tooltip label="Distribute horizontally">
                      <ActionIcon variant="default" size="md" onClick={() => distributeSelection('h')}>
                        <IconLayoutDistributeHorizontal size={16} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Distribute vertically">
                      <ActionIcon variant="default" size="md" onClick={() => distributeSelection('v')}>
                        <IconLayoutDistributeVertical size={16} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                )}
                <Divider />
                <Group gap="xs">
                  <Tooltip label="Group (Ctrl+G)">
                    <ActionIcon variant="default" size="md" onClick={groupSelection}>
                      <IconFolderPlus size={16} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Ungroup (Ctrl+Shift+G)">
                    <ActionIcon variant="default" size="md" onClick={ungroupSelection}>
                      <IconFolderMinus size={16} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Bring to front">
                    <ActionIcon variant="default" size="md" onClick={() => zOrder('front')}>
                      <IconStackPop size={16} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Send to back">
                    <ActionIcon variant="default" size="md" onClick={() => zOrder('back')}>
                      <IconStackPush size={16} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Duplicate (Ctrl+D)">
                    <ActionIcon variant="default" size="md" onClick={duplicateSelected}>
                      <IconCopy size={16} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Delete (Del)">
                    <ActionIcon variant="default" color="red" size="md" onClick={deleteSelected}>
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Stack>
            ) : (
              <Stack gap="xs">
                <Text fw={600} size="sm" c="blue.4">
                  Diagram
                </Text>
                <Text size="xs" c="dimmed" style={{ lineHeight: 1.6 }}>
                  Pick a tool and drag on the canvas to draw. Click to select;
                  drag a marquee or Shift-click for multiple. Drag handles to
                  resize, arrow keys to nudge. Ctrl+Z/Y undo/redo;
                  Ctrl+C/X/V/D clipboard; Ctrl+A select all.
                </Text>
                <Text size="xs" c="dimmed" style={{ lineHeight: 1.6 }}>
                  Labels may contain {'{varname}'} placeholders: in Run mode
                  they display the solved value with units.
                </Text>
                <Text size="xs" c="dimmed" style={{ lineHeight: 1.6 }}>
                  Form controls bind to variables: Inputs, Dropdowns,
                  Checkboxes and Sliders fix a variable's value for the solve;
                  Outputs display a solved result. Set a control's bound
                  variable in its properties, switch to Run mode, then Solve.
                </Text>
                <Divider />
                <Text size="xs" c="dimmed">
                  {state.elements.length} element(s)
                </Text>
                {state.elements.length > 0 && (
                  <Button
                    size="xs"
                    color="red"
                    variant="light"
                    onClick={() => {
                      commit((s) => ({ ...s, elements: [] }))
                      setSelectedIds([])
                    }}
                  >
                    Clear diagram
                  </Button>
                )}
              </Stack>
            )}

            <Divider my="sm" />
            <Group
              gap={4}
              justify="space-between"
              style={{ cursor: 'pointer' }}
              onClick={() => setShowLayers((v) => !v)}
            >
              <Group gap={4}>
                <IconStack3 size={14} />
                <Text fw={600} size="xs">
                  Layers ({state.elements.length})
                </Text>
              </Group>
              <Text size="xs" c="dimmed">
                {showLayers ? '▾' : '▸'}
              </Text>
            </Group>
            {showLayers && (
              <Stack gap={4} mt={6}>
                <LayersPanel
                  elements={state.elements}
                  selectedSet={selectedSet}
                  onSelect={onSelectLayer}
                  onFlag={(id, patch) => setElementFlag(id, patch)}
                  onRename={(id, name) =>
                    setElementFlag(id, { name: name.trim() || undefined }, `rename:${id}`)
                  }
                  onReorder={reorderElement}
                />
              </Stack>
            )}
          </ScrollArea>
        </Paper>
      )}
    </Group>
  )
}

/** Dotted grid covering the visible viewport only. */
function GridPattern({
  gridSize,
  view,
}: Readonly<{ gridSize: number; view: ViewTransform }>) {
  // Visible world rect (with margin) derived from the inverse transform.
  const margin = 200
  const x0 = -view.x / view.k - margin
  const y0 = -view.y / view.k - margin
  const w = 6000 / Math.min(1, view.k) + 2 * margin
  const h = 4000 / Math.min(1, view.k) + 2 * margin
  const startX = Math.floor(x0 / gridSize) * gridSize
  const startY = Math.floor(y0 / gridSize) * gridSize
  return (
    <>
      <defs>
        <pattern
          id="diagram-grid"
          x={startX}
          y={startY}
          width={gridSize}
          height={gridSize}
          patternUnits="userSpaceOnUse"
        >
          <circle cx={0.75} cy={0.75} r={0.75} fill="#373A40" />
        </pattern>
      </defs>
      <rect
        x={startX}
        y={startY}
        width={w}
        height={h}
        fill="url(#diagram-grid)"
        pointerEvents="none"
      />
    </>
  )
}
