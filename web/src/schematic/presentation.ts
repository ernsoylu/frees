import {
  framedGroups,
  type PortSide,
  type SchematicGroup,
  type SchematicLayout,
  type SchematicNode,
  type SchematicOffsets,
} from './layout'

/**
 * How the canvas is presented (VIEW-03, VIEW-05). None of this changes the
 * model: it reshapes the base layout, frames and labels, and governs how a
 * drag lands.
 */
export interface ViewSettings {
  background: 'plain' | 'dots' | 'grid'
  /** Grid pitch in drawing units, for the background and for snapping. */
  grid: number
  snap: boolean
  guides: boolean
  spacing: 'compact' | 'normal' | 'roomy'
  orientation: 'horizontal' | 'vertical'
  grouping: 'circuit' | 'domain' | 'none'
  /** Block detail: the full card, or the name only. */
  detail: 'full' | 'names'
  portLabels: boolean
}

/** Readable on a small model without touching a setting. */
export const DEFAULT_VIEW: ViewSettings = {
  background: 'dots',
  grid: 16,
  snap: false,
  guides: true,
  spacing: 'normal',
  orientation: 'horizontal',
  grouping: 'circuit',
  detail: 'full',
  portLabels: false,
}

const SPACING = { compact: 0.85, normal: 1, roomy: 1.25 } as const

/** Port sides after turning left-to-right flow into top-to-bottom. */
const TURN: Record<PortSide, PortSide> = { left: 'top', right: 'bottom', top: 'left', bottom: 'right' }

/**
 * The base layout under a spacing and orientation. Spacing scales positions
 * (never block sizes). Vertical turns the drawing so flow runs top to bottom:
 * layers become rows and rows columns, each axis rescaled so the tallest row
 * step clears the widest block and a layer step clears a block's height, and
 * every port moves to the matching side at the same relative place.
 */
export function arrangeBase(layout: SchematicLayout, view: Pick<ViewSettings, 'spacing' | 'orientation'>): SchematicLayout {
  const k = SPACING[view.spacing]
  if (k === 1 && view.orientation === 'horizontal') {
    return layout
  }
  let sx = k
  let sy = k
  let turn = false
  if (view.orientation === 'vertical') {
    turn = true
    const widest = Math.max(0, ...layout.nodes.map((n) => n.w))
    // Row step was NODE_H + ROW_GAP (86); a column gap must hold a stub from
    // each side and a lane between (48). A layer step is at least the
    // narrowest block plus the layer gap (182).
    sx = (widest + 48 * k) / 86
    sy = (k * 112) / 182
  }
  const place = (x: number, y: number) => (turn ? { x: y * sx, y: x * sy } : { x: x * sx, y: y * sy })
  // Blocks move by their centres, so blocks of different sizes that lined up
  // (a terminal beside a full block) still line up.
  const centred = (n: SchematicNode) => {
    const c = place(n.x + n.w / 2, n.y + n.h / 2)
    return { x: c.x - n.w / 2, y: c.y - n.h / 2 }
  }
  const nodes: SchematicNode[] = layout.nodes.map((n) => ({
    ...n,
    ...centred(n),
    ports: turn
      ? n.ports.map((p) => {
          const side = TURN[p.side]
          // Same relative place along the turned side.
          const along = p.side === 'left' || p.side === 'right' ? p.dy / n.h : p.dx / n.w
          return side === 'top' || side === 'bottom'
            ? { ...p, side, dx: along * n.w, dy: side === 'top' ? 0 : n.h }
            : { ...p, side, dx: side === 'left' ? 0 : n.w, dy: along * n.h }
        })
      : n.ports,
  }))
  const groups = layout.groups.map((g) => {
    const at = place(g.x, g.y)
    return turn ? { ...g, ...at, w: g.h * sx, h: g.w * sy } : { ...g, ...at, w: g.w * sx, h: g.h * sy }
  })
  const [w, h] = turn ? [layout.height * sx, layout.width * sy] : [layout.width * sx, layout.height * sy]
  return { ...layout, nodes, groups, width: w, height: h }
}

