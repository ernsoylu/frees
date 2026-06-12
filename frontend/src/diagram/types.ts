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

export type DiagramElement =
  | LineElement
  | RectElement
  | EllipseElement
  | LabelElement
  | IconElement

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
