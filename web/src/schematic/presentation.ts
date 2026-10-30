import {
  framedGroups,
  type PortSide,
  type SchematicGroup,
  type SchematicLayout,
  type SchematicNode,
  type SchematicOffsets,
} from './layout'
import { renameId } from './sourceEdit'
import { LINE_KINDS } from './palette'

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
  /** CFG-02: every line drawn thinner or bolder than the default. */
  lineWidth: 'thin' | 'normal' | 'bold'
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
  lineWidth: 'normal',
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
  /** WIRE-07: hand-placed bends by `routeKey`; a locked route is never changed by a drag. */
  routes: Record<string, WireRoute>
  /** RUN-03: the variable a block's badge shows instead of the automatic one, by block id (lower-case names). */
  badges: Record<string, string>
  /** RUN-03: pinned watch rows, in order (lower-case variable names). */
  watch: string[]
  /** RUN-03: how a variable reads, by lower-case name. Display only: inputs are never rewritten. */
  formats: Record<string, VariableFormat>
  /** RUN-04/WIRE-10: the metric the wires are coloured by (`domain:member`, '' for none) and measured-flow arrows. */
  overlay: { metric: string; arrows: boolean }
  /** VIEW-08: named views saved with the project. */
  views: SavedView[]
  /** VIEW-09: notes, callouts, variable cards and legends, each drawn in one scope. */
  annotations: Annotation[]
  /** CFG-02: the project's colour per line kind (`LINE_KINDS`), `#rrggbb`; used where it holds contrast. */
  lineColors: Record<string, string>
}

/** VIEW-09: an annotation; callouts and cards link to a block or variable by its id, so a rename moves the link. */
export interface Annotation {
  id: string
  kind: 'note' | 'callout' | 'card' | 'legend'
  scope: string
  at: { x: number; y: number }
  text: string
  /** callout: the block it points at; card: the variable it shows; '' otherwise. */
  target: string
}

/** SYNC-04: every presentation key and link under a rename, matching whole dotted segments. */
export function renamePresentation(p: SchematicPresentation, renames: ReadonlyMap<string, string>): SchematicPresentation {
  const id = (k: string) => renameId(k, renames)
  const move = <V,>(r: Record<string, V>) => Object.fromEntries(Object.entries(r).map(([k, v]) => [id(k), v]))
  const badges = (b: Record<string, string>) => Object.fromEntries(Object.entries(b).map(([k, v]) => [id(k), id(v)]))
  return {
    ...p,
    positions: move(p.positions),
    legacyOffsets: move(p.legacyOffsets),
    locked: p.locked.map(id),
    areas: p.areas.map((a) => ({ ...a, members: a.members.map(id) })),
    styles: { ...(p.styles ?? EMPTY_STYLES), instances: move((p.styles ?? EMPTY_STYLES).instances) },
    badges: badges(p.badges ?? {}),
    watch: (p.watch ?? []).map(id),
    formats: move(p.formats ?? {}),
    views: (p.views ?? []).map((v) => ({ ...v, scope: id(v.scope), badges: badges(v.badges), focus: v.focus && { ...v.focus, id: id(v.focus.id) } })),
    annotations: (p.annotations ?? []).map((a) => ({ ...a, scope: id(a.scope), target: id(a.target) })),
  }
}

/** VIEW-08: what a named view restores — where, how framed, what is shown and how it reads. */
export interface SavedView {
  name: string
  /** The subsystem path it looks into ('' = the model). */
  scope: string
  camera: { x: number; y: number; zoom: number }
  view: ViewSettings
  overlay: SchematicPresentation['overlay']
  badges: Record<string, string>
  /** An isolation or highlight command in force, if any. */
  focus: { kind: 'neighbours' | 'trace' | 'circuit'; id: string } | null
}

export type ViewPreset = 'names' | 'engineering' | 'debug' | 'presentation'