/**
 * The frames drawn around groups of blocks: one per circuit (grown to hold
 * dragged members), one per domain (every circuit of that domain merged), or
 * none at all for free placement.
 */
export function framesFor(
  grouping: ViewSettings['grouping'],
  groups: SchematicGroup[],
  nodes: Iterable<SchematicNode>,
  domainOf: (lineId: string) => string,
): SchematicGroup[] {
  if (grouping === 'none') {
    return []
  }
  const circuits = framedGroups(groups, nodes)
  if (grouping === 'circuit') {
    return circuits
  }
  const byDomain = new Map<string, SchematicGroup>()
  for (const g of circuits) {
    const domain = domainOf(g.lineId)
    const d = byDomain.get(domain)
    if (!d) {
      byDomain.set(domain, { ...g, id: `domain:${domain}`, label: domain })
      continue
    }
    const x = Math.min(d.x, g.x)
    const y = Math.min(d.y, g.y)
    byDomain.set(domain, {
      ...d,
      x,
      y,
      w: Math.max(d.x + d.w, g.x + g.w) - x,
      h: Math.max(d.y + d.h, g.y + g.h) - y,
    })
  }
  return [...byDomain.values()]
}

/** Nearest multiple of `grid`. */
export function snapToGrid(v: number, grid: number): number {
  return Math.round(v / grid) * grid
}

type Rect = { x: number; y: number; w: number; h: number }

/**
 * Alignment guides for a moving box: the shift, within `tol` on each axis,
 * that lines its left, centre or right (top, middle or bottom) up with the
 * same line of another box, and the lines it then sits on. The nearest match
 * on each axis wins; no match leaves that axis alone.
 */
export function guideSnap(moving: Rect, others: readonly Rect[], tol: number): { dx: number; dy: number; xs: number[]; ys: number[] } {
  const lines = (r: Rect, axis: 'x' | 'y') =>
    axis === 'x' ? [r.x, r.x + r.w / 2, r.x + r.w] : [r.y, r.y + r.h / 2, r.y + r.h]
  const best = (axis: 'x' | 'y') => {
    let shift = 0
    let gap = tol
    let at: number | null = null
    for (const o of others) {
      for (const target of lines(o, axis)) {
        for (const own of lines(moving, axis)) {
          if (Math.abs(target - own) <= gap) {
            gap = Math.abs(target - own)
            shift = target - own
            at = target
          }
        }
      }
    }
    return { shift, at }
  }
  const bx = best('x')
  const by = best('y')
  return { dx: bx.shift, dy: by.shift, xs: bx.at === null ? [] : [bx.at], ys: by.at === null ? [] : [by.at] }
}

/** A named frame the user drew around chosen blocks (VIEW-05); it follows them. */
export interface SchematicArea {
  id: string
  label: string
  members: string[]
}

/**
 * Everything about the drawing that is not in the document (CFG-03, project
 * v4). Blocks the user placed keep absolute positions; every other block takes
 * its place from the layout. v3 files saved offsets from the layout instead:
 * those wait in `legacyOffsets` until the first Check draws the network they
 * were measured against, then become positions (`resolveLegacy`).
 */
export interface SchematicPresentation {
  positions: Record<string, { x: number; y: number }>
  legacyOffsets: SchematicOffsets
  /** Blocks that drags, nudges and Arrange leave where they are. */
  locked: string[]
  areas: SchematicArea[]
  view: ViewSettings
  styles: BlockStyles
}

/** How a block draws, beyond the theme: an outline accent and readout digits. */
export interface BlockStyle {
  /** `#rrggbb`. */
  accent?: string
  /** Significant digits of the block's readout badge. */
  precision?: number
}

