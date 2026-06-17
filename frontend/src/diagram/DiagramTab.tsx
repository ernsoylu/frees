import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ActionIcon,
  Alert,
  Autocomplete,
  Button,
  Center,
  Checkbox,
  ColorInput,
  Divider,
  Group,
  Menu,
  Modal,
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
  IconBinaryTree,
  IconBroadcast,
  IconGauge,
  IconArrowAutofitWidth,
  IconArrowAutofitHeight,
  IconRipple,
  IconThermometer,
  IconHandStop,
  IconChartLine,
  IconCheckbox,
  IconCircle,
  IconCircleDot,
  IconClick,
  IconPlusMinus,
  IconTarget,
  IconPlus,
  IconDownload,
  IconFileImport,
  IconSun,
  IconMoon,
  IconVideo,
  IconClock,
  IconRefresh,
  IconChevronDown,
  IconArrowLeft,
  IconArrowRight,
  IconLayoutGrid,
  IconSchema,
  IconCopy,
  IconEye,
  IconEyeOff,
  IconFolderMinus,
  IconFolderPlus,
  IconSearch,
  IconForms,
  IconGripVertical,
  IconLock,
  IconLockOpen,
  IconPin,
  IconPinnedOff,
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
  IconZoomIn,
  IconZoomOut,
} from '@tabler/icons-react'
import { TableRowResult, VariableResult } from '../api'
import { formatValue } from '../format'
import { PROPERTY_UNITS } from '../plots/units'
import { PlotSpec, newPlotSpec } from '../plots/types'
import { detectStates, StateTable } from '../plots/stateTable'
import { ParamRow } from '../ParametricTableTab'
import EmbeddedPlot, { EmbedInputs } from './EmbeddedPlot'
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
  ConnectorElement,
  getAnchorCoordinate,
  getAnchorNormal,
  getElementAnchors,
  FlowAnimation,
  ImageElement,
  ConditionalStyleRule,
  WidgetElement,
  ValueDrivenFill,
  HotspotElement,
  DiagramSpec,
} from './types'
import { TEMPLATES, instantiateTemplate } from './templates'
import {
  exportDiagram,
  DiagramExportFormat,
  DiagramExportTheme,
} from './exportDiagram'
import { DiagramRecorder } from './recordDiagram'
import { FormulaInput } from './FormulaInput'

const DIAGRAMS_STORAGE_KEY = 'frees-diagrams'