/** VIEW-08 presets: view settings and overlay only — never positions, routes or the document. */
export function applyPreset(p: SchematicPresentation, preset: ViewPreset): SchematicPresentation {
  const view = { ...p.view }
  const off = { metric: '', arrows: false }
  if (preset === 'names') return { ...p, view: { ...view, detail: 'names', portLabels: false }, overlay: off }
  if (preset === 'engineering') return { ...p, view: { ...view, detail: 'full', portLabels: false }, overlay: { ...p.overlay, arrows: true } }
  if (preset === 'debug') return { ...p, view: { ...view, detail: 'full', portLabels: true, grouping: 'domain' }, overlay: p.overlay }
  return { ...p, view: { ...view, detail: 'full', portLabels: false, background: 'plain', guides: false }, overlay: off }
}

/** A display unit (`shown = value · scale + shift`, valid while the variable is in `from`) and significant digits. */
export interface VariableFormat {
  unit?: string
  from?: string
  scale?: number
  shift?: number
  digits?: number
}

export interface WireRoute {
  points: { x: number; y: number }[]
  locked?: boolean
}

/** How a block draws, beyond the theme: an outline accent and readout digits. */
export interface BlockStyle {
  /** `#rrggbb`. */
  accent?: string
  /** Significant digits of the block's readout badge. */
  precision?: number
  /** COMP-07: quarter turns clockwise, then a left–right mirror; the ports move with the symbol, the text stays upright. */
  rotate?: 0 | 90 | 180 | 270
  mirror?: boolean
  /** COMP-07: the block's own level of detail, over the view's. */
  density?: 'names' | 'full'
  /** COMP-07: where the name is drawn, and its size in px. */
  label?: 'inside' | 'above' | 'below'
  labelSize?: number
}

export const LABEL_SIZES = [11, 12, 13, 14, 16, 18]
const TURN_CW: Record<PortSide, PortSide> = { left: 'top', top: 'right', right: 'bottom', bottom: 'left' }
const FLIP: Record<PortSide, PortSide> = { left: 'right', right: 'left', top: 'top', bottom: 'bottom' }

/** COMP-07: each block's ports turned and mirrored with its symbol on the same box; port names never change. */
export function transformSymbols(layout: SchematicLayout, styles: BlockStyles): SchematicLayout {
  let changed = false
  const nodes = layout.nodes.map((n) => {
    const { rotate = 0, mirror = false } = n.kind === 'instance' ? styleFor(styles, n.id, n.type ?? '') : {}
    if (!rotate && !mirror) return n
    changed = true
    const ports = n.ports.map((p) => {
      let [u, v, side] = [n.w ? p.dx / n.w : 0, n.h ? p.dy / n.h : 0, p.side]
      if (mirror) [u, side] = [1 - u, FLIP[side]]
      for (let k = 0; k < rotate / 90; k++) [u, v, side] = [1 - v, u, TURN_CW[side]]
      return { ...p, side, dx: u * n.w, dy: v * n.h }
    })
    return { ...n, ports }
  })
  return changed ? { ...layout, nodes } : layout
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
  routes: {},
  badges: {},
  watch: [],
  formats: {},
  overlay: { metric: '', arrows: false },
  views: [],
  annotations: [],
  lineColors: {},
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
  lineWidth: ['thin', 'normal', 'bold'],
}

const record = (v: unknown): Record<string, unknown> | null =>
  v != null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
const id = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= MAX_TEXT
const coord = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= MAX_COORD
/** A block id: an instance path, or a `$` junction. */
const ref = (v: unknown): v is string => id(v) && /^\$?[A-Za-z_][\w$]*(\.[A-Za-z_][\w$]*)*$/.test(v)
/** A solver variable name: a dotted path, possibly indexed (`x[2]`). */
const variable = (v: unknown): v is string => id(v) && /^[a-z_][\w$]*(\.[a-z_][\w$]*)*(\[\d+(,\d+)?\])?$/.test(v)

function viewOf(v: unknown): { view: ViewSettings; bad: number } {
  const given = record(v) ?? {}
  const view = { ...DEFAULT_VIEW }
  let bad = 0
  for (const key of Object.keys(VIEW_CHOICES) as (keyof ViewSettings)[]) {
    if (!(key in given)) continue
    if ((VIEW_CHOICES[key] as readonly unknown[]).includes(given[key])) (view as Record<string, unknown>)[key] = given[key]
    else bad++
  }
  return { view, bad }
}

