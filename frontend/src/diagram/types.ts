/**
 * Epic 6 — Diagram Window element model.
 *
 * Every element carries shared presentation style plus kind-specific
 * geometry. Coordinates are world coordinates (pre pan/zoom transform);
 * the editor snaps them to the grid when snapping is enabled.
 */

export interface ElementStyle {
  stroke: string
  strokeWidth: number
  fill: string
  opacity: number
}

/**
 * Attribute bindings (Story 6.3): each key holds a formula of solved variables
 * evaluated in Run mode to drive the element's geometry/appearance. A binding
 * offsets the element's authored value — e.g. `dx` shifts x, `rotation` sets
 * the absolute angle. Empty/absent formulas leave the authored value untouched.
 */
export interface AttributeBindings {
  dx?: string
  dy?: string
  w?: string
  h?: string
  rotation?: string
  opacity?: string
}

export interface ConditionalStyleRule {
  id: string
  property: 'stroke' | 'fill' | 'opacity' | 'hidden'
  formula: string
  value: string
}

export interface ValueDrivenFill {
  varName: string
  minFormula: string
  maxFormula: string
  colorStart: string
  colorEnd: string
}

interface ElementBase extends ElementStyle {
  id: string
  rotation: number
  bind?: AttributeBindings
  /** Group membership (Story 10.3): elements sharing a groupId select/move together. */
  groupId?: string
  /** Locked elements cannot be selected or transformed on the canvas. */
  locked?: boolean
  /** Hidden elements are not drawn in Run mode and dimmed in Development mode. */
  hidden?: boolean
  /** Optional user-given name shown in the Layers panel. */
  name?: string
  rules?: ConditionalStyleRule[]
  valueFill?: ValueDrivenFill
}

/** Animated dashed-line flow (Story 6.3): speed is a formula; sign sets direction. */
export interface FlowAnimation {
  speed: string
}

/** Straight line, optionally with an arrow head at the (x2, y2) end. */
export interface LineElement extends ElementBase {
  kind: 'line'
  x1: number
  y1: number
  x2: number
  y2: number
  arrow: boolean
  flow?: FlowAnimation
}

/** Smart connector line between two element anchors. */
export interface ConnectorElement extends ElementBase {
  kind: 'connector'
  fromId: string
  fromAnchor: string
  toId: string
  toAnchor: string
  style: 'straight' | 'orthogonal' | 'curved'
  arrow: 'none' | 'from' | 'to' | 'both'
  flow?: FlowAnimation
}

export interface RectElement extends ElementBase {
  kind: 'rect'
  x: number
  y: number
  w: number
  h: number
  /** Corner radius. */
  rx: number
}

export interface EllipseElement extends ElementBase {
  kind: 'ellipse'
  x: number
  y: number
  w: number
  h: number
}

/**
 * Rich text label. In Run mode, `{varname}` placeholders are replaced by the
 * solved value (and unit) of that variable — the first form of variable
 * binding (Story 6.2/6.3).
 */
export interface LabelElement extends ElementBase {
  kind: 'label'
  x: number
  y: number
  text: string
  fontSize: number
  bold: boolean
}

/** Pre-built engineering component from the library (Story 6.1). */
export interface IconElement extends ElementBase {
  kind: 'icon'
  icon: string
  x: number
  y: number
  w: number
  h: number
}

/**
 * Embedded live chart widget (Story 6.4): plots one or more Y variables
 * against an X variable across the parametric table runs, with a marker at the
 * current playback run.
 */
export interface ChartElement extends ElementBase {
  kind: 'chart'
  x: number
  y: number
  w: number
  h: number
  xVar: string
  yVars: string[]
}

/** Imported SVG/image background or glyph reference (Story 10.5). */
export interface ImageElement extends ElementBase {
  kind: 'image'
  x: number
  y: number
  w: number
  h: number
  url: string
  isBackground?: boolean
}