export function loadDiagrams(): DiagramSpec[] {
  try {
    const raw = localStorage.getItem(DIAGRAMS_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {}

  // Fallback to legacy single diagram:
  try {
    const rawLegacy = localStorage.getItem('frees-diagram-v1')
    if (rawLegacy) {
      const parsed = JSON.parse(rawLegacy)
      if (Array.isArray(parsed.elements)) {
        const legacySpec: DiagramSpec = {
          id: crypto.randomUUID(),
          name: 'Main Diagram',
          state: parsed,
        }
        const initial = [legacySpec]
        localStorage.setItem(DIAGRAMS_STORAGE_KEY, JSON.stringify(initial))
        return initial
      }
    }
  } catch {}

  const initial: DiagramSpec[] = [
    {
      id: 'default',
      name: 'Main Diagram',
      state: DEFAULT_DIAGRAM_STATE,
    },
  ]
  return initial
}

/** Broadcast name for save failures so the diagram window can warn the user. */
export const DIAGRAM_SAVE_ERROR_EVENT = 'frees-diagram-save-error'

/**
 * Persist all diagrams. Returns false on failure (most commonly a
 * localStorage quota overflow from large embedded images) and broadcasts an
 * event so the UI can surface it — previously failures were swallowed
 * silently, so the user could lose work without any warning.
 */
export function saveDiagrams(diagrams: DiagramSpec[]): boolean {
  try {
    localStorage.setItem(DIAGRAMS_STORAGE_KEY, JSON.stringify(diagrams))
    return true
  } catch (err) {
    const message =
      err instanceof DOMException && /quota/i.test(err.name + err.message)
        ? 'Storage is full — the diagram could not be saved. Large embedded images are the usual cause; remove or shrink them, or export the diagram as JSON to keep a copy.'
        : 'The diagram could not be saved to local storage.'
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(DIAGRAM_SAVE_ERROR_EVENT, { detail: message }))
    }
    return false
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
  | { type: 'connector-mid'; id: string; axis: 'x' | 'y' }
  | { type: 'waypoint'; id: string; index: number }
  | { type: 'rotate'; id: string; original: DiagramElement; cx: number; cy: number }
  | { type: 'marquee'; startX: number; startY: number; additive: boolean }
  | {
      type: 'create-connector'
      fromId: string
      fromAnchor: string
      startX: number
      startY: number
      tempX: number
      tempY: number
    }

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
  if (el.kind === 'connector') {
    return el
  }
  if (el.kind === 'line') {
    return { ...el, x1: el.x1 + dx, y1: el.y1 + dy, x2: el.x2 + dx, y2: el.y2 + dy }
  }
  return { ...el, x: el.x + dx, y: el.y + dy }
}

/** Combined bounding box of several elements. */
function combinedBounds(els: DiagramElement[], elements: DiagramElement[] = []): Box {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const el of els) {
    const b = elementBounds(el, elements)
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
  if (el.kind === 'connector') {
    return el
  }
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
  if (el.kind === 'connector') {
    return { cx: 0, cy: 0 }
  }
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
function resolveConditionalStyles(
  el: DiagramElement,
  numValues: Map<string, number>,
): DiagramElement {
  if (!el.rules || el.rules.length === 0) return el
  
  let stroke = el.stroke
  let fill = el.fill
  let opacity = el.opacity
  let hidden = el.hidden
  
  for (const rule of el.rules) {
    if (!rule.formula || rule.formula.trim() === '') continue
    const result = evalFormula(rule.formula, numValues)
    if (result !== null && result !== 0) {
      if (rule.property === 'stroke') {
        stroke = rule.value
      } else if (rule.property === 'fill') {
        fill = rule.value
      } else if (rule.property === 'opacity') {
        const op = Number.parseFloat(rule.value)
        if (Number.isFinite(op)) opacity = op
      } else if (rule.property === 'hidden') {
        hidden = rule.value === 'true' || rule.value === '1'
      }
    }
  }
  
  return {
    ...el,
    stroke,
    fill,
    opacity,
    hidden,
  } as DiagramElement
}

// Easing functions for tweened playback (Story 10.11). Each maps 0..1 → 0..1.
export type EasingName = 'linear' | 'ease' | 'ease-in' | 'ease-out'
const EASINGS: Record<EasingName, (t: number) => number> = {
  linear: (t) => t,
  ease: (t) => t * t * (3 - 2 * t), // smoothstep
  'ease-in': (t) => t * t,
  'ease-out': (t) => t * (2 - t),
}

function resolveElement(
  el: DiagramElement,
  numValues: Map<string, number>,
  runMode: boolean,
  paths?: Map<string, LineElement>,
): DiagramElement {
  let resolved = el
  if (runMode && el.bind) {
    const b = el.bind
    const num = (f: string | undefined, fallback: number) => {
      const v = evalFormula(f, numValues)
      return v === null ? fallback : v
    }
    const opacity = b.opacity ? Math.max(0, Math.min(1, num(b.opacity, el.opacity))) : el.opacity
    const rotation = b.rotation ? num(b.rotation, el.rotation) : el.rotation
    const dx = b.dx ? num(b.dx, 0) : 0
    const dy = b.dy ? num(b.dy, 0) : 0

    if (el.kind === 'connector') {
      resolved = { ...el, opacity }
    } else if (el.kind === 'line') {
      resolved = { ...el, opacity, rotation, x1: el.x1 + dx, y1: el.y1 + dy, x2: el.x2 + dx, y2: el.y2 + dy }
    } else if (el.kind === 'label') {
      resolved = { ...el, opacity, rotation, x: el.x + dx, y: el.y + dy }
    } else {
      const w = b.w ? num(b.w, el.w) : el.w
      const h = b.h ? num(b.h, el.h) : el.h
      resolved = { ...el, opacity, rotation, x: el.x + dx, y: el.y + dy, w, h }
    }
  }
  
  if (runMode && el.valueFill) {
    const vf = el.valueFill
    const val = numValues.get(vf.varName.trim().toLowerCase())
    if (val !== undefined && Number.isFinite(val)) {
      const minVal = evalFormula(vf.minFormula, numValues) ?? 0
      const maxVal = evalFormula(vf.maxFormula, numValues) ?? 100
      let t = 0
      if (maxVal > minVal) {
        t = Math.max(0, Math.min(1, (val - minVal) / (maxVal - minVal)))
      }
      const fill = interpolateColor(vf.colorStart || '#3b82f6', vf.colorEnd || '#ef4444', t)
      resolved = { ...resolved, fill }
    }
  }
  
  if (runMode) {
    resolved = resolveConditionalStyles(resolved, numValues)
  }

  // Path-following motion (Story 10.11): move the element's center along a line
  // element at the eased/animated progress (0..1), optionally orienting it to
  // the path tangent. Line/connector elements are not themselves movers.
  if (
    runMode &&
    el.motion &&
    paths &&
    resolved.kind !== 'line' &&
    resolved.kind !== 'connector'
  ) {
    const line = paths.get(el.motion.pathId)
    if (line) {
      const raw = evalFormula(el.motion.progress, numValues) ?? 0
      const p = Math.max(0, Math.min(1, raw))
      const px = line.x1 + (line.x2 - line.x1) * p
      const py = line.y1 + (line.y2 - line.y1) * p
      const rot = el.motion.orient
        ? (Math.atan2(line.y2 - line.y1, line.x2 - line.x1) * 180) / Math.PI
        : resolved.rotation
      const next = { ...resolved } as DiagramElement & {
        x?: number
        y?: number
        w?: number
        h?: number
      }
      const halfW = resolved.kind === 'label' ? 0 : (typeof next.w === 'number' ? next.w / 2 : 0)
      const halfH = resolved.kind === 'label' ? 0 : (typeof next.h === 'number' ? next.h / 2 : 0)
      next.x = px - halfW
      next.y = py - halfH
      next.rotation = rot
      resolved = next
    }
  }

  return resolved
}

/** The solved variables an element references — for the Run-mode hover tooltip. */
function elementVars(el: DiagramElement): string[] {
  const out = new Set<string>()
  if (el.bind) {
    for (const f of Object.values(el.bind)) formulaVars(f).forEach((v) => out.add(v))
  }
  if ((el.kind === 'line' || el.kind === 'connector') && el.flow) formulaVars(el.flow.speed).forEach((v) => out.add(v))
  if (el.kind === 'label') {
    for (const m of el.text.matchAll(/\{([^}]+)\}/g)) {
      const expr = m[1].split(':')[0]
      formulaVars(expr).forEach((v) => out.add(v))
    }
  }
  if (isControl(el) && el.kind !== 'ctl-button' && el.varName.trim()) out.add(el.varName.trim().toLowerCase())
  if (el.kind === 'widget') {
    if (el.varName.trim()) out.add(el.varName.trim().toLowerCase())
    formulaVars(el.minFormula).forEach((v) => out.add(v))
    formulaVars(el.maxFormula).forEach((v) => out.add(v))
    formulaVars(el.lowWarningFormula).forEach((v) => out.add(v))
    formulaVars(el.highWarningFormula).forEach((v) => out.add(v))
    formulaVars(el.lowDangerFormula).forEach((v) => out.add(v))
    formulaVars(el.highDangerFormula).forEach((v) => out.add(v))
  }
  if (el.valueFill) {
    if (el.valueFill.varName.trim()) out.add(el.valueFill.varName.trim().toLowerCase())
    formulaVars(el.valueFill.minFormula).forEach((v) => out.add(v))
    formulaVars(el.valueFill.maxFormula).forEach((v) => out.add(v))
  }
  if (el.rules) {
    for (const r of el.rules) {
      formulaVars(r.formula).forEach((v) => out.add(v))
    }
  }
  if (el.motion) formulaVars(el.motion.progress).forEach((v) => out.add(v))
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
  el: { flow?: FlowAnimation },
  runMode: boolean,
  numValues: Map<string, number>,
): React.SVGProps<any> {
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

function formatExpressionValue(val: number, formatSpec: string): string {
  if (val === null || val === undefined || !Number.isFinite(val)) return '—'
  
  let convertedVal = val
  let numberFormat: { precision: number; type: 'f' | 'e' | 'g' } | null = null
  let unitLabel = ''
  
  const parts = formatSpec.split(':').map(p => p.trim()).filter(Boolean)
  for (const part of parts) {
    const numMatch = part.match(/^\.(\d+)([feg])$/)
    if (numMatch) {
      numberFormat = {
        precision: Number.parseInt(numMatch[1], 10),
        type: numMatch[2] as 'f' | 'e' | 'g'
      }
      continue
    }
    
    let foundUnit = false
    const normPart = part.replace(/°/g, '').toLowerCase()
    
    for (const units of Object.values(PROPERTY_UNITS)) {
      const u = units.find(choice => choice.id.replace(/°/g, '').toLowerCase() === normPart)
      if (u) {
        convertedVal = val * u.scale + u.offset
        unitLabel = ' ' + u.id
        foundUnit = true
        break
      }
    }
    
    if (!foundUnit) {
      unitLabel = ' ' + part
    }
  }
  
  let formattedStr = ''
  if (numberFormat) {
    const { precision, type } = numberFormat
    if (type === 'f') formattedStr = convertedVal.toFixed(precision)
    else if (type === 'e') formattedStr = convertedVal.toExponential(precision)
    else if (type === 'g') formattedStr = convertedVal.toPrecision(precision)
  } else {
    formattedStr = formatValue(convertedVal)
  }
  
  return `${formattedStr}${unitLabel}`
}

function interpolateLabel(
  text: string,
  values: Map<string, VariableResult>,
  numValues: Map<string, number>,
): string {
  return text.replace(/\{([^}]+)\}/g, (match, inner: string) => {
    const colonIndex = inner.indexOf(':')
    const exprStr = colonIndex === -1 ? inner : inner.slice(0, colonIndex)
    const formatSpec = colonIndex === -1 ? '' : inner.slice(colonIndex + 1)
    
    const val = evalFormula(exprStr, numValues)
    if (val === null) {
      const varName = exprStr.trim().toLowerCase()
      const v = values.get(varName)
      if (v) {
        return formatExpressionValue(v.value, formatSpec || v.units)
      }
      return match
    }
    
    return formatExpressionValue(val, formatSpec)
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
  if (el.kind === 'ctl-button') {
    return `Btn: ${el.action}`
  }
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
    case 'ctl-stepper':
      return `${v} = ${el.value}`
    case 'ctl-radio':
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
  if (el.kind === 'ctl-button') return null
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
          {v ? `${formatValue(v.value, el.decimals)}${unit}` : '—'}
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
  if (el.kind === 'ctl-stepper') {
    const handleStep = (dir: number) => {
      let nextVal = el.value + dir * el.step
      if (el.min !== undefined && nextVal < el.min) nextVal = el.min
      if (el.max !== undefined && nextVal > el.max) nextVal = el.max
      onValue({ value: nextVal })
    }
    return (
      <div style={{ fontFamily: 'system-ui, sans-serif' }}>
        <div style={captionStyle}>{caption}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            type="button"
            onClick={() => handleStep(-1)}
            style={{
              background: '#2C2E33',
              color: '#fff',
              border: '1px solid #495057',
              borderRadius: 4,
              width: 24,
              height: 24,
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            -
          </button>
          <div
            style={{
              ...fieldStyle,
              flex: 1,
              textAlign: 'center',
              lineHeight: '20px',
              height: 24,
              padding: '2px 4px',
            }}
          >
            {el.value}
          </div>
          <button
            type="button"
            onClick={() => handleStep(1)}
            style={{
              background: '#2C2E33',
              color: '#fff',
              border: '1px solid #495057',
              borderRadius: 4,
              width: 24,
              height: 24,
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            +
          </button>
        </div>
      </div>
    )
  }
  if (el.kind === 'ctl-radio') {
    return (
      <div style={{ fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {caption && <div style={captionStyle}>{caption}</div>}
        {el.options.map((opt) => (
          <label
            key={opt}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: '#e9ecef',
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            <input
              type="radio"
              name={`radio-${el.id}`}
              checked={el.value === opt}
              onChange={() => onValue({ value: opt })}
              style={{ cursor: 'pointer' }}
            />
            {opt}
          </label>
        ))}
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

/**
 * Embedded Plotly chart widget (Story 10.12). Renders either an existing Plot
 * (when el.plotId is set) or a built-in X-Y chart synthesized from the chart's
 * xVar/yVars, both through the full Plotly engine inside a foreignObject. A
 * vertical marker is synced to the active playback run on X-Y charts.
 */
function EmbeddedChart({
  el,
  plots,
  inputs,
  activeIndex,
  runMode,
}: Readonly<{
  el: ChartElement
  plots: PlotSpec[]
  inputs: EmbedInputs
  activeIndex: number | null
  runMode: boolean
}>) {
  const yKey = el.yVars.join(',')
  const spec = useMemo<PlotSpec | null>(() => {
    if (el.plotId) return plots.find((p) => p.id === el.plotId) ?? null
    const base = newPlotSpec('xy', 'Chart')
    return {
      ...base,
      xy: { ...base.xy, xVar: el.xVar || null, yVars: el.yVars },
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [el.plotId, el.xVar, yKey, plots])

  const activeX =
    activeIndex != null && spec?.kind === 'xy' && spec.xy.xVar
      ? inputs.tableResults[activeIndex]?.values?.[spec.xy.xVar]
      : null

  return (
    <foreignObject x={el.x} y={el.y} width={el.w} height={el.h}>
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#1a1b1e',
          border: '1px solid #2c2e33',
          borderRadius: 4,
          overflow: 'hidden',
          // In develop mode let clicks fall through to the SVG so the widget can
          // be selected/dragged; in run mode allow Plotly hover/zoom.
          pointerEvents: runMode ? 'auto' : 'none',
        }}
      >
        {el.plotId && !spec ? (
          <Center h="100%" p="xs">
            <Text size="xs" c="dimmed" ta="center">
              Embedded plot was deleted. Pick another in the panel.
            </Text>
          </Center>
        ) : spec ? (
          <EmbeddedPlot spec={spec} inputs={inputs} activeX={activeX} />
        ) : null}
      </div>
    </foreignObject>
  )
}

/** Resolved end anchors of a connector, or null if its elements are gone. */
function getConnectorEnds(
  el: ConnectorElement,
  elements: DiagramElement[],
): { p1: { x: number; y: number }; p2: { x: number; y: number } } | null {
  const fromEl = elements.find((e) => e.id === el.fromId)
  const toEl = elements.find((e) => e.id === el.toId)
  if (!fromEl || !toEl) return null
  return {
    p1: getAnchorCoordinate(fromEl, el.fromAnchor),
    p2: getAnchorCoordinate(toEl, el.toAnchor),
  }
}

/** Ordered vertices the route threads through: from-anchor, waypoints, to-anchor. */
function getConnectorVertices(
  el: ConnectorElement,
  elements: DiagramElement[],
): { x: number; y: number }[] | null {
  const ends = getConnectorEnds(el, elements)
  if (!ends) return null
  return [ends.p1, ...(el.waypoints ?? []), ends.p2]
}

/** Smooth Catmull-Rom spline through the given points (for the curved style). */
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 3) return `M ${pts.map((p) => `${p.x} ${p.y}`).join(' L ')}`
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`
  }
  return d
}

function getConnectorPath(el: ConnectorElement, elements: DiagramElement[]): string {
  const ends = getConnectorEnds(el, elements)
  if (!ends) return ''
  const { p1, p2 } = ends
  const wps = el.waypoints ?? []

  // Once the user has placed waypoints, the route threads through them as a
  // polyline (curved style smooths it) — this is the manual multi-bend mode.
  if (wps.length > 0) {
    const pts = [p1, ...wps, p2]
    if (el.style === 'curved') return smoothPath(pts)
    return `M ${pts.map((p) => `${p.x} ${p.y}`).join(' L ')}`
  }

  if (el.style === 'straight') {
    return `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`
  }

  const n1 = getAnchorNormal(elements.find((e) => e.id === el.fromId)!, el.fromAnchor)
  const n2 = getAnchorNormal(elements.find((e) => e.id === el.toId)!, el.toAnchor)

  if (el.style === 'curved') {
    const dist = Math.max(40, Math.hypot(p2.x - p1.x, p2.y - p1.y) * 0.35)
    const cx1 = p1.x + n1.x * dist
    const cy1 = p1.y + n1.y * dist
    const cx2 = p2.x + n2.x * dist
    const cy2 = p2.y + n2.y * dist
    return `M ${p1.x} ${p1.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${p2.x} ${p2.y}`
  }

  // Orthogonal (auto single elbow). The mid-segment is draggable: `el.mid`
  // overrides the auto-centred position like in Visio/Lucid.
  const isHorizontal = Math.abs(n1.x) > Math.abs(n1.y)
  if (isHorizontal) {
    const mx = el.mid ?? (p1.x + p2.x) / 2
    return `M ${p1.x} ${p1.y} L ${mx} ${p1.y} L ${mx} ${p2.y} L ${p2.x} ${p2.y}`
  } else {
    const my = el.mid ?? (p1.y + p2.y) / 2
    return `M ${p1.x} ${p1.y} L ${p1.x} ${my} L ${p2.x} ${my} L ${p2.x} ${p2.y}`
  }
}

/**
 * Position of the draggable mid-segment ("elbow") of an auto-routed orthogonal
 * connector (no manual waypoints), and which axis dragging it moves. Returns
 * null otherwise.
 */
function getConnectorElbow(
  el: ConnectorElement,
  elements: DiagramElement[],
): { x: number; y: number; axis: 'x' | 'y' } | null {
  if (el.style !== 'orthogonal' || (el.waypoints?.length ?? 0) > 0) return null
  const ends = getConnectorEnds(el, elements)
  if (!ends) return null
  const { p1, p2 } = ends
  const n1 = getAnchorNormal(elements.find((e) => e.id === el.fromId)!, el.fromAnchor)
  const isHorizontal = Math.abs(n1.x) > Math.abs(n1.y)
  if (isHorizontal) {
    const mx = el.mid ?? (p1.x + p2.x) / 2
    return { x: mx, y: (p1.y + p2.y) / 2, axis: 'x' }
  }
  const my = el.mid ?? (p1.y + p2.y) / 2
  return { x: (p1.x + p2.x) / 2, y: my, axis: 'y' }
}

function parseColor(color: string): { r: number; g: number; b: number } {
  let hex = color.trim().replace(/^#/, '')
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]
  }
  const num = Number.parseInt(hex, 16)
  if (Number.isNaN(num)) {
    return { r: 128, g: 128, b: 128 }
  }
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  }
}

function interpolateColor(color1: string, color2: string, t: number): string {
  const c1 = parseColor(color1)
  const c2 = parseColor(color2)
  const r = Math.round(c1.r + (c2.r - c1.r) * t)
  const g = Math.round(c1.g + (c2.g - c1.g) * t)
  const b = Math.round(c1.b + (c2.b - c1.b) * t)
  return `rgb(${r}, ${g}, ${b})`
}

function convertValue(val: number, targetUnit: string | undefined): { value: number; unit: string } {
  if (!targetUnit) return { value: val, unit: '' }
  const normUnit = targetUnit.replace(/°/g, '').toLowerCase()
  for (const units of Object.values(PROPERTY_UNITS)) {
    const u = units.find(choice => choice.id.replace(/°/g, '').toLowerCase() === normUnit)
    if (u) {
      return { value: val * u.scale + u.offset, unit: u.id }
    }
  }
  return { value: val, unit: targetUnit }
}

function polarToCartesian(cx: number, cy: number, r: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180
  return {
    x: cx + r * Math.cos(angleInRadians),
    y: cy + r * Math.sin(angleInRadians),
  }
}

function getArcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, r, endAngle)
  const end = polarToCartesian(cx, cy, r, startAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1'
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`
}

function WidgetView({
  el,
  values,
  numValues,
  runMode,
}: Readonly<{
  el: WidgetElement
  values: Map<string, VariableResult>
  numValues: Map<string, number>
  runMode: boolean
}>) {
  const varKey = el.varName.trim().toLowerCase()
  const solvedVal = numValues.get(varKey) ?? 0
  const solvedUnit = values.get(varKey)?.units || ''
  
  const targetUnit = el.units ?? (solvedUnit !== '-' ? solvedUnit : undefined)
  const { value: val, unit } = convertValue(solvedVal, targetUnit)
  
  const minValRaw = evalFormula(el.minFormula, numValues) ?? 0
  const maxValRaw = evalFormula(el.maxFormula, numValues) ?? 100
  const minVal = convertValue(minValRaw, targetUnit).value
  const maxVal = convertValue(maxValRaw, targetUnit).value

  let t = 0
  if (Number.isFinite(val) && maxVal > minVal) {
    // Guard against a NaN/Inf solve producing broken gauge geometry.
    t = Math.max(0, Math.min(1, (val - minVal) / (maxVal - minVal)))
  }

  // Warning/danger limits
  const lowWarningRaw = el.lowWarningFormula ? evalFormula(el.lowWarningFormula, numValues) : null
  const highWarningRaw = el.highWarningFormula ? evalFormula(el.highWarningFormula, numValues) : null
  const lowDangerRaw = el.lowDangerFormula ? evalFormula(el.lowDangerFormula, numValues) : null
  const highDangerRaw = el.highDangerFormula ? evalFormula(el.highDangerFormula, numValues) : null

  const lowWarning = lowWarningRaw !== null ? convertValue(lowWarningRaw, targetUnit).value : null
  const highWarning = highWarningRaw !== null ? convertValue(highWarningRaw, targetUnit).value : null
  const lowDanger = lowDangerRaw !== null ? convertValue(lowDangerRaw, targetUnit).value : null
  const highDanger = highDangerRaw !== null ? convertValue(highDangerRaw, targetUnit).value : null

  let statusColor = '#228be6' // default blue
  if (runMode) {
    if (lowDanger !== null && val < lowDanger) statusColor = '#fa5252'
    else if (highDanger !== null && val > highDanger) statusColor = '#fa5252'
    else if (lowWarning !== null && val < lowWarning) statusColor = '#fab005'
    else if (highWarning !== null && val > highWarning) statusColor = '#fab005'
    else statusColor = '#40c057'
  }

  const formattedVal = formatValue(val)
  const caption = el.label || el.varName || 'Widget'

  if (el.widgetType === 'dial') {
    const cx = el.x + el.w / 2
    const cy = el.y + el.h / 2
    const r = Math.min(el.w, el.h) / 2 - 12
    const needleAngle = -140 + t * 280
    const tip = polarToCartesian(cx, cy, r - 10, needleAngle)

    const valToAngle = (v: number) => {
      if (maxVal === minVal) return -140
      const pct = Math.max(0, Math.min(1, (v - minVal) / (maxVal - minVal)))
      return -140 + pct * 280
    }

    return (
      <g>
        {/* dial background shadow and border */}
        <circle cx={cx} cy={cy} r={r + 6} fill="#1A1B1E" fillOpacity={0.7} stroke="#373A40" strokeWidth={1} />
        {/* grey background arc track */}
        <path d={getArcPath(cx, cy, r, -140, 140)} fill="none" stroke="#2C2E33" strokeWidth={8} strokeLinecap="round" />
        
        {/* colored zones */}
        {runMode && (
          <>
            {/* normal/green base */}
            <path d={getArcPath(cx, cy, r, -140, 140)} fill="none" stroke="#40c057" strokeWidth={4} strokeLinecap="round" opacity={0.3} />
            {/* Danger low */}
            {lowDanger !== null && (
              <path
                d={getArcPath(cx, cy, r, -140, valToAngle(lowDanger))}
                fill="none"
                stroke="#fa5252"
                strokeWidth={5}
                strokeLinecap="round"
              />
            )}
            {/* Warning low */}
            {lowWarning !== null && (
              <path
                d={getArcPath(cx, cy, r, valToAngle(lowDanger ?? minVal), valToAngle(lowWarning))}
                fill="none"
                stroke="#fab005"
                strokeWidth={5}
                strokeLinecap="round"
              />
            )}
            {/* Warning high */}
            {highWarning !== null && (
              <path
                d={getArcPath(cx, cy, r, valToAngle(highWarning), valToAngle(highDanger ?? maxVal))}
                fill="none"
                stroke="#fab005"
                strokeWidth={5}
                strokeLinecap="round"
              />
            )}
            {/* Danger high */}
            {highDanger !== null && (
              <path
                d={getArcPath(cx, cy, r, valToAngle(highDanger), 140)}
                fill="none"
                stroke="#fa5252"
                strokeWidth={5}
                strokeLinecap="round"
              />
            )}
          </>
        )}

        {/* scale ticks */}
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const ang = -140 + i * 56
          const p1 = polarToCartesian(cx, cy, r - 6, ang)
          const p2 = polarToCartesian(cx, cy, r, ang)
          return <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#909296" strokeWidth={1} />
        })}

        {/* needle */}
        <line x1={cx} y1={cy} x2={tip.x} y2={tip.y} stroke={statusColor} strokeWidth={2.5} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={5} fill={statusColor} stroke="#1A1B1E" strokeWidth={1.5} />

        {/* labels */}
        <text x={cx} y={cy + r - 16} fill="#909296" fontSize={10} fontFamily="system-ui" textAnchor="middle" fontWeight="bold">
          {caption}
        </text>
        <text x={cx} y={cy + r - 2} fill={runMode ? statusColor : '#e9ecef'} fontSize={11} fontFamily="monospace" textAnchor="middle" fontWeight={600}>
          {formattedVal} {unit}
        </text>
      </g>
    )
  }

  if (el.widgetType === 'bar-h') {
    const tx = el.x + 8
    const ty = el.y + 22
    const tw = el.w - 16
    const th = 14
    const fillW = t * tw

    return (
      <g>
        <rect x={el.x} y={el.y} width={el.w} height={el.h} rx={4} fill="#1A1B1E" fillOpacity={0.7} stroke="#373A40" strokeWidth={1} />
        {/* caption */}
        <text x={tx} y={el.y + 14} fill="#909296" fontSize={10} fontFamily="system-ui" fontWeight="bold">
          {caption}
        </text>
        {/* value */}
        <text x={el.x + el.w - 8} y={el.y + 14} fill={runMode ? statusColor : '#e9ecef'} fontSize={11} fontFamily="monospace" textAnchor="end" fontWeight={600}>
          {formattedVal} {unit}
        </text>
        {/* bar track */}
        <rect x={tx} y={ty} width={tw} height={th} rx={3} fill="#2C2E33" stroke="#495057" strokeWidth={0.5} />
        {/* bar fill */}
        {fillW > 0 && (
          <rect x={tx} y={ty} width={fillW} height={th} rx={2} fill={statusColor} />
        )}
        {/* limit markers */}
        {runMode && lowWarning !== null && (
          <line x1={tx + ((lowWarning - minVal) / (maxVal - minVal)) * tw} y1={ty} x2={tx + ((lowWarning - minVal) / (maxVal - minVal)) * tw} y2={ty + th} stroke="#fab005" strokeWidth={1.5} strokeDasharray="2 1" />
        )}
        {runMode && highWarning !== null && (
          <line x1={tx + ((highWarning - minVal) / (maxVal - minVal)) * tw} y1={ty} x2={tx + ((highWarning - minVal) / (maxVal - minVal)) * tw} y2={ty + th} stroke="#fab005" strokeWidth={1.5} strokeDasharray="2 1" />
        )}
        {/* min/max ticks */}
        <text x={tx} y={el.y + el.h - 4} fill="#909296" fontSize={8} fontFamily="monospace">
          {formatValue(minVal)}
        </text>
        <text x={el.x + el.w - 8} y={el.y + el.h - 4} fill="#909296" fontSize={8} fontFamily="monospace" textAnchor="end">
          {formatValue(maxVal)}
        </text>
      </g>
    )
  }

  if (el.widgetType === 'bar-v') {
    const tx = el.x + el.w / 2 - 7
    const ty = el.y + 24
    const tw = 14
    const th = el.h - 44
    const fillH = t * th

    return (
      <g>
        <rect x={el.x} y={el.y} width={el.w} height={el.h} rx={4} fill="#1A1B1E" fillOpacity={0.7} stroke="#373A40" strokeWidth={1} />
        <text x={el.x + el.w / 2} y={el.y + 14} fill="#909296" fontSize={10} fontFamily="system-ui" textAnchor="middle" fontWeight="bold">
          {caption}
        </text>
        {/* bar track */}
        <rect x={tx} y={ty} width={tw} height={th} rx={3} fill="#2C2E33" stroke="#495057" strokeWidth={0.5} />
        {/* bar fill */}
        {fillH > 0 && (
          <rect x={tx} y={ty + th - fillH} width={tw} height={fillH} rx={2} fill={statusColor} />
        )}
        <text x={el.x + el.w / 2} y={el.y + el.h - 6} fill={runMode ? statusColor : '#e9ecef'} fontSize={10} fontFamily="monospace" textAnchor="middle" fontWeight={600}>
          {formattedVal} {unit}
        </text>
      </g>
    )
  }

  if (el.widgetType === 'tank') {
    const rx = (el.w - 20) / 2
    const ry = Math.max(3, Math.min(8, rx / 3))
    const cx = el.x + el.w / 2
    const topY = el.y + 22
    const bottomY = el.y + el.h - 22
    const th = bottomY - topY
    const fluidH = t * th
    const fluidY = bottomY - fluidH

    return (
      <g>
        <rect x={el.x} y={el.y} width={el.w} height={el.h} rx={4} fill="#1A1B1E" fillOpacity={0.7} stroke="#373A40" strokeWidth={1} />
        
        <text x={cx} y={el.y + 14} fill="#909296" fontSize={10} fontFamily="system-ui" textAnchor="middle" fontWeight="bold">
          {caption}
        </text>

        {/* Tank background fill inside */}
        <path
          d={`M ${cx - rx} ${topY} L ${cx - rx} ${bottomY} A ${rx} ${ry} 0 0 0 ${cx + rx} ${bottomY} L ${cx + rx} ${topY} A ${rx} ${ry} 0 0 0 ${cx - rx} ${topY}`}
          fill="#2C2E33"
          stroke="none"
        />

        {/* Fluid level */}
        {fluidH > 0 && (
          <g>
            <path
              d={`M ${cx - rx} ${fluidY} L ${cx - rx} ${bottomY} A ${rx} ${ry} 0 0 0 ${cx + rx} ${bottomY} L ${cx + rx} ${fluidY} A ${rx} ${ry} 0 0 1 ${cx - rx} ${fluidY}`}
              fill={statusColor}
              fillOpacity={0.65}
              stroke="none"
            />
            <ellipse cx={cx} cy={fluidY} rx={rx} ry={ry} fill={statusColor} fillOpacity={0.8} />
          </g>
        )}

        {/* Tank outline container */}
        <path
          d={`M ${cx - rx} ${topY} L ${cx - rx} ${bottomY} A ${rx} ${ry} 0 0 0 ${cx + rx} ${bottomY} L ${cx + rx} ${topY} A ${rx} ${ry} 0 0 0 ${cx - rx} ${topY}`}
          fill="none"
          stroke="#495057"
          strokeWidth={1.5}
        />
        <ellipse cx={cx} cy={topY} rx={rx} ry={ry} fill="none" stroke="#495057" strokeWidth={1.5} />

        <text x={cx} y={el.y + el.h - 6} fill={runMode ? statusColor : '#e9ecef'} fontSize={10} fontFamily="monospace" textAnchor="middle" fontWeight={600}>
          {formattedVal} {unit}
        </text>
      </g>
    )
  }

  // thermometer
  const cx = el.x + el.w / 2
  const bulbRadius = Math.min(16, el.w / 3.5)
  const bulbY = el.y + el.h - bulbRadius - 10
  const stemW = Math.min(12, bulbRadius * 0.7)
  const stemY = el.y + 22
  const stemH = bulbY - stemY - bulbRadius + 4
  const fluidH = t * stemH

  return (
    <g>
      <rect x={el.x} y={el.y} width={el.w} height={el.h} rx={4} fill="#1A1B1E" fillOpacity={0.7} stroke="#373A40" strokeWidth={1} />
      <text x={cx} y={el.y + 14} fill="#909296" fontSize={10} fontFamily="system-ui" textAnchor="middle" fontWeight="bold">
        {caption}
      </text>

      {/* Background shapes */}
      <rect x={cx - stemW / 2} y={stemY} width={stemW} height={stemH + bulbRadius} rx={stemW / 2} fill="#2C2E33" stroke="#495057" strokeWidth={1} />
      <circle cx={cx} cy={bulbY} r={bulbRadius} fill="#2C2E33" stroke="#495057" strokeWidth={1} />

      {/* Fluid Bulb */}
      <circle cx={cx} cy={bulbY} r={bulbRadius - 2} fill={statusColor} />

      {/* Fluid stem */}
      {fluidH > 0 && (
        <rect x={cx - stemW / 2 + 1.5} y={bulbY - bulbRadius + 4 - fluidH} width={stemW - 3} height={fluidH + bulbRadius} rx={(stemW - 3) / 2} fill={statusColor} />
      )}

      {/* ticks on left */}
      {[0, 1, 2, 3, 4].map((i) => {
        const yPos = bulbY - bulbRadius + 4 - (i / 4) * stemH
        return <line key={i} x1={cx - stemW / 2 - 4} y1={yPos} x2={cx - stemW / 2} y2={yPos} stroke="#868e96" strokeWidth={1} />
      })}

      <text x={cx} y={el.y + el.h - 6} fill={runMode ? statusColor : '#e9ecef'} fontSize={10} fontFamily="monospace" textAnchor="middle" fontWeight={600}>
        {formattedVal} {unit}
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
  elements = [],
  onSolve,
  onCheck,
  solving = false,
  onNavigate,
  plots = [],
  chartInputs,
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
  elements?: DiagramElement[]
  onSolve?: () => Promise<void>
  onCheck?: () => Promise<void>
  solving?: boolean
  onNavigate?: (action: { tab?: string; query?: string; plotId?: string }) => void
  plots?: PlotSpec[]
  chartInputs?: EmbedInputs
}>) {
  const { cx, cy } = elementCenter(el)
  const transform = el.rotation ? `rotate(${el.rotation} ${cx} ${cy})` : undefined
  const handleDown = (e: React.MouseEvent) => {
    if (!runMode) onMouseDown(e, el)
  }

  let body: React.ReactNode = null
  if (el.kind === 'connector') {
    const pathD = getConnectorPath(el, elements)
    if (pathD) {
      const markerStart = (el.arrow === 'from' || el.arrow === 'both') ? `url(#diagram-arrow-start-${el.id})` : undefined
      const markerEnd = (el.arrow === 'to' || el.arrow === 'both') ? `url(#diagram-arrow-end-${el.id})` : undefined
      body = (
        <>
          {(el.arrow === 'from' || el.arrow === 'both') && (
            <defs>
              <marker
                id={`diagram-arrow-start-${el.id}`}
                viewBox="0 0 10 10"
                refX="1"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto"
              >
                {/* Tip points back along the path (orient="auto", not the
                    SVG2-only "auto-start-reverse" that Batik/FOP rejects). */}
                <path d="M 10 0 L 0 5 L 10 10 z" fill={el.stroke} />
              </marker>
            </defs>
          )}
          {(el.arrow === 'to' || el.arrow === 'both') && (
            <defs>
              <marker
                id={`diagram-arrow-end-${el.id}`}
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill={el.stroke} />
              </marker>
            </defs>
          )}
          <path
            d={pathD}
            stroke={el.stroke}
            strokeWidth={el.strokeWidth}
            fill="none"
            opacity={el.opacity}
            markerStart={markerStart}
            markerEnd={markerEnd}
            {...flowDashProps(el, runMode, numValues)}
          />
          {/* wide invisible hit area */}
          <path
            d={pathD}
            stroke="transparent"
            strokeWidth={Math.max(12, el.strokeWidth + 8)}
            fill="none"
            onPointerDown={handleDown}
            style={{ cursor: runMode ? 'default' : 'pointer' }}
          />
        </>
      )
    }
  } else if (el.kind === 'line') {
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
              orient="auto"
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
    const text = runMode ? interpolateLabel(el.text, values, numValues) : el.text
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
    body = chartInputs ? (
      <EmbeddedChart
        el={el}
        plots={plots}
        inputs={chartInputs}
        activeIndex={runMode ? activeIndex : null}
        runMode={runMode}
      />
    ) : (
      <ChartView el={el} runs={runs} activeIndex={runMode ? activeIndex : null} />
    )
  } else if (el.kind === 'widget') {
    body = <WidgetView el={el} values={values} numValues={numValues} runMode={runMode} />
  } else if (el.kind === 'image') {
    body = (
      <image
        href={el.url}
        x={el.x}
        y={el.y}
        width={el.w}
        height={el.h}
        preserveAspectRatio="none"
      />
    )
  } else if (el.kind === 'hotspot') {
    if (runMode) {
      const handleHotspotClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        onNavigate?.({
          tab: el.targetType === 'equation' ? 'equations' : el.targetType === 'plot' ? 'plots' : el.targetTab,
          query: el.targetType === 'equation' ? el.targetQuery : undefined,
          plotId: el.targetType === 'plot' ? el.targetPlotId : undefined,
        })
      }
      body = (
        <rect
          x={el.x}
          y={el.y}
          width={el.w}
          height={el.h}
          fill="rgba(0,0,0,0.001)"
          stroke="none"
          onClick={handleHotspotClick}
          style={{ cursor: 'pointer' }}
        />
      )
    } else {
      body = (
        <g opacity={el.opacity}>
          <rect
            x={el.x}
            y={el.y}
            width={el.w}
            height={el.h}
            fill="rgba(230,73,128,0.12)"
            stroke="#e64980"
            strokeWidth={1.5}
            strokeDasharray="4 2"
          />
          <text
            x={el.x + 6}
            y={el.y + 16}
            fill="#e64980"
            fontSize={10}
            fontFamily="system-ui, sans-serif"
            style={{ userSelect: 'none', fontWeight: 'bold' }}
          >
            Hotspot ➔ {el.targetType}
          </text>
        </g>
      )
    }
  } else if (el.kind === 'ctl-button') {
    if (runMode) {
      const handleButtonClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (el.action === 'check') {
          onCheck?.()
        } else {
          onSolve?.()
        }
      }
      body = (
        <foreignObject x={el.x} y={el.y} width={el.w} height={el.h} opacity={el.opacity}>
          <button
            type="button"
            disabled={solving}
            onClick={handleButtonClick}
            style={{
              width: '100%',
              height: '100%',
              background: el.action === 'solve' ? '#228be6' : '#495057',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: solving ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
            }}
          >
            {solving && el.action === 'solve' ? 'Solving...' : el.label || (el.action === 'solve' ? 'Calculate' : 'Check')}
          </button>
        </foreignObject>
      )
    } else {
      body = (
        <g opacity={el.opacity}>
          <rect
            x={el.x}
            y={el.y}
            width={el.w}
            height={el.h}
            rx={4}
            fill="#1c7ed6"
            fillOpacity={0.6}
            stroke="#228be6"
            strokeWidth={1}
          />
          <text
            x={el.x + el.w / 2}
            y={el.y + el.h / 2 + 4}
            fill="#fff"
            fontSize={12}
            fontFamily="system-ui, sans-serif"
            textAnchor="middle"
            style={{ userSelect: 'none', fontWeight: 'bold' }}
          >
            {el.label || (el.action === 'solve' ? 'Calculate' : 'Check')}
          </text>
        </g>
      )
    }
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
      onPointerDown={handleDown}
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
  onElbowDown,
  onElbowReset,
  onWaypointDown,
  onSegmentDown,
  onWaypointDelete,
  elements = [],
}: Readonly<{
  el: DiagramElement
  view: ViewTransform
  onHandleDown: (e: React.MouseEvent, handle: 'nw' | 'ne' | 'sw' | 'se') => void
  onEndpointDown: (e: React.MouseEvent, which: 1 | 2) => void
  onRotateDown: (e: React.MouseEvent) => void
  onElbowDown: (e: React.MouseEvent, axis: 'x' | 'y') => void
  onElbowReset: (id: string) => void
  onWaypointDown: (e: React.MouseEvent, index: number) => void
  onSegmentDown: (e: React.MouseEvent, segIndex: number, at: { x: number; y: number }) => void
  onWaypointDelete: (id: string, index: number) => void
  elements?: DiagramElement[]
}>) {
  const size = 8 / view.k
  const color = '#4dabf7'
  const { cx, cy } = elementCenter(el)
  const transform = el.rotation ? `rotate(${el.rotation} ${cx} ${cy})` : undefined

  if (el.kind === 'connector') {
    const elbow = getConnectorElbow(el, elements)
    const verts = getConnectorVertices(el, elements) ?? []
    const wps = el.waypoints ?? []
    // Hollow "+" handles at each segment midpoint: drag one to insert a bend.
    const segHandles = verts.slice(0, -1).map((a, i) => {
      const bpt = verts[i + 1]
      return { i, x: (a.x + bpt.x) / 2, y: (a.y + bpt.y) / 2 }
    })
    return (
      <g>
        {/* Solid handles at each user waypoint: drag to move, dbl-click to delete. */}
        {wps.map((w, i) => (
          <circle
            key={`wp-${i}`}
            cx={w.x}
            cy={w.y}
            r={size * 0.8}
            fill="#fff"
            stroke={color}
            strokeWidth={2 / view.k}
            style={{ cursor: 'move' }}
            onPointerDown={(e) => onWaypointDown(e, i)}
            onDoubleClick={(e) => {
              e.stopPropagation()
              onWaypointDelete(el.id, i)
            }}
          />
        ))}
        {/* Add-a-bend handles on each segment (hidden once there are many). */}
        {segHandles.map((s) => (
          <g key={`seg-${s.i}`}>
            <circle
              cx={s.x}
              cy={s.y}
              r={size * 0.6}
              fill={color}
              opacity={0.35}
              style={{ cursor: 'copy' }}
              onPointerDown={(e) => onSegmentDown(e, s.i, { x: s.x, y: s.y })}
            />
            <path
              d={`M ${s.x - size * 0.3} ${s.y} h ${size * 0.6} M ${s.x} ${s.y - size * 0.3} v ${size * 0.6}`}
              stroke="#fff"
              strokeWidth={1.2 / view.k}
              pointerEvents="none"
            />
          </g>
        ))}
        {elbow && (
          <circle
            cx={elbow.x}
            cy={elbow.y}
            r={size * 0.8}
            fill="#fff"
            stroke={color}
            strokeWidth={2 / view.k}
            style={{ cursor: elbow.axis === 'x' ? 'ew-resize' : 'ns-resize' }}
            onPointerDown={(e) => onElbowDown(e, elbow.axis)}
            onDoubleClick={(e) => {
              e.stopPropagation()
              onElbowReset(el.id)
            }}
          />
        )}
      </g>
    )
  }

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
              onPointerDown={(e) => onEndpointDown(e, which as 1 | 2)}
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
            onPointerDown={(e) => onHandleDown(e, h.id)}
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
        onPointerDown={onRotateDown}
      />
    </g>
  )
}

/** Combined bounding box with corner handles for a multi-element selection. */
function GroupHandles({
  els,
  view,
  onHandleDown,
  elements = [],
}: Readonly<{
  els: DiagramElement[]
  view: ViewTransform
  onHandleDown: (e: React.MouseEvent, handle: Handle) => void
  elements?: DiagramElement[]
}>) {
  const b = combinedBounds(els, elements)
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
          onPointerDown={(e) => onHandleDown(e, h.id)}
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
  'ctl-stepper': 'Stepper',
  'ctl-radio': 'Radio Group',
  'ctl-button': 'Calculate Button',
}

function ControlFields({
  el,
  set,
}: Readonly<{ el: ControlElement; set: (patch: Partial<DiagramElement>) => void }>) {
  return (
    <>
      {el.kind !== 'ctl-button' && (
        <TextInput
          label="Bound variable"
          description="A trailing $ binds a string variable"
          size="xs"
          value={el.varName}
          placeholder="e.g. T1 or fluid$"
          onChange={(e) => set({ varName: e.currentTarget.value })}
        />
      )}
      <TextInput
        label="Caption"
        size="xs"
        value={el.label}
        onChange={(e) => set({ label: e.currentTarget.value })}
      />
      {el.kind !== 'ctl-button' && el.kind !== 'ctl-output' && (
        <Select
          label="Binding target"
          size="xs"
          data={[
            { label: 'Fix value via equation (e.g. x = 5)', value: 'equation' },
            { label: 'Write to solver guess value', value: 'guess' },
            { label: 'Write to solver lower bound', value: 'lower' },
            { label: 'Write to solver upper bound', value: 'upper' },
          ]}
          value={el.target || 'equation'}
          onChange={(v) => set({ target: v as any })}
        />
      )}
      {el.kind === 'ctl-input' && (
        <TextInput
          label="Default value"
          size="xs"
          value={el.value}
          onChange={(e) => set({ value: e.currentTarget.value })}
        />
      )}
      {(el.kind === 'ctl-dropdown' || el.kind === 'ctl-radio') && (
        <>
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
          <TextInput
            label="Default value"
            size="xs"
            value={el.value}
            onChange={(e) => set({ value: e.currentTarget.value })}
          />
        </>
      )}
      {el.kind === 'ctl-checkbox' && (
        <Checkbox
          label="Checked by default"
          size="xs"
          checked={el.checked}
          onChange={(e) => set({ checked: e.currentTarget.checked })}
        />
      )}
      {(el.kind === 'ctl-slider' || el.kind === 'ctl-stepper') && (
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
      {el.kind === 'ctl-button' && (
        <Select
          label="Button Action"
          size="xs"
          data={[
            { label: 'Check syntax & equations', value: 'check' },
            { label: 'Calculate / Solve equations', value: 'solve' },
          ]}
          value={el.action}
          onChange={(v) => set({ action: v as any })}
        />
      )}
      {el.kind === 'ctl-output' && (
        <NumberInput
          label="Decimal places"
          description="Leave blank for automatic formatting"
          size="xs"
          min={0}
          max={12}
          allowDecimal={false}
          value={el.decimals ?? ''}
          onChange={(v) => set({ decimals: typeof v === 'number' ? v : undefined })}
        />
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
  pathOptions = [],
  varNames = [],
}: Readonly<{
  el: DiagramElement
  set: (patch: Partial<DiagramElement>) => void
  pathOptions?: { value: string; label: string }[]
  varNames?: string[]
}>) {
  const keys: (keyof AttributeBindings)[] =
    el.kind === 'line' || el.kind === 'label'
      ? ['dx', 'dy', 'rotation', 'opacity']
      : ['dx', 'dy', 'w', 'h', 'rotation', 'opacity']

  const setBind = (key: keyof AttributeBindings, value: string) =>
    set({ bind: { ...el.bind, [key]: value.trim() === '' ? undefined : value } })

  // Path-following motion (Story 10.11): not offered for the path elements
  // (lines/connectors) themselves.
  const canFollowPath = el.kind !== 'line' && el.kind !== 'connector'
  const setMotion = (patch: Partial<NonNullable<DiagramElement['motion']>>) =>
    set({
      motion: {
        pathId: el.motion?.pathId ?? '',
        progress: el.motion?.progress ?? 't',
        orient: el.motion?.orient,
        ...patch,
      },
    })

  return (
    <>
      <Divider label="Run-mode bindings" labelPosition="left" />
      <Text size="10px" c="dimmed">
        Formulas of solved variables drive these attributes when you Solve in
        Run mode (e.g. <code>{'30*sin(theta)'}</code>). Δx/Δy offset the position.
      </Text>
      {keys.map((key) => (
        <FormulaInput
          key={key}
          label={BINDABLE_LABELS[key]}
          placeholder="(static)"
          varNames={varNames}
          value={el.bind?.[key] ?? ''}
          onChange={(v) => setBind(key, v)}
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
            <FormulaInput
              label="Flow speed (formula; sign = direction)"
              placeholder="e.g. m_dot or 2"
              varNames={varNames}
              value={el.flow.speed}
              onChange={(v) => set({ flow: { speed: v } })}
            />
          )}
        </>
      )}
      {canFollowPath && (
        <>
          <Divider label="Path-following motion" labelPosition="left" />
          <Checkbox
            label="Move along a line path"
            size="xs"
            checked={!!el.motion}
            disabled={pathOptions.length === 0 && !el.motion}
            onChange={(e) =>
              set({
                motion: e.currentTarget.checked
                  ? { pathId: pathOptions[0]?.value ?? '', progress: 't', orient: false }
                  : undefined,
              })
            }
          />
          {pathOptions.length === 0 && !el.motion && (
            <Text size="10px" c="dimmed">
              Draw a Line element to use as a motion path.
            </Text>
          )}
          {el.motion && (
            <>
              <Select
                label="Path (line)"
                size="xs"
                value={el.motion.pathId || null}
                data={pathOptions}
                onChange={(v) => v && setMotion({ pathId: v })}
                placeholder="Choose a line…"
              />
              <FormulaInput
                label="Progress 0→1 (formula; t = time clock)"
                placeholder="e.g. t/5 or (T-300)/200"
                varNames={varNames}
                value={el.motion.progress}
                onChange={(v) => setMotion({ progress: v })}
              />
              <Checkbox
                label="Orient to path direction"
                size="xs"
                checked={!!el.motion.orient}
                onChange={(e) => setMotion({ orient: e.currentTarget.checked })}
              />
            </>
          )}
        </>
      )}
    </>
  )
}

function ConditionalRulesFields({
  el,
  set,
  varNames = [],
}: Readonly<{
  el: DiagramElement
  set: (patch: Partial<DiagramElement>) => void
  varNames?: string[]
}>) {
  const rules = el.rules ?? []
  
  const addRule = () => {
    const newRule: ConditionalStyleRule = {
      id: crypto.randomUUID(),
      property: 'stroke',
      formula: '',
      value: '#ff0000',
    }
    set({ rules: [...rules, newRule] })
  }
  
  const updateRule = (id: string, patch: Partial<ConditionalStyleRule>) => {
    set({
      rules: rules.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    })
  }
  
  const removeRule = (id: string) => {
    set({ rules: rules.filter((r) => r.id !== id) })
  }
  
  return (
    <>
      <Divider label="Conditional style rules" labelPosition="left" />
      <Text size="10px" c="dimmed" mb={4}>
        Formulas evaluating to true (non-zero) trigger these style overrides in Run mode.
      </Text>
      <Stack gap="xs">
        {rules.map((rule) => (
          <Paper key={rule.id} withBorder p="xs" style={{ background: '#1A1B1E', borderColor: '#373A40' }}>
            <Stack gap="xs">
              <Group justify="space-between" align="center" wrap="nowrap">
                <Select
                  size="xs"
                  style={{ flex: 1 }}
                  data={[
                    { label: 'Stroke color', value: 'stroke' },
                    { label: 'Fill color', value: 'fill' },
                    { label: 'Opacity', value: 'opacity' },
                    { label: 'Hidden', value: 'hidden' },
                  ]}
                  value={rule.property}
                  onChange={(v) => {
                    const prop = v as ConditionalStyleRule['property']
                    let defaultValue = '#ff0000'
                    if (prop === 'opacity') defaultValue = '0.5'
                    else if (prop === 'hidden') defaultValue = 'true'
                    updateRule(rule.id, { property: prop, value: defaultValue })
                  }}
                />
                <ActionIcon size="sm" variant="subtle" color="red" onClick={() => removeRule(rule.id)}>
                  <IconTrash size={14} />
                </ActionIcon>
              </Group>
              
              <FormulaInput
                label="Condition (formula)"
                placeholder="e.g. T > 100"
                varNames={varNames}
                value={rule.formula}
                onChange={(v) => updateRule(rule.id, { formula: v })}
              />
              
              {rule.property === 'stroke' || rule.property === 'fill' ? (
                <ColorInput
                  label="Value"
                  size="xs"
                  value={rule.value}
                  onChange={(v) => updateRule(rule.id, { value: v })}
                />
              ) : rule.property === 'opacity' ? (
                <NumberInput
                  label="Value"
                  size="xs"
                  min={0}
                  max={1}
                  step={0.1}
                  value={Number.parseFloat(rule.value) || 0}
                  onChange={(v) => updateRule(rule.id, { value: String(v) })}
                />
              ) : (
                <Select
                  label="Value"
                  size="xs"
                  data={[
                    { label: 'Hidden', value: 'true' },
                    { label: 'Visible', value: 'false' },
                  ]}
                  value={rule.value}
                  onChange={(v) => updateRule(rule.id, { value: v || 'true' })}
                />
              )}
            </Stack>
          </Paper>
        ))}
        <Button variant="default" size="xs" onClick={addRule} leftSection={<IconFolderPlus size={14} />}>
          Add Rule
        </Button>
      </Stack>
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
              ? 'var(--mantine-color-teal-light)'
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

function HotspotFields({
  el,
  set,
  plots = [],
  diagrams = [],
}: Readonly<{
  el: HotspotElement
  set: (patch: Partial<DiagramElement>) => void
  plots?: PlotSpec[]
  diagrams?: DiagramSpec[]
}>) {
  const plotOptions = plots.map((p) => ({
    label: `${p.kind === 'xy' ? 'X-Y' : p.kind === 'psychro' ? 'Psychrometric' : 'Property'} · ${p.name || 'Untitled'}`,
    value: p.id,
  }))

  const diagramOptions = diagrams.map((d) => ({
    label: d.name,
    value: d.id,
  }))

  return (
    <>
      <Select
        label="Navigation Target Type"
        size="xs"
        data={[
          { label: 'Switch to Workspace Tab', value: 'tab' },
          { label: 'Jump to Equation in Editor', value: 'equation' },
          { label: 'Open Plot / Diagram', value: 'plot' },
          { label: 'Switch to Schematic Diagram', value: 'diagram' },
        ]}
        value={el.targetType}
        onChange={(v) =>
          set({
            targetType: v as HotspotElement['targetType'],
            targetTab: undefined,
            targetQuery: undefined,
            targetPlotId: undefined,
            targetDiagramId: undefined,
          })
        }
      />

      {el.targetType === 'tab' && (
        <Select
          label="Target Tab"
          size="xs"
          data={[
            { label: 'Editor', value: 'equations' },
            { label: 'Tables', value: 'table' },
            { label: 'Plots (X-Y)', value: 'plots' },
            { label: 'Thermodynamics', value: 'thermo' },
            { label: 'Graph Digitizer', value: 'digitizer' },
          ]}
          value={el.targetTab || null}
          onChange={(v) => set({ targetTab: v ?? undefined })}
          placeholder="Choose tab…"
        />
      )}

      {el.targetType === 'equation' && (
        <TextInput
          label="Search Text / Equation"
          size="xs"
          placeholder="e.g. T2 = or sin(theta)"
          value={el.targetQuery ?? ''}
          onChange={(e) => set({ targetQuery: e.currentTarget.value || undefined })}
        />
      )}

      {el.targetType === 'plot' && (
        <Select
          label="Target Plot / Diagram"
          size="xs"
          data={plotOptions}
          value={el.targetPlotId || null}
          onChange={(v) => set({ targetPlotId: v ?? undefined })}
          placeholder={plotOptions.length > 0 ? "Select plot…" : "No plots created yet"}
          disabled={plotOptions.length === 0}
        />
      )}

      {el.targetType === 'diagram' && (
        <Select
          label="Target Schematic Diagram"
          size="xs"
          data={diagramOptions}
          value={el.targetDiagramId || null}
          onChange={(v) => set({ targetDiagramId: v ?? undefined })}
          placeholder={diagramOptions.length > 0 ? "Select diagram…" : "No other diagrams"}
          disabled={diagramOptions.length === 0}
        />
      )}
    </>
  )
}

function WidgetFields({
  el,
  set,
  varNames,
}: Readonly<{ el: WidgetElement; set: (patch: Partial<DiagramElement>) => void; varNames: string[] }>) {
  return (
    <>
      <Select
        label="Widget type"
        size="xs"
        data={[
          { label: 'Analog Gauge/Dial', value: 'dial' },
          { label: 'Horizontal Bar', value: 'bar-h' },
          { label: 'Vertical Bar', value: 'bar-v' },
          { label: 'Tank Fill-Level', value: 'tank' },
          { label: 'Thermometer', value: 'thermometer' },
        ]}
        value={el.widgetType}
        onChange={(v) => set({ widgetType: v as WidgetElement['widgetType'] })}
      />
      <Autocomplete
        label="Bound variable"
        size="xs"
        data={varNames}
        value={el.varName}
        onChange={(v) => set({ varName: v })}
        placeholder="e.g. T2"
      />
      <TextInput
        label="Display Unit"
        size="xs"
        value={el.units ?? ''}
        placeholder="e.g. °C, bar (default uses solved units)"
        onChange={(e) => set({ units: e.currentTarget.value })}
      />
      <Group grow>
        <FormulaInput
          label="Min Value/Formula"
          varNames={varNames}
          value={el.minFormula}
          onChange={(v) => set({ minFormula: v })}
        />
        <FormulaInput
          label="Max Value/Formula"
          varNames={varNames}
          value={el.maxFormula}
          onChange={(v) => set({ maxFormula: v })}
        />
      </Group>
      <Group grow>
        <FormulaInput
          label="Low Warning Limit"
          placeholder="e.g. 20"
          varNames={varNames}
          value={el.lowWarningFormula ?? ''}
          onChange={(v) => set({ lowWarningFormula: v || undefined })}
        />
        <FormulaInput
          label="High Warning Limit"
          placeholder="e.g. 80"
          varNames={varNames}
          value={el.highWarningFormula ?? ''}
          onChange={(v) => set({ highWarningFormula: v || undefined })}
        />
      </Group>
      <Group grow>
        <FormulaInput
          label="Low Danger Limit"
          placeholder="e.g. 10"
          varNames={varNames}
          value={el.lowDangerFormula ?? ''}
          onChange={(v) => set({ lowDangerFormula: v || undefined })}
        />
        <FormulaInput
          label="High Danger Limit"
          placeholder="e.g. 90"
          varNames={varNames}
          value={el.highDangerFormula ?? ''}
          onChange={(v) => set({ highDangerFormula: v || undefined })}
        />
      </Group>
    </>
  )
}

function ValueDrivenFillFields({
  el,
  set,
  varNames,
}: Readonly<{ el: DiagramElement; set: (patch: Partial<DiagramElement>) => void; varNames: string[] }>) {
  const enabled = !!el.valueFill
  const vf = el.valueFill ?? { varName: '', minFormula: '0', maxFormula: '100', colorStart: '#3b82f6', colorEnd: '#ef4444' }
  const toggle = (chk: boolean) => {
    if (chk) {
      set({ valueFill: vf })
    } else {
      set({ valueFill: undefined })
    }
  }
  const updateVf = (patch: Partial<ValueDrivenFill>) => {
    set({ valueFill: { ...vf, ...patch } })
  }

  return (
    <>
      <Checkbox
        label="Enable Value-Driven Fill"
        size="xs"
        checked={enabled}
        onChange={(e) => toggle(e.currentTarget.checked)}
      />
      {enabled && (
        <Stack gap="xs" style={{ borderLeft: '2px solid #373A40', paddingLeft: 8, marginLeft: 4 }}>
          <Autocomplete
            label="Bound variable"
            size="xs"
            data={varNames}
            value={vf.varName}
            onChange={(v) => updateVf({ varName: v })}
            placeholder="e.g. T"
          />
          <Group grow>
            <FormulaInput
              label="Min Formula"
              varNames={varNames}
              value={vf.minFormula}
              onChange={(v) => updateVf({ minFormula: v })}
            />
            <FormulaInput
              label="Max Formula"
              varNames={varNames}
              value={vf.maxFormula}
              onChange={(v) => updateVf({ maxFormula: v })}
            />
          </Group>
          <Group grow>
            <ColorInput
              label="Color Start"
              size="xs"
              value={vf.colorStart}
              onChange={(colorStart) => updateVf({ colorStart })}
            />
            <ColorInput
              label="Color End"
              size="xs"
              value={vf.colorEnd}
              onChange={(colorEnd) => updateVf({ colorEnd })}
            />
          </Group>
        </Stack>
      )}
    </>
  )
}

/**
 * Precise numeric placement (X/Y/W/H, or line endpoints) for the selected
 * element. Canvas dragging is fine for rough layout, but engineering diagrams
 * need exact coordinates — this gives a typed alternative to the handles.
 */
function GeometryFields({
  el,
  set,
}: Readonly<{
  el: DiagramElement
  set: (patch: Partial<DiagramElement>) => void
}>) {
  // Connectors are anchored to other elements — their geometry is derived.
  if (el.kind === 'connector') return null

  const field = (label: string, value: number, onSet: (v: number) => void) => (
    <NumberInput
      label={label}
      size="xs"
      value={Math.round(value)}
      onChange={(v) => onSet(typeof v === 'number' ? v : value)}
      styles={{ input: { fontFamily: 'monospace' } }}
    />
  )

  if (el.kind === 'line') {
    return (
      <>
        <Divider label="Endpoints" labelPosition="left" />
        <Group grow gap="xs">
          {field('X1', el.x1, (v) => set({ x1: v }))}
          {field('Y1', el.y1, (v) => set({ y1: v }))}
        </Group>
        <Group grow gap="xs">
          {field('X2', el.x2, (v) => set({ x2: v }))}
          {field('Y2', el.y2, (v) => set({ y2: v }))}
        </Group>
      </>
    )
  }

  const g = el as unknown as { x: number; y: number; w?: number; h?: number }
  const hasSize = el.kind !== 'label'
  return (
    <>
      <Divider label="Position & Size" labelPosition="left" />
      <Group grow gap="xs">
        {field('X', g.x, (v) => set({ x: v } as Partial<DiagramElement>))}
        {field('Y', g.y, (v) => set({ y: v } as Partial<DiagramElement>))}
      </Group>
      {hasSize && (
        <Group grow gap="xs">
          {field('W', g.w ?? 0, (v) => set({ w: Math.max(1, v) } as Partial<DiagramElement>))}
          {field('H', g.h ?? 0, (v) => set({ h: Math.max(1, v) } as Partial<DiagramElement>))}
        </Group>
      )}
    </>
  )
}

function PropertiesPanel({
  el,
  varNames,
  pathOptions = [],
  onChange,
  onDuplicate,
  onDelete,
  onZOrder,
  onSaveComponent,
  plots = [],
  diagrams = [],
}: Readonly<{
  el: DiagramElement
  varNames: string[]
  pathOptions?: { value: string; label: string }[]
  onChange: (next: DiagramElement) => void
  onDuplicate: () => void
  onDelete: () => void
  onZOrder: (direction: 'front' | 'back') => void
  onSaveComponent: () => void
  plots?: PlotSpec[]
  diagrams?: DiagramSpec[]
}>) {
  const set = (patch: Partial<DiagramElement>) =>
    onChange({ ...el, ...patch } as DiagramElement)

  const plotOptions = plots.map((p) => ({ value: p.id, label: p.name }))

  return (
    <Stack gap="xs">
      <Text fw={600} size="sm" c="teal.4">
        {el.kind === 'icon'
          ? (libraryIcon(el.icon)?.label ?? 'Component')
          : isControl(el)
            ? CONTROL_LABELS[el.kind]
            : el.kind === 'chart'
              ? 'Chart'
              : el.kind === 'widget'
                ? `Widget: ${el.widgetType}`
                : el.kind === 'connector'
                  ? 'Connector'
                  : el.kind}
      </Text>

      <GeometryFields el={el} set={set} />

      {isControl(el) && <ControlFields el={el} set={set} />}

      {el.kind === 'chart' && (
        <>
          <SegmentedControl
            size="xs"
            fullWidth
            value={el.plotId ? 'embed' : 'table'}
            onChange={(v) =>
              set({ plotId: v === 'embed' ? (plotOptions[0]?.value ?? '') : undefined })
            }
            data={[
              { label: 'Table X-Y', value: 'table' },
              { label: 'Embed plot', value: 'embed' },
            ]}
          />
          {el.plotId !== undefined ? (
            plotOptions.length > 0 ? (
              <Select
                label="Embedded plot"
                description="Live Plotly chart from the Plots / Thermo windows"
                size="xs"
                data={plotOptions}
                value={el.plotId || null}
                onChange={(v) => set({ plotId: v ?? '' })}
                placeholder="Choose a plot…"
              />
            ) : (
              <Text size="10px" c="dimmed">
                No plots exist yet. Create one in the Plots or Thermodynamics
                window, then embed it here.
              </Text>
            )
          ) : (
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
        </>
      )}

      {!isControl(el) && (
        <>
          {el.kind === 'widget' && (
            <WidgetFields el={el} set={set} varNames={varNames} />
          )}
          {el.kind === 'hotspot' && (
            <HotspotFields el={el} set={set} plots={plots} diagrams={diagrams} />
          )}
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
              <Text size="xs" c="dimmed" lh="xs" style={{ marginTop: -4 }}>
                Format guide: <code>{`{T2:.2f}`}</code> (2 decimals), <code>{`{P1:bar}`}</code> (unit conversion), <code>{`{h1:.1f:kJ/kg}`}</code> (1 decimal, custom label/conversion).
              </Text>
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

      {el.kind === 'connector' && (
        <>
          <Select
            label="Style"
            size="xs"
            data={[
              { label: 'Straight', value: 'straight' },
              { label: 'Orthogonal (Elbow)', value: 'orthogonal' },
              { label: 'Curved', value: 'curved' },
            ]}
            value={el.style}
            onChange={(v) => set({ style: v as ConnectorElement['style'] })}
          />
          <div>
            <Text size="xs" fw={500} mb={4}>
              Arrowheads
            </Text>
            <Group gap="sm">
              {(() => {
                const startOn = el.arrow === 'from' || el.arrow === 'both'
                const endOn = el.arrow === 'to' || el.arrow === 'both'
                const apply = (s: boolean, e2: boolean) =>
                  set({ arrow: s && e2 ? 'both' : s ? 'from' : e2 ? 'to' : 'none' })
                return (
                  <>
                    <Checkbox
                      size="xs"
                      label="Start"
                      checked={startOn}
                      onChange={(ev) => apply(ev.currentTarget.checked, endOn)}
                    />
                    <Checkbox
                      size="xs"
                      label="End"
                      checked={endOn}
                      onChange={(ev) => apply(startOn, ev.currentTarget.checked)}
                    />
                  </>
                )
              })()}
            </Group>
            <Group gap={6} mt={6}>
              <Button
                size="compact-xs"
                variant="light"
                onClick={() => set({ arrow: 'both' })}
              >
                Both ends
              </Button>
              <Button
                size="compact-xs"
                variant="default"
                onClick={() => set({ arrow: 'none' })}
              >
                No arrows
              </Button>
            </Group>
          </div>
          {(el.waypoints?.length ?? 0) > 0 && (
            <Button
              size="compact-xs"
              variant="light"
              color="gray"
              onClick={() => set({ waypoints: undefined })}
            >
              Clear bends ({el.waypoints?.length})
            </Button>
          )}
          <Text size="10px" c="dimmed">
            Select the connector, then drag the white dots to bend it; drag a “+”
            on a segment to add a bend, or double-click a dot to remove it.
          </Text>
        </>
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

      {el.kind === 'image' && (
        <Checkbox
          label="Send to background (ignore clicks)"
          size="xs"
          checked={!!el.isBackground}
          onChange={(e) => {
            const isBg = e.currentTarget.checked
            set({ isBackground: isBg, locked: isBg })
          }}
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
        {el.kind !== 'connector' && (
          <NumberInput
            label="Rotation °"
            size="xs"
            min={-360}
            max={360}
            value={el.rotation}
            onChange={(v) => set({ rotation: typeof v === 'number' ? v : el.rotation })}
          />
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
      </Group>
      {(el.kind === 'rect' || el.kind === 'ellipse' || el.kind === 'icon' || el.kind === 'line') && (
        <>
          <Divider label="Value-Driven Fill" labelPosition="center" size="xs" />
          <ValueDrivenFillFields el={el} set={set} varNames={varNames} />
        </>
      )}
      <BindingFields el={el} set={set} pathOptions={pathOptions} varNames={varNames} />
      <ConditionalRulesFields el={el} set={set} varNames={varNames} />
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
        <Tooltip label="Save as Custom Component">
          <ActionIcon variant="default" color="teal" size="md" onClick={onSaveComponent}>
            <IconFolderPlus size={16} />
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
  | 'connector'
  | 'image'
  | 'hotspot'
  | ControlElement['kind']
  | `icon:${string}`
  | `custom:${string}`
  | `widget:${WidgetElement['widgetType']}`

interface ElementAnchorInfo {
  elId: string
  name: string
  x: number
  y: number
}

interface CustomComponent {
  id: string
  label: string
  elements: DiagramElement[]
}

interface Props {
  variables: VariableResult[]
  /** Solved parametric-table runs for playback animation (Story 6.4). */
  runs?: DiagramRun[]
  /** Reports the `var = value` lines contributed by input-type controls. */
  onBindingsChange?: (lines: string[]) => void
  // Epic 10.8 props:
  plots?: PlotSpec[]
  // Story 10.12: parametric-table data for embedded Plotly chart widgets.
  tableRows?: ParamRow[]
  tableResults?: TableRowResult[]
  cyclePath?: Record<string, number>[]
  solving?: boolean
  onSolve?: () => Promise<void>
  onCheck?: () => Promise<void>
  onNavigate?: (action: { tab?: string; query?: string; plotId?: string; diagramId?: string }) => void
  onVarDraftsChange?: React.Dispatch<React.SetStateAction<Record<string, any>>>
  // Epic 10.9 props for multiple diagrams:
  diagrams?: DiagramSpec[]
  activeDiagramId?: string | null
  onDiagramsChange?: (
    update: DiagramSpec[] | ((prev: DiagramSpec[]) => DiagramSpec[]),
  ) => void
  onActiveDiagramIdChange?: (id: string | null) => void
  /**
   * When set, the component renders only this one diagram and hides the
   * diagram-tab strip — used when each diagram is its own dock window.
   */
  singleDiagramId?: string
  /** Shared Inspector edge-panel DOM node to portal Properties/Layers into. */
  inspectorOutlet?: HTMLElement | null
  /** Whether this is the focused diagram window (owns the shared Inspector). */
  isActive?: boolean
  /**
   * Mode the diagram mounts in. Defaults to 'develop'. Opening a saved project
   * that contains diagrams passes 'run' so the diagram shows in Run view first.
   */
  initialMode?: 'develop' | 'run'
}

const PLAYBACK_SPEEDS: { label: string; value: string; ms: number }[] = [
  { label: '0.5×', value: 'slow', ms: 1000 },
  { label: '1×', value: 'normal', ms: 550 },
  { label: '2×', value: 'fast', ms: 280 },
]

export default function DiagramTab(props: Readonly<Props>) {
  const {
    variables,
    runs = [],
    onBindingsChange,
    plots = [],
    tableRows = [],
    tableResults = [],
    cyclePath,
    solving = false,
    onSolve,
    onCheck,
    onNavigate,
    onVarDraftsChange,
    diagrams: propsDiagrams,
    activeDiagramId: propsActiveId,
    onDiagramsChange: propsOnDiagramsChange,
    onActiveDiagramIdChange: propsOnActiveIdChange,
    singleDiagramId,
    inspectorOutlet,
    isActive,
    initialMode,
  } = props

  const [localDiagrams, setLocalDiagrams] = useState<DiagramSpec[]>(() => {
    if (propsDiagrams && propsDiagrams.length > 0) return propsDiagrams
    return loadDiagrams()
  })
  const [localActiveDiagramId, setLocalActiveDiagramId] = useState<string>(() => {
    if (propsActiveId) return propsActiveId
    return localDiagrams[0]?.id ?? 'default'
  })

  const diagrams = propsDiagrams ?? localDiagrams
  // In single-window mode the active diagram is fixed to this window's diagram.
  const activeDiagramId = singleDiagramId ?? propsActiveId ?? localActiveDiagramId
  const onDiagramsChange = propsOnDiagramsChange ?? ((update) => {
    setLocalDiagrams((prev) => {
      const next = typeof update === 'function' ? update(prev) : update
      saveDiagrams(next)
      return next
    })
  })
  const onActiveDiagramIdChange = propsOnActiveIdChange ?? setLocalActiveDiagramId

  const activeDiagram = diagrams.find((d) => d.id === activeDiagramId) ?? diagrams[0] ?? { id: 'default', name: 'Main Diagram', state: DEFAULT_DIAGRAM_STATE }
  const state = activeDiagram.state

  // Always resolve the active id at apply time so the functional update below
  // targets the right diagram even mid-gesture.
  const activeIdRef = useRef(activeDiagramId)
  activeIdRef.current = activeDiagramId

  // Functional update form is essential: a single gesture can fire several
  // updates before React re-renders (e.g. create-then-size while drawing, or
  // rapid drag ticks). Reading `diagrams` from the closure would let the second
  // update clobber the first with a stale list, making the element vanish.
  const setStateRaw = useCallback(
    (updater: DiagramState | ((s: DiagramState) => DiagramState)) => {
      onDiagramsChange((prevList) =>
        prevList.map((d) => {
          if (d.id === activeIdRef.current) {
            const nextState = typeof updater === 'function' ? updater(d.state) : updater
            return { ...d, state: nextState }
          }
          return d
        }),
      )
    },
    [onDiagramsChange],
  )
  const [tool, setTool] = useState<Tool>('select')
  // When locked, a drawing tool stays active after each placement so several
  // elements can be dropped in a row (place-multiple). When off, the tool
  // reverts to Select after one placement (the conventional single-shot mode).
  const [lockTool, setLockTool] = useState(false)
  const lockToolRef = useRef(lockTool)
  lockToolRef.current = lockTool
  // Search query for the Component Library dropdown (50+ icons across 4
  // categories, so a flat scrolling menu is hard to use without a filter).
  const [libQuery, setLibQuery] = useState('')
  const [mode, setMode] = useState<'develop' | 'run'>(initialMode ?? 'develop')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [view, setView] = useState<ViewTransform>({ x: 60, y: 40, k: 1 })
  const [drag, setDrag] = useState<DragState | null>(null)
  const [hover, setHover] = useState<{ id: string; x: number; y: number } | null>(null)
  const [marquee, setMarquee] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [guides, setGuides] = useState<{ v: number[]; h: number[] } | null>(null)
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null)
  const [showLayers, setShowLayers] = useState(true)

  const [hoveredAnchor, setHoveredAnchor] = useState<ElementAnchorInfo | null>(null)

  const [customComponents, setCustomComponents] = useState<CustomComponent[]>(() => {
    try {
      const raw = localStorage.getItem('frees-custom-components')
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })

  const [saveCompModalOpen, setSaveCompModalOpen] = useState(false)
  const [newCompName, setNewCompName] = useState('')
  const imageInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    localStorage.setItem('frees-custom-components', JSON.stringify(customComponents))
  }, [customComponents])

  const allAnchors = useMemo(() => {
    const list: ElementAnchorInfo[] = []
    for (const el of state.elements) {
      if (el.kind === 'connector' || el.kind === 'line') continue
      const anchors = getElementAnchors(el)
      for (const name of Object.keys(anchors)) {
        const coord = getAnchorCoordinate(el, name)
        list.push({
          elId: el.id,
          name,
          x: coord.x,
          y: coord.y,
        })
      }
    }
    return list
  }, [state.elements])

  useEffect(() => {
    setHoveredAnchor(null)
  }, [tool])

  // Surface localStorage save failures (previously swallowed) so the user is
  // warned before losing work — usually quota overflow from embedded images.
  useEffect(() => {
    const onSaveError = (e: Event) => {
      const message = (e as CustomEvent<string>).detail
      setNotice({ kind: 'error', message: message || 'The diagram could not be saved.' })
    }
    window.addEventListener(DIAGRAM_SAVE_ERROR_EVENT, onSaveError)
    return () => window.removeEventListener(DIAGRAM_SAVE_ERROR_EVENT, onSaveError)
  }, [])

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

  useEffect(() => {
    pastRef.current = []
    futureRef.current = []
    setSelectedIds([])
  }, [activeDiagramId])

  const [templateModalOpen, setTemplateModalOpen] = useState(false)

  // Diagram export (Story 10.10): standalone SVG/PNG client-side, PDF/EPS via FOP.
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [exportScale, setExportScale] = useState(2)
  const [exportTheme, setExportTheme] = useState<DiagramExportTheme>('dark')
  const [exporting, setExporting] = useState<DiagramExportFormat | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)
  // Transient banner for save failures (quota) and import errors/warnings.
  const [notice, setNotice] = useState<{ kind: 'error' | 'info'; message: string } | null>(null)
  // Canvas surface theme — editing was previously locked to dark regardless of
  // the app's color scheme; this lets the canvas match a light workspace.
  const [canvasTheme, setCanvasTheme] = useState<'dark' | 'light'>('dark')
  const diagramJsonInputRef = useRef<HTMLInputElement>(null)

  const runExport = async (format: DiagramExportFormat) => {
    if (!svgRef.current) return
    setExportError(null)
    setExporting(format)
    try {
      await exportDiagram(svgRef.current, format, activeDiagram.name, {
        scale: exportScale,
        theme: exportTheme,
      })
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed.')
    } finally {
      setExporting(null)
    }
  }

  const addDiagram = (name: string, elements: DiagramElement[] = []) => {
    const nextSpec: DiagramSpec = {
      id: crypto.randomUUID(),
      name,
      state: {
        elements,
        gridSize: 10,
        snap: true,
        showGrid: true,
      },
    }
    const nextList = [...diagrams, nextSpec]
    onDiagramsChange(nextList)
    onActiveDiagramIdChange?.(nextSpec.id)
  }

  const duplicateDiagram = (id: string) => {
    const target = diagrams.find((d) => d.id === id)
    if (!target) return
    const clonedElements = instantiateTemplate(target.state.elements)
    const nextSpec: DiagramSpec = {
      id: crypto.randomUUID(),
      name: `${target.name} (Copy)`,
      state: {
        ...target.state,
        elements: clonedElements,
      },
    }
    const nextList = [...diagrams, nextSpec]
    onDiagramsChange(nextList)
    onActiveDiagramIdChange?.(nextSpec.id)
  }

  const moveDiagram = (id: string, dir: number) => {
    const index = diagrams.findIndex((d) => d.id === id)
    if (index === -1) return
    const nextIndex = index + dir
    if (nextIndex < 0 || nextIndex >= diagrams.length) return
    const nextList = [...diagrams]
    const [temp] = nextList.splice(index, 1)
    nextList.splice(nextIndex, 0, temp)
    onDiagramsChange(nextList)
  }

  const removeDiagram = (id: string) => {
    if (diagrams.length <= 1) return
    const nextList = diagrams.filter((d) => d.id !== id)
    onDiagramsChange(nextList)
    if (activeDiagramId === id) {
      onActiveDiagramIdChange?.(nextList[0]?.id ?? 'default')
    }
  }

  const renameDiagram = (id: string, name: string) => {
    const nextList = diagrams.map((d) => (d.id === id ? { ...d, name } : d))
    onDiagramsChange(nextList)
  }

  // Export the active diagram to a portable JSON file so it can be backed up,
  // version-controlled, or moved to another browser/machine — localStorage is
  // not durable enough on its own.
  // Import a diagram JSON (single spec, an exported payload, or an array of
  // specs) as new tab(s). Validates the shape before touching the diagram list.
  const importDiagramJson = (text: string): { ok: boolean; error?: string } => {
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      return { ok: false, error: 'That file is not valid JSON.' }
    }
    const toSpec = (raw: any): DiagramSpec | null => {
      const st = raw?.state ?? raw
      if (!st || !Array.isArray(st.elements)) return null
      const state: DiagramState = {
        elements: st.elements,
        gridSize: typeof st.gridSize === 'number' ? st.gridSize : 10,
        snap: typeof st.snap === 'boolean' ? st.snap : true,
        showGrid: typeof st.showGrid === 'boolean' ? st.showGrid : true,
      }
      return { id: crypto.randomUUID(), name: String(raw?.name ?? 'Imported Diagram'), state }
    }
    const candidates = Array.isArray(parsed) ? parsed : [parsed]
    const specs = candidates.map(toSpec).filter((s): s is DiagramSpec => s !== null)
    if (specs.length === 0) {
      return { ok: false, error: 'No diagram could be read from that file.' }
    }
    onDiagramsChange([...diagrams, ...specs])
    onActiveDiagramIdChange?.(specs[0].id)
    return { ok: true }
  }

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

  // Playback (Story 6.4 + 10.11): playPos is a *continuous* position in the run
  // sequence (null = live single solve). Tweening interpolates bound attributes
  // between adjacent runs; the time clock (clockT) drives `t`-based formulas
  // independently of the table.
  const [playPos, setPlayPos] = useState<number | null>(null)
  const [playing, setPlaying] = useState(false)
  const [loop, setLoop] = useState(true)
  const [speed, setSpeed] = useState('normal')
  const [tween, setTween] = useState(true)
  const [easing, setEasing] = useState<EasingName>('ease')
  const [clockT, setClockT] = useState(0)
  const [timePlaying, setTimePlaying] = useState(false)
  const [timeScale, setTimeScale] = useState(1)
  const [recording, setRecording] = useState(false)
  const recorderRef = useRef<DiagramRecorder | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)
  // Active touch/pen pointers for two-finger pinch zoom. When two are down we
  // suppress the single-pointer drag model and scale about the pinch midpoint.
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map())
  const pinchingRef = useRef(false)
  const pinchDistRef = useRef<number | null>(null)

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

  // The nearest discrete run (for the chart marker and the run counter); the
  // continuous numeric values are interpolated separately below.
  const activeIndex =
    playPos !== null && runs.length > 0
      ? Math.max(0, Math.min(runs.length - 1, Math.round(playPos)))
      : null
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

  // Numeric values feeding every formula binding. During playback these are
  // interpolated between adjacent runs (eased) when tweening is on, else snapped
  // to the nearest run. The time clock is always exposed as `t`.
  const numValues = useMemo(() => {
    const map = new Map<string, number>()
    // The time clock seeds `t` as a fallback only; a real solved/run variable
    // named t (or T — names are case-insensitive) must override it, so it is
    // set BEFORE the solved values, not after (Story 10.11 fix).
    map.set('t', clockT)
    if (playPos !== null && runs.length > 0) {
      const p = Math.max(0, Math.min(runs.length - 1, playPos))
      const i0 = Math.floor(p)
      const i1 = Math.min(runs.length - 1, i0 + 1)
      const frac = tween ? EASINGS[easing](p - i0) : 0
      const a = runs[tween ? i0 : Math.round(p)].values
      const b = runs[i1].values
      const keys = new Set([...Object.keys(a), ...Object.keys(b)])
      for (const k of keys) {
        const va = a[k]
        const vb = b[k]
        if (tween && Number.isFinite(va) && Number.isFinite(vb)) {
          map.set(k.toLowerCase(), va + (vb - va) * frac)
        } else {
          map.set(k.toLowerCase(), Number.isFinite(va) ? va : vb)
        }
      }
    } else {
      for (const v of variables) map.set(v.name.toLowerCase(), v.value)
      // Live input-control feedback (run-mode operator dashboard): a value-fixing
      // control's current value overrides the last solved value for the variable
      // it drives, so gauges, value-driven fill, and {var} labels track sliders /
      // inputs immediately — without needing a re-Solve. (Skipped during table
      // playback above, where the swept run values must win.)
      if (runMode) {
        for (const el of state.elements) {
          if (!isControl(el) || el.kind === 'ctl-button') continue
          const name = el.varName?.trim()
          if (!name || name.endsWith('$')) continue
          if (el.target && el.target !== 'equation') continue
          const n = Number((el as { value?: unknown }).value)
          if (Number.isFinite(n)) map.set(name.toLowerCase(), n)
        }
      }
    }
    return map
  }, [playPos, runs, variables, tween, easing, clockT, runMode, state.elements])

  const valueMap = useMemo(() => {
    const map = new Map<string, VariableResult>()
    const nameFor = new Map<string, string>()
    if (activeRun) for (const n of Object.keys(activeRun.values)) nameFor.set(n.toLowerCase(), n)
    for (const v of variables) if (!nameFor.has(v.name.toLowerCase())) nameFor.set(v.name.toLowerCase(), v.name)
    for (const [k, value] of numValues) {
      map.set(k, { name: nameFor.get(k) ?? k, value, units: liveUnits.get(k) ?? '' })
    }
    return map
  }, [numValues, activeRun, variables, liveUnits])

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

  // ── Playback & animation (Story 6.4 + 10.11) ─────────────────────────
  const runCount = runs.length

  // Single requestAnimationFrame loop driving both tweened table playback and
  // the independent time clock, for smooth (interpolated) motion.
  useEffect(() => {
    const tableActive = playing && runCount > 1
    if (!tableActive && !timePlaying) return
    const msPerRun = PLAYBACK_SPEEDS.find((s) => s.value === speed)?.ms ?? 550
    let last = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const dt = now - last
      last = now
      if (tableActive) {
        setPlayPos((prev) => {
          let next = (prev ?? 0) + dt / msPerRun
          if (next >= runCount - 1) {
            if (loop) {
              next = ((next - (runCount - 1)) % (runCount - 1 || 1))
            } else {
              next = runCount - 1
              setPlaying(false)
            }
          }
          return next
        })
      }
      if (timePlaying) setClockT((t) => t + (dt / 1000) * timeScale)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, timePlaying, runCount, speed, loop, timeScale])

  // Leaving Run mode stops all animation and returns to the live solve.
  useEffect(() => {
    if (!runMode) {
      setPlaying(false)
      setPlayPos(null)
      setTimePlaying(false)
    }
  }, [runMode])

  useEffect(() => {
    if (runCount === 0) {
      setPlaying(false)
      setPlayPos(null)
    }
  }, [runCount])

  const togglePlay = () => {
    if (runCount <= 1) return
    if (playPos === null) setPlayPos(0)
    setPlaying((p) => !p)
  }

  const stepRun = (dir: 1 | -1) => {
    if (runCount === 0) return
    setPlaying(false)
    setPlayPos((prev) => {
      const base = prev === null ? 0 : Math.round(prev)
      return Math.max(0, Math.min(runCount - 1, base + dir))
    })
  }

  const goLive = () => {
    setPlaying(false)
    setPlayPos(null)
  }

  // Line elements usable as motion paths (Story 10.11 path-following).
  const motionPaths = useMemo(() => {
    const m = new Map<string, LineElement>()
    for (const el of state.elements) if (el.kind === 'line') m.set(el.id, el)
    return m
  }, [state.elements])

  const pathOptions = useMemo(
    () =>
      state.elements
        .filter((el) => el.kind === 'line')
        .map((el, i) => ({ value: el.id, label: el.name?.trim() || `Line ${i + 1}` })),
    [state.elements],
  )

  // Story 10.12: inputs for embedded Plotly chart widgets. Memoized with stable
  // deps so playback frames don't rebuild Plotly figures (only the run data,
  // not the animation clock, affects them).
  const chartStates: StateTable = useMemo(() => detectStates(variables), [variables])
  const chartInputs: EmbedInputs = useMemo(
    () => ({ states: chartStates, cyclePath, tableRows, tableResults }),
    [chartStates, cyclePath, tableRows, tableResults],
  )

  const toggleRecord = async () => {
    if (recording) {
      setRecording(false)
      await recorderRef.current?.stop(activeDiagram.name)
      recorderRef.current = null
      return
    }
    if (!svgRef.current) return
    try {
      const rec = new DiagramRecorder()
      rec.start(svgRef.current, 'dark')
      recorderRef.current = rec
      setRecording(true)
    } catch {
      recorderRef.current = null
      setRecording(false)
    }
  }

  // Stop any in-progress recording if the component unmounts.
  useEffect(() => {
    return () => {
      if (recorderRef.current) void recorderRef.current.stop(activeDiagram.name)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])


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
      setStateRaw((s) => {
        const nextElements = s.elements.map((el) =>
          el.id === id ? ({ ...el, ...patch } as DiagramElement) : el,
        )
        const control = nextElements.find((el) => el.id === id)
        if (
          control &&
          isControl(control) &&
          control.kind !== 'ctl-button' &&
          control.varName.trim() &&
          control.target &&
          control.target !== 'equation'
        ) {
          const varName = control.varName.trim()
          let valStr = ''
          if (control.kind === 'ctl-input') valStr = control.value
          else if (control.kind === 'ctl-slider') valStr = String(control.value)
          else if (control.kind === 'ctl-checkbox') valStr = control.checked ? '1' : '0'
          else if (control.kind === 'ctl-dropdown') valStr = control.value
          else if (control.kind === 'ctl-stepper') valStr = String(control.value)
          else if (control.kind === 'ctl-radio') valStr = control.value

          if (valStr.trim() !== '') {
            onVarDraftsChange?.((drafts) => {
              const existing = drafts[varName] ?? {
                guess: '',
                lower: '',
                upper: '',
                units: '',
                isUnitsUserSet: false,
              }
              const nextDrafts = { ...drafts }
              if (control.target === 'guess') {
                nextDrafts[varName] = { ...existing, guess: valStr }
              } else if (control.target === 'lower') {
                nextDrafts[varName] = { ...existing, lower: valStr }
              } else if (control.target === 'upper') {
                nextDrafts[varName] = { ...existing, upper: valStr }
              }
              return nextDrafts
            })
          }
        }
        return {
          ...s,
          elements: nextElements,
        }
      })
    },
    [onVarDraftsChange],
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
    commit((s) => {
      const remaining = s.elements.filter((el) => !selectedSet.has(el.id))
      const remainingIds = new Set(remaining.map((r) => r.id))
      const cleaned = remaining.filter((el) => {
        if (el.kind === 'connector') {
          return remainingIds.has(el.fromId) && remainingIds.has(el.toId)
        }
        return true
      })
      return { ...s, elements: cleaned }
    })
    setSelectedIds([])
  }, [selectedIds, selectedSet, commit])

  const duplicateElements = useCallback(
    (els: DiagramElement[], offset: number) => {
      if (els.length === 0) return
      const idMap = new Map<string, string>()
      const copies = els.map((el) => {
        const copy = structuredClone(el)
        copy.id = crypto.randomUUID()
        idMap.set(el.id, copy.id)
        return translateElement(copy, offset, offset)
      })
      for (const copy of copies) {
        if (copy.kind === 'connector') {
          const newFrom = idMap.get(copy.fromId)
          const newTo = idMap.get(copy.toId)
          if (newFrom && newTo) {
            copy.fromId = newFrom
            copy.toId = newTo
          }
        }
      }
      commit((s) => ({ ...s, elements: [...s.elements, ...copies] }))
      setSelectedIds(copies.map((c) => c.id))
    },
    [commit],
  )

  const saveSelectionAsComponent = useCallback((name: string) => {
    if (selectedElements.length === 0) return
    const id = crypto.randomUUID()
    
    // Normalize coordinates relative to bbox
    const bbox = combinedBounds(selectedElements, stateRef.current.elements)
    const dx = -bbox.x
    const dy = -bbox.y
    
    const relativeElements = selectedElements.map((el): DiagramElement => {
      if (el.kind === 'connector') {
        return { ...el }
      }
      if (el.kind === 'line') {
        return {
          ...el,
          x1: el.x1 + dx,
          y1: el.y1 + dy,
          x2: el.x2 + dx,
          y2: el.y2 + dy,
        }
      }
      return {
        ...el,
        x: (el as any).x + dx,
        y: (el as any).y + dy,
      } as any
    })
    
    const newComp: CustomComponent = {
      id,
      label: name,
      elements: relativeElements,
    }
    
    setCustomComponents((prev) => [...prev, newComp])
  }, [selectedElements])

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Images are stored inline as base64 data-URLs inside the diagram, which
    // counts against the small (~5 MB) localStorage budget shared by every
    // diagram. Reject oversized files up front rather than silently failing to
    // save later. SVGs are text and stay compact, so they get a higher ceiling.
    const isSvg = file.type === 'image/svg+xml'
    const limit = isSvg ? 1_000_000 : 1_500_000
    if (file.size > limit) {
      setNotice({
        kind: 'error',
        message: `That image is ${(file.size / 1_048_576).toFixed(1)} MB — too large to embed (limit ${(limit / 1_048_576).toFixed(1)} MB). Shrink it first; large images can exceed the browser storage quota and prevent the diagram from saving.`,
      })
      e.target.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const url = event.target?.result as string
      if (!url) return
      
      const rect = svgRef.current?.getBoundingClientRect()
      const cx = rect ? rect.width / 2 : 300
      const cy = rect ? rect.height / 2 : 200
      
      const worldCenter = toWorld(
        (rect?.left ?? 0) + cx,
        (rect?.top ?? 0) + cy
      )
      
      const newImage: ImageElement = {
        id: crypto.randomUUID(),
        kind: 'image',
        x: worldCenter.x - 100,
        y: worldCenter.y - 100,
        w: 200,
        h: 200,
        url,
        rotation: 0,
        stroke: '#c1c2c5',
        strokeWidth: 2,
        fill: 'transparent',
        opacity: 1,
      }
      
      commit((s) => ({
        ...s,
        elements: [...s.elements, newImage],
      }))
      setSelectedIds([newImage.id])
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }, [toWorld, commit])

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
      if (tool.startsWith('widget:')) {
        const widgetType = tool.slice(7) as WidgetElement['widgetType']
        const w = widgetType === 'dial' ? 120 : widgetType === 'bar-h' ? 145 : widgetType === 'bar-v' ? 60 : widgetType === 'tank' ? 90 : 70
        const h = widgetType === 'dial' ? 120 : widgetType === 'bar-h' ? 64 : widgetType === 'bar-v' ? 145 : widgetType === 'tank' ? 120 : 145
        return {
          ...base,
          kind: 'widget',
          widgetType,
          x,
          y,
          w,
          h,
          varName: '',
          minFormula: '0',
          maxFormula: '100',
        }
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
      if (tool === 'ctl-stepper') {
        return {
          ...ctlBase,
          kind: 'ctl-stepper',
          w: 150,
          h: 48,
          label: 'Stepper',
          min: 0,
          max: 100,
          step: 1,
          value: 0,
        }
      }
      if (tool === 'ctl-radio') {
        return {
          ...ctlBase,
          kind: 'ctl-radio',
          w: 160,
          h: 80,
          label: 'Options',
          options: ['Option A', 'Option B'],
          value: 'Option A',
        }
      }
      if (tool === 'ctl-button') {
        return {
          ...base,
          kind: 'ctl-button',
          x,
          y,
          w: 120,
          h: 40,
          label: 'Calculate',
          action: 'solve',
        }
      }
      if (tool === 'hotspot') {
        return {
          ...base,
          kind: 'hotspot',
          x,
          y,
          w: 100,
          h: 60,
          targetType: 'tab',
        }
      }
      return null
    },
    [tool, snap],
  )

  // ── pointer interactions (mouse / touch / pen) ───────────────────────

  // Track every active pointer so two simultaneous touches become a pinch.
  const onCanvasPointerDown = (e: React.PointerEvent) => {
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointersRef.current.size === 2) {
      // Second finger down: cancel any single-pointer gesture and begin pinch.
      pinchingRef.current = true
      setDrag(null)
      const pts = [...pointersRef.current.values()]
      pinchDistRef.current = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
      return
    }
    onBackgroundDown(e)
  }

  const onCanvasPointerMove = (e: React.PointerEvent) => {
    if (pinchingRef.current) {
      if (!pointersRef.current.has(e.pointerId)) return
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      const pts = [...pointersRef.current.values()]
      if (pts.length < 2 || pinchDistRef.current == null) return
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
      const rect = svgRef.current?.getBoundingClientRect()
      if (!rect || dist === 0) return
      const midX = (pts[0].x + pts[1].x) / 2 - rect.left
      const midY = (pts[0].y + pts[1].y) / 2 - rect.top
      const factor = dist / pinchDistRef.current
      pinchDistRef.current = dist
      setView((v) => {
        const k = Math.min(5, Math.max(0.15, v.k * factor))
        return { k, x: midX - ((midX - v.x) / v.k) * k, y: midY - ((midY - v.y) / v.k) * k }
      })
      return
    }
    onCanvasHoverMove(e)
  }

  const onCanvasPointerUp = (e: React.PointerEvent) => {
    pointersRef.current.delete(e.pointerId)
    if (pointersRef.current.size < 2) {
      pinchingRef.current = false
      pinchDistRef.current = null
    }
  }

  // Highlight the nearest connection anchor while the connector tool is hovering.
  const onCanvasHoverMove = (e: { clientX: number; clientY: number }) => {
    if (runMode) return
    if (tool === 'connector' && !drag) {
      const world = toWorld(e.clientX, e.clientY)
      let closest: ElementAnchorInfo | null = null
      let minDistance = 12 // screen pixels
      for (const anchor of allAnchors) {
        const dist = Math.hypot(anchor.x - world.x, anchor.y - world.y) * view.k
        if (dist < minDistance) {
          minDistance = dist
          closest = anchor
        }
      }
      setHoveredAnchor(closest)
    }
  }

  const startPan = (e: { clientX: number; clientY: number }) => {
    setDrag({ type: 'pan', startClientX: e.clientX, startClientY: e.clientY, startView: view })
  }

  const onBackgroundDown = (e: React.MouseEvent) => {
    if (pinchingRef.current) return
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
    if (tool === 'connector') {
      if (hoveredAnchor) {
        const targetEl = stateRef.current.elements.find((el) => el.id === hoveredAnchor.elId)
        if (targetEl) {
          const coord = getAnchorCoordinate(targetEl, hoveredAnchor.name)
          gestureBaseRef.current = stateRef.current
          setDrag({
            type: 'create-connector',
            fromId: hoveredAnchor.elId,
            fromAnchor: hoveredAnchor.name,
            startX: coord.x,
            startY: coord.y,
            tempX: coord.x,
            tempY: coord.y,
          })
        }
      }
      return
    }
    if (tool.startsWith('custom:')) {
      const compId = tool.slice(7)
      const comp = customComponents.find((c) => c.id === compId)
      if (comp) {
        gestureBaseRef.current = stateRef.current
        const world = toWorld(e.clientX, e.clientY)
        const bbox = combinedBounds(comp.elements, comp.elements)
        const cx = bbox.x + bbox.w / 2
        const cy = bbox.y + bbox.h / 2
        const dx = world.x - cx
        const dy = world.y - cy

        const idMap = new Map<string, string>()
        comp.elements.forEach((el) => {
          idMap.set(el.id, crypto.randomUUID())
        })

        const clonedElements = comp.elements.map((el): DiagramElement => {
          const copy = structuredClone(el)
          copy.id = idMap.get(el.id)!
          const base = copy
          if (base.groupId) {
            const newGroupId = idMap.get(base.groupId) || crypto.randomUUID()
            idMap.set(base.groupId, newGroupId)
            base.groupId = newGroupId
          }
          if (base.kind === 'connector') {
            return {
              ...base,
              fromId: idMap.get(base.fromId) ?? base.fromId,
              toId: idMap.get(base.toId) ?? base.toId,
            } as ConnectorElement
          }
          if (base.kind === 'line') {
            return {
              ...base,
              x1: base.x1 + dx,
              y1: base.y1 + dy,
              x2: base.x2 + dx,
              y2: base.y2 + dy,
            } as LineElement
          }
          return {
            ...base,
            x: (base as any).x + dx,
            y: (base as any).y + dy,
          } as any
        })

        commit((s) => ({
          ...s,
          elements: [...s.elements, ...clonedElements],
        }))
        setSelectedIds(clonedElements.map((el) => el.id))
        setTool('select')
      }
      return
    }
    // A drawing tool: create a new element (one gesture in history).
    gestureBaseRef.current = stateRef.current
    const world = toWorld(e.clientX, e.clientY)
    const el = createElement(world.x, world.y)
    if (!el) return
    setStateRaw((s) => ({ ...s, elements: [...s.elements, el] }))
    setSelectedIds([el.id])
    if (el.kind === 'label' || el.kind === 'icon' || el.kind === 'chart' || el.kind === 'widget' || isControl(el) || el.kind === 'hotspot') {
      setDrag({ type: 'move', startX: world.x, startY: world.y, originals: [el] })
    } else {
      setDrag({ type: 'create', id: el.id, startX: snap(world.x), startY: snap(world.y) })
    }
  }

  const onElementDown = (e: React.MouseEvent, el: DiagramElement) => {
    if (pinchingRef.current) return
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

  const onElbowDown = (e: React.MouseEvent, axis: 'x' | 'y') => {
    if (!selected) return
    e.stopPropagation()
    gestureBaseRef.current = stateRef.current
    setDrag({ type: 'connector-mid', id: selected.id, axis })
  }

  // Double-click the elbow handle to clear the manual position and re-centre.
  const resetConnectorMid = (id: string) => {
    const el = stateRef.current.elements.find((e) => e.id === id)
    if (!el || el.kind !== 'connector') return
    const next = { ...el }
    delete (next as { mid?: number }).mid
    updateElement(id, next, `connmid:${id}`)
  }

  // Drag an existing waypoint (multi-bend routing).
  const onWaypointDown = (e: React.MouseEvent, index: number) => {
    if (!selected) return
    e.stopPropagation()
    gestureBaseRef.current = stateRef.current
    setDrag({ type: 'waypoint', id: selected.id, index })
  }

  // Drag a segment's midpoint to insert a new waypoint there, then move it.
  // `segIndex` is the index in the waypoints array at which to insert.
  const onSegmentDown = (e: React.MouseEvent, segIndex: number, at: { x: number; y: number }) => {
    if (!selected || selected.kind !== 'connector') return
    e.stopPropagation()
    gestureBaseRef.current = stateRef.current
    const wps = [...(selected.waypoints ?? [])]
    wps.splice(segIndex, 0, { x: snap(at.x), y: snap(at.y) })
    updateElement(selected.id, { ...selected, waypoints: wps }, `waypoint:${selected.id}`)
    setDrag({ type: 'waypoint', id: selected.id, index: segIndex })
  }

  // Double-click a waypoint to delete it (drops back toward a straighter route).
  const deleteWaypoint = (id: string, index: number) => {
    const el = stateRef.current.elements.find((e) => e.id === id)
    if (!el || el.kind !== 'connector' || !el.waypoints) return
    const wps = el.waypoints.filter((_, i) => i !== index)
    updateElement(id, { ...el, waypoints: wps.length ? wps : undefined }, `waypoint:${id}`)
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
          .map((e) => elementBounds(e, stateRef.current.elements))
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
      if (orig.kind === 'line' || orig.kind === 'label' || orig.kind === 'connector') return
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

  const applyConnectorMid = useCallback(
    (d: Extract<DragState, { type: 'connector-mid' }>, world: { x: number; y: number }) => {
      const el = stateRef.current.elements.find((e) => e.id === d.id)
      if (!el || el.kind !== 'connector') return
      const mid = d.axis === 'x' ? snap(world.x) : snap(world.y)
      updateElementLive(d.id, { ...el, mid })
    },
    [snap, updateElementLive],
  )

  const applyWaypoint = useCallback(
    (d: Extract<DragState, { type: 'waypoint' }>, world: { x: number; y: number }) => {
      const el = stateRef.current.elements.find((e) => e.id === d.id)
      if (!el || el.kind !== 'connector' || !el.waypoints) return
      const wps = el.waypoints.map((w, i) =>
        i === d.index ? { x: snap(world.x), y: snap(world.y) } : w,
      )
      updateElementLive(d.id, { ...el, waypoints: wps })
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

  const applyCreateConnector = useCallback(
    (d: Extract<DragState, { type: 'create-connector' }>, world: { x: number; y: number }) => {
      let closest: ElementAnchorInfo | null = null
      let minDistance = 12 // screen pixels
      
      for (const anchor of allAnchors) {
        if (anchor.elId === d.fromId) continue
        const dist = Math.hypot(anchor.x - world.x, anchor.y - world.y) * view.k
        if (dist < minDistance) {
          minDistance = dist
          closest = anchor
        }
      }
      
      const tempX = closest ? closest.x : world.x
      const tempY = closest ? closest.y : world.y
      
      setDrag(prev => {
        if (!prev || prev.type !== 'create-connector') return prev
        return { ...prev, tempX, tempY }
      })
      
      setHoveredAnchor(closest)
    },
    [allAnchors, view.k],
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
      else if (drag.type === 'connector-mid') applyConnectorMid(drag, world)
      else if (drag.type === 'waypoint') applyWaypoint(drag, world)
      else if (drag.type === 'rotate') applyRotate(drag, world, shift)
      else if (drag.type === 'marquee') applyMarquee(drag, world)
      else if (drag.type === 'create-connector') applyCreateConnector(drag, world)
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
        if (!lockToolRef.current) setTool('select')
      } else if (drag.type === 'move') {
        endGesture()
        if (tool !== 'select') setTool('select')
      } else if (
        drag.type === 'resize' ||
        drag.type === 'groupResize' ||
        drag.type === 'endpoint' ||
        drag.type === 'connector-mid' ||
        drag.type === 'waypoint' ||
        drag.type === 'rotate'
      ) {
        endGesture()
      } else if (drag.type === 'create-connector') {
        if (hoveredAnchor && hoveredAnchor.elId !== drag.fromId) {
          const newConnector: ConnectorElement = {
            id: crypto.randomUUID(),
            kind: 'connector',
            fromId: drag.fromId,
            fromAnchor: drag.fromAnchor,
            toId: hoveredAnchor.elId,
            toAnchor: hoveredAnchor.name,
            style: 'orthogonal',
            arrow: 'to',
            rotation: 0,
            stroke: '#c1c2c5',
            strokeWidth: 2,
            fill: 'transparent',
            opacity: 1,
          }
          commit((s) => ({
            ...s,
            elements: [...s.elements, newConnector],
          }))
          setSelectedIds([newConnector.id])
        }
        setHoveredAnchor(null)
        gestureBaseRef.current = null
        if (!lockToolRef.current) setTool('select')
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
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [
    drag,
    toWorld,
    applyMove,
    applyCreate,
    applyResize,
    applyGroupResize,
    applyEndpoint,
    applyConnectorMid,
    applyWaypoint,
    applyRotate,
    applyMarquee,
    applyCreateConnector,
    endGesture,
    tool,
    hoveredAnchor,
    commit,
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

  // Zoom by a fixed factor about the canvas center, keeping that point fixed.
  const zoomBy = (factor: number) => {
    const rect = svgRef.current?.getBoundingClientRect()
    const cx = rect ? rect.width / 2 : 0
    const cy = rect ? rect.height / 2 : 0
    setView((v) => {
      const k = Math.min(5, Math.max(0.15, v.k * factor))
      return {
        k,
        x: cx - ((cx - v.x) / v.k) * k,
        y: cy - ((cy - v.y) / v.k) * k,
      }
    })
  }

  // Reset to 100% about the canvas center.
  const resetZoom = () => {
    const rect = svgRef.current?.getBoundingClientRect()
    const cx = rect ? rect.width / 2 : 0
    const cy = rect ? rect.height / 2 : 0
    setView((v) => ({
      k: 1,
      x: cx - ((cx - v.x) / v.k) * 1,
      y: cy - ((cy - v.y) / v.k) * 1,
    }))
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
      // Zoom shortcuts (Ctrl/Cmd with +, -, 0) work in any mode.
      if (mod && (e.key === '=' || e.key === '+')) {
        e.preventDefault()
        zoomBy(1.2)
        return
      }
      if (mod && (e.key === '-' || e.key === '_')) {
        e.preventDefault()
        zoomBy(1 / 1.2)
        return
      }
      if (mod && e.key === '0') {
        e.preventDefault()
        resetZoom()
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
        setLockTool(false)
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
    { tool: 'chart', label: 'Chart widget (Plotly: table X-Y or embedded plot)', icon: <IconChartLine size={18} /> },
    { tool: 'connector', label: 'Connector (Link)', icon: <IconBinaryTree size={18} /> },
    { tool: 'hotspot', label: 'Navigation Hotspot', icon: <IconTarget size={18} /> },
  ]

  const CONTROL_TOOLS: { tool: ControlElement['kind']; label: string; icon: React.ReactNode }[] = [
    { tool: 'ctl-input', label: 'Input (fixes a variable)', icon: <IconForms size={16} /> },
    { tool: 'ctl-output', label: 'Output (shows a solved value)', icon: <IconTag size={16} /> },
    { tool: 'ctl-dropdown', label: 'Dropdown selector', icon: <IconSelector size={16} /> },
    { tool: 'ctl-checkbox', label: 'Checkbox (0 / 1)', icon: <IconCheckbox size={16} /> },
    { tool: 'ctl-slider', label: 'Slider', icon: <IconAdjustmentsHorizontal size={16} /> },
    { tool: 'ctl-stepper', label: 'Stepper input', icon: <IconPlusMinus size={16} /> },
    { tool: 'ctl-radio', label: 'Radio option group', icon: <IconCircleDot size={16} /> },
    { tool: 'ctl-button', label: 'Calculate / Check button', icon: <IconClick size={16} /> },
  ]

  const WIDGET_TOOLS: { tool: Tool; label: string; icon: React.ReactNode }[] = [
    { tool: 'widget:dial', label: 'Analog Gauge/Dial', icon: <IconGauge size={16} /> },
    { tool: 'widget:bar-h', label: 'Horizontal Bar', icon: <IconArrowAutofitWidth size={16} /> },
    { tool: 'widget:bar-v', label: 'Vertical Bar', icon: <IconArrowAutofitHeight size={16} /> },
    { tool: 'widget:tank', label: 'Tank Fill-Level', icon: <IconRipple size={16} /> },
    { tool: 'widget:thermometer', label: 'Thermometer', icon: <IconThermometer size={16} /> },
  ]

  const gridStep = state.gridSize * view.k

  return (
    <Group align="stretch" gap="sm" h="100%" wrap="nowrap" p={6}>
      <Stack gap="xs" flex={1} miw={0}>
        {/* Diagram Tabs Row */}
        <Group gap="xs" wrap="wrap" style={{ borderBottom: '1px solid var(--mantine-color-default-border)', paddingBottom: 8 }}>
          {!singleDiagramId && diagrams.map((d, index) => (
            <Menu key={d.id} position="bottom-start" shadow="md" trigger="hover" openDelay={200}>
              <Menu.Target>
                <Paper
                  withBorder
                  px={8}
                  py={4}
                  style={{
                    cursor: 'pointer',
                    borderColor: activeDiagramId === d.id ? 'var(--mantine-color-teal-7)' : undefined,
                    backgroundColor: activeDiagramId === d.id
                      ? 'var(--mantine-color-default)'
                      : 'light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-8))',
                  }}
                  onClick={() => onActiveDiagramIdChange?.(d.id)}
                >
                  <Group gap={6} wrap="nowrap">
                    <IconSchema size={14} color="var(--mantine-color-teal-4)" />
                    {activeDiagramId === d.id ? (
                      <TextInput
                        size="xs"
                        variant="unstyled"
                        w={100}
                        styles={{ input: { height: 18, minHeight: 18, padding: 0 } }}
                        value={d.name}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => renameDiagram(d.id, e.currentTarget.value)}
                      />
                    ) : (
                      <Text size="xs" style={{ userSelect: 'none' }}>{d.name}</Text>
                    )}
                    <IconChevronDown size={11} color="gray" />
                  </Group>
                </Paper>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item leftSection={<IconCopy size={14} />} onClick={() => duplicateDiagram(d.id)}>
                  Duplicate
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconArrowLeft size={14} />}
                  disabled={index === 0}
                  onClick={() => moveDiagram(d.id, -1)}
                >
                  Move Left
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconArrowRight size={14} />}
                  disabled={index === diagrams.length - 1}
                  onClick={() => moveDiagram(d.id, 1)}
                >
                  Move Right
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  color="red"
                  leftSection={<IconTrash size={14} />}
                  disabled={diagrams.length <= 1}
                  onClick={() => removeDiagram(d.id)}
                >
                  Delete
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          ))}
          {!singleDiagramId && (
          <Menu position="bottom-start" shadow="md">
            <Menu.Target>
              <Button size="compact-xs" variant="light" leftSection={<IconPlus size={13} />}>
                Add Diagram
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item leftSection={<IconPlus size={14} />} onClick={() => addDiagram(`Diagram ${diagrams.length + 1}`)}>
                New Blank Diagram
              </Menu.Item>
              <Menu.Item leftSection={<IconLayoutGrid size={14} />} onClick={() => setTemplateModalOpen(true)}>
                From Template...
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item leftSection={<IconFileImport size={14} />} onClick={() => diagramJsonInputRef.current?.click()}>
                Import from JSON...
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
          )}
          {/* Export is a Run-mode action only; diagrams persist with the
              workspace, so a separate "Save JSON" button is unnecessary. */}
          {runMode && (
            <Tooltip label="Export this diagram (SVG, PNG, PDF, EPS)">
              <Button
                size="compact-xs"
                variant="light"
                color="gray"
                leftSection={<IconDownload size={13} />}
                onClick={() => {
                  setExportError(null)
                  setExportModalOpen(true)
                }}
              >
                Export
              </Button>
            </Tooltip>
          )}
        </Group>

        {notice && (
          <Alert
            color={notice.kind === 'error' ? 'red' : 'blue'}
            variant="light"
            withCloseButton
            onClose={() => setNotice(null)}
            py={6}
          >
            <Text size="xs">{notice.message}</Text>
          </Alert>
        )}

        {/* Canvas Toolbar Row */}
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
                      aria-label={tb.label}
                      aria-pressed={tool === tb.tool}
                      onClick={() => setTool(tb.tool)}
                    >
                      {tb.icon}
                    </ActionIcon>
                  </Tooltip>
                ))}
                <Menu shadow="md" position="bottom-start" onClose={() => setLibQuery('')}>
                  <Menu.Target>
                    <Tooltip label="Component Library">
                      <ActionIcon
                        variant={tool.startsWith('icon:') ? 'filled' : 'default'}
                        size="lg"
                        aria-label="Component Library"
                      >
                        <IconStack2 size={18} />
                      </ActionIcon>
                    </Tooltip>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item
                      leftSection={<IconFolderPlus size={16} />}
                      onClick={() => imageInputRef.current?.click()}
                    >
                      Import Image / SVG...
                    </Menu.Item>
                    <Menu.Divider />
                    {/* Filter box: type to narrow the 32+ components by name. */}
                    <div style={{ padding: '0 8px 6px' }}>
                      <TextInput
                        size="xs"
                        data-autofocus
                        placeholder="Search components…"
                        value={libQuery}
                        leftSection={<IconSearch size={14} />}
                        onChange={(e) => setLibQuery(e.currentTarget.value)}
                        // Keep keystrokes (and Space/arrows) in the field instead
                        // of triggering the Menu's type-ahead / item navigation.
                        onKeyDown={(e) => e.stopPropagation()}
                      />
                    </div>
                    <ScrollArea.Autosize mah={360} type="auto">
                      {(() => {
                        const q = libQuery.trim().toLowerCase()
                        const cats = ['Basic Shapes', 'Thermo-fluid', 'Mechanical', 'Sensors & Gauges', 'Electrical'] as const
                        const matchesCustom = customComponents.filter((cc) => cc.label.toLowerCase().includes(q))
                        let anyMatch = matchesCustom.length > 0
                        const sections = cats.map((cat) => {
                          const items = LIBRARY_ICONS.filter(
                            (i) => i.category === cat && i.label.toLowerCase().includes(q),
                          )
                          if (items.length === 0) return null
                          anyMatch = true
                          return (
                            <div key={cat}>
                              <Menu.Label>{cat}</Menu.Label>
                              {items.map((icon) => (
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
                            </div>
                          )
                        })
                        return (
                          <>
                            {sections}
                            {matchesCustom.length > 0 && (
                              <>
                                <Menu.Divider />
                                <Menu.Label>Custom Components</Menu.Label>
                                {matchesCustom.map((cc) => (
                                  <Menu.Item
                                    key={cc.id}
                                    leftSection={
                                      <svg width="22" height="22" viewBox="0 0 100 100">
                                        <rect x="20" y="20" width="60" height="60" rx="8" fill="none" stroke="#4dabf7" strokeWidth="6" />
                                      </svg>
                                    }
                                    rightSection={
                                      <ActionIcon
                                        variant="subtle"
                                        color="red"
                                        size="xs"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setCustomComponents((prev) => prev.filter((c) => c.id !== cc.id))
                                        }}
                                      >
                                        <IconTrash size={12} />
                                      </ActionIcon>
                                    }
                                    onClick={() => setTool(`custom:${cc.id}`)}
                                  >
                                    {cc.label}
                                  </Menu.Item>
                                ))}
                              </>
                            )}
                            {!anyMatch && (
                              <Text size="xs" c="dimmed" ta="center" py="sm">
                                No components match “{libQuery}”.
                              </Text>
                            )}
                          </>
                        )
                      })()}
                    </ScrollArea.Autosize>
                  </Menu.Dropdown>
                </Menu>
                <Menu shadow="md" position="bottom-start">
                  <Menu.Target>
                    <Tooltip label="Form Controls (variable binding)">
                      <ActionIcon
                        variant={tool.startsWith('ctl-') ? 'filled' : 'default'}
                        size="lg"
                        aria-label="Form Controls"
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
                <Menu shadow="md" position="bottom-start">
                  <Menu.Target>
                    <Tooltip label="Indicator & Gauge Widgets">
                      <ActionIcon
                        variant={tool.startsWith('widget:') ? 'filled' : 'default'}
                        size="lg"
                        aria-label="Indicator & Gauge Widgets"
                      >
                        <IconGauge size={18} />
                      </ActionIcon>
                    </Tooltip>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Label>Indicator & Gauge Widgets</Menu.Label>
                    {WIDGET_TOOLS.map((wt) => (
                      <Menu.Item
                        key={wt.tool}
                        leftSection={wt.icon}
                        onClick={() => setTool(wt.tool)}
                      >
                        {wt.label}
                      </Menu.Item>
                    ))}
                  </Menu.Dropdown>
                </Menu>
                <Tooltip label={lockTool ? 'Tool locked — stays active for placing several (click or Esc to unlock)' : 'Lock tool to place several in a row'}>
                  <ActionIcon
                    variant={lockTool ? 'filled' : 'default'}
                    size="lg"
                    aria-label="Keep tool active after placing"
                    aria-pressed={lockTool}
                    onClick={() => setLockTool((v) => !v)}
                  >
                    {lockTool ? <IconPin size={18} /> : <IconPinnedOff size={18} />}
                  </ActionIcon>
                </Tooltip>
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
                  aria-label="Undo"
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
                  aria-label="Redo"
                  onClick={redo}
                  disabled={futureRef.current.length === 0}
                >
                  <IconArrowForwardUp size={18} />
                </ActionIcon>
              </Tooltip>
            </Group>
          )}
          <Group gap={2}>
            <Tooltip label="Zoom out">
              <ActionIcon variant="default" size="lg" aria-label="Zoom out" onClick={() => zoomBy(1 / 1.2)}>
                <IconZoomOut size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Reset to 100%">
              <Button variant="default" size="compact-sm" w={52} px={4} onClick={resetZoom} aria-label="Zoom level, click to reset to 100%">
                {Math.round(view.k * 100)}%
              </Button>
            </Tooltip>
            <Tooltip label="Zoom in">
              <ActionIcon variant="default" size="lg" aria-label="Zoom in" onClick={() => zoomBy(1.2)}>
                <IconZoomIn size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Zoom to fit">
              <ActionIcon variant="default" size="lg" aria-label="Zoom to fit" onClick={zoomToFit}>
                <IconZoomScan size={18} />
              </ActionIcon>
            </Tooltip>
          </Group>
          <Tooltip label={canvasTheme === 'dark' ? 'Canvas: dark (switch to light)' : 'Canvas: light (switch to dark)'}>
            <ActionIcon
              variant="default"
              size="lg"
              aria-label="Toggle canvas background light/dark"
              onClick={() => setCanvasTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            >
              {canvasTheme === 'dark' ? <IconMoon size={18} /> : <IconSun size={18} />}
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

        {runMode && (
          <Paper withBorder px="sm" py={6}>
            <Stack gap={6}>
              {runCount > 0 && (
                <Group gap="sm" wrap="nowrap">
                  <Group gap={2} wrap="nowrap">
                    <Tooltip label="Previous run">
                      <ActionIcon variant="default" aria-label="Previous run" onClick={() => stepRun(-1)}>
                        <IconPlayerSkipBackFilled size={16} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label={playing ? 'Pause' : 'Play runs'}>
                      <ActionIcon variant="filled" aria-label={playing ? 'Pause' : 'Play runs'} onClick={togglePlay} disabled={runCount <= 1}>
                        {playing ? (
                          <IconPlayerPauseFilled size={16} />
                        ) : (
                          <IconPlayerPlayFilled size={16} />
                        )}
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Next run">
                      <ActionIcon variant="default" aria-label="Next run" onClick={() => stepRun(1)}>
                        <IconPlayerSkipForwardFilled size={16} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label={loop ? 'Looping' : 'Loop off'}>
                      <ActionIcon
                        variant={loop ? 'light' : 'default'}
                        aria-label="Toggle loop playback"
                        aria-pressed={loop}
                        onClick={() => setLoop((l) => !l)}
                      >
                        {loop ? <IconRepeat size={16} /> : <IconRepeatOff size={16} />}
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                  <Slider
                    flex={1}
                    min={0}
                    max={Math.max(0, runCount - 1)}
                    step={0.01}
                    value={playPos ?? 0}
                    label={(v) => runs[Math.round(v)]?.label ?? ''}
                    onChange={(v) => {
                      setPlaying(false)
                      setPlayPos(v)
                    }}
                  />
                  <Text size="xs" c="dimmed" w={64} ta="center" style={{ flexShrink: 0 }}>
                    {playPos === null || activeIndex === null
                      ? 'live'
                      : `${activeIndex + 1} / ${runCount}`}
                  </Text>
                  <SegmentedControl
                    size="xs"
                    value={speed}
                    onChange={setSpeed}
                    data={PLAYBACK_SPEEDS.map((s) => ({ label: s.label, value: s.value }))}
                  />
                  <Tooltip label="Show the live single solve">
                    <ActionIcon
                      variant={playPos === null ? 'light' : 'default'}
                      aria-label="Show the live single solve"
                      onClick={goLive}
                    >
                      <IconBroadcast size={16} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              )}

              {/* Animation options (Story 10.11): tweening, time clock, recording. */}
              <Group gap="sm" wrap="wrap">
                {runCount > 1 && (
                  <>
                    <Tooltip label="Smoothly interpolate bound attributes between runs">
                      <Checkbox
                        size="xs"
                        label="Tween"
                        checked={tween}
                        onChange={(e) => setTween(e.currentTarget.checked)}
                      />
                    </Tooltip>
                    <Select
                      size="xs"
                      w={120}
                      disabled={!tween}
                      value={easing}
                      onChange={(v) => v && setEasing(v as EasingName)}
                      data={[
                        { value: 'linear', label: 'Linear' },
                        { value: 'ease', label: 'Ease' },
                        { value: 'ease-in', label: 'Ease in' },
                        { value: 'ease-out', label: 'Ease out' },
                      ]}
                      aria-label="Easing"
                    />
                    <Divider orientation="vertical" />
                  </>
                )}
                <Tooltip label="Free-running time clock — drives formulas that use the variable t">
                  <ActionIcon
                    variant={timePlaying ? 'filled' : 'default'}
                    onClick={() => setTimePlaying((p) => !p)}
                  >
                    {timePlaying ? <IconPlayerPauseFilled size={16} /> : <IconClock size={16} />}
                  </ActionIcon>
                </Tooltip>
                <Text size="xs" c="dimmed" ff="monospace" w={70}>
                  t = {clockT.toFixed(2)}s
                </Text>
                <Tooltip label="Reset the time clock to 0">
                  <ActionIcon
                    variant="default"
                    onClick={() => {
                      setTimePlaying(false)
                      setClockT(0)
                    }}
                  >
                    <IconRefresh size={16} />
                  </ActionIcon>
                </Tooltip>
                <NumberInput
                  size="xs"
                  w={96}
                  min={0.1}
                  max={20}
                  step={0.5}
                  value={timeScale}
                  onChange={(v) => setTimeScale(typeof v === 'number' ? v : 1)}
                  suffix="×"
                  aria-label="Time speed"
                />
                <Divider orientation="vertical" />
                {DiagramRecorder.isSupported() && (
                  <Tooltip label={recording ? 'Stop recording & download' : 'Record animation to video'}>
                    <Button
                      size="compact-xs"
                      variant={recording ? 'filled' : 'light'}
                      color={recording ? 'red' : 'gray'}
                      leftSection={<IconVideo size={14} />}
                      onClick={() => void toggleRecord()}
                    >
                      {recording ? 'Stop' : 'Record'}
                    </Button>
                  </Tooltip>
                )}
              </Group>
            </Stack>
          </Paper>
        )}

        <Paper
          withBorder
          flex={1}
          mih={0}
          style={{ overflow: 'hidden', background: canvasTheme === 'light' ? '#ffffff' : '#141517', position: 'relative' }}
        >
          <style>{FLOW_KEYFRAMES}</style>
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            onPointerDown={onCanvasPointerDown}
            onPointerMove={onCanvasPointerMove}
            onPointerUp={onCanvasPointerUp}
            onPointerCancel={onCanvasPointerUp}
            onWheel={onWheel}
            onMouseLeave={() => {
              if (tool === 'connector' && !drag) {
                setHoveredAnchor(null)
              }
            }}
            style={{
              touchAction: 'none',
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
                <GridPattern gridSize={state.gridSize} view={view} dotColor={canvasTheme === 'light' ? '#ced4da' : '#373A40'} />
              )}
              {/* Marked group captured by diagram export (Story 10.10); excludes
                  grid, smart guides, and selection chrome rendered as siblings. */}
              <g data-export-content="">
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
                      el={resolveElement(el, numValues, runMode, motionPaths)}
                      runMode={runMode}
                      values={valueMap}
                      numValues={numValues}
                      runs={runs}
                      activeIndex={activeIndex}
                      onMouseDown={onElementDown}
                      onControlValue={onControlValue}
                      onHover={onHover}
                      elements={state.elements}
                      onSolve={onSolve}
                      onCheck={onCheck}
                      solving={solving}
                      onNavigate={onNavigate}
                      plots={plots}
                      chartInputs={chartInputs}
                    />
                  </g>
                )
              })}
              </g>
              {!runMode && selectedElements.length > 1 &&
                selectedElements.map((el) => {
                  const b = elementBounds(el, state.elements)
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
                <GroupHandles els={selectedElements} view={view} onHandleDown={onHandleDown} elements={state.elements} />
              )}
              {!runMode && selected && (
                <SelectionHandles
                  el={selected}
                  view={view}
                  onHandleDown={onHandleDown}
                  onEndpointDown={onEndpointDown}
                  onRotateDown={onRotateDown}
                  onElbowDown={onElbowDown}
                  onElbowReset={resetConnectorMid}
                  onWaypointDown={onWaypointDown}
                  onSegmentDown={onSegmentDown}
                  onWaypointDelete={deleteWaypoint}
                  elements={state.elements}
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
              {!runMode && tool === 'connector' && allAnchors.map((anchor) => {
                const isHovered = hoveredAnchor && hoveredAnchor.elId === anchor.elId && hoveredAnchor.name === anchor.name
                const r = (isHovered ? 6 : 4) / view.k
                return (
                  <circle
                    key={`anchor-${anchor.elId}-${anchor.name}`}
                    cx={anchor.x}
                    cy={anchor.y}
                    r={r}
                    fill={isHovered ? '#69db7c' : 'rgba(77,171,247,0.5)'}
                    stroke={isHovered ? '#1b5e20' : '#4dabf7'}
                    strokeWidth={1.5 / view.k}
                    style={{ cursor: 'pointer', transition: 'r 0.1s ease, fill 0.1s ease' }}
                    pointerEvents="none"
                  />
                )
              })}
              {drag?.type === 'create-connector' && (
                <g>
                  <line
                    x1={drag.startX}
                    y1={drag.startY}
                    x2={drag.tempX}
                    y2={drag.tempY}
                    stroke="#4dabf7"
                    strokeWidth={2 / view.k}
                    strokeDasharray={`${4 / view.k} ${3 / view.k}`}
                    pointerEvents="none"
                  />
                  <circle
                    cx={drag.tempX}
                    cy={drag.tempY}
                    r={4 / view.k}
                    fill="#4dabf7"
                    pointerEvents="none"
                  />
                </g>
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

      {!runMode && (() => {
        const inspectorBody = (
          <ScrollArea h="100%" type="auto">
            {selected ? (
              <PropertiesPanel
                el={selected}
                varNames={varNames}
                pathOptions={pathOptions.filter((p) => p.value !== selected.id)}
                onChange={(next) => updateElement(selected.id, next, `prop:${selected.id}`)}
                onDuplicate={duplicateSelected}
                onDelete={deleteSelected}
                onZOrder={zOrder}
                onSaveComponent={() => setSaveCompModalOpen(true)}
                plots={plots}
                diagrams={diagrams}
              />
            ) : selectedElements.length > 1 ? (
              <Stack gap="xs">
                <Text fw={600} size="sm" c="teal.4">
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
                  <Tooltip label="Save as Custom Component">
                    <ActionIcon variant="default" color="teal" size="md" onClick={() => setSaveCompModalOpen(true)}>
                      <IconFolderPlus size={16} />
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
                <Text fw={600} size="sm" c="teal.4">
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
        )
        // Only the focused diagram window shows an inspector. A non-focused
        // diagram renders nothing — otherwise, when focus leaves to another
        // window the shared outlet unmounts (inspectorOutlet → null) and the
        // inline fallback below would render a stray inspector beside the
        // diagram (the duplicate-inspector bug).
        if (!isActive) return null
        // Focused: portal Properties/Layers into the shared Inspector edge
        // panel when it's open; otherwise fall back to an inline column so
        // properties stay reachable.
        if (inspectorOutlet) {
          return createPortal(
            <div style={{ height: '100%', padding: 'var(--mantine-spacing-sm)' }}>
              {inspectorBody}
            </div>,
            inspectorOutlet,
          )
        }
        return (
          <Paper withBorder p="sm" w={250} style={{ flexShrink: 0 }}>
            {inspectorBody}
          </Paper>
        )
      })()}

      <Modal
        opened={saveCompModalOpen}
        onClose={() => setSaveCompModalOpen(false)}
        title="Save Selection as Custom Component"
        size="xs"
      >
        <Stack gap="sm">
          <TextInput
            label="Component Name"
            placeholder="e.g. Dual Compressor"
            value={newCompName}
            onChange={(e) => setNewCompName(e.currentTarget.value)}
            autoFocus
          />
          <Group justify="flex-end">
            <Button variant="default" size="xs" onClick={() => setSaveCompModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="xs"
              disabled={!newCompName.trim()}
              onClick={() => {
                const name = newCompName.trim()
                if (name) {
                  saveSelectionAsComponent(name)
                  setSaveCompModalOpen(false)
                  setNewCompName('')
                }
              }}
            >
              Save
            </Button>
          </Group>
        </Stack>
      </Modal>

      <input
        type="file"
        ref={imageInputRef}
        accept="image/*,image/svg+xml"
        onChange={handleImageUpload}
        style={{ display: 'none' }}
      />

      <input
        type="file"
        ref={diagramJsonInputRef}
        accept="application/json,.json"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (!file) return
          file
            .text()
            .then((text) => {
              const result = importDiagramJson(text)
              if (!result.ok) {
                setNotice({ kind: 'error', message: result.error ?? 'Import failed.' })
              } else {
                setNotice({ kind: 'info', message: `Imported “${file.name}”.` })
              }
            })
            .catch(() => setNotice({ kind: 'error', message: 'Could not read that file.' }))
        }}
        style={{ display: 'none' }}
      />

      <Modal
        opened={templateModalOpen}
        onClose={() => setTemplateModalOpen(false)}
        title={<Text fw={700}>Select a Diagram Template</Text>}
        size="lg"
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Choose a starter template. The diagram will be created as a new tab with pre-wired schematic elements, connectors, and labels.
          </Text>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: 12,
            }}
          >
            {TEMPLATES.map((tmpl) => (
              <div
                key={tmpl.name}
                style={{
                  border: '1px solid var(--mantine-color-default-border)',
                  borderRadius: 8,
                  padding: 12,
                  backgroundColor: 'light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-8))',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <div>
                  <Text fw={600} size="sm" c="teal.4">
                    {tmpl.name}
                  </Text>
                  <Text size="xs" c="dimmed" style={{ marginTop: 4, lineHeight: 1.5 }}>
                    {tmpl.description}
                  </Text>
                </div>
                <Button
                  size="xs"
                  variant="light"
                  fullWidth
                  onClick={() => {
                    addDiagram(tmpl.name, instantiateTemplate(tmpl.elements))
                    setTemplateModalOpen(false)
                  }}
                >
                  Load Template
                </Button>
              </div>
            ))}
          </div>
        </Stack>
      </Modal>

      <Modal
        opened={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        title={<Text fw={700}>Export “{activeDiagram.name}”</Text>}
        size="sm"
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            SVG and PNG are generated in your browser; PDF and EPS are rendered by
            the backend. The editor grid, guides, and selection handles are excluded.
          </Text>
          <NumberInput
            label="Raster scale (PNG)"
            description="Pixel multiplier for the bitmap export"
            min={1}
            max={8}
            step={1}
            value={exportScale}
            onChange={(v) => setExportScale(typeof v === 'number' ? v : 2)}
          />
          <div>
            <Text size="sm" fw={500} mb={4}>
              Background
            </Text>
            <SegmentedControl
              fullWidth
              size="xs"
              value={exportTheme}
              onChange={(v) => setExportTheme(v as DiagramExportTheme)}
              data={[
                { label: 'Dark', value: 'dark' },
                { label: 'Light', value: 'light' },
              ]}
            />
          </div>
          <Divider label="Download as" labelPosition="left" />
          <Group grow gap="xs">
            {(['svg', 'png', 'pdf', 'eps'] as DiagramExportFormat[]).map((fmt) => (
              <Button
                key={fmt}
                size="sm"
                variant="light"
                loading={exporting === fmt}
                disabled={exporting !== null}
                leftSection={<IconDownload size={14} />}
                onClick={() => void runExport(fmt)}
              >
                {fmt.toUpperCase()}
              </Button>
            ))}
          </Group>
          {exportError && (
            <Text size="sm" c="red.5">
              {exportError}
            </Text>
          )}
        </Stack>
      </Modal>
    </Group>
  )
}

/** Dotted grid covering the visible viewport only. */
function GridPattern({
  gridSize,
  view,
  dotColor = '#373A40',
}: Readonly<{ gridSize: number; view: ViewTransform; dotColor?: string }>) {
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
          <circle cx={0.75} cy={0.75} r={0.75} fill={dotColor} />
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