function overlayOf(v: unknown): { overlay: SchematicPresentation['overlay']; bad: number } {
  const { metric, arrows } = record(v) ?? {}
  const overlay = { metric: typeof metric === 'string' && /^([a-z]+:[a-z]+)?$/.test(metric) ? metric : '', arrows: arrows === true }
  return { overlay, bad: v !== undefined && (overlay.metric !== metric || overlay.arrows !== arrows) ? 1 : 0 }
}

function badgesOf(v: unknown): { badges: Record<string, string>; bad: number } {
  const badges: Record<string, string> = {}
  let bad = 0
  for (const [key, name] of Object.entries(record(v) ?? {})) {
    if (Object.keys(badges).length < MAX_ENTRIES && ref(key) && variable(name)) badges[key] = name
    else bad++
  }
  return { badges, bad }
}

const MAX_VIEWS = 50
const FOCUS_KINDS = ['neighbours', 'trace', 'circuit']

/** One saved view, whole or not at all: a view that would restore half its state is dropped. */
function savedViewOf(v: unknown): SavedView | null {
  const raw = record(v)
  const camera = record(raw?.camera)
  const focus = raw?.focus === null || raw?.focus === undefined ? null : record(raw.focus)
  if (!raw || typeof raw.name !== 'string' || !raw.name.trim() || raw.name.length > 60) return null
  if (!(raw.scope === '' || ref(raw.scope)) || !camera || !coord(camera.x) || !coord(camera.y) || typeof camera.zoom !== 'number' || !(camera.zoom > 0 && camera.zoom <= 16)) return null
  if (focus && (!FOCUS_KINDS.includes(focus.kind as string) || !ref(focus.id))) return null
  const view = viewOf(raw.view)
  const overlay = overlayOf(raw.overlay)
  const badges = badgesOf(raw.badges)
  if (view.bad + overlay.bad + badges.bad > 0) return null
  return {
    name: raw.name,
    scope: raw.scope as string,
    camera: { x: camera.x, y: camera.y, zoom: camera.zoom },
    view: view.view,
    overlay: overlay.overlay,
    badges: badges.badges,
    focus: focus ? { kind: focus.kind as NonNullable<SavedView['focus']>['kind'], id: focus.id as string } : null,
  }
}

const ANNOTATION_KINDS = ['note', 'callout', 'card', 'legend']

function annotationOf(v: unknown): Annotation | null {
  const raw = record(v)
  const at = record(raw?.at)
  if (!raw || typeof raw.id !== 'string' || !/^n\d{1,6}$/.test(raw.id) || !ANNOTATION_KINDS.includes(raw.kind as string)) return null
  if (!(raw.scope === '' || ref(raw.scope)) || !at || !coord(at.x) || !coord(at.y) || typeof raw.text !== 'string' || raw.text.length > 2000) return null
  const kind = raw.kind as Annotation['kind']
  const linked = kind === 'callout' ? ref(raw.target) : kind === 'card' ? variable(raw.target) : raw.target === ''
  return linked ? { id: raw.id, kind, scope: raw.scope as string, at: { x: at.x, y: at.y }, text: raw.text, target: raw.target as string } : null
}

function formatOf(v: unknown): VariableFormat | null {
  const raw = record(v)
  if (!raw) return null
  const { unit, from, scale, shift, digits } = raw
  const text = (t: unknown) => typeof t === 'string' && t.length > 0 && t.length <= 40
  const num = (n: unknown) => typeof n === 'number' && Number.isFinite(n)
  const out: VariableFormat = {}
  if (unit !== undefined) {
    if (!text(unit) || !text(from) || !num(scale) || scale === 0 || !num(shift)) return null
    Object.assign(out, { unit, from, scale, shift })
  }
  if (digits !== undefined) {
    if (!Number.isInteger(digits) || (digits as number) < 2 || (digits as number) > 10) return null
    out.digits = digits as number
  }
  return Object.keys(out).length > 0 ? out : null
}