/** A single solved parametric-table run fed to the diagram for playback. */
export interface DiagramRun {
  label: string
  values: Record<string, number>
}

// ── Form controls (Story 6.2) ────────────────────────────────────────────
// Controls bind canvas widgets to solver variables: Inputs/Dropdowns/
// Checkboxes/Sliders feed values INTO the solve (appended as equations),
// Outputs display solved values.

interface ControlBase extends ElementBase {
  x: number
  y: number
  w: number
  h: number
  /** Bound variable name; a trailing '$' binds a string variable. */
  varName: string
  /** Caption shown next to the widget. */
  label: string
  /** Binding target (Story 10.8): equation fixes a variable, others write to guess/bounds */
  target?: 'equation' | 'guess' | 'lower' | 'upper'
}

export interface InputControl extends ControlBase {
  kind: 'ctl-input'
  value: string
}

export interface OutputControl extends ControlBase {
  kind: 'ctl-output'
}

export interface DropdownControl extends ControlBase {
  kind: 'ctl-dropdown'
  options: string[]
  value: string
}

export interface CheckboxControl extends ControlBase {
  kind: 'ctl-checkbox'
  checked: boolean
}

export interface SliderControl extends ControlBase {
  kind: 'ctl-slider'
  min: number
  max: number
  step: number
  value: number
}

export interface StepperControl extends ControlBase {
  kind: 'ctl-stepper'
  min: number
  max: number
  step: number
  value: number
}

export interface RadioControl extends ControlBase {
  kind: 'ctl-radio'
  options: string[]
  value: string
}

export interface ButtonControl extends ElementBase {
  kind: 'ctl-button'
  x: number
  y: number
  w: number
  h: number
  label: string
  action: 'solve' | 'check'
}

export type ControlElement =
  | InputControl
  | OutputControl
  | DropdownControl
  | CheckboxControl
  | SliderControl
  | StepperControl
  | RadioControl
  | ButtonControl

export interface WidgetElement extends ElementBase {
  kind: 'widget'
  widgetType: 'dial' | 'bar-h' | 'bar-v' | 'tank' | 'thermometer'
  x: number
  y: number
  w: number
  h: number
  varName: string
  minFormula: string
  maxFormula: string
  lowWarningFormula?: string
  highWarningFormula?: string
  lowDangerFormula?: string
  highDangerFormula?: string
  units?: string
  label?: string
}

export interface HotspotElement extends ElementBase {
  kind: 'hotspot'
  x: number
  y: number
  w: number
  h: number
  targetType: 'tab' | 'equation' | 'plot' | 'diagram'
  targetTab?: string
  targetQuery?: string
  targetPlotId?: string
  targetDiagramId?: string
}

export type DiagramElement =
  | LineElement
  | RectElement
  | EllipseElement
  | LabelElement
  | IconElement
  | ChartElement
  | ControlElement
  | ConnectorElement
  | ImageElement
  | WidgetElement
  | HotspotElement

export function isControl(el: DiagramElement): el is ControlElement {
  return el.kind.startsWith('ctl-')
}

const KIND_LABELS: Record<string, string> = {
  line: 'Line',
  rect: 'Rectangle',
  ellipse: 'Ellipse',
  label: 'Label',
  icon: 'Component',
  chart: 'Chart',
  'ctl-input': 'Input',
  'ctl-output': 'Output',
  'ctl-dropdown': 'Dropdown',
  'ctl-checkbox': 'Checkbox',
  'ctl-slider': 'Slider',
  'ctl-stepper': 'Stepper',
  'ctl-radio': 'Radio Group',
  'ctl-button': 'Calculate Button',
  connector: 'Connector',
  image: 'Image/SVG',
  widget: 'Widget',
  hotspot: 'Hotspot',
}