/** CFG-01 style scopes. A block takes its own, then its type's, then the project's. */
export interface BlockStyles {
  project: BlockStyle
  /** By lower-case component type. */
  types: Record<string, BlockStyle>
  /** By block id. */
  instances: Record<string, BlockStyle>
}

export const EMPTY_STYLES: BlockStyles = { project: {}, types: {}, instances: {} }

/** The style a block draws with, after precedence. */
export function styleFor(styles: BlockStyles, id: string, type: string): BlockStyle {
  return { ...styles.project, ...styles.types[type.toLowerCase()], ...styles.instances[id] }
}

export const EMPTY_PRESENTATION: SchematicPresentation = {
  positions: {},
  legacyOffsets: {},
  locked: [],
  areas: [],
  view: DEFAULT_VIEW,
  styles: EMPTY_STYLES,
}

/** Coordinates past this, or more entries than this, are a malformed or
 *  hostile file rather than a drawing. */
const MAX_COORD = 100_000
const MAX_ENTRIES = 5_000
const MAX_AREAS = 500
const MAX_TEXT = 200

const VIEW_CHOICES: { [K in keyof ViewSettings]: readonly ViewSettings[K][] } = {
  background: ['plain', 'dots', 'grid'],
  grid: [8, 16, 32],
  snap: [false, true],
  guides: [false, true],
  spacing: ['compact', 'normal', 'roomy'],
  orientation: ['horizontal', 'vertical'],
  grouping: ['circuit', 'domain', 'none'],
  detail: ['full', 'names'],
  portLabels: [false, true],
}

const record = (v: unknown): Record<string, unknown> | null =>
  v != null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
const id = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= MAX_TEXT
const coord = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= MAX_COORD
/** A block id: an instance path, or a `$` junction. */
const ref = (v: unknown): v is string => id(v) && /^\$?[A-Za-z_]\w*(\.[A-Za-z_]\w*)*$/.test(v)

/** One style, keeping only well-formed fields; `bad` counts what was dropped. */
function styleOf(v: unknown): { style: BlockStyle | null; bad: number } {
  const raw = record(v)
  if (!raw) return { style: null, bad: 1 }
  const style: BlockStyle = {}
  let bad = 0
  for (const [key, value] of Object.entries(raw)) {
    if (key === 'accent' && typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)) style.accent = value
    else if (key === 'precision' && Number.isInteger(value) && (value as number) >= 2 && (value as number) <= 8) style.precision = value as number
    else bad++
  }
  return { style, bad }
}

function stylesOf(v: unknown): { styles: BlockStyles; repaired: number } {
  const raw = record(v)
  if (!raw) return { styles: EMPTY_STYLES, repaired: v == null ? 0 : 1 }
  let repaired = 0
  const scope = (value: unknown, key: (k: string) => boolean) => {
    const out: Record<string, BlockStyle> = {}
    for (const [k, s] of Object.entries(record(value) ?? {})) {
      const { style, bad } = styleOf(s)
      repaired += bad
      if (style && key(k) && Object.keys(out).length < MAX_ENTRIES) out[k] = style
      else if (style) repaired++
    }
    return out
  }
  const project = styleOf(raw.project ?? {})
  repaired += project.bad
  return {
    styles: { project: project.style ?? {}, types: scope(raw.types, (k) => /^[a-z_]\w*$/.test(k)), instances: scope(raw.instances, ref) },
    repaired,
  }
}

/**
 * v3 drag offsets, validated as v3 always did: finite pairs only, clamped to
 * the plausible canvas (`repaired` counts what was dropped).
 */
function offsetsOf(value: unknown): { offsets: SchematicOffsets; repaired: number } {
  const offsets: SchematicOffsets = {}
  let repaired = 0
  const clamp = (n: number) => Math.min(MAX_COORD, Math.max(-MAX_COORD, n))
  for (const [key, raw] of Object.entries(record(value) ?? {})) {
    const { dx, dy } = record(raw) ?? {}
    if (Object.keys(offsets).length >= MAX_ENTRIES || !id(key) || typeof dx !== 'number' || typeof dy !== 'number' || !Number.isFinite(dx) || !Number.isFinite(dy)) {
      repaired++
      continue
    }
    offsets[key] = { dx: clamp(dx), dy: clamp(dy) }
  }
  return { offsets, repaired }
}