/** One style, keeping only well-formed fields; `bad` counts what was dropped. */
function styleOf(v: unknown): { style: BlockStyle | null; bad: number } {
  const raw = record(v)
  if (!raw) return { style: null, bad: 1 }
  const style: BlockStyle = {}
  let bad = 0
  for (const [key, value] of Object.entries(raw)) {
    if (key === 'accent' && typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)) style.accent = value
    else if (key === 'precision' && Number.isInteger(value) && (value as number) >= 2 && (value as number) <= 8) style.precision = value as number
    else if (key === 'rotate' && [0, 90, 180, 270].includes(value as number)) style.rotate = value as BlockStyle['rotate']
    else if (key === 'mirror' && typeof value === 'boolean') style.mirror = value
    else if (key === 'density' && (value === 'names' || value === 'full')) style.density = value
    else if (key === 'label' && ['inside', 'above', 'below'].includes(value as string)) style.label = value as BlockStyle['label']
    else if (key === 'labelSize' && LABEL_SIZES.includes(value as number)) style.labelSize = value as number
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
  const parsedView = viewOf(raw.view)
  const view = parsedView.view
  repaired += parsedView.bad
  const styles = stylesOf(raw.styles)
  repaired += styles.repaired
  const routes: Record<string, WireRoute> = {}
  for (const [key, r] of Object.entries(record(raw.routes) ?? {})) {
    const { points, locked: fixed } = record(r) ?? {}
    const pts = Array.isArray(points) ? points.map(record) : null
    if (Object.keys(routes).length < MAX_ENTRIES && key.length <= MAX_TEXT && pts && pts.length <= 64 && pts.every((q) => q && coord(q.x) && coord(q.y)) && (fixed === undefined || typeof fixed === 'boolean')) {
      routes[key] = { points: pts.map((q) => ({ x: q!.x as number, y: q!.y as number })), ...(fixed ? { locked: true } : {}) }
    } else {
      repaired++
    }
  }
  const parsedBadges = badgesOf(raw.badges)
  const badges = parsedBadges.badges
  repaired += parsedBadges.bad
  const watch = [...new Set(list(raw.watch).filter(variable))].slice(0, MAX_ENTRIES)
  repaired += list(raw.watch).length - watch.length
  const formats: Record<string, VariableFormat> = {}
  for (const [key, f] of Object.entries(record(raw.formats) ?? {})) {
    const format = formatOf(f)
    if (Object.keys(formats).length < MAX_ENTRIES && variable(key) && format) formats[key] = format
    else repaired++
  }
  const parsedOverlay = overlayOf(raw.overlay)
  repaired += parsedOverlay.bad
  const views: SavedView[] = []
  for (const v of list(raw.views)) {
    const saved = savedViewOf(v)
    if (saved && views.length < MAX_VIEWS && !views.some((x) => x.name === saved.name)) views.push(saved)
    else repaired++
  }
  const annotations: Annotation[] = []
  for (const a of list(raw.annotations)) {
    const note = annotationOf(a)
    if (note && annotations.length < MAX_ENTRIES && !annotations.some((x) => x.id === note.id)) annotations.push(note)
    else repaired++
  }
  const lineColors: Record<string, string> = {}
  for (const [kind, color] of Object.entries(record(raw.lineColors) ?? {})) {
    if (LINE_KINDS.includes(kind) && typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color)) lineColors[kind] = color.toLowerCase()
    else repaired++
  }
  return { presentation: { positions, legacyOffsets: legacy.offsets, locked, areas, view, styles: styles.styles, routes, badges, watch, formats, overlay: parsedOverlay.overlay, views, annotations, lineColors }, repaired }
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

/**
 * VIEW-04: hand `targets` back to the automatic layout. Locked blocks keep
 * their place and locked routes their bends; an unlocked route touching a
 * moved block goes too, so it re-routes against the new places.
 */
export function arrangeBlocks(p: SchematicPresentation, targets: Iterable<string>): { presentation: SchematicPresentation; moved: string[] } {
  const locked = new Set(p.locked)
  const moved = [...targets].filter((id) => !locked.has(id))
  const gone = new Set(moved)
  const touches = (key: string) => key.split('|').some((end) => gone.has(end.slice(0, end.lastIndexOf('.'))))
  return {
    moved,
    presentation: {
      ...p,
      positions: Object.fromEntries(Object.entries(p.positions).filter(([id]) => !gone.has(id))),
      routes: Object.fromEntries(Object.entries(p.routes ?? {}).filter(([key, r]) => r.locked || !touches(key))),
    },
  }
}