/** Display name for the Layers panel (Story 10.3). */
export function elementLabel(el: DiagramElement): string {
  if (el.name && el.name.trim()) return el.name.trim()
  if (el.kind === 'connector') {
    return `Connector · ${el.fromAnchor} ➔ ${el.toAnchor}`
  }
  if (el.kind === 'label') {
    const first = el.text.split('\n')[0]?.trim()
    return first ? first.slice(0, 24) : 'Label'
  }
  if (el.kind === 'icon') return el.icon
  if (el.kind === 'chart') return el.xVar ? `Chart: ${el.xVar}` : 'Chart'
  if (el.kind === 'widget') return `Widget: ${el.widgetType}${el.varName ? ` · ${el.varName}` : ''}`
  if (el.kind === 'hotspot') return `Hotspot ➔ ${el.targetType}`
  if (el.kind === 'ctl-button') return `Button · ${el.action}`
  if (isControl(el)) return `${KIND_LABELS[el.kind]}${el.varName ? ` · ${el.varName}` : ''}`
  return KIND_LABELS[el.kind] ?? el.kind
}

/** Expands a set of selected ids to include all members of any touched group. */
export function expandGroups(ids: Iterable<string>, elements: DiagramElement[]): string[] {
  const idSet = new Set(ids)
  const groups = new Set<string>()
  for (const el of elements) {
    if (idSet.has(el.id) && el.groupId) groups.add(el.groupId)
  }
  if (groups.size === 0) return [...idSet]
  for (const el of elements) {
    if (el.groupId && groups.has(el.groupId)) idSet.add(el.id)
  }
  return [...idSet]
}

/**
 * Equation lines injected into Check/Solve by the diagram's input-type
 * controls (Story 6.2): each bound control contributes `var = value`.
 * Output controls contribute nothing — they only display results.
 */
export function controlBindings(elements: DiagramElement[]): string[] {
  const lines: string[] = []
  for (const el of elements) {
    if (!isControl(el) || el.kind === 'ctl-button' || el.varName.trim() === '') continue
    if (el.target && el.target !== 'equation') continue
    const name = el.varName.trim()
    if (el.kind === 'ctl-input') {
      const value = Number(el.value)
      if (el.value.trim() !== '' && Number.isFinite(value)) {
        lines.push(`${name} = ${el.value.trim()}`)
      }
    } else if (el.kind === 'ctl-dropdown' || el.kind === 'ctl-radio') {
      if (el.value === '') continue
      if (name.endsWith('$')) {
        lines.push(`${name} = '${el.value}'`)
      } else if (Number.isFinite(Number(el.value))) {
        lines.push(`${name} = ${el.value}`)
      }
    } else if (el.kind === 'ctl-checkbox') {
      lines.push(`${name} = ${el.checked ? 1 : 0}`)
    } else if (el.kind === 'ctl-slider' || el.kind === 'ctl-stepper') {
      lines.push(`${name} = ${el.value}`)
    }
  }
  return lines
}

export interface DiagramState {
  elements: DiagramElement[]
  gridSize: number
  snap: boolean
  showGrid: boolean
}

export interface DiagramSpec {
  id: string
  name: string
  state: DiagramState
}

export const DEFAULT_DIAGRAM_STATE: DiagramState = {
  elements: [],
  gridSize: 10,
  snap: true,
  showGrid: true,
}

export const DEFAULT_STYLE: ElementStyle = {
  stroke: '#c1c2c5',
  strokeWidth: 2,
  fill: 'transparent',
  opacity: 1,
}

export interface AnchorDefinition {
  rx: number
  ry: number
  nx: number
  ny: number
}