/** A v3 `schematic` slice (offsets) as a v4 presentation awaiting migration. */
export function fromV3(value: unknown): { presentation: SchematicPresentation; repaired: number } {
  const { offsets, repaired } = offsetsOf(value)
  return { presentation: { ...EMPTY_PRESENTATION, legacyOffsets: offsets }, repaired }
}

/**
 * Validate a v4 presentation read from a file or storage. Anything malformed —
 * a non-finite or absurd coordinate, a non-string id, an unknown setting — is
 * dropped or reset to its default and counted, never guessed at; the document
 * itself is untouched by any of it.
 */
export function sanitizePresentation(value: unknown): { presentation: SchematicPresentation; repaired: number } {
  const raw = record(value)
  if (!raw) {
    return { presentation: EMPTY_PRESENTATION, repaired: value == null ? 0 : 1 }
  }
  let repaired = 0
  const positions: SchematicPresentation['positions'] = {}
  for (const [key, p] of Object.entries(record(raw.positions) ?? {})) {
    const { x, y } = record(p) ?? {}
    if (Object.keys(positions).length < MAX_ENTRIES && ref(key) && coord(x) && coord(y)) {
      positions[key] = { x, y }
    } else {
      repaired++
    }
  }
  const legacy = offsetsOf(raw.legacyOffsets)
  repaired += legacy.repaired
  const list = (v: unknown) => (Array.isArray(v) ? v : [])
  const locked = list(raw.locked).filter(ref).slice(0, MAX_ENTRIES)
  repaired += list(raw.locked).length - locked.length
  const areas: SchematicArea[] = []
  for (const a of list(raw.areas)) {
    const { id: areaId, label, members } = record(a) ?? {}
    if (areas.length < MAX_AREAS && id(areaId) && typeof label === 'string' && label.length <= MAX_TEXT && Array.isArray(members) && members.every(ref)) {
      areas.push({ id: areaId, label, members: members.slice(0, MAX_ENTRIES) })
    } else {
      repaired++
    }
  }
  const given = record(raw.view) ?? {}
  const view = { ...DEFAULT_VIEW }
  for (const key of Object.keys(VIEW_CHOICES) as (keyof ViewSettings)[]) {
    if (!(key in given)) continue
    if ((VIEW_CHOICES[key] as readonly unknown[]).includes(given[key])) {
      ;(view as Record<string, unknown>)[key] = given[key]
    } else {
      repaired++
    }
  }
  const styles = stylesOf(raw.styles)
  repaired += styles.repaired
  return { presentation: { positions, legacyOffsets: legacy.offsets, locked, areas, view, styles: styles.styles }, repaired }
}

/**
 * Turn v3 offsets into absolute positions against the layout they were
 * measured from (the plain left-to-right layout of the checked network).
 * Offsets naming no block in it stay behind for recovery and are reported,
 * never attached to some other block.
 */
export function resolveLegacy(
  presentation: SchematicPresentation,
  legacyBasis: readonly SchematicNode[],
): { presentation: SchematicPresentation; unresolved: number } {
  const byId = new Map(legacyBasis.map((n) => [n.id, n]))
  const positions = { ...presentation.positions }
  const legacyOffsets: SchematicOffsets = {}
  for (const [key, o] of Object.entries(presentation.legacyOffsets)) {
    const n = byId.get(key)
    if (n) {
      positions[key] ??= { x: n.x + o.dx, y: n.y + o.dy }
    } else {
      legacyOffsets[key] = o
    }
  }
  return { presentation: { ...presentation, positions, legacyOffsets }, unresolved: Object.keys(legacyOffsets).length }
}
