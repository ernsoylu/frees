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

interface ElementBase extends ElementStyle {
  id: string
  rotation: number
}

/** Straight line, optionally with an arrow head at the (x2, y2) end. */
export interface LineElement extends ElementBase {
  kind: 'line'
  x1: number
  y1: number
  x2: number
  y2: number
  arrow: boolean
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

export type ControlElement =
  | InputControl
  | OutputControl
  | DropdownControl
  | CheckboxControl
  | SliderControl

export type DiagramElement =
  | LineElement
  | RectElement
  | EllipseElement
  | LabelElement
  | IconElement
  | ControlElement

export function isControl(el: DiagramElement): el is ControlElement {
  return el.kind.startsWith('ctl-')
}

/**
 * Equation lines injected into Check/Solve by the diagram's input-type
 * controls (Story 6.2): each bound control contributes `var = value`.
 * Output controls contribute nothing — they only display results.
 */
export function controlBindings(elements: DiagramElement[]): string[] {
  const lines: string[] = []
  for (const el of elements) {
    if (!isControl(el) || el.varName.trim() === '') continue
    const name = el.varName.trim()
    if (el.kind === 'ctl-input') {
      const value = Number(el.value)
      if (el.value.trim() !== '' && Number.isFinite(value)) {
        lines.push(`${name} = ${el.value.trim()}`)
      }
    } else if (el.kind === 'ctl-dropdown') {
      if (el.value === '') continue
      if (name.endsWith('$')) {
        lines.push(`${name} = '${el.value}'`)
      } else if (Number.isFinite(Number(el.value))) {
        lines.push(`${name} = ${el.value}`)
      }
    } else if (el.kind === 'ctl-checkbox') {
      lines.push(`${name} = ${el.checked ? 1 : 0}`)
    } else if (el.kind === 'ctl-slider') {
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

/** Axis-aligned bounding box of an element in world coordinates. */
export function elementBounds(el: DiagramElement): {
  x: number
  y: number
  w: number
  h: number
} {
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