export const ANCHOR_DEFS: Record<string, Record<string, AnchorDefinition>> = {
  default: {
    N: { rx: 0.5, ry: 0, nx: 0, ny: -1 },
    E: { rx: 1, ry: 0.5, nx: 1, ny: 0 },
    S: { rx: 0.5, ry: 1, nx: 0, ny: 1 },
    W: { rx: 0, ry: 0.5, nx: -1, ny: 0 },
    center: { rx: 0.5, ry: 0.5, nx: 0, ny: 0 },
  },
  turbine: {
    inlet: { rx: 0, ry: 0.5, nx: -1, ny: 0 },
    outlet: { rx: 1, ry: 0.5, nx: 1, ny: 0 },
    N: { rx: 0.5, ry: 0.12, nx: 0, ny: -1 },
    S: { rx: 0.5, ry: 0.88, nx: 0, ny: 1 },
  },
  pump: {
    inlet: { rx: 0, ry: 0.5, nx: -1, ny: 0 },
    outlet: { rx: 1, ry: 0.5, nx: 1, ny: 0 },
  },
  compressor: {
    inlet: { rx: 0, ry: 0.5, nx: -1, ny: 0 },
    outlet: { rx: 1, ry: 0.5, nx: 1, ny: 0 },
  },
  valve: {
    inlet: { rx: 0.1, ry: 0.5, nx: -1, ny: 0 },
    outlet: { rx: 0.9, ry: 0.5, nx: 1, ny: 0 },
  },
  heatx: {
    inlet: { rx: 0, ry: 0.5, nx: -1, ny: 0 },
    outlet: { rx: 1, ry: 0.5, nx: 1, ny: 0 },
    'shell-in': { rx: 0.5, ry: 0, nx: 0, ny: -1 },
    'shell-out': { rx: 0.5, ry: 1, nx: 0, ny: 1 },
  },
  vessel: {
    inlet: { rx: 0.5, ry: 0.05, nx: 0, ny: -1 },
    outlet: { rx: 0.5, ry: 0.95, nx: 0, ny: 1 },
    left: { rx: 0.25, ry: 0.5, nx: -1, ny: 0 },
    right: { rx: 0.75, ry: 0.5, nx: 1, ny: 0 },
  },
  condenser: {
    inlet: { rx: 0.05, ry: 0.5, nx: -1, ny: 0 },
    outlet: { rx: 0.95, ry: 0.5, nx: 1, ny: 0 },
    top: { rx: 0.5, ry: 0.25, nx: 0, ny: -1 },
    bottom: { rx: 0.5, ry: 0.75, nx: 0, ny: 1 },
  },
  springdamper: {
    inlet: { rx: 0.5, ry: 0, nx: 0, ny: -1 },
    outlet: { rx: 0.5, ry: 0.8, nx: 0, ny: 1 },
  },
  boiler: {
    inlet: { rx: 0.25, ry: 0.5, nx: -1, ny: 0 },
    outlet: { rx: 0.75, ry: 0.5, nx: 1, ny: 0 },
  },
  evaporator: {
    inlet: { rx: 0.05, ry: 0.5, nx: -1, ny: 0 },
    outlet: { rx: 0.95, ry: 0.5, nx: 1, ny: 0 },
    top: { rx: 0.5, ry: 0.25, nx: 0, ny: -1 },
    bottom: { rx: 0.5, ry: 0.75, nx: 0, ny: 1 },
  },
  nozzle: {
    inlet: { rx: 0.15, ry: 0.5, nx: -1, ny: 0 },
    outlet: { rx: 0.85, ry: 0.5, nx: 1, ny: 0 },
  },
  diffuser: {
    inlet: { rx: 0.15, ry: 0.5, nx: -1, ny: 0 },
    outlet: { rx: 0.85, ry: 0.5, nx: 1, ny: 0 },
  },
  mixing: {
    inlet1: { rx: 0.1, ry: 0.5, nx: -1, ny: 0 },
    inlet2: { rx: 0.5, ry: 0.1, nx: 0, ny: -1 },
    outlet: { rx: 0.9, ry: 0.5, nx: 1, ny: 0 },
  },
  separator: {
    inlet: { rx: 0.1, ry: 0.5, nx: -1, ny: 0 },
    'gas-out': { rx: 0.5, ry: 0.15, nx: 0, ny: -1 },
    'liq-out': { rx: 0.5, ry: 0.85, nx: 0, ny: 1 },
  },
  plate_heatx: {
    inlet1: { rx: 0.2, ry: 0.2, nx: -1, ny: 0 },
    outlet1: { rx: 0.8, ry: 0.2, nx: 1, ny: 0 },
    inlet2: { rx: 0.2, ry: 0.8, nx: -1, ny: 0 },
    outlet2: { rx: 0.8, ry: 0.8, nx: 1, ny: 0 },
  },
  finned_heatx: {
    inlet: { rx: 0.2, ry: 0.5, nx: -1, ny: 0 },
    outlet: { rx: 0.8, ry: 0.5, nx: 1, ny: 0 },
  },
  elbow: {
    port1: { rx: 0.1, ry: 0.5, nx: -1, ny: 0 },
    port2: { rx: 0.5, ry: 0.9, nx: 0, ny: 1 },
  },
  tee: {
    port1: { rx: 0.1, ry: 0.5, nx: -1, ny: 0 },
    port2: { rx: 0.9, ry: 0.5, nx: 1, ny: 0 },
    port3: { rx: 0.5, ry: 0.9, nx: 0, ny: 1 },
  },
  mass: {
    left: { rx: 0.2, ry: 0.5, nx: -1, ny: 0 },
    right: { rx: 0.8, ry: 0.5, nx: 1, ny: 0 },
    top: { rx: 0.5, ry: 0.25, nx: 0, ny: -1 },
    bottom: { rx: 0.5, ry: 0.75, nx: 0, ny: 1 },
  },
  pulley: {
    center: { rx: 0.5, ry: 0.5, nx: 0, ny: 0 },
    left: { rx: 0.2, ry: 0.5, nx: -1, ny: 0 },
    right: { rx: 0.8, ry: 0.5, nx: 1, ny: 0 },
  },
  gear: {
    center: { rx: 0.5, ry: 0.5, nx: 0, ny: 0 },
    top: { rx: 0.5, ry: 0.22, nx: 0, ny: -1 },
    bottom: { rx: 0.5, ry: 0.78, nx: 0, ny: 1 },
  },
  piston: {
    cylinder: { rx: 0.2, ry: 0.5, nx: -1, ny: 0 },
    rod: { rx: 0.95, ry: 0.5, nx: 1, ny: 0 },
  },
  ground: {
    top: { rx: 0.5, ry: 0.5, nx: 0, ny: -1 },
  },
  temp_sensor: {
    port: { rx: 0.1, ry: 0.5, nx: -1, ny: 0 },
  },
  press_sensor: {
    port: { rx: 0.1, ry: 0.5, nx: -1, ny: 0 },
  },
  flow_meter: {
    inlet: { rx: 0.1, ry: 0.5, nx: -1, ny: 0 },
    outlet: { rx: 0.9, ry: 0.5, nx: 1, ny: 0 },
  },
  resistor: {
    port1: { rx: 0.1, ry: 0.5, nx: -1, ny: 0 },
    port2: { rx: 0.9, ry: 0.5, nx: 1, ny: 0 },
  },
  capacitor: {
    port1: { rx: 0.1, ry: 0.5, nx: -1, ny: 0 },
    port2: { rx: 0.9, ry: 0.5, nx: 1, ny: 0 },
  },
  inductor: {
    port1: { rx: 0.1, ry: 0.5, nx: -1, ny: 0 },
    port2: { rx: 0.9, ry: 0.5, nx: 1, ny: 0 },
  },
  source: {
    port1: { rx: 0.1, ry: 0.5, nx: -1, ny: 0 },
    port2: { rx: 0.9, ry: 0.5, nx: 1, ny: 0 },
  },
  elec_ground: {
    port: { rx: 0.5, ry: 0.2, nx: 0, ny: -1 },
  },
}

export function getElementAnchors(el: DiagramElement): Record<string, AnchorDefinition> {
  const defaults = ANCHOR_DEFS.default
  if (el.kind === 'icon') {
    const specific = ANCHOR_DEFS[el.icon]
    return specific ? { ...defaults, ...specific } : defaults
  }
  return defaults
}

export function getAnchorCoordinate(el: DiagramElement, anchorName: string): { x: number; y: number } {
  if (el.kind === 'line') {
    return { x: el.x1, y: el.y1 }
  }
  if (el.kind === 'connector') {
    return { x: 0, y: 0 }
  }
  const bounds = elementBounds(el)
  const anchors = getElementAnchors(el)
  const pos = anchors[anchorName] ?? anchors.center ?? { rx: 0.5, ry: 0.5, nx: 0, ny: 0 }
  
  const cx = bounds.x + bounds.w / 2
  const cy = bounds.y + bounds.h / 2
  const lx = bounds.x + pos.rx * bounds.w
  const ly = bounds.y + pos.ry * bounds.h
  
  if (!el.rotation) {
    return { x: lx, y: ly }
  }
  
  const rad = (el.rotation * Math.PI) / 180
  const dx = lx - cx
  const dy = ly - cy
  const rx = cx + dx * Math.cos(rad) - dy * Math.sin(rad)
  const ry = cy + dx * Math.sin(rad) + dy * Math.cos(rad)
  return { x: rx, y: ry }
}

export function getAnchorNormal(el: DiagramElement, anchorName: string): { x: number; y: number } {
  if (el.kind === 'line' || el.kind === 'connector') {
    return { x: 1, y: 0 }
  }
  const anchors = getElementAnchors(el)
  const pos = anchors[anchorName] ?? anchors.center ?? { rx: 0.5, ry: 0.5, nx: 0, ny: 0 }
  
  if (!el.rotation) {
    return { x: pos.nx, y: pos.ny }
  }
  
  const rad = (el.rotation * Math.PI) / 180
  const rx = pos.nx * Math.cos(rad) - pos.ny * Math.sin(rad)
  const ry = pos.nx * Math.sin(rad) + pos.ny * Math.cos(rad)
  return { x: rx, y: ry }
}

/** Axis-aligned bounding box of an element in world coordinates. */
export function elementBounds(el: DiagramElement, elements: DiagramElement[] = []): {
  x: number
  y: number
  w: number
  h: number
} {
  if (el.kind === 'connector') {
    const fromEl = elements.find((e) => e.id === el.fromId)
    const toEl = elements.find((e) => e.id === el.toId)
    if (!fromEl || !toEl) return { x: 0, y: 0, w: 0, h: 0 }
    const p1 = getAnchorCoordinate(fromEl, el.fromAnchor)
    const p2 = getAnchorCoordinate(toEl, el.toAnchor)
    const x = Math.min(p1.x, p2.x)
    const y = Math.min(p1.y, p2.y)
    return { x, y, w: Math.max(1, Math.abs(p2.x - p1.x)), h: Math.max(1, Math.abs(p2.y - p1.y)) }
  }
  if (el.kind === 'line') {
    const x = Math.min(el.x1, el.x2)
    const y = Math.min(el.y1, el.y2)
    return { x, y, w: Math.abs(el.x2 - el.x1), h: Math.abs(el.y2 - el.y1) }
  }
  if (el.kind === 'label') {
    // Approximate text metrics: enough for selection outline and zoom-to-fit.
    const lines = el.text.split('\n')
    const longest = Math.max(1, ...lines.map((l) => l.length))
    return {
      x: el.x,
      y: el.y,
      w: longest * el.fontSize * 0.6,
      h: lines.length * el.fontSize * 1.3,
    }
  }
  return { x: el.x, y: el.y, w: el.w, h: el.h }
}
