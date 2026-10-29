import { flushSync } from 'react-dom'
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import {
  ActionIcon,
  Badge,
  Button,
  Checkbox,
  ColorInput,
  Group,
  Kbd,
  Menu,
  Modal,
  Paper,
  Popover,
  SegmentedControl,
  Select,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
  Tooltip,
  useComputedColorScheme,
} from '@mantine/core'
import {
  IconAdjustments,
  IconArrowBackUp,
  IconArrowForwardUp,
  IconArrowsMaximize,
  IconDownload,
  IconEye,
  IconPinned,
  IconLock,
  IconLayoutGrid,
  IconNote,
  IconPlus,
  IconTrash,
  IconZoomIn,
  IconZoomOut,
} from '@tabler/icons-react'
import { check as checkText, type BlockResult, type CheckResponse, type ComponentResult, type ConnectionDto, type InstanceIdentityDto, type VariableResult } from '../api'
import {
  declarationLine,
  declarationLineFromCheck,
  declaredComponentTypes,
  declaredInstances,
} from './declaration'
import { buildLineStyles, lineId, lineLabel, SCHEMATIC_INK, type LineStyle, type SchematicInk } from './palette'
import {
  arrangeDeltas,
  connectedTo,
  focusOf,
  LAYER_GAP,
  layoutSchematic,
  crossingHops,
  nearestInDirection,
  pathOf,
  routeAll,
  netOf,
  nearestLane,
  routeCrosses,
  routeKey,
  endpointScope,
  scopeOf,
  type ArrangeOp,
  type Pt,
  type FocusKind,
  type PortSide,
  type SchematicEdge,
  type SchematicNode,
} from './layout'
import { glyphFillPath, glyphPath, SHAPE_LABELS } from './symbols'
import {
  appendStatement,
  applyChanges,
  disconnectEndpoint,
  insertIntoConnection,
  invertChanges,
  removeStatement,
  renamedIds,
  lastDeclaration,
  renameInstance,
  renameProblem,
  setParameter,
  suggestFix,
  writtenEndpoints,
  type SourceChange,
  type SourceEdit,
} from './sourceEdit'
import { componentFile, editInterface, extractSubsystem, importComponents, movePresentation, type Extraction, type InterfaceChange } from './encapsulation'
import { edgeReadings, flowAlong, overlayMetrics, rampColor, RAMP_STOPS } from './overlay'
import { badgeFor, formatCompact, formatReading, indexVariables, readoutFor, type NodeReadout, type Reading } from './readouts'
import { wasmUnitConversions } from '../wasm/engineClient'
import { COMPONENT_CATALOG, type ComponentSpec } from '../componentCatalog'
import { searchModel, type SearchHit } from './search'
import { blockDependencies, lineOfEquation, type BlockLink } from './dependencies'
import { formatParamValue, paramValueError, suggestInstanceName } from '../componentText'
import { QuickAdd } from './QuickAdd'
import { CANVAS_COMMANDS, canvasHandlers, type CanvasCommand } from './commands'
import { copyFragment, deleteImpact, loadFragment, pasteFragment, storeFragment, withoutBlocks, type DeleteImpact, type Fragment, type PasteResult } from './clipboard'
import { boxAround, contains, frameBox, visibleBox, zoomAbout, type Box, type View } from './viewport'
import {
  applyPreset,
  arrangeBase,
  LABEL_SIZES,
  transformSymbols,
  renamePresentation,
  arrangeBlocks,
  EMPTY_PRESENTATION,
  framesFor,
  guideSnap,
  resolveLegacy,
  snapToGrid,
  EMPTY_STYLES,
  styleFor,
  type Annotation,
  type BlockStyle,
  type BlockStyles,
  type SavedView,
  type SchematicPresentation,
  type VariableFormat,
  type ViewPreset,
  type ViewSettings,
  type WireRoute,
} from './presentation'
import {
  alreadyConnected,
  canonRef,
  compatibility,
  COMPONENT_DRAG_TYPE,
  connectStatement,
  endpointRef,
  joinedElsewhere,
  netConnections,
  portIndex,
  previewDomain,
  type QuickAddChoice,
  previewWire,
  type WireEndpoint,
} from './wiring'

const MIN_ZOOM = 0.25
const MAX_ZOOM = 3
/** A node's name, in drawing units at full detail. */
const LABEL_FONT = 12.5
/** Smallest on-screen name size. Below it, nodes switch to the label-only chip. */
const MIN_LABEL_PX = 12
/** Screen gap kept between two neighbouring chip names. */
const CHIP_GAP_PX = 6
/** Furthest a chip name may run past its block on either side. */
const CHIP_OVERHANG = LAYER_GAP
const ARROWS: Partial<Record<string, 'left' | 'right' | 'up' | 'down'>> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
}
const ARRANGE_ITEMS: ({ op: ArrangeOp; label: string } | null)[] = [
  { op: 'left', label: 'Align left' },
  { op: 'centre', label: 'Align centres' },
  { op: 'right', label: 'Align right' },
  null,
  { op: 'top', label: 'Align top' },
  { op: 'middle', label: 'Align middles' },
  { op: 'bottom', label: 'Align bottom' },
  null,
  { op: 'spread-x', label: 'Distribute horizontally' },
  { op: 'spread-y', label: 'Distribute vertically' },
]
const VIEW_CHOICES: { key: 'background' | 'grid' | 'spacing' | 'orientation' | 'grouping' | 'detail'; label: string; data: string[][] }[] = [
  { key: 'orientation', label: 'Flow', data: [['horizontal', 'Left to right'], ['vertical', 'Top to bottom']] },
  { key: 'spacing', label: 'Spacing', data: [['compact', 'Compact'], ['normal', 'Normal'], ['roomy', 'Roomy']] },
  { key: 'grouping', label: 'Frames', data: [['circuit', 'Circuit'], ['domain', 'Domain'], ['none', 'None']] },
  { key: 'detail', label: 'Blocks', data: [['full', 'Full'], ['names', 'Names only']] },
  { key: 'background', label: 'Background', data: [['plain', 'Plain'], ['dots', 'Dots'], ['grid', 'Grid']] },
  { key: 'grid', label: 'Grid size', data: [['8', '8'], ['16', '16'], ['32', '32']] },
]
/** Snap and guide pull, in screen pixels. */
const GUIDE_PX = 6
const NO_PORTS: ReadonlySet<string> = new Set()
const EMPTY_ROUTES: Record<string, WireRoute> = {}
const ComponentWizardModal = lazy(() => import('../ComponentWizardModal'))
/** A new block's top-left, from the point it was placed at (drawing units). */
const PLACE_OFFSET = { x: 60, y: 24 }
/** Steps the canvas undo timeline keeps. */
const HISTORY_LIMIT = 100
/** One undoable canvas action: a presentation change, a source edit, or both. */
interface HistoryStep {
  label: string
  pres?: [SchematicPresentation, SchematicPresentation]
  source?: { changes: SourceChange[]; undo: SourceChange[]; before: string; after: string }
}
const FOCUS_TITLES: Record<FocusKind, string> = {
  neighbours: 'Neighbours of',
  trace: 'Net through',
  circuit: 'Circuit of',
}

interface Props {
  /** The check response holding the connection topology; it outlives the
   *  solve result, so the schematic tracks the text without needing a solve. */
  checkResult: CheckResponse | null
  /** Solved component instances, when a solve has run — supplies the written
   *  spelling, the component type and the parameter bindings for each node. */
  components?: ComponentResult[]
  /** Solved variables, so each block can show its own results. */
  variables?: VariableResult[]
  /** The document text, for locating an instance's declaration on click. */
  text: string
  /** Reveal a 1-based line in the editor: an explicit navigation that brings
   *  the editor forward. */
  onRevealLine: (line: number) => void
  /** Select a 1-based line in the editor without moving focus or tabs; a node
   *  click links to its declaration this way. */
  onSelectLine?: (line: number) => void
  /** Append a statement to the document (wiring emits `connect(...)` lines).
   *  Absent = the canvas stays read-only. */
  onEmitStatement?: (statement: string) => void
  /** Apply range patches to the editor while it still holds `expected`; false
   *  when another edit intervened. The route every model edit here takes. */
  onSourceEdit?: (changes: SourceChange[], expected: string) => boolean
  /** How the drawing is presented — placed blocks, locks, areas, view
   *  settings — owned by the workspace so it rides the project file; the
   *  network itself is regenerated from the document on every check. */
  presentation?: SchematicPresentation
  onPresentationChange?: (next: SchematicPresentation) => void
  /** Instance ids to emphasize from a Check diagnosis (free quantities). */
  highlightIds?: readonly string[]
  /** RUN-06: hand a solved variable to the app's windows; `reason` says why an action does not apply. */
  handoff?: Handoff
  /** SYNC-10: the last solve's block decomposition, for an equation-only model's dependency view. */
  blocks?: readonly BlockResult[]
}

export type SchematicHandoff = 'plot' | 'table' | 'state' | 'sensitivity'
interface Handoff {
  reason: (kind: SchematicHandoff, name: string) => string | null
  run: (kind: SchematicHandoff, name: string, fluid?: string) => void
}

type Positions = SchematicPresentation['positions']

interface ExportOptions {
  format: 'svg' | 'png' | 'print'
  region: 'model' | 'view' | 'selection'
  background: 'none' | 'white' | 'theme'
  /** PNG pixels per drawing unit. */
  scale: number
  page: 'A4' | 'Letter'
  legend: boolean
  values: boolean
  annotations: boolean
  context: boolean
  warnings: boolean
}
/** A touch screen: larger targets (CFG-09). */
const COARSE = typeof window !== 'undefined' && Boolean(window.matchMedia?.('(pointer: coarse)').matches)

const EXPORT_DEFAULTS: ExportOptions = { format: 'svg', region: 'model', background: 'none', scale: 2, page: 'A4', legend: true, values: true, annotations: true, context: true, warnings: false }

/**
 * CFG-05: a captured drawing as a standalone file — editing affordances and
 * rings removed, the chosen parts kept, a footer of legend, run context and
 * warnings, framed on `box`.
 */
function drawingFile(
  clone: SVGSVGElement,
  box: Box,
  o: ExportOptions,
  ctx: { ink: SchematicInk; picked: ReadonlySet<string>; legend: { label: string; style: LineStyle }[]; context: string; issues: { severity: string; text: string }[] },
): { xml: string; w: number; h: number } {
  const { ink } = ctx
  const ns = 'http://www.w3.org/2000/svg'
  clone.querySelectorAll('[data-background], [data-bend], [data-wire], [data-transient]').forEach((el) => el.remove())
  // Selection, hover and focus rings are not part of the drawing.
  clone.querySelectorAll<SVGRectElement>('rect[data-plain]').forEach((r) => {
    r.setAttribute('stroke', r.dataset.plain!)
    r.setAttribute('stroke-width', '1.2')
    r.setAttribute('fill', ink.block)
  })
  if (!o.values) clone.querySelectorAll('[data-badge]').forEach((el) => el.remove())
  if (!o.annotations) clone.querySelectorAll('[data-area], [data-annotation]').forEach((el) => el.remove())
  if (o.region === 'selection') {
    clone.querySelectorAll<SVGElement>('[data-node]').forEach((el) => !ctx.picked.has(el.dataset.node!) && el.remove())
    clone.querySelectorAll<SVGElement>('[data-route]').forEach((el) => {
      const ends = el.dataset.route!.split('|').filter((end) => end !== '*')
      if (!ends.every((end) => ctx.picked.has(end.slice(0, end.lastIndexOf('.'))))) el.parentElement?.remove()
    })
  }
  // Legend, run context and warnings go under the drawing, as text.
  const foot = document.createElementNS(ns, 'g')
  let y = box.minY + box.h + 18
  const text = (x: number, content: string, color: string) => {
    const t = document.createElementNS(ns, 'text')
    Object.entries({ x, y, 'font-size': 11, fill: color, 'font-family': 'sans-serif' }).forEach(([k, v]) => t.setAttribute(k, String(v)))
    t.textContent = content
    foot.appendChild(t)
  }
  if (o.legend && ctx.legend.length > 0) {
    let x = box.minX
    for (const { label, style } of ctx.legend) {
      const line = document.createElementNS(ns, 'line')
      Object.entries({ x1: x, y1: y - 4, x2: x + 24, y2: y - 4, stroke: style.color, 'stroke-width': style.width, 'stroke-dasharray': style.dash ?? '' }).forEach(([k, v]) => line.setAttribute(k, String(v)))
      foot.appendChild(line)
      text(x + 30, label, ink.text)
      x += 30 + label.length * 6.5 + 18
    }
    y += 18
  }
  if (o.context) {
    text(box.minX, ctx.context, ink.subtext)
    y += 18
  }
  if (o.warnings) {
    for (const i of ctx.issues) {
      text(box.minX, `${i.severity === 'error' ? 'Error' : 'Warning'}: ${i.text}`, i.severity === 'error' ? '#c92a2a' : '#e8590c')
      y += 16
    }
  }
  foot.setAttribute('data-export-footer', '')
  clone.appendChild(foot)
  const h = Math.max(box.h, y - box.minY - 8)
  const w = Math.max(box.w, ...[...foot.querySelectorAll('text')].map((t) => Number(t.getAttribute('x')) - box.minX + (t.textContent?.length ?? 0) * 6.5))
  if (o.background !== 'none') {
    const bg = document.createElementNS(ns, 'rect')
    Object.entries({ x: box.minX, y: box.minY, width: w, height: h, fill: o.background === 'white' ? '#ffffff' : ink.canvas }).forEach(([k, v]) => bg.setAttribute(k, String(v)))
    clone.insertBefore(bg, clone.firstChild)
  }
  clone.setAttribute('viewBox', `${box.minX} ${box.minY} ${w} ${h}`)
  clone.setAttribute('width', String(Math.round(w)))
  clone.setAttribute('height', String(Math.round(h)))
  return { xml: new XMLSerializer().serializeToString(clone), w, h }
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

/**
 * Rendered schematic of the component network, drawn as a circuit: each
 * working fluid gets its own line color and its own framed band, blocks carry
 * the symbol of what they are, and every block reports its own solved state on
 * hover. Nodes can be dragged; the canvas pans and zooms. Everything is drawn
 * from the check payload, so the drawing follows the text as it is checked.
 */
export default function SchematicTab({
  checkResult,
  components,
  variables,
  text,
  onRevealLine,
  onSelectLine,
  onEmitStatement: emitStatement,
  onSourceEdit,
  presentation: saved,
  onPresentationChange,
  highlightIds = [],
  handoff,
  blocks,
}: Readonly<Props>) {
  const svgRef = useRef<SVGSVGElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const [view, setView] = useState<View>({ zoom: 1, x: 0, y: 0 })
  const zoom = view.zoom
  // Dragging updates many times a second; routing every pointermove through
  // the workspace would re-render the app and restart its autosave debounce
  // once per frame. The canvas therefore owns the live value — seeded from the
  // workspace — and publishes upward once, when the drag ends. The ref mirrors
  // the state so the commit can read the final value without waiting for a
  // render.
  // VIEW-04: an arrangement on screen awaiting Apply or Cancel.
  const [arranging, setArranging] = useState<{ label: string; moved: string[]; presentation: SchematicPresentation } | null>(null)
  const presRef = useRef<SchematicPresentation>(saved ?? EMPTY_PRESENTATION)
  const [pres, setPres] = useState(saved ?? EMPTY_PRESENTATION)
  const applyPres = useCallback((next: SchematicPresentation) => {
    presRef.current = next
    setPres(next)
    setArranging(null) // a preview is measured against the presentation it was made from
  }, [])
  const publish = (next: SchematicPresentation) => {
    applyPres(next)
    onPresentationChange?.(next)
  }
  // SYNC-07: one ordered timeline for the model and diagram edits made here.
  // A step carries its presentation before/after, its source patches and their
  // inverse, or both, and undoes as one. Typing in the editor keeps the
  // editor's own undo; a source step undoes only while the editor still holds
  // the text the step produced.
  const [history, setHistory] = useState<{ done: HistoryStep[]; undone: HistoryStep[] }>({ done: [], undone: [] })
  const record = (step: HistoryStep) => setHistory((h) => ({ done: [...h.done.slice(1 - HISTORY_LIMIT), step], undone: [] }))
  /** Change the presentation and publish it at once — anything but a drag frame. */
  const updatePres = (change: (p: SchematicPresentation) => SchematicPresentation, label = 'Change view settings') => {
    const before = presRef.current
    const next = change(before)
    publish(next)
    record({ label, pres: [before, next] })
  }
  const onScreen = arranging?.presentation ?? pres
  const settings = pres.view
  const setSettings = (change: (v: ViewSettings) => ViewSettings) => updatePres((p) => ({ ...p, view: change(p.view) }))
  const lockedIds = useMemo(() => new Set(pres.locked), [pres.locked])
  const [hovered, setHovered] = useState<string | null>(null)
  const [pinned, setPinned] = useState<string | null>(null)
  const [pendingPort, setPendingPort] = useState<{ instance: string; port: string } | null>(null)
  const [wireNote, setWireNote] = useState<string | null>(null)
  const [selectFrom, setSelectFrom] = useState<string | null>(null)
  const [selectTo, setSelectTo] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  // An explicit context command (VIEW-06); plain selection never fades anything.
  const [focus, setFocus] = useState<{ kind: FocusKind; id: string } | null>(null)
  // HIER-01: the subsystem being looked into ('' = the model), with back/forward.
  const [scopes, setScopes] = useState<{ list: string[]; at: number }>({ list: [''], at: 0 })
  // CFG-08: the structured list, and what a screen reader hears.
  const [listOpen, setListOpen] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const toggle = (key: 'snap' | 'guides' | 'portLabels', on: boolean) => setSettings((s) => ({ ...s, [key]: on }))
  // A user area being named (VIEW-05), and v3 positions that matched no block.
  const [areaName, setAreaName] = useState<string | null>(null)
  const [unresolved, setUnresolved] = useState(0)
  // Alignment lines shown while a drag sits on one.
  const [guides, setGuides] = useState<{ xs: number[]; ys: number[] } | null>(null)
  const lastEmitted = useRef<{ a: string; b: string } | null>(null)
  // A wire just written to the source, drawn dashed until the next Check lands.
  const [provisional, setProvisional] = useState<{ from: WireEndpoint; to: WireEndpoint; check: CheckResponse | null } | null>(null)
  // WIRE-05: the wire being inspected, valid only for the check that drew it.
  const [wireCard, setWireCard] = useState<{ index: number; check: CheckResponse | null } | null>(null)
  // WIRE-01: a wire being dragged out of a port, in drawing units.
  const [wireDrag, setWireDrag] = useState<{ from: { instance: string; port: string }; a: [number, number]; b: [number, number] } | null>(null)

  // SYNC-06: the last check that drew a network stands in while the source is
  // edited or broken, so the drawing never blanks under the user.
  const drewNetwork = (checkResult?.connections?.length ?? 0) > 0
  const [previous, setPrevious] = useState<CheckResponse | null>(null)
  if (drewNetwork && previous !== checkResult) setPrevious(checkResult)
  const wired = /^\s*connect\s*\(/im.test(text)
  const showingPrevious = !drewNetwork && previous !== null && wired
  // A check ran on the current text and could not expand the network.
  const sourceBroken = showingPrevious && checkResult !== null
  const errorLine = checkResult?.errorLine ?? checkResult?.errors?.[0]?.line ?? null
  const fix = useMemo(
    () => (checkResult && !checkResult.solvable && onSourceEdit ? suggestFix(checkResult.message, text, COMPONENT_CATALOG) : null),
    [checkResult, text, onSourceEdit],
  )
  const drawnCheck = showingPrevious ? previous : checkResult
  // A scope whose instance is gone (renamed, extracted back) falls back to the model.
  const scope = drawnCheck?.instances?.some((i) => i.name.toLowerCase() === scopes.list[scopes.at]) ? scopes.list[scopes.at] : ''
  // Inside a subsystem the drawing is browsed, not edited: its source is the definition.
  const onEmitStatement = sourceBroken || scope ? undefined : emitStatement
  const connections = useMemo(() => (drawnCheck?.connections ?? []).filter((c) => endpointScope(c.endpoints[0] ?? '') === scope), [drawnCheck, scope])
  const ports = useMemo(() => portIndex(drawnCheck?.ports), [drawnCheck])
  // WIRE-03: ports the engine reports unjoined, by instance.
  const openPorts = useMemo(() => {
    const out = new Map<string, Set<string>>()
    for (const p of drawnCheck?.ports ?? []) {
      if (!p.connected) {
        const key = p.instance.toLowerCase()
        out.set(key, (out.get(key) ?? new Set()).add(p.port.toLowerCase()))
      }
    }
    return out
  }, [drawnCheck])
  // RUN-08: everything Check reported, each pointing at what it names. Only
  // what the engine attributes is attributed: a whole-system message points nowhere.
  const issues = useMemo(() => {
    const out: { severity: 'error' | 'warning'; text: string; line?: number; instance?: string }[] = []
    for (const e of checkResult?.errors ?? []) out.push({ severity: 'error', text: e.message, line: e.line })
    if (checkResult && !checkResult.solvable && !checkResult.errors?.length && checkResult.message) {
      out.push({ severity: 'error', text: checkResult.message, line: checkResult.errorLine ?? undefined })
    }
    for (const p of drawnCheck?.ports ?? []) {
      if (!p.connected) out.push({ severity: 'warning', text: `${p.instance}.${p.port} is not connected`, instance: p.instance })
    }
    for (const w of checkResult?.unitWarnings ?? []) out.push({ severity: 'warning', text: w })
    return out
  }, [checkResult, drawnCheck])
  const [issueFilter, setIssueFilter] = useState<'all' | 'error' | 'warning'>('all')

  const labels = useMemo(() => {
    const map = new Map<string, { label: string; type?: string }>()
    // The document covers the un-solved case; Check identity then a solve
    // refine nested scopes the text scan cannot distinguish.
    for (const [instance, hit] of documentInstances(text)) {
      map.set(instance, hit)
    }
    for (const i of drawnCheck?.instances ?? []) {
      map.set(i.name.toLowerCase(), { label: i.label, type: i.type })
    }
    for (const c of components ?? []) {
      map.set(c.name.toLowerCase(), { label: c.name, type: c.type })
    }
    // A subsystem's boundary, drawn inside it, is labelled with its port.
    for (const c of drawnCheck?.connections ?? []) {
      for (const e of c.endpoints) if (e.includes('$')) map.set(e.toLowerCase(), { label: e.slice(e.indexOf('$') + 1) })
    }
    return map
  }, [drawnCheck, components, text])

  const declaredIds = useMemo(
    () => (scope ? (drawnCheck?.instances ?? []).map((i) => i.name.toLowerCase()).filter((id) => scopeOf(id) === scope) : [...documentInstances(text).keys()]),
    [text, scope, drawnCheck],
  )
  // The canvas element exists only while there is something to draw; effects
  // that attach to it re-run when it appears.
  const drawn = connections.length > 0 || declaredIds.length > 0

  // The document wires components but the canvas has no topology. Either no
  // check has run since the last edit (checkResult is null), or one ran and
  // did not get far enough to expand the network. Only the second is an error.
  const topologyMissing = connections.length === 0 && wired

  /** Each instance's declared ports, by component type, so unwired ports show. */
  const portsByInstance = useMemo(() => {
    const byType = new Map(COMPONENT_CATALOG.map((c) => [c.type.toLowerCase(), c.ports]))
    for (const d of drawnCheck?.definitions ?? []) if (d.ports) byType.set(d.name, d.ports)
    const out = new Map<string, readonly string[]>()
    for (const [instance, hit] of documentInstances(text)) {
      const ports = byType.get(hit.type.toLowerCase())
      if (ports && ports.length > 0) {
        out.set(instance, ports)
      }
    }
    for (const i of drawnCheck?.instances ?? []) {
      const ports = i.definedIn ? byType.get(i.type.toLowerCase()) : undefined
      if (ports && ports.length > 0) out.set(i.name.toLowerCase(), ports)
    }
    return out
  }, [text, drawnCheck])

  /** Written spelling of each fluid (`EG50`), for the legend — the payload
   *  canonicalises to lowercase but the document said it properly. */
  const fluidSpelling = useMemo(() => {
    const out = new Map<string, string>()
    for (const c of components ?? []) {
      for (const p of c.params) {
        if (p.name.endsWith('$') && p.ref) {
          out.set(p.ref.toLowerCase(), p.ref)
        }
      }
    }
    return out
  }, [components])

  const rawLayout = useMemo(
    () =>
      layoutSchematic(connections, labels, declaredIds, portsByInstance, (key, index) => {
        const base = lineLabel(key, fluidSpelling)
        return index > 0 ? `${base} (${index + 1})` : base
      }),
    [connections, labels, declaredIds, portsByInstance, fluidSpelling],
  )
  // Placed blocks keep their absolute positions whatever the flow or spacing;
  // only the blocks the layout places move with it.
  const layout = useMemo(
    () => transformSymbols(arrangeBase(rawLayout, { spacing: settings.spacing, orientation: settings.orientation }), pres.styles ?? EMPTY_STYLES),
    [rawLayout, settings.spacing, settings.orientation, pres.styles],
  )

  const scheme = useComputedColorScheme('dark')
  const ink = SCHEMATIC_INK[scheme]
  const styles = useMemo(() => buildLineStyles(layout.lines, scheme), [layout.lines, scheme])
  const styleOf = useCallback(
    (id: string): LineStyle => styles.get(id) ?? { color: ink.borderTerminal, width: 1.8 },
    [styles, ink],
  )

  // A block the user placed sits where they put it; the rest where the layout puts them.
  const positioned = useMemo(() => {
    const map = new Map<string, SchematicNode>()
    for (const n of layout.nodes) {
      const p = onScreen.positions[n.id]
      map.set(n.id, p ? { ...n, x: p.x, y: p.y } : n)
    }
    return map
  }, [layout.nodes, onScreen.positions])

  // v3 files saved offsets from the plain layout of the checked network; once
  // a Check has drawn that network, they become absolute positions.
  const hasLegacy = Object.keys(pres.legacyOffsets).length > 0
  useEffect(() => {
    if (!hasLegacy || !checkResult || connections.length === 0) {
      return
    }
    const r = resolveLegacy(presRef.current, rawLayout.nodes)
    applyPres(r.presentation)
    onPresentationChange?.(r.presentation)
    setUnresolved(r.unresolved)
  }, [hasLegacy, checkResult, connections.length, rawLayout.nodes, applyPres, onPresentationChange])

  const groups = useMemo(() => {
    const domains = new Map(layout.edges.map((e) => [e.lineId, e.domain]))
    return framesFor(settings.grouping, layout.groups, positioned.values(), (line) => domains.get(line) ?? line)
  }, [settings.grouping, layout.groups, layout.edges, positioned])
  // User areas (VIEW-05) are sized to their members wherever those are drawn,
  // with a title row above them.
  const areaFrames = useMemo(
    () =>
      pres.areas.flatMap((a) => {
        const b = boxAround(a.members.flatMap((id) => positioned.get(id) ?? []), 14, 14)
        return b ? [{ ...a, x: b.minX, y: b.minY - 16, w: b.w, h: b.h + 16 }] : []
      }),
    [pres.areas, positioned],
  )
  const shown = useMemo(
    () => (focus && positioned.has(focus.id) ? focusOf(focus.kind, focus.id, layout.nodes, layout.edges) : null),
    [focus, positioned, layout.nodes, layout.edges],
  )
  // Isolating a circuit hides the rest; neighbours and trace fade it.
  const isolating = shown !== null && focus?.kind === 'circuit'
  // Routes avoid nodes where they are drawn now, not where the layout put them.
  const placed = useMemo(() => [...positioned.values()], [positioned])
  // WIRE-07: wires the user bent go through their bends; a drag in progress
  // overrides the saved bends of the wire it moves.
  const [liveRoute, setLiveRoute] = useState<{ key: string; points: Pt[] } | null>(null)
  const savedRoutes = onScreen.routes ?? EMPTY_ROUTES
  const manual = useMemo(() => {
    const out = new Map<string, Pt[]>()
    for (const e of layout.edges) {
      const key = routeKey(e)
      const pts = liveRoute?.key === key ? liveRoute.points : savedRoutes[key]?.points
      if (pts) out.set(e.id, pts)
    }
    return out
  }, [layout.edges, savedRoutes, liveRoute])
  // Every wire routed once per arrangement, against the blocks and each other.
  const routes = useMemo(() => routeAll(layout.edges, positioned, placed, manual), [layout.edges, positioned, placed, manual])
  // A hand route the automatic router no longer keeps clear of blocks.
  const routeConflicts = useMemo(() => {
    const out = new Map<string, string[]>()
    for (const id of manual.keys()) {
      const crossed = routeCrosses(routes.get(id) ?? [], placed)
      if (crossed.length) out.set(id, crossed)
    }
    return out
  }, [manual, routes, placed])
  const edgeNet = useMemo(() => new Map(layout.edges.map((e) => [e.id, netOf(e)])), [layout.edges])
  // Hop over drawn wires only: an isolated circuit has nothing to hop.
  const hops = useMemo(
    () =>
      crossingHops(
        isolating ? new Map([...routes].filter(([id]) => shown.edges.has(id))) : routes,
        (id) => edgeNet.get(id) ?? id,
      ),
    [routes, edgeNet, isolating, shown],
  )

  // Free drawing units left and right of each block, to its nearest neighbour
  // in the same row: the space a chip name may share with that neighbour.
  const chipRoom = useMemo(() => {
    const room = new Map<string, { left: number; right: number }>()
    for (const n of placed) {
      let left = Infinity
      let right = Infinity
      for (const o of placed) {
        if (o !== n && o.y < n.y + n.h && n.y < o.y + o.h) {
          if (o.x >= n.x) {
            right = Math.min(right, Math.max(0, o.x - (n.x + n.w)))
          } else {
            left = Math.min(left, Math.max(0, n.x - (o.x + o.w)))
          }
        }
      }
      room.set(n.id, { left, right })
    }
    return room
  }, [placed])

  // The drawing as it stands, dragged nodes included: what Fit frames and what
  // an export contains. The layout's own extent always counts, so frames and
  // labels drawn against it are never cut off.
  const bounds = useMemo(() => {
    let minX = 0
    let minY = 0
    let maxX = layout.width
    let maxY = layout.height
    for (const g of [...groups, ...areaFrames]) {
      minX = Math.min(minX, g.x)
      minY = Math.min(minY, g.y)
      maxX = Math.max(maxX, g.x + g.w)
      maxY = Math.max(maxY, g.y + g.h)
    }
    // The margin covers a chip name running past its block.
    for (const n of positioned.values()) {
      minX = Math.min(minX, n.x - CHIP_OVERHANG - 5)
      minY = Math.min(minY, n.y - 20)
      maxX = Math.max(maxX, n.x + n.w + CHIP_OVERHANG + 5)
      maxY = Math.max(maxY, n.y + n.h + 20)
    }
    // VIEW-09: annotations in this scope, sized as they draw (a card or legend at its widest likely line).
    for (const a of pres.annotations ?? []) {
      if (a.scope !== scope) continue
      const lines = a.text ? a.text.split('\n') : []
      const rows = a.kind === 'legend' ? layout.lines.length : a.kind === 'card' ? 2 : Math.max(1, lines.length)
      minX = Math.min(minX, a.at.x - 5)
      minY = Math.min(minY, a.at.y - 5)
      maxX = Math.max(maxX, a.at.x + Math.max(a.kind === 'note' || a.kind === 'callout' ? 60 : 200, ...lines.map((l) => l.length * 6.4 + 14)) + 5)
      maxY = Math.max(maxY, a.at.y + rows * 15 + 13)
    }
    return { minX, minY, w: maxX - minX, h: maxY - minY }
  }, [layout.width, layout.height, layout.lines.length, groups, areaFrames, positioned, pres.annotations, scope])

  const values = useMemo(
    () => indexVariables(variables, checkResult?.inferredUnits),
    [variables, checkResult?.inferredUnits],
  )
  const readouts = useMemo(() => {
    const out = new Map<string, NodeReadout>()
    for (const n of layout.nodes) {
      if (n.kind === 'instance') {
        out.set(n.id, readoutFor(n, layout.edges, values, components))
      }
    }
    return out
  }, [layout.nodes, layout.edges, values, components])

  // The viewBox is expressed in VIEWPORT pixels divided by zoom, so `zoom = 1`
  // is a true 1:1 rendering and panning moves by real pixels. Deriving it from
  // the drawing's own size instead would make the SVG silently scale-to-fit,
  // and every zoom step would then mean something different per document.
  // Zero until the element has actually been measured — a guessed size here
  // would let the one-time fit below compute a zoom for a viewport that never
  // existed, leaving the drawing framed for the wrong window.
  const [viewport, setViewport] = useState({ w: 0, h: 0 })
  useEffect(() => {
    const el = viewportRef.current
    if (!el) {
      return
    }
    const observer = new ResizeObserver(([entry]) => {
      const box = entry.contentRect
      if (box.width > 0 && box.height > 0) {
        setViewport({ w: box.width, h: box.height })
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [drawn])

  const fitTo = useCallback(
    (w: number, h: number) => {
      if (layout.width === 0 || layout.height === 0 || w === 0) {
        return
      }
      // MIN_ZOOM is the floor for manual zoom-out only; Fit must frame the
      // whole drawing however large it is, dragged nodes included.
      setView(frameBox(bounds, w, h, MAX_ZOOM))
    },
    [layout.width, layout.height, bounds],
  )
  // Manual zoom-out may always reach the fitted view, even below MIN_ZOOM.
  const minZoom =
    layout.width > 0 && layout.height > 0 && viewport.w > 0
      ? Math.min(MIN_ZOOM, viewport.w / bounds.w, viewport.h / bounds.h)
      : MIN_ZOOM
  // Auto-framing stays on until the user takes control of the view, then never
  // fights them again. A one-shot "fit on first render" is not enough: the
  // panel is still settling when the first measurement arrives, so the drawing
  // would be framed for a window that existed for one frame.
  const userAdjusted = useRef(false)
  const fit = useCallback(() => {
    userAdjusted.current = false
    fitTo(viewport.w, viewport.h)
  }, [fitTo, viewport.w, viewport.h])
  const takeControl = useCallback(() => {
    userAdjusted.current = true
  }, [])
  // HIER-01: each scope keeps its own camera; one not yet adjusted is fitted.
  const cameras = useRef(new Map<string, View>())
  const showScope = (list: string[], at: number) => {
    if (userAdjusted.current) cameras.current.set(scope, view)
    else cameras.current.delete(scope)
    setScopes({ list, at })
    setSelected(new Set())
    setPinned(null)
    setWireCard(null)
    setFocus(null)
    const camera = cameras.current.get(list[at])
    userAdjusted.current = Boolean(camera)
    if (camera) setView(camera)
  }
  const openScope = (next: string) => {
    if (next !== scope) showScope([...scopes.list.slice(0, scopes.at + 1), next], scopes.at + 1)
  }
  const [treeQuery, setTreeQuery] = useState('')
  const [treeOpen, setTreeOpen] = useState(false)
  /** Every instance, depth-first in declaration order; a subsystem counts the open ports inside it. */
  const tree = useMemo(() => {
    const all = drawnCheck?.instances ?? []
    const rows: { id: string; label: string; type: string; depth: number; open: boolean; hidden: number }[] = []
    const walk = (within: string, depth: number) => {
      for (const i of all) {
        const id = i.name.toLowerCase()
        if (scopeOf(id) !== within) continue
        const open = all.some((j) => scopeOf(j.name.toLowerCase()) === id)
        const hidden = open ? (drawnCheck?.ports ?? []).filter((p) => !p.connected && p.instance.toLowerCase().startsWith(`${id}.`)).length : 0
        rows.push({ id, label: i.label, type: i.type, depth, open, hidden })
        if (open) walk(id, depth + 1)
      }
    }
    walk('', 0)
    return rows
  }, [drawnCheck])
  const nested = tree.some((r) => r.open)
  /** Zoom by `factor` about a viewport point (its centre by default). */
  const zoomBy = useCallback(
    (factor: number, at?: { x: number; y: number }) => {
      takeControl()
      setView((v) => zoomAbout(v, factor, at ?? { x: viewport.w / 2, y: viewport.h / 2 }, minZoom, MAX_ZOOM))
    },
    [takeControl, viewport.w, viewport.h, minZoom],
  )
  const frame = useCallback(
    (box: Box | null) => {
      if (box && viewport.w > 0) {
        takeControl()
        setView(frameBox(box, viewport.w, viewport.h, MAX_ZOOM))
      }
    },
    [takeControl, viewport.w, viewport.h],
  )
  // Fit selection frames the shift-selected blocks, or the pinned one.
  const selection = [...selected, ...(pinned && !selected.has(pinned) ? [pinned] : [])]
  const fitSelection = () =>
    frame(boxAround(selection.flatMap((id) => positioned.get(id) ?? []), CHIP_OVERHANG + 5, 20))
  // VIEW-07: a picked search hit is centred once its scope has drawn it, at
  // 100 % or less so it reads; the scope's saved camera is not overwritten.
  const seek = useRef<string[] | null>(null)
  const [seekTick, setSeekTick] = useState(0)
  useEffect(() => {
    const box = seek.current && boxAround(seek.current.flatMap((id) => positioned.get(id) ?? []), CHIP_OVERHANG + 5, 20)
    if (!box || viewport.w === 0) return
    seek.current = null
    takeControl()
    setView(frameBox(box, viewport.w, viewport.h, 1))
  }, [seekTick, positioned, viewport.w, viewport.h, takeControl])
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const nodeKey = layout.nodes.map((n) => n.id).join(',')

  /**
   * Hands the current arrangement to the workspace, so it rides the project
   * file. Positions of blocks the document no longer declares are dropped here
   * rather than as the network changes: a stale entry is harmless to draw (no
   * node looks it up), and pruning at save time means editing a document never
   * discards a position the user set on a block that survives the edit.
   */
  /**
   * Make a model edit: patch the source the last Check described, then record
   * it — with any coupled presentation change — as one undo step.
   */
  const runEdit = (edit: SourceEdit, presChange?: (p: SchematicPresentation) => SchematicPresentation, fromScope = false): boolean => {
    const before = text
    if (scope && !fromScope) {
      setWireNote('Inside a subsystem the drawing is read-only: edit its definition, or go back to the model.')
      return false
    }
    if (!onSourceEdit?.(edit.changes, before)) {
      setWireNote('The source changed after the last Check; Check again, then retry.')
      return false
    }
    const presStep = presChange ? ([presRef.current, presChange(presRef.current)] as const) : undefined
    if (presStep) publish(presStep[1])
    record({
      label: edit.label,
      pres: presStep ? [presStep[0], presStep[1]] : undefined,
      source: { changes: edit.changes, undo: invertChanges(before, edit.changes), before, after: applyChanges(before, edit.changes) },
    })
    setAnnouncement(`${edit.label}: done; Check runs next.`)
    return true
  }
  const replay = (direction: 'undo' | 'redo') => {
    const from = direction === 'undo' ? history.done : history.undone
    const step = from.at(-1)
    if (!step) return
    if (step.source) {
      const [changes, expected] = direction === 'undo' ? [step.source.undo, step.source.after] : [step.source.changes, step.source.before]
      if (!onSourceEdit?.(changes, expected)) {
        setWireNote(`Cannot ${direction} "${step.label}": the source changed since. Use the editor's undo for typed edits.`)
        return
      }
    }
    if (step.pres) publish(step.pres[direction === 'undo' ? 0 : 1])
    setHistory((h) =>
      direction === 'undo'
        ? { done: h.done.slice(0, -1), undone: [...h.undone, step] }
        : { done: [...h.done, step], undone: h.undone.slice(0, -1) },
    )
  }

  const commit = useCallback(() => {
    if (!onPresentationChange) {
      return
    }
    const alive = new Set(nodeKey.split(','))
    // Only this scope's blocks are drawn; the others' positions are kept.
    const positions = Object.fromEntries(Object.entries(presRef.current.positions).filter(([id]) => alive.has(id) || scopeOf(id) !== scope))
    onPresentationChange({ ...presRef.current, positions })
  }, [nodeKey, onPresentationChange, scope])

  // Keep the whole network framed as the panel settles and the document
  // changes, so the user opens onto the drawing rather than its top-left
  // corner — but stop the moment they zoom, pan or drag anything.
  useEffect(() => {
    if (userAdjusted.current || layout.nodes.length === 0 || viewport.w === 0) {
      return
    }
    fitTo(viewport.w, viewport.h)
  }, [layout.nodes.length, layout.width, layout.height, viewport.w, viewport.h, fitTo])

  const declarationOf = (node: SchematicNode): number | null =>
    node.kind === 'instance'
      ? (declarationLineFromCheck(checkResult?.instances, node.id) ??
        declarationLineFromCheck(checkResult?.instances, node.label) ??
        declarationLine(text, node.label))
      : null
  // CFG-01: a style at one scope; null resets that scope.
  const blockStyles = pres.styles ?? EMPTY_STYLES
  const setStyle = (scope: StyleScope, key: string, next: BlockStyle | null) =>
    updatePres((p) => {
      const s = p.styles ?? EMPTY_STYLES
      const kept = next && Object.keys(next).length > 0 ? next : null
      if (scope === 'project') return { ...p, styles: { ...s, project: kept ?? {} } }
      const field = scope === 'type' ? 'types' : 'instances'
      const { [key]: _old, ...rest } = s[field]
      return { ...p, styles: { ...s, [field]: kept ? { ...rest, [key]: kept } : rest } }
    }, next && Object.keys(next).length > 0 ? 'Change style' : `Reset ${scope} style`)
  // RUN-03: the variables chosen to read on the drawing, and how they read.
  const badges = pres.badges ?? {}
  const watch = pres.watch ?? []
  const formats = pres.formats ?? {}
  const toggleBadge = (block: string, name: string) =>
    updatePres((p) => {
      const { [block]: old, ...rest } = p.badges ?? {}
      return { ...p, badges: old === name ? rest : { ...rest, [block]: name } }
    }, 'Change block readout')
  const toggleWatch = (name: string) =>
    updatePres((p) => {
      const w = p.watch ?? []
      return { ...p, watch: w.includes(name) ? w.filter((x) => x !== name) : [...w, name] }
    }, 'Change watch')
  const setFormat = (name: string, f: VariableFormat | null) =>
    updatePres((p) => {
      const { [name]: _old, ...rest } = p.formats ?? {}
      return { ...p, formats: f ? { ...rest, [name]: f } : rest }
    }, 'Change display format')
  // RUN-04/WIRE-10: wires coloured by one solved metric, and measured-flow arrows.
  const overlaySet = pres.overlay ?? { metric: '', arrows: false }
  const metrics = useMemo(() => overlayMetrics(layout.edges, values), [layout.edges, values])
  const metric = metrics.find((m) => m.key === overlaySet.metric) ?? null
  const overlayRead = useMemo(() => (metric ? edgeReadings(layout.edges, values, metric) : null), [metric, layout.edges, values])
  const setOverlay = (next: Partial<SchematicPresentation['overlay']>) =>
    updatePres((p) => ({ ...p, overlay: { ...(p.overlay ?? { metric: '', arrows: false }), ...next } }), 'Change overlay')
  // VIEW-08: presets change view settings only; a named view also restores
  // where it looked, its readouts and any focus. Both are presentation, one undo step.
  const [viewName, setViewName] = useState('')
  const savedViews = pres.views ?? []
  const viewGone = (v: SavedView) => [v.scope, v.focus?.id ?? ''].some((id) => id && !drawnCheck?.instances?.some((i) => i.name.toLowerCase() === id))
  const saveView = (name: string) =>
    updatePres((p) => ({ ...p, views: [...(p.views ?? []).filter((x) => x.name !== name), { name, scope, camera: view, view: p.view, overlay: p.overlay, badges: p.badges, focus }] }), `Save view ${name}`)
  const applyView = (v: SavedView) => {
    updatePres((p) => ({ ...p, view: v.view, overlay: v.overlay, badges: v.badges }), `Apply view ${v.name}`)
    openScope(v.scope)
    userAdjusted.current = true
    setView(v.camera)
    setFocus(v.focus)
    setAnnouncement(`View ${v.name}`)
  }
  // VIEW-09: annotations drawn in this scope. A callout or card whose block or
  // variable the last Check no longer reports is drawn broken, never with an old value.
  const annotations = pres.annotations ?? []
  const [noteDrag, setNoteDrag] = useState<{ id: string; from: { x: number; y: number }; at: { x: number; y: number }; moved: boolean } | null>(null)
  const [noteEdit, setNoteEdit] = useState<{ id: string; text: string } | null>(null)
  const knownVariables = useMemo(() => new Set((drawnCheck?.variables ?? []).map((v) => v.toLowerCase())), [drawnCheck])
  const annotate = (kind: Annotation['kind'], target = '', at?: { x: number; y: number }) => {
    const id = `n${annotations.reduce((m, a) => Math.max(m, Number(a.id.slice(1))), 0) + 1}`
    // Near the view's top-left corner, where Fit leaves a margin, cascading so a new one never hides the last.
    const step = 24 * (annotations.filter((x) => x.scope === scope).length % 8)
    const where = at ?? { x: Math.round((16 - view.x) / zoom) + step, y: Math.round((16 - view.y) / zoom) + step }
    updatePres((p) => ({ ...p, annotations: [...(p.annotations ?? []), { id, kind, scope, at: where, text: '', target }] }), `Add ${kind}`)
    if (kind === 'note' || kind === 'callout') setNoteEdit({ id, text: '' })
  }
  // SYNC-10: an equation-only model's cards and the solve's block dependencies.
  const links = useMemo(() => blockDependencies(blocks ?? []), [blocks])
  const pinnedCards = annotations.filter((a) => a.kind === 'card' && a.scope === '')
  const togglePin = (name: string) => {
    const card = pinnedCards.find((a) => a.target === name)
    if (card) updatePres((p) => ({ ...p, annotations: (p.annotations ?? []).filter((x) => x.id !== card.id) }), 'Remove card')
    else annotate('card', name, { x: 0, y: 40 * pinnedCards.length })
  }
  const readingText = (name: string) => {
    const v = values.get(name)
    if (!v) return null
    const f = formatReading(v, formats[name])
    return `${f.text} ${f.units}`.trim()
  }
  /** A variable as the drawing labels its block (`R1.a.i`), else as the solve reported it. */
  const shownName = (name: string) => {
    const owner = ownerOf(name)
    return owner ? `${labels.get(owner.block)?.label ?? owner.block}${name.slice(owner.block.length)}` : (values.get(name)?.name ?? name)
  }
  const legendRows = layout.lines.map((key) => ({ label: lineLabel(key, fluidSpelling), color: styleOf(lineId(key)).color }))
  const annotationBody = (a: Annotation): { lines: string[]; broken: boolean; to?: SchematicNode } => {
    const text = a.text ? a.text.split('\n') : []
    if (a.kind === 'callout') {
      const to = positioned.get(a.target)
      if (to) return { lines: text.length ? text : ['Note'], broken: false, to }
      const gone = !drawnCheck?.instances?.some((i) => i.name.toLowerCase() === a.target)
      return { lines: [...text, `Link broken: ${a.target} ${gone ? 'no longer exists' : 'is in another subsystem'}`], broken: true }
    }
    if (a.kind === 'card') {
      const v = values.get(a.target)
      const title = a.text || shownName(a.target)
      if (drawnCheck && !knownVariables.has(a.target)) return { lines: [title, `Link broken: ${a.target} no longer exists`], broken: true }
      const f = v && formatReading(v, formats[a.target])
      return { lines: [title, f ? `${f.text} ${f.units}`.trim() : 'Not solved'], broken: false }
    }
    if (a.kind === 'legend') return { lines: legendRows.map((l) => l.label), broken: false }
    return { lines: text.length ? text : ['Note'], broken: false }
  }
  // COMP-01/02: placing a component. The quick-add finds it, the wizard
  // configures a library type, and the block lands where it was asked for,
  // its declaration and its position one undo step.
  const [quickAdd, setQuickAdd] = useState<{ screen: { x: number; y: number }; at: { x: number; y: number } } | null>(null)
  const [placing, setPlacing] = useState<{ type: string; at: { x: number; y: number }; after?: (block: string) => void } | null>(null)
  const localTypes = useMemo(() => {
    const out = new Map([...declaredComponentTypes(text)].map((t) => [t, t]))
    for (const d of drawnCheck?.definitions ?? []) {
      const header = d.range ? text.slice(d.range[0], d.range[1]) : ''
      out.set(d.name, /(?:=|component)\s*([A-Za-z_]\w*)\s*\(/i.exec(header)?.[1] ?? d.name)
    }
    return [...out.values()]
  }, [text, drawnCheck])
  /** A document type as its definition writes it. */
  const written = (type: string) => localTypes.find((t) => t.toLowerCase() === type.toLowerCase()) ?? type
  const hits = useMemo(
    () =>
      searchModel(drawnCheck, text, issues, searchQuery, (type) =>
        COMPONENT_CATALOG.find((c) => c.type.toLowerCase() === type.toLowerCase())?.type ?? localTypes.find((t) => t.toLowerCase() === type.toLowerCase()) ?? type,
      ),
    [drawnCheck, text, issues, searchQuery, localTypes],
  )
  const goTo = (hit: SearchHit) => {
    setSearchOpen(false)
    if (hit.scope !== null) {
      openScope(hit.scope)
      setSelected(new Set(hit.select))
      seek.current = hit.select
      setSeekTick((t) => t + 1)
    }
    // The editor follows without taking the view, unless the hit has nothing to draw.
    if (hit.line !== null) (hit.scope !== null ? onSelectLine : onRevealLine)?.(hit.line)
    setAnnouncement(`${hit.label}, ${hit.detail}`)
  }
  const takenNames = useMemo(() => [...documentInstances(text).values()].map((h) => h.label), [text])
  const toDrawing = (clientX: number, clientY: number) => {
    const r = viewportRef.current?.getBoundingClientRect()
    return r ? { x: (clientX - r.left - view.x) / zoom, y: (clientY - r.top - view.y) / zoom } : { x: 0, y: 0 }
  }
  const openQuickAdd = (clientX?: number, clientY?: number) => {
    const r = viewportRef.current?.getBoundingClientRect()
    const cx = clientX ?? (r ? r.left + r.width / 2 : 0)
    const cy = clientY ?? (r ? r.top + r.height / 3 : 0)
    setQuickAdd({ screen: { x: Math.max(8, cx - (r?.left ?? 0) - 170), y: Math.max(8, cy - (r?.top ?? 0)) }, at: toDrawing(cx, cy) })
  }
  const placeBlock = (block: string, at: { x: number; y: number }) => {
    const decl = lastDeclaration(block)
    const id = decl?.[2].toLowerCase()
    runEdit(
      { label: `Add ${decl?.[2] ?? 'component'}`, changes: [appendStatement(text, block)] },
      id ? (p) => ({ ...p, positions: { ...p.positions, [id]: { x: at.x - PLACE_OFFSET.x, y: at.y - PLACE_OFFSET.y } } }) : undefined,
    )
  }
  const choose = (choice: QuickAddChoice, at: { x: number; y: number }) => {
    setQuickAdd(null)
    if (choice.local) placeBlock(`${choice.type} ${suggestInstanceName(choice.type, takenNames)}()`, at)
    else setPlacing({ type: choice.type, at })
  }
  const fitsArmed = pendingPort ? ports.get(`${pendingPort.instance}.${pendingPort.port}`.toLowerCase()) : undefined
  const adding = (
    <>
      {quickAdd && (
        <QuickAdd
          at={quickAdd.screen}
          localTypes={localTypes}
          fits={fitsArmed ? { label: `${fitsArmed.instance}.${fitsArmed.port}`, domain: fitsArmed.domain } : null}
          onChoose={(c) => choose(c, quickAdd.at)}
          onCancel={() => {
            setQuickAdd(null)
            viewportRef.current?.focus()
          }}
        />
      )}
      {placing && (
        <Suspense fallback={null}>
          <ComponentWizardModal
            opened
            initialType={placing.type}
            existingNames={takenNames}
            onClose={() => setPlacing(null)}
            onInsert={(block) => (placing.after ? placing.after(block) : placeBlock(block, placing.at))}
          />
        </Suspense>
      )}
    </>
  )

  // WIRE-07: route edits are presentation, one undo step each.
  const snapPt = (p: Pt): Pt => (settings.snap ? { x: snapToGrid(p.x, settings.grid), y: snapToGrid(p.y, settings.grid) } : p)
  const setRoutes = (change: (r: Record<string, WireRoute>) => Record<string, WireRoute>, label: string) =>
    updatePres((p) => ({ ...p, routes: change(p.routes ?? EMPTY_ROUTES) }), label)
  const suppressClick = useRef(false)
  /** Drag the lane under the pointer square to itself; a still press is a click. */
  const startLaneDrag = (ev: ReactPointerEvent, e: SchematicEdge) => {
    const key = routeKey(e)
    const pts = routes.get(e.id)
    if (ev.button !== 0 || savedRoutes[key]?.locked || !pts || pts.length < 4) return
    const { index: j } = nearestLane(pts, toDrawing(ev.clientX, ev.clientY))
    const across = pts[j].y === pts[j + 1].y
    const [x0, y0] = [ev.clientX, ev.clientY]
    let moved: Pt[] | null = null
    const move = (m: PointerEvent) => {
      const [dx, dy] = [(m.clientX - x0) / zoom, (m.clientY - y0) / zoom]
      if (!moved && Math.hypot(dx * zoom, dy * zoom) < 4) return
      const next = pts.map((p) => ({ ...p }))
      for (const k of [j, j + 1]) {
        next[k] = across ? { x: next[k].x, y: snapPt({ x: 0, y: pts[k].y + dy }).y } : { x: snapPt({ x: pts[k].x + dx, y: 0 }).x, y: next[k].y }
      }
      // The bends: everything between the stubs, plus a stub end the drag moved.
      const last = next.length - 2
      moved = next.slice(1, -1).filter((p, k) => (k !== 0 || p.x !== pts[1].x || p.y !== pts[1].y) && (k + 1 !== last || p.x !== pts[last].x || p.y !== pts[last].y))
      setLiveRoute({ key, points: moved })
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      setLiveRoute(null)
      if (moved) {
        suppressClick.current = true
        const points = moved
        setRoutes((r) => ({ ...r, [key]: { points } }), 'Move wire segment')
      }
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }
  /** Double-click on a wire: a bend where it was clicked, ready to drag. */
  const addBend = (e: SchematicEdge, at: Pt) => {
    const key = routeKey(e)
    const pts = routes.get(e.id)
    if (savedRoutes[key]?.locked || !pts || pts.length < 4) return
    const { index: j, foot } = nearestLane(pts, at)
    const full = [...pts.slice(1, j + 1), snapPt(foot), ...pts.slice(j + 1, -1)]
    setRoutes((r) => ({ ...r, [key]: { points: full.slice(1, -1) } }), 'Add bend')
  }
  const moveBend = (ev: ReactPointerEvent, key: string, k: number) => {
    ev.stopPropagation()
    const base = savedRoutes[key]?.points
    if (!base || savedRoutes[key]?.locked) return
    let moved: Pt[] | null = null
    const move = (m: PointerEvent) => {
      moved = base.map((p, i) => (i === k ? snapPt(toDrawing(m.clientX, m.clientY)) : p))
      setLiveRoute({ key, points: moved })
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      setLiveRoute(null)
      if (moved) {
        const points = moved
        setRoutes((r) => ({ ...r, [key]: { points } }), 'Move bend')
      }
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }
  const removeBend = (key: string, k: number) =>
    setRoutes((r) => ({ ...r, [key]: { points: r[key].points.filter((_, i) => i !== k) } }), 'Remove bend')
  const cardEdges = wireCard ? layout.edges.filter((e) => Number(netOf(e).slice(1)) === wireCard.index) : []
  const cardLocked = cardEdges.length > 0 && cardEdges.every((e) => savedRoutes[routeKey(e)]?.locked)
  const routeControls = cardEdges.length > 0 && (
    <Group gap={4} mt={6} data-testid="route-controls">
      <Text size="xs" c="dimmed">
        Route{cardEdges.some((e) => manual.has(e.id)) ? ' (manual)' : ' (automatic)'}:
      </Text>
      <Button
        size="compact-xs"
        variant="default"
        onClick={() =>
          setRoutes((r) => {
            const next = { ...r }
            for (const e of cardEdges) {
              const key = routeKey(e)
              next[key] = cardLocked ? { points: r[key]?.points ?? [] } : { points: r[key]?.points ?? (routes.get(e.id) ?? []).slice(2, -2), locked: true }
            }
            return next
          }, cardLocked ? 'Unlock route' : 'Lock route')
        }
      >
        {cardLocked ? 'Unlock route' : 'Lock route'}
      </Button>
      <Button
        size="compact-xs"
        variant="default"
        disabled={cardLocked || !cardEdges.some((e) => savedRoutes[routeKey(e)])}
        onClick={() =>
          setRoutes((r) => Object.fromEntries(Object.entries(r).filter(([key]) => !cardEdges.some((e) => routeKey(e) === key))), 'Reset route')
        }
      >
        Reset route
      </Button>
    </Group>
  )

  // WIRE-09: a configured block put into the open wire, with its port mapping
  // and, on a junction, the branch it takes; previewed before it is written.
  const [insertDraft, setInsertDraft] = useState<{ index: number; type: string | null; toA: string; toB: string; branch: string; block: string | null } | null>(null)
  const insertConn = insertDraft ? connections[insertDraft.index] : undefined
  const insertEnds = insertConn?.range ? writtenEndpoints(text.slice(insertConn.range[0], insertConn.range[1])) : []
  const insertTypes = useMemo(() => {
    if (!insertConn) return []
    const local = (drawnCheck?.definitions ?? []).filter((d) => (d.ports?.length ?? 0) >= 2).map((d) => ({ type: localTypes.find((t) => t.toLowerCase() === d.name) ?? d.name, ports: d.ports ?? [] }))
    const library = COMPONENT_CATALOG.filter((c) => c.ports.length >= 2 && c.ports.some((p) => previewDomain(c.type, p) === insertConn.domain)).map((c) => ({ type: c.type, ports: c.ports }))
    return [...local, ...library]
  }, [insertConn, drawnCheck, localTypes])
  const portsOf = (type: string | null) => insertTypes.find((t) => t.type === type)?.ports ?? []
  const insertEdit = insertDraft?.block && insertConn ? insertIntoConnection(text, insertConn, insertDraft.block, insertDraft) : null
  const chooseInsertType = (type: string | null) => {
    const ports = portsOf(type)
    const toA = ports.find((p) => /(^|_)in(let)?$/i.test(p)) ?? ports[0] ?? ''
    const toB = ports.find((p) => /(^|_)out(let)?$/i.test(p)) ?? ports.find((p) => p !== toA) ?? ''
    setInsertDraft((d) => d && { ...d, type, toA, toB, block: null })
  }
  const applyInsert = () => {
    if (!insertEdit || !insertConn || !insertDraft) return
    const id = lastDeclaration(insertDraft.block!)?.[2].toLowerCase()
    const centres = [insertDraft.branch, insertEnds.find((e) => canonRef(e) !== canonRef(insertDraft.branch))!]
      .map((e) => positioned.get(e.split('.')[0].trim().toLowerCase()))
      .filter((n): n is SchematicNode => Boolean(n))
      .map((n) => ({ x: n.x + n.w / 2, y: n.y + n.h / 2 }))
    const mid = centres.length === 2 ? { x: (centres[0].x + centres[1].x) / 2, y: (centres[0].y + centres[1].y) / 2 } : null
    if (runEdit(insertEdit, id && mid ? (p) => ({ ...p, positions: { ...p.positions, [id]: { x: mid.x - PLACE_OFFSET.x, y: mid.y - PLACE_OFFSET.y } } }) : undefined)) {
      setInsertDraft(null)
      setWireCard(null)
    }
  }
  const insertPanel = insertDraft && insertConn && (
    <Paper withBorder shadow="md" p="xs" radius="sm" data-testid="insert-panel" style={{ position: 'absolute', left: 396, bottom: 8, width: 340, zIndex: 7 }}>
      <Stack gap={6}>
        <Text size="xs" fw={600}>Insert into {insertEnds.join(', ')}</Text>
        <Select size="xs" label="Component" placeholder="Type to search" searchable data={insertTypes.map((t) => t.type)} value={insertDraft.type} onChange={chooseInsertType} />
        {insertEnds.length > 2 && (
          <Select size="xs" label="Branch it goes on" data={insertEnds} value={insertDraft.branch} onChange={(v) => v && setInsertDraft({ ...insertDraft, branch: v, block: null })} />
        )}
        {insertDraft.type && (
          <Group gap={6} grow>
            <Select size="xs" label={`Port toward ${insertEnds.filter((e) => canonRef(e) !== canonRef(insertDraft.branch)).join(', ')}`} data={portsOf(insertDraft.type)} value={insertDraft.toA} onChange={(v) => v && setInsertDraft({ ...insertDraft, toA: v, block: null })} />
            <Select size="xs" label={`Port toward ${insertDraft.branch}`} data={portsOf(insertDraft.type)} value={insertDraft.toB} onChange={(v) => v && setInsertDraft({ ...insertDraft, toB: v, block: null })} />
          </Group>
        )}
        {insertDraft.toA && insertDraft.toA === insertDraft.toB && <Text size="xs" c="orange">Pick two different ports.</Text>}
        {insertEdit && (
          <Text component="pre" size="xs" data-testid="insert-preview" style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'var(--mantine-font-family-monospace)' }}>
            {insertEdit.changes.flatMap((c) => [...text.slice(c.from, c.to).split('\n').filter(Boolean).map((l) => `- ${l}`), ...c.insert.split('\n').filter(Boolean).map((l) => `+ ${l}`)]).join('\n')}
          </Text>
        )}
        <Group gap={4} justify="flex-end">
          <Button size="compact-xs" variant="default" onClick={() => setInsertDraft(null)}>Cancel</Button>
          {insertEdit ? (
            <Button size="compact-xs" onClick={applyInsert}>Apply</Button>
          ) : (
            <Button
              size="compact-xs"
              disabled={!insertDraft.type || !insertDraft.toA || !insertDraft.toB || insertDraft.toA === insertDraft.toB}
              onClick={() => {
                const local = (drawnCheck?.definitions ?? []).some((d) => d.name === insertDraft.type!.toLowerCase())
                const add = (block: string) => setInsertDraft((d) => d && { ...d, block })
                if (local) add(`${insertDraft.type} ${suggestInstanceName(insertDraft.type!, takenNames)}()`)
                else setPlacing({ type: insertDraft.type!, at: { x: 0, y: 0 }, after: add })
              }}
            >
              Configure…
            </Button>
          )}
        </Group>
      </Stack>
    </Paper>
  )

  // COMP-05/06: copy, paste, duplicate and delete. Each reads the ranges of the
  // current Check, so a stale drawing asks for a Check rather than guessing.
  const [deleting, setDeleting] = useState<(DeleteImpact & { ids: string[] }) | null>(null)
  const [pasteReport, setPasteReport] = useState<PasteResult | null>(null)
  const fragmentOf = (): Fragment | null => {
    if (!checkResult || sourceBroken) {
      setWireNote('Check first: copying and deleting work on the checked source.')
      return null
    }
    const pos = Object.fromEntries(selection.flatMap((id) => {
      const n = positioned.get(id)
      return n ? [[id, { x: n.x, y: n.y }]] : []
    }))
    const f = copyFragment(text, checkResult, new Set(selection), pos)
    if (f.instances.length === 0) {
      setWireNote('Select one or more components first.')
      return null
    }
    return f
  }
  const copySelection = () => {
    const f = fragmentOf()
    if (f && !storeFragment(f)) {
      setWireNote('The clipboard could not be prepared; nothing was changed.')
      return null
    }
    if (f) setWireNote(`Copied ${f.instances.length} component${f.instances.length === 1 ? '' : 's'}.`)
    return f
  }
  const pasteHere = (f: Fragment | null, label: string) => {
    if (!f) return setWireNote('Nothing to paste: copy components first.')
    if (!checkResult || sourceBroken) return setWireNote('Check first: pasting needs the checked source.')
    const defs = (checkResult.definitions ?? []).flatMap((d) => (d.range ? [{ name: d.name, text: text.slice(d.range[0], d.range[1]) }] : []))
    const r = pasteFragment(text, f, takenNames, defs, { dx: 40, dy: 40 })
    if (runEdit({ label: `${label} ${f.instances.map((i) => i.name).join(', ')}`, changes: [appendStatement(text, r.block)] }, (p) => ({ ...p, positions: { ...p.positions, ...r.positions } }))) {
      setSelected(new Set(r.ids))
      setPinned(null)
      setPasteReport(r)
    }
  }
  const requestDelete = (ids: readonly string[] = selection) => {
    if (!checkResult || sourceBroken) return setWireNote('Check first: deleting works on the checked source.')
    const impact = deleteImpact(text, checkResult, new Set(ids))
    if (impact.edit.changes.length === 0) return setWireNote('Select one or more components first.')
    setDeleting({ ...impact, ids: [...ids] })
  }
  const confirmDelete = () => {
    if (!deleting) return
    const gone = new Set(deleting.ids)
    if (runEdit(deleting.edit, (p) => withoutBlocks(p, gone))) {
      setSelected(new Set())
      setPinned(null)
    }
    setDeleting(null)
  }
  /** The catalog entry, or a document definition's ports and parameters (HIER-04). */
  const specOf = (type: string | undefined): ComponentSpec | undefined => {
    const t = type?.toLowerCase()
    const local = drawnCheck?.definitions?.find((d) => d.name === t)
    if (!local) return COMPONENT_CATALOG.find((c) => c.type.toLowerCase() === t)
    const param = (name: string) => ({ name, isString: name.endsWith('$'), isSelector: false, isMap: false, unit: '', description: `Parameter of ${type}`, required: true, values: [], variants: [] })
    return { type: type!, library: 'document', summary: 'Defined in this document', tags: [], ports: local.ports ?? [], params: (local.params ?? []).map(param), variants: [] }
  }
  // HIER-04: a local definition's ports, changed with a migration plan.
  const [iface, setIface] = useState<{ type: string; change: InterfaceChange | null; names: Record<string, string>; add: string } | null>(null)
  const ifacePlan = iface?.change && checkResult ? editInterface(text, checkResult, iface.type, iface.change) : null
  const ifaceDef = iface ? drawnCheck?.definitions?.find((d) => d.name === iface.type.toLowerCase()) : undefined
  const interfacePanel = (
    <Modal opened={iface !== null} onClose={() => setIface(null)} title={iface && `${iface.type} interface`} size="lg">
      {iface && (
        <Stack gap="xs" data-testid="interface-editor">
          <Text size="sm">Used by {ifacePlan?.instances ?? (drawnCheck?.instances ?? []).filter((i) => i.type.toLowerCase() === iface.type.toLowerCase()).length} instance(s).</Text>
          {(ifaceDef?.ports ?? []).map((port) => (
            <Group key={port} gap={4} wrap="nowrap">
              <TextInput size="xs" aria-label={`Port ${port}`} value={iface.names[port] ?? port} onChange={(e) => setIface({ ...iface, names: { ...iface.names, [port]: e.currentTarget.value }, change: null })} />
              <Button size="compact-xs" variant="default" disabled={(iface.names[port] ?? port) === port} onClick={() => setIface({ ...iface, change: { rename: [port, iface.names[port]] } })}>
                Rename
              </Button>
              <Button size="compact-xs" variant="default" color="red" onClick={() => setIface({ ...iface, change: { remove: port } })}>
                Remove
              </Button>
            </Group>
          ))}
          <Group gap={4} wrap="nowrap">
            <TextInput size="xs" aria-label="New port" placeholder="New port" value={iface.add} onChange={(e) => setIface({ ...iface, add: e.currentTarget.value, change: null })} />
            <Button size="compact-xs" variant="default" disabled={!iface.add.trim()} onClick={() => setIface({ ...iface, change: { add: iface.add.trim() } })}>
              Add port
            </Button>
          </Group>
          {ifacePlan && (
            <Stack gap={2} data-testid="interface-plan">
              {ifacePlan.blocked.map((b) => <Text key={b} size="sm" c="red">{b}</Text>)}
              {ifacePlan.statements.map((st) => (
                <Text key={st.line} size="xs" ff="monospace">
                  line {st.line}: {st.before} → {st.after || '(removed)'}
                </Text>
              ))}
              {ifacePlan.kept.map((k) => <Text key={k} size="xs" c="orange">Kept, Check will report it: {k}</Text>)}
            </Stack>
          )}
          <Group justify="flex-end" gap="xs">
            <Button variant="default" size="xs" onClick={() => setIface(null)}>Cancel</Button>
            <Button
              size="xs"
              disabled={!ifacePlan || ifacePlan.blocked.length > 0}
              onClick={() => {
                if (ifacePlan && runEdit(ifacePlan.edit, undefined, true)) setIface(null)
              }}
            >
              Apply
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  )
  // HIER-02/03: the extraction preview, and a Check of the text it would write.
  const [extracting, setExtracting] = useState<{ type: string; name: string; ids: string[] } | null>(null)
  const extraction: Extraction | null = extracting && checkResult ? extractSubsystem(text, checkResult, new Set(extracting.ids), extracting.type, extracting.name) : null
  // HIER-05: component files out and in.
  const [exporting, setExporting] = useState<{ type: string; description: string } | null>(null)
  const [importing, setImporting] = useState<{ file: string; defs: { name: string; text: string }[]; replace: string[] } | null>(null)
  const importInput = useRef<HTMLInputElement>(null)
  const importPlan = importing && checkResult ? importComponents(text, checkResult, importing.defs, new Set(importing.replace)) : null
  const exportType = (() => {
    const id = scope || (selection.length === 1 ? selection[0] : '')
    const inst = drawnCheck?.instances?.find((i) => i.name.toLowerCase() === id)
    return inst?.localType ? written(inst.type) : undefined
  })()
  const readComponents = async (file: File) => {
    const body = await file.text()
    const found = await checkText(body, [], false)
    const defs = (found.definitions ?? []).flatMap((d) => (d.range ? [{ name: d.name, text: body.slice(d.range[0], d.range[1]) }] : []))
    if (defs.length === 0) return setWireNote(`${file.name} defines no components.`)
    setImporting({ file: file.name, defs, replace: [] })
  }
  const candidate =
    extraction && extraction.blocked.length === 0
      ? applyChanges(text, extraction.edit.changes)
      : importPlan && importPlan.edit.changes.length > 0
        ? applyChanges(text, importPlan.edit.changes)
        : null
  const [verdict, setVerdict] = useState<{ text: string; ok: boolean; message: string } | null>(null)
  useEffect(() => {
    if (!candidate) return
    let live = true
    void checkText(candidate, [], false).then((r) => {
      // The result must parse, and be solvable whenever the model was.
      if (live) setVerdict({ text: candidate, ok: !r.errors?.length && r.errorLine == null && (r.solvable || !checkResult?.solvable), message: r.message })
    })
    return () => {
      live = false
    }
  }, [candidate, checkResult?.solvable])
  const startExtract = () => {
    if (!checkResult || sourceBroken) return setWireNote('Check first: extracting works on the checked source.')
    const free = (make: (k: number) => string, taken: (n: string) => boolean) => {
      let k = 1
      while (taken(make(k).toLowerCase())) k++
      return make(k)
    }
    const type = free((k) => (k === 1 ? 'Subsystem' : `Subsystem${k}`), (n) => (checkResult.definitions ?? []).some((d) => d.name === n))
    const name = free((k) => `SUB${k}`, (n) => [...takenNames].some((t) => t.toLowerCase() === n))
    setExtracting({ type, name, ids: [...selection] })
  }
  const applyExtraction = () => {
    if (!extraction || !extracting) return
    const ids = new Set(extracting.ids)
    const boxes = extracting.ids.flatMap((id) => positioned.get(id) ?? [])
    const at = { x: boxes.reduce((s, b) => s + b.x, 0) / Math.max(1, boxes.length), y: boxes.reduce((s, b) => s + b.y, 0) / Math.max(1, boxes.length) }
    if (runEdit(extraction.edit, (p) => movePresentation(p, ids, extracting.name, at))) {
      setSelected(new Set([extracting.name.toLowerCase()]))
      setPinned(null)
    }
    setExtracting(null)
  }
  const verdictLine = candidate && (
    <Text size="sm" c={verdict?.text !== candidate ? 'dimmed' : verdict.ok ? 'teal' : 'red'} data-testid="result-check">
      {verdict?.text !== candidate ? 'Checking the result…' : `Check of the result: ${verdict.message}`}
    </Text>
  )
  const editing = (
    <>
      {interfacePanel}
      <input
        ref={importInput}
        type="file"
        accept=".frees,.txt"
        hidden
        data-testid="import-components-input"
        onChange={(e) => {
          const file = e.currentTarget.files?.[0]
          e.currentTarget.value = ''
          if (file) void readComponents(file)
        }}
      />
      <Modal opened={exporting !== null} onClose={() => setExporting(null)} title={exporting && `Export ${exporting.type}`} size="lg">
        {exporting && (
          <Stack gap="xs" data-testid="export-component">
            <TextInput size="xs" label="Description" value={exporting.description} onChange={(e) => setExporting({ ...exporting, description: e.currentTarget.value })} />
            <Text component="pre" size="xs" ff="monospace" m={0} p={6} style={{ background: 'var(--mantine-color-default-hover)', overflowX: 'auto' }}>
              {componentFile(text, drawnCheck, exporting.type, exporting.description)}
            </Text>
            <Group justify="flex-end" gap="xs">
              <Button variant="default" size="xs" onClick={() => setExporting(null)}>Cancel</Button>
              <Button
                size="xs"
                onClick={() => {
                  download(new Blob([componentFile(text, drawnCheck, exporting.type, exporting.description)], { type: 'text/plain' }), `${exporting.type}.frees`)
                  setExporting(null)
                }}
              >
                Download
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
      <Modal opened={importing !== null} onClose={() => setImporting(null)} title={importing && `Import from ${importing.file}`} size="lg">
        {importing && importPlan && (
          <Stack gap="xs" data-testid="import-components">
            {importPlan.added.length > 0 && <Text size="sm">Adds {importPlan.added.join(', ')}</Text>}
            {importPlan.same.length > 0 && <Text size="sm">Already here, identical: {importPlan.same.join(', ')}</Text>}
            {[...importPlan.differs, ...importPlan.replaced].map((name) => (
              <Checkbox
                key={name}
                size="xs"
                label={`${name} differs from this document's — replace mine`}
                checked={importing.replace.includes(name)}
                onChange={(e) => setImporting({ ...importing, replace: e.currentTarget.checked ? [...importing.replace, name] : importing.replace.filter((n) => n !== name) })}
              />
            ))}
            {verdictLine}
            <Group justify="flex-end" gap="xs">
              <Button variant="default" size="xs" onClick={() => setImporting(null)}>Cancel</Button>
              <Button
                size="xs"
                disabled={!candidate || verdict?.text !== candidate || !verdict.ok}
                onClick={() => {
                  if (runEdit(importPlan.edit, undefined, true)) setImporting(null)
                }}
              >
                Import
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
      <Modal opened={extracting !== null} onClose={() => setExtracting(null)} title="Extract subsystem" size="xl">
        {extracting && extraction && (
          <Stack gap="xs" data-testid="extract-preview">
            <Group gap="xs">
              <TextInput size="xs" label="Component name" value={extracting.type} onChange={(e) => setExtracting({ ...extracting, type: e.currentTarget.value })} />
              <TextInput size="xs" label="Instance name" value={extracting.name} onChange={(e) => setExtracting({ ...extracting, name: e.currentTarget.value })} />
            </Group>
            {extraction.blocked.map((b) => (
              <Text key={b} size="sm" c="red">{b}</Text>
            ))}
            <Text size="sm">Moves inside: {extraction.moved.join('; ')}{extraction.internal.length > 0 && `; ${extraction.internal.join('; ')}`}</Text>
            {extraction.ports.length > 0 && (
              <Text size="sm" data-testid="extract-ports">Ports: {extraction.ports.map((p) => `${p.name} (${p.inside.join(', ')} — ${p.outside.join(', ')})`).join('; ')}</Text>
            )}
            {extraction.captures.length > 0 && (
              <Text size="sm" data-testid="extract-captures">Passed in: {extraction.captures.map((c) => `${c.name} = ${c.value}`).join('; ')}</Text>
            )}
            {extraction.references.length > 0 && (
              <Text size="sm" data-testid="extract-references">Re-pointed: {extraction.references.map((r) => `line ${r.line}: ${r.before} → ${r.after}`).join('; ')}</Text>
            )}
            <Text component="pre" size="xs" ff="monospace" m={0} p={6} style={{ background: 'var(--mantine-color-default-hover)', overflowX: 'auto' }} data-testid="extract-definition">
              {`${extraction.definition}\n${extraction.declaration}`}
            </Text>
            {verdictLine}
            <Group justify="flex-end" gap="xs">
              <Button variant="default" size="xs" onClick={() => setExtracting(null)}>Cancel</Button>
              <Button size="xs" onClick={applyExtraction} disabled={!candidate || verdict?.text !== candidate || !verdict.ok}>Extract</Button>
            </Group>
          </Stack>
        )}
      </Modal>
      <Modal opened={deleting !== null} onClose={() => setDeleting(null)} title={deleting?.edit.label} size="lg">
        {deleting && (
          <Stack gap="xs" data-testid="delete-impact">
            {deleting.removed.length > 0 && <Text size="sm">Removes {deleting.removed.length} connection{deleting.removed.length === 1 ? '' : 's'}: {deleting.removed.join('; ')}</Text>}
            {deleting.rewritten.length > 0 && <Text size="sm">Rewrites: {deleting.rewritten.join('; ')}</Text>}
            {deleting.equations.length > 0 && (
              <Text size="sm" c="orange">
                Kept, and reported by Check until you change them: {deleting.equations.map((q) => `line ${q.line}: ${q.text}`).join('; ')}
              </Text>
            )}
            {deleting.removed.length + deleting.rewritten.length + deleting.equations.length === 0 && <Text size="sm">Nothing else refers to it.</Text>}
            <Group justify="flex-end" gap="xs">
              <Button variant="default" size="xs" onClick={() => setDeleting(null)}>Cancel</Button>
              <Button color="red" size="xs" onClick={confirmDelete} data-autofocus>Delete</Button>
            </Group>
          </Stack>
        )}
      </Modal>
      {pasteReport && (
        <Paper withBorder shadow="sm" p="xs" data-testid="paste-report" style={{ position: 'absolute', right: 8, bottom: 8, maxWidth: 420, zIndex: 7 }}>
          <Group justify="space-between" gap={4} wrap="nowrap" align="flex-start">
            <Stack gap={2}>
              <Text size="xs" fw={600}>Pasted {pasteReport.ids.length} component{pasteReport.ids.length === 1 ? '' : 's'}</Text>
              {pasteReport.renames.map(([a, b]) => <Text key={a} size="xs">Renamed {a} → {b} (name taken)</Text>)}
              {pasteReport.added.map((d) => <Text key={d} size="xs">Added definition {d}</Text>)}
              {pasteReport.reused.map((d) => <Text key={d.name} size="xs" c={d.differs ? 'orange' : undefined}>Uses this document's {d.name}{d.differs ? ' — it differs from the copied one' : ''}</Text>)}
              {pasteReport.external.map((x) => <Text key={x} size="xs" c="orange">Not reconnected: {x}</Text>)}
              {pasteReport.missing.length > 0 && <Text size="xs" c="orange">Not defined here: {pasteReport.missing.join(', ')}</Text>}
            </Stack>
            <ActionIcon size="xs" variant="subtle" aria-label="Close paste report" onClick={() => setPasteReport(null)}>×</ActionIcon>
          </Group>
        </Paper>
      )}
    </>
  )

  // COMP-04: one parameter binding, as one undoable source edit.
  const setParam = (inst: InstanceIdentityDto, name: string, value: string): string | null => {
    if (sourceBroken) return 'Fix the source errors first.'
    const edit = setParameter(text, inst, name, value)
    if (!edit) return 'Check again first: the source changed since this block was drawn.'
    return runEdit(edit) ? null : 'The source changed after the last Check; Check again, then retry.'
  }
  // SYNC-04: rename at every reference in the instance's scope, moving its
  // layout keys with it, as one undo step.
  const rename = (inst: InstanceIdentityDto, next: string): string | null => {
    const all = drawnCheck?.instances ?? []
    const problem = sourceBroken ? 'Fix the source errors first.' : renameProblem(inst, next, all)
    if (problem) return problem
    const renames = renamedIds(inst, next, all)
    const done = runEdit(renameInstance(inst, next), (p) => renamePresentation(p, renames))
    if (!done) return 'The source changed after the last Check; Check again, then retry.'
    setPinned(null)
    setSelected(new Set())
    return null
  }
  const revealInstance = (node: SchematicNode) => {
    const line = declarationOf(node)
    if (line !== null) {
      onRevealLine(line)
    }
  }

  const portChoices = useMemo(() => {
    const out: { value: string; label: string }[] = []
    for (const n of layout.nodes) {
      if (n.kind !== 'instance') continue
      for (const p of n.ports) {
        out.push({ value: `${n.id}::${p.port}`, label: `${n.label}.${p.port}` })
      }
    }
    return out
  }, [layout.nodes])

  const endpointOf = (instance: string, port: string): WireEndpoint => {
    const node = layout.nodes.find((n) => n.id === instance)
    return {
      instance,
      port,
      label: node?.label ?? instance,
      type: node?.type,
    }
  }

  const tryConnect = (from: WireEndpoint, to: WireEndpoint) => {
    if (!onEmitStatement) {
      return
    }
    const preview = previewWire(from, to, connections, ports)
    if (!preview.ok) {
      setWireNote(preview.reason)
      setPendingPort(null)
      return
    }
    const statement = connectStatement(from, to)
    const label = `Connect ${endpointRef(from)} to ${endpointRef(to)}`
    if (!onSourceEdit) {
      onEmitStatement(statement)
    } else if (!runEdit({ label, changes: [appendStatement(text, statement)] })) {
      return
    }
    lastEmitted.current = { a: endpointRef(from), b: endpointRef(to) }
    setProvisional({ from, to, check: checkResult })
    setPendingPort(null)
    setSelectFrom(null)
    setSelectTo(null)
    setWireNote(preview.pending ?? 'Connection added; pending Check. Undo removes the statement.')
  }

  const clickPort = (instance: string, port: string) => {
    if (!onEmitStatement) {
      return
    }
    setWireNote(null)
    if (!pendingPort) {
      setPendingPort({ instance, port })
      return
    }
    tryConnect(endpointOf(pendingPort.instance, pendingPort.port), endpointOf(instance, port))
  }

  // Drag from a port and release on another; a release where it began is a click.
  const startWireDrag = (instance: string, port: string, e: React.PointerEvent) => {
    const n = positioned.get(instance)
    const p = n?.ports.find((q) => q.port === port)
    const rect = viewportRef.current?.getBoundingClientRect()
    if (!n || !p || !rect) return
    const a: [number, number] = [n.x + p.dx, n.y + p.dy]
    const at = (ev: PointerEvent): [number, number] => [(ev.clientX - rect.left - view.x) / zoom, (ev.clientY - rect.top - view.y) / zoom]
    const [x0, y0] = [e.clientX, e.clientY]
    let moved = false
    const move = (ev: PointerEvent) => {
      moved ||= Math.abs(ev.clientX - x0) + Math.abs(ev.clientY - y0) > 4
      if (moved) setWireDrag({ from: { instance, port }, a, b: at(ev) })
    }
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      setWireDrag(null)
      const hit = moved ? document.elementFromPoint(ev.clientX, ev.clientY)?.closest('[data-port]')?.getAttribute('data-port') : null
      const dot = hit?.lastIndexOf('.') ?? -1
      if (hit && dot > 0) {
        setWireNote(null)
        tryConnect(endpointOf(instance, port), endpointOf(hit.slice(0, dot), hit.slice(dot + 1)))
      }
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }
  // WIRE-02: while a wire is being drawn, each port says whether it may take it.
  const wireSource = wireDrag?.from ?? pendingPort
  const compatOf = (instance: string, port: string) => {
    if (!wireSource || wireSource.instance === instance) return undefined
    return compatibility(ports.get(`${wireSource.instance}.${wireSource.port}`.toLowerCase()), ports.get(`${instance}.${port}`.toLowerCase())).kind
  }

  useEffect(() => {
    const pending = lastEmitted.current
    if (!pending || !checkResult) {
      return
    }
    if (alreadyConnected(connections, pending.a, pending.b)) {
      setWireNote(`Connected ${pending.a} — ${pending.b}`)
      lastEmitted.current = null
      return
    }
    const msg = checkResult.message ?? ''
    if (/domain|fluid family|connect\(/i.test(msg) && !checkResult.solvable) {
      setWireNote(msg)
      lastEmitted.current = null
    }
  }, [checkResult, connections])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPendingPort(null)
        setWireNote(null)
        setFocus(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  /** Move blocks by per-block drawing-unit deltas, as one workspace update; locked blocks stay. */
  const moveBlocks = (deltas: ReadonlyMap<string, { dx: number; dy: number }>, label = 'Move') => {
    const positions = { ...presRef.current.positions }
    for (const [id, d] of deltas) {
      const n = positioned.get(id)
      if (n && !lockedIds.has(id)) {
        positions[id] = { x: n.x + d.dx, y: n.y + d.dy }
      }
    }
    takeControl()
    updatePres((p) => ({ ...p, positions }), label)
  }
  /** Lock (or unlock) the selection where it is drawn now. */
  const lockSelection = (on: boolean) =>
    updatePres((p) => ({
      ...p,
      positions: on ? { ...p.positions, ...Object.fromEntries(selection.flatMap((id) => { const n = positioned.get(id); return n ? [[id, { x: n.x, y: n.y }]] : [] })) } : p.positions,
      locked: on ? [...new Set([...p.locked, ...selection])] : p.locked.filter((id) => !selection.includes(id)),
    }), on ? 'Lock position' : 'Unlock position')
  const addArea = (label: string) => {
    updatePres((p) => ({ ...p, areas: [...p.areas, { id: `area-${Date.now().toString(36)}`, label, members: selection }] }), `Frame area ${label}`)
    setAreaName(null)
  }
  const removeAreas = () => updatePres((p) => ({ ...p, areas: p.areas.filter((a) => !a.members.some((m) => selection.includes(m))) }), 'Remove area')
  const nudge = (dx: number, dy: number) => moveBlocks(new Map(selection.map((id) => [id, { dx, dy }])), 'Nudge')
  const arrange = (op: ArrangeOp) => moveBlocks(arrangeDeltas(op, selection.flatMap((id) => positioned.get(id) ?? [])), 'Arrange')
  /** Preview handing a scope back to the automatic layout. */
  const previewArrange = (scope: 'selection' | 'circuit' | 'all') => {
    const groups = new Set(selection.map((id) => positioned.get(id)?.group))
    const ids =
      scope === 'all' ? layout.nodes.map((n) => n.id)
        : scope === 'circuit' ? layout.nodes.filter((n) => groups.has(n.group)).map((n) => n.id)
          : selection
    const { presentation, moved } = arrangeBlocks(presRef.current, ids)
    if (moved.length === 0) return setWireNote('Nothing to arrange: those blocks are locked.')
    setArranging({ label: `Arrange ${scope}`, moved, presentation: scope === 'all' ? { ...presentation, legacyOffsets: {} } : presentation })
  }
  const applyArrange = () => {
    if (!arranging) return
    const next = arranging.presentation
    setArranging(null)
    updatePres(() => next, arranging.label)
  }
  const instanceIds = (ids: Iterable<string>) => [...ids].filter((id) => positioned.get(id)?.kind === 'instance')
  const select = (ids: Iterable<string>) => {
    setSelected(new Set(instanceIds(ids)))
    setPinned(null)
  }
  const selectAll = () => select(positioned.keys())
  const selectConnected = () => select(connectedTo(selection, layout.edges))
  // Same domain: every block on a connection of a domain the selection uses.
  const selectDomain = () => {
    const ids = new Set(selection)
    const domains = new Set(layout.edges.filter((e) => ids.has(e.from) || ids.has(e.to)).map((e) => e.domain))
    select(layout.edges.filter((e) => domains.has(e.domain)).flatMap((e) => [e.from, e.to]).concat(selection))
  }
  const clearSelection = () => {
    setSelected(new Set())
    setPinned(null)
  }

  // CFG-05: the drawing as a file or a page, without the editing affordances.
  const [exportOpts, setExportOpts] = useState<ExportOptions | null>(null)
  // While a drawing is captured, blocks render in full, never as name chips.
  const [printing, setPrinting] = useState(false)
  const runContext = [
    variables?.length ? `Solved: ${variables.length} variables` : 'Not solved: no results shown',
    showingPrevious ? 'drawing from the last valid Check (the source has errors)' : null,
    scope ? `inside ${labels.get(scope)?.label ?? scope}` : null,
    `exported ${new Date().toLocaleString()}`,
  ]
    .filter(Boolean)
    .join(' · ')
  const drawingSvg = (o: ExportOptions): { xml: string; w: number; h: number } | null => {
    const box =
      o.region === 'view'
        ? { minX: -view.x / zoom, minY: -view.y / zoom, w: viewport.w / zoom, h: viewport.h / zoom }
        : o.region === 'selection'
          ? boxAround(selection.flatMap((id) => positioned.get(id) ?? []), CHIP_OVERHANG + 5, 20)
          : bounds
    flushSync(() => setPrinting(true))
    const clone = svgRef.current && box ? (svgRef.current.cloneNode(true) as SVGSVGElement) : null
    setPrinting(false)
    if (!clone || !box) return null
    const legend = layout.lines.map((key) => ({ label: lineLabel(key, fluidSpelling), style: styleOf(lineId(key)) }))
    return drawingFile(clone, box, o, { ink, picked: new Set(selection), legend, context: runContext, issues })
  }
  const exportDrawing = async (o: ExportOptions) => {
    const drawing = drawingSvg(o)
    if (!drawing) return setWireNote('Select the blocks to export first.')
    if (o.format === 'svg') return download(new Blob([drawing.xml], { type: 'image/svg+xml' }), 'schematic.svg')
    if (o.format === 'png') {
      const img = new Image()
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(drawing.xml)}`
      await img.decode()
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(drawing.w * o.scale)
      canvas.height = Math.round(drawing.h * o.scale)
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      const blob = await new Promise<Blob | null>((done) => canvas.toBlob(done, 'image/png'))
      return blob ? download(blob, 'schematic.png') : setWireNote('The PNG could not be drawn.')
    }
    // Print through a frame holding only the drawing, so the browser's PDF
    // printer gets the page size asked for and none of the app around it.
    document.querySelector('iframe[data-testid="print-frame"]')?.remove()
    const frame = document.createElement('iframe')
    frame.setAttribute('data-testid', 'print-frame')
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
    document.body.appendChild(frame)
    const page = frame.contentDocument!
    page.open()
    page.write(`<!doctype html><title>Schematic</title><style>@page { size: ${o.page} landscape; margin: 10mm } html, body { margin: 0 } svg { width: 100%; height: auto; max-height: 100vh }</style>${drawing.xml}`)
    page.close()
    frame.contentWindow?.print()
  }
  const toggles = [
    ['legend', 'Legend'],
    ['values', 'Values'],
    ['annotations', 'Annotations'],
    ['context', 'Run context'],
    ['warnings', `Warnings (${issues.length})`],
  ] as const
  const exportDialog = (
    <Modal opened={exportOpts !== null} onClose={() => setExportOpts(null)} title="Export drawing" size="md">
      {exportOpts && (
        <Stack gap="xs" data-testid="export-drawing">
          {(
            [
              ['format', 'Format', [['svg', 'SVG'], ['png', 'PNG'], ['print', 'Print / PDF']]],
              ['region', 'Region', [['model', 'Whole model'], ['view', 'Current view'], ['selection', 'Selection']]],
              ['background', 'Background', [['none', 'None'], ['white', 'White'], ['theme', 'Theme']]],
            ] as const
          ).map(([key, label, choices]) => (
            <div key={key}>
              <Text size="xs" c="dimmed" mb={2}>{label}</Text>
              <SegmentedControl
                size="xs"
                fullWidth
                aria-label={label}
                value={exportOpts[key]}
                onChange={(v) => setExportOpts({ ...exportOpts, [key]: v })}
                data={choices.map(([value, text]) => ({ value, label: text, disabled: value === 'selection' && selection.length === 0 }))}
              />
            </div>
          ))}
          {exportOpts.format === 'png' && (
            <Select size="xs" label="Scale" value={String(exportOpts.scale)} onChange={(v) => setExportOpts({ ...exportOpts, scale: Number(v ?? 2) })} data={['1', '2', '4'].map((k) => ({ value: k, label: `${k}×` }))} allowDeselect={false} />
          )}
          {exportOpts.format === 'print' && (
            <Select size="xs" label="Page" value={exportOpts.page} onChange={(v) => setExportOpts({ ...exportOpts, page: (v ?? 'A4') as ExportOptions['page'] })} data={['A4', 'Letter']} allowDeselect={false} />
          )}
          <Group gap="sm">
            {toggles.map(([key, label]) => (
              <Checkbox key={key} size="xs" label={label} checked={exportOpts[key]} onChange={(e) => setExportOpts({ ...exportOpts, [key]: e.currentTarget.checked })} />
            ))}
          </Group>
          {exportOpts.context && <Text size="xs" c="dimmed">{runContext}</Text>}
          <Group justify="flex-end" gap="xs">
            <Button variant="default" size="xs" onClick={() => setExportOpts(null)}>Cancel</Button>
            <Button
              size="xs"
              onClick={() => {
                const o = exportOpts
                setExportOpts(null)
                void exportDrawing(o)
              }}
            >
              Export
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  )

  /**
   * Place dragged blocks at their start positions plus the pointer's travel. The
   * dragged group's box lands on an alignment guide when one is within reach,
   * otherwise on the grid when snapping is on — per axis.
   */
  const dragTo = (ids: readonly string[], start: Positions, dx: number, dy: number) => {
    const box = boxAround(
      ids.flatMap((id) => {
        const n = positioned.get(id)
        return n && start[id] ? [{ ...n, x: start[id].x + dx, y: start[id].y + dy }] : []
      }),
    )
    if (box) {
      const others = placed.filter((n) => n.kind === 'instance' && !ids.includes(n.id))
      const g = settings.guides
        ? guideSnap({ x: box.minX, y: box.minY, w: box.w, h: box.h }, others, GUIDE_PX / zoom)
        : { dx: 0, dy: 0, xs: [], ys: [] }
      const grid = (v: number) => (settings.snap ? snapToGrid(v, settings.grid) - v : 0)
      dx += g.xs.length > 0 ? g.dx : grid(box.minX)
      dy += g.ys.length > 0 ? g.dy : grid(box.minY)
      setGuides(g.xs.length + g.ys.length > 0 ? { xs: g.xs, ys: g.ys } : null)
    }
    dragBefore.current ??= presRef.current
    const positions = { ...presRef.current.positions }
    for (const id of ids) {
      if (start[id]) {
        positions[id] = { x: start[id].x + dx, y: start[id].y + dy }
      }
    }
    applyPres({ ...presRef.current, positions })
  }
  // A drag is one undo step, from its first move to its release.
  const dragBefore = useRef<SchematicPresentation | null>(null)
  const recordRef = useRef(record)
  useEffect(() => {
    recordRef.current = record
  })
  const endDrag = useCallback(() => {
    setGuides(null)
    commit()
    if (dragBefore.current) {
      recordRef.current({ label: 'Move', pres: [dragBefore.current, presRef.current] })
      dragBefore.current = null
    }
  }, [commit])
  const drag = useDragging(zoom, dragTo, setView, endDrag, takeControl, clearSelection)
  // Shift+drag on empty canvas: a marquee, in viewport pixels, adding every
  // block it touches to the selection.
  const [marquee, setMarquee] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null)
  const marqueeRef = useRef(marquee)
  const marqueeOn = marquee !== null
  useEffect(() => {
    const el = viewportRef.current
    if (!marqueeOn || !el) {
      return
    }
    const local = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      return { x: e.clientX - r.left, y: e.clientY - r.top }
    }
    const move = (e: PointerEvent) => {
      const p = local(e)
      marqueeRef.current = marqueeRef.current && { ...marqueeRef.current, x1: p.x, y1: p.y }
      setMarquee(marqueeRef.current)
    }
    const up = () => {
      const m = marqueeRef.current
      marqueeRef.current = null
      setMarquee(null)
      if (!m) {
        return
      }
      const [x0, x1] = [Math.min(m.x0, m.x1), Math.max(m.x0, m.x1)].map((x) => (x - view.x) / view.zoom)
      const [y0, y1] = [Math.min(m.y0, m.y1), Math.max(m.y0, m.y1)].map((y) => (y - view.y) / view.zoom)
      const hit = placed.filter((n) => n.kind === 'instance' && n.x < x1 && n.x + n.w > x0 && n.y < y1 && n.y + n.h > y0)
      setSelected((cur) => new Set([...cur, ...hit.map((n) => n.id)]))
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }, [marqueeOn, view, placed])
  usePanZoom(viewportRef, drawn, zoomBy, setView, takeControl, drag.cancel)

  // The background doubles its pitch until it stays at least 8 px apart.
  let pitch = settings.grid
  while (pitch * zoom < 8) {
    pitch *= 2
  }

  const active = pinned ?? hovered
  const activeNode = active ? positioned.get(active) : undefined
  const activeReadout = active ? readouts.get(active) : undefined
  /** The block a variable belongs to — the longest instance path it starts with — and the port after it. */
  const ownerOf = (name: string) => {
    let block = ''
    for (const i of drawnCheck?.instances ?? []) {
      const id = i.name.toLowerCase()
      if (name.startsWith(`${id}.`) && id.length > block.length) block = id
    }
    const port = block ? name.slice(block.length + 1).split('.')[0] : ''
    return block ? { block, port: portsByInstance.get(block)?.some((p) => p.toLowerCase() === port) ? port : null } : null
  }
  /** The fluid a variable's stream carries, from the wire at its port or its shared stream. */
  const fluidOf = (name: string) => {
    const owner = ownerOf(name)
    const alias = name.split('.')[0]
    const e = layout.edges.find((x) => (owner?.port ? (x.from === owner.block && x.fromPort === owner.port) || (x.to === owner.block && x.toPort === owner.port) : x.fromStream?.toLowerCase() === alias))
    return e?.domain.toLowerCase() === 'fluid' ? (e.fluid ?? null) : null
  }
  // RUN-06: the card's handoff, with the fluid filled in for a stream's state.
  const cardHandoff: Handoff | undefined = handoff && {
    reason: (kind, name) => (kind === 'state' && !fluidOf(name.toLowerCase()) ? 'Not a fluid stream with a named fluid.' : handoff.reason(kind, name)),
    run: (kind, name) => handoff.run(kind, name, fluidOf(name.toLowerCase()) ?? undefined),
  }
  /** A block's badge: the variable chosen for it while the solve still reports it, else the automatic one. */
  const badgeOf = (n: SchematicNode) => {
    const r = readouts.get(n.id) ?? { ports: [], outputs: [], params: [] }
    const want = badges[n.id]
    const chosen = want ? readingsOf(r).find((x) => x.name.toLowerCase() === want) : undefined
    const b = chosen ?? badgeFor(n, r)
    return b ? { ...b, format: formats[b.name.toLowerCase()] } : null
  }

  // Hooks stay above the empty-canvas return. The palette reaches whichever
  // handlers this render defined; an empty canvas offers only placement.
  const commands = useRef<Partial<Record<CanvasCommand, () => void>>>({})
  useEffect(() => {
    for (const c of CANVAS_COMMANDS) canvasHandlers[c.id] = () => commands.current[c.id]?.()
    return () => {
      for (const c of CANVAS_COMMANDS) delete canvasHandlers[c.id]
    }
  }, [])
  useEffect(() => {
    // The full set only once the render got past the empty-canvas return.
    commands.current = drawn
      ? {
          add: () => openQuickAdd(),
          list: () => setListOpen((o) => !o),
          search: () => setSearchOpen(true),
          fit,
          'fit-selection': fitSelection,
          'select-all': selectAll,
          duplicate: () => pasteHere(fragmentOf(), 'Duplicate'),
          copy: () => void copySelection(),
          cut: () => copySelection() && requestDelete(),
          paste: () => pasteHere(loadFragment(), 'Paste'),
          delete: () => requestDelete(),
          undo: () => replay('undo'),
          redo: () => replay('redo'),
          arrange: () => previewArrange('all'),
          extract: startExtract,
          tree: () => setTreeOpen(true),
          export: () => setExportOpts({ ...EXPORT_DEFAULTS, region: selection.length > 0 ? 'selection' : 'model' }),
        }
      : { add: () => openQuickAdd(), paste: () => pasteHere(loadFragment(), 'Paste') }
  })
  // Announce a new canvas note or Check result as it arrives.
  const [heard, setHeard] = useState({ note: wireNote, check: checkResult })
  if (heard.note !== wireNote || heard.check !== checkResult) {
    setHeard({ note: wireNote, check: checkResult })
    if (heard.note !== wireNote && wireNote) setAnnouncement(wireNote)
    else if (heard.check !== checkResult && checkResult) setAnnouncement(`Check: ${checkResult.message}`)
  }
  if (!drawn && (drawnCheck?.variables?.length ?? 0) > 0) {
    return (
      <Stack gap="sm" p="md" h="100%" style={{ overflowY: 'auto' }} data-testid="equation-view">
        <Text size="sm" c="dimmed" maw={560}>
          This model is equations only: it declares no components, so there is no physical network to draw. Its variables and how the solve's blocks depend on each other are below.
        </Text>
        {onSourceEdit && (
          <Group gap="xs">
            <Button size="xs" variant="light" leftSection={<IconPlus size={14} />} onClick={() => openQuickAdd()}>
              Add component
            </Button>
            <Button size="xs" variant="subtle" onClick={() => pasteHere(loadFragment(), 'Paste')}>
              Paste
            </Button>
          </Group>
        )}
        {pinnedCards.length > 0 && (
          <Stack gap={4} data-testid="variable-cards" role="region" aria-label="Variable cards">
            <Text size="xs" fw={600}>
              Cards
            </Text>
            <Group gap="xs">
              {pinnedCards.map((a) => {
                const body = annotationBody(a)
                return (
                  <Paper key={a.id} withBorder p={6} data-broken={body.broken || undefined} aria-label={`card: ${body.lines.join(', ')}`} style={body.broken ? { borderColor: '#fa5252', borderStyle: 'dashed' } : undefined}>
                    <Group gap={6} wrap="nowrap">
                      <Stack gap={0}>
                        <Text size="xs" fw={600}>
                          {body.lines[0]}
                        </Text>
                        <Text size="xs" ff="monospace" c={body.broken ? 'red' : undefined}>
                          {body.lines[1]}
                        </Text>
                      </Stack>
                      <ActionIcon size="xs" variant="subtle" color="gray" aria-label={`Remove card ${a.target}`} onClick={() => togglePin(a.target)}>
                        <IconTrash size={12} />
                      </ActionIcon>
                    </Group>
                  </Paper>
                )
              })}
            </Group>
          </Stack>
        )}
        {blocks?.length ? (
          <DependencyView blocks={blocks} links={links} ink={ink} valueOf={readingText} pinned={new Set(pinnedCards.map((a) => a.target))} onPin={togglePin} onLine={(eq) => {
            const line = lineOfEquation(text, eq)
            if (line !== null) onRevealLine(line)
          }} />
        ) : (
          <Stack gap={4}>
            <Text size="xs" c="dimmed">
              Solve to see how the equations depend on each other. Variables Check found:
            </Text>
            <Group gap={4}>
              {(drawnCheck?.variables ?? []).map((v) => (
                <Button key={v} size="compact-xs" variant={pinnedCards.some((a) => a.target === v.toLowerCase()) ? 'light' : 'default'} onClick={() => togglePin(v.toLowerCase())}>
                  {v}
                </Button>
              ))}
            </Group>
          </Stack>
        )}
        {adding}
        {editing}
      </Stack>
    )
  }

  if (!drawn) {
    return (
      <Stack gap="xs" p="md" align="center" justify="center" h="100%">
        <Text size="sm" c="dimmed" ta="center" maw={430}>
          No component network to draw. Instantiate components and wire them — with
          <Text span ff="monospace" size="sm">{' connect(a.out, b.in) '}</Text>
          or by sharing a stream name — then press Check.
        </Text>
        {onSourceEdit && (
          <Button size="xs" variant="light" leftSection={<IconPlus size={14} />} onClick={() => openQuickAdd()}>
            Add component
          </Button>
        )}
        {onSourceEdit && (
          <Button size="xs" variant="subtle" onClick={() => pasteHere(loadFragment(), 'Paste')}>
            Paste
          </Button>
        )}
        {adding}
        {editing}
      </Stack>
    )
  }

  const listNodes = layout.nodes.filter((n) => n.kind === 'instance')

  return (
    <Stack gap={4} h="100%" style={{ minHeight: 0, position: 'relative' }}>
      <Group gap="xs" px="xs" pt={4} wrap="wrap" data-schematic-toolbar>
        {layout.lines.map((key) => {
          const id = lineId(key)
          const style = styleOf(id)
          return (
            <Group key={id} gap={4}>
              <svg width={26} height={6} aria-hidden>
                <line x1={1} y1={3} x2={25} y2={3} stroke={style.color} strokeWidth={style.width} strokeDasharray={style.dash} strokeLinecap={style.cap} />
              </svg>
              <Text size="xs" c="dimmed">
                {lineLabel(key, fluidSpelling)}
              </Text>
            </Group>
          )
        })}
        <Badge size="xs" variant="light" color="gray">
          {layout.nodes.filter((n) => n.kind === 'instance').length} components
        </Badge>
        {(nested || scope) && (
          <Group gap={2} wrap="nowrap" data-testid="scope-bar">
            <ActionIcon size="sm" variant="subtle" color="gray" aria-label="Back" disabled={scopes.at === 0} onClick={() => showScope(scopes.list, scopes.at - 1)}>
              ‹
            </ActionIcon>
            <ActionIcon size="sm" variant="subtle" color="gray" aria-label="Forward" disabled={scopes.at >= scopes.list.length - 1} onClick={() => showScope(scopes.list, scopes.at + 1)}>
              ›
            </ActionIcon>
            <nav aria-label="Breadcrumbs">
              <Group gap={0} wrap="nowrap">
                {['', ...scope.split('.').map((_, k, parts) => parts.slice(0, k + 1).join('.')).filter(Boolean)].map((path, k) => (
                  <Group key={path} gap={0} wrap="nowrap">
                    {k > 0 && <Text size="xs" c="dimmed">›</Text>}
                    <Button size="compact-xs" variant="subtle" color={path === scope ? 'dark' : 'gray'} aria-current={path === scope ? 'location' : undefined} onClick={() => openScope(path)}>
                      {path ? `${labels.get(path)?.label ?? path} (${written(labels.get(path)?.type ?? '')})` : 'Model'}
                    </Button>
                  </Group>
                ))}
              </Group>
            </nav>
            <Popover opened={treeOpen} onChange={setTreeOpen} position="bottom-start" withinPortal shadow="md">
              <Popover.Target>
                <Button size="compact-xs" variant="subtle" color="gray" onClick={() => setTreeOpen((o) => !o)}>
                  Model tree
                </Button>
              </Popover.Target>
              <Popover.Dropdown p={6}>
                <Stack gap={2} w={280} mah={360} style={{ overflowY: 'auto' }} data-testid="model-tree">
                  <TextInput size="xs" placeholder="Find a block" aria-label="Find a block" value={treeQuery} onChange={(e) => setTreeQuery(e.currentTarget.value)} data-autofocus />
                  {tree
                    .filter((r) => !treeQuery.trim() || `${r.label} ${r.type}`.toLowerCase().includes(treeQuery.trim().toLowerCase()))
                    .map((r) => (
                      <Button
                        key={r.id}
                        size="compact-xs"
                        variant={r.id === scope ? 'light' : 'subtle'}
                        color="gray"
                        justify="flex-start"
                        pl={6 + r.depth * 14}
                        aria-label={`${r.open ? 'Open' : 'Show'} ${r.id.split('.').map((_, k, parts) => labels.get(parts.slice(0, k + 1).join('.'))?.label ?? parts[k]).join(' › ')}`}
                        onClick={() => {
                          setTreeOpen(false)
                          if (r.open) return openScope(r.id)
                          openScope(scopeOf(r.id))
                          setSelected(new Set([r.id]))
                        }}
                        rightSection={r.hidden > 0 ? <Badge size="xs" color="orange" variant="light">{r.hidden} inside</Badge> : undefined}
                      >
                        {r.open ? '▸ ' : ''}
                        {r.label} <Text span size="xs" c="dimmed" ml={4}>{r.type}</Text>
                      </Button>
                    ))}
                </Stack>
              </Popover.Dropdown>
            </Popover>
            {scope && (
              <Button
                size="compact-xs"
                variant="subtle"
                onClick={() => {
                  const type = drawnCheck?.instances?.find((i) => i.name.toLowerCase() === scope)?.type.toLowerCase()
                  const line = drawnCheck?.definitions?.find((d) => d.name === type)?.line
                  if (line) onRevealLine(line)
                }}
              >
                Open definition
              </Button>
            )}
            {scope && onSourceEdit && (
              <Button
                size="compact-xs"
                variant="subtle"
                onClick={() => {
                  const type = drawnCheck?.instances?.find((i) => i.name.toLowerCase() === scope)?.type
                  if (type) setIface({ type: written(type), change: null, names: {}, add: '' })
                }}
              >
                Interface…
              </Button>
            )}
          </Group>
        )}
        {onEmitStatement && pendingPort && (
          <Badge size="xs" variant="filled" color="teal">
            wiring from {pendingPort.instance}.{pendingPort.port} — pick a second port (Esc cancels)
          </Badge>
        )}
        {onEmitStatement && !pendingPort && wireNote && (
          <Text size="xs" c="dimmed" maw={520}>
            {wireNote}
          </Text>
        )}
        {sourceBroken && (
          <Group gap={6} wrap="nowrap" data-testid="schematic-previous">
            <Text size="xs" c="orange">
              Source has errors; showing previous model
            </Text>
            {errorLine !== null && (
              <Button size="compact-xs" variant="subtle" color="orange" onClick={() => onRevealLine(errorLine)}>
                Go to error (line {errorLine})
              </Button>
            )}
          </Group>
        )}
        {fix && (
          <Group gap={6} wrap="nowrap" data-testid="schematic-fix">
            <Tooltip
              label={
                <Text component="pre" size="xs" style={{ margin: 0 }}>
                  {fix.changes.map((c) => `- ${text.slice(c.from, c.to)}\n+ ${c.insert}`).join('\n')}
                </Text>
              }
            >
              <Text size="xs">Fix: {fix.label}</Text>
            </Tooltip>
            <Button size="compact-xs" variant="light" color="orange" onClick={() => runEdit(fix)}>
              Apply fix
            </Button>
          </Group>
        )}
        {showingPrevious && !sourceBroken && (
          <Text size="xs" c="dimmed" data-testid="schematic-previous">
            edited — showing the last checked model
          </Text>
        )}
        {topologyMissing && (checkResult ? (
          <Text size="xs" c="orange">
            connections not shown — the document has errors; fix them and Check
          </Text>
        ) : (
          <Text size="xs" c="dimmed">
            connections appear after Check
          </Text>
        ))}
        {onEmitStatement && (
          <Group gap={6} wrap="nowrap">
            <Select
              size="xs"
              placeholder="From port"
              data={portChoices}
              value={selectFrom}
              onChange={setSelectFrom}
              searchable
              w={160}
              aria-label="Connect from port"
            />
            <Select
              size="xs"
              placeholder="To port"
              data={portChoices}
              value={selectTo}
              onChange={setSelectTo}
              searchable
              w={160}
              aria-label="Connect to port"
            />
            <Button
              size="compact-xs"
              disabled={!selectFrom || !selectTo}
              onClick={() => {
                const a = parseChoice(selectFrom)
                const b = parseChoice(selectTo)
                if (a && b) tryConnect(endpointOf(a.instance, a.port), endpointOf(b.instance, b.port))
              }}
            >
              Connect
            </Button>
          </Group>
        )}
        {areaName !== null && (
          <Group gap={4} wrap="nowrap">
            <TextInput
              size="xs"
              value={areaName}
              onChange={(e) => setAreaName(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && areaName.trim()) addArea(areaName.trim())
                if (e.key === 'Escape') setAreaName(null)
              }}
              w={150}
              aria-label="Area name"
              data-autofocus
              autoFocus
            />
            <Button size="compact-xs" disabled={!areaName.trim()} onClick={() => addArea(areaName.trim())}>
              Add area
            </Button>
            <Button size="compact-xs" variant="subtle" color="gray" onClick={() => setAreaName(null)}>
              Cancel
            </Button>
          </Group>
        )}
        {arranging && (
          <Group gap={6} wrap="nowrap" data-testid="arrange-preview">
            <Text size="xs" c="yellow">
              Preview: {arranging.label} moves {arranging.moved.length} block{arranging.moved.length === 1 ? '' : 's'}{pres.locked.length ? '; locked ones stay' : ''}
            </Text>
            <Button size="compact-xs" onClick={applyArrange}>Apply</Button>
            <Button size="compact-xs" variant="subtle" color="gray" onClick={() => setArranging(null)}>Cancel</Button>
          </Group>
        )}
        {routeConflicts.size > 0 && (
          <Text size="xs" c="orange" data-testid="route-conflict">
            {[...routeConflicts].map(([id, blocks]) => `${edgeTitle(layout.edges.find((e) => e.id === id)!)} runs through ${blocks.map((b) => labels.get(b)?.label ?? b).join(', ')}`).join('; ')}
            {' '}— drag a segment clear, or unlock and reset the route
          </Text>
        )}
        {unresolved > 0 && (
          <Text size="xs" c="orange">
            {unresolved} saved block position{unresolved === 1 ? '' : 's'} from an older file match no block; kept in the project for recovery
          </Text>
        )}
        <Group gap={2} ml="auto">
          {issues.length > 0 && (
            <Menu position="bottom-end" withinPortal>
              <Menu.Target>
                <Button
                  size="compact-xs"
                  variant="light"
                  color={issues.some((i) => i.severity === 'error') ? 'red' : 'orange'}
                  aria-label={`${issues.length} issues`}
                  data-testid="schematic-issues"
                >
                  {issues.length} {issues.length === 1 ? 'issue' : 'issues'}
                </Button>
              </Menu.Target>
              <Menu.Dropdown mah={360} style={{ overflowY: 'auto' }}>
                <SegmentedControl
                  size="xs"
                  fullWidth
                  value={issueFilter}
                  onChange={(v) => setIssueFilter(v as typeof issueFilter)}
                  data={[
                    { value: 'all', label: 'All' },
                    { value: 'error', label: 'Errors' },
                    { value: 'warning', label: 'Warnings' },
                  ]}
                />
                {issues
                  .filter((i) => issueFilter === 'all' || i.severity === issueFilter)
                  .map((i) => (
                    <Menu.Item
                      key={`${i.severity}:${i.line ?? ""}:${i.text}`}
                      color={i.severity === 'error' ? 'red' : undefined}
                      disabled={i.line === undefined && i.instance === undefined}
                      onClick={() => {
                        if (i.line !== undefined) onRevealLine(i.line)
                        const id = i.instance && [...positioned.keys()].find((n) => n.toLowerCase() === i.instance!.toLowerCase())
                        if (id) {
                          select([id])
                          setPinned(id)
                        }
                      }}
                    >
                      {i.line !== undefined ? `Line ${i.line}: ` : ''}
                      {i.text}
                    </Menu.Item>
                  ))}
              </Menu.Dropdown>
            </Menu>
          )}
          {selection.length > 1 && (
            <Badge size="xs" variant="light" color="yellow" mr={4}>
              {selection.length} selected
            </Badge>
          )}
          <Popover position="bottom-end" withinPortal shadow="md">
            <Popover.Target>
              <Button size="compact-xs" variant={metric || overlaySet.arrows ? 'light' : 'subtle'} color="gray">
                Overlay
              </Button>
            </Popover.Target>
            <Popover.Dropdown p={8}>
              <Stack gap={6} w={220} data-testid="overlay-settings">
                <Select
                  size="xs"
                  label="Colour wires by"
                  data={[{ value: '', label: 'Nothing' }, ...metrics.map((m) => ({ value: m.key, label: `${m.label} [${m.units || '-'}]` }))]}
                  value={metric?.key ?? ''}
                  onChange={(v) => setOverlay({ metric: v ?? '' })}
                  comboboxProps={{ withinPortal: false }}
                />
                <Switch size="xs" label="Measured flow arrows" checked={overlaySet.arrows} onChange={(e) => setOverlay({ arrows: e.currentTarget.checked })} />
                {metrics.length === 0 && (
                  <Text size="xs" c="dimmed">
                    Solve to colour wires by a result.
                  </Text>
                )}
              </Stack>
            </Popover.Dropdown>
          </Popover>
          <Menu position="bottom-end" withinPortal>
            <Menu.Target>
              <Button size="compact-xs" variant="subtle" color="gray">
                Annotate
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item onClick={() => annotate('note')}>Note</Menu.Item>
              <Menu.Item
                disabled={!(selection.length === 1 && positioned.has(selection[0]))}
                onClick={() => {
                  const n = positioned.get(selection[0])!
                  annotate('callout', selection[0], { x: n.x + n.w + 30, y: n.y - 50 })
                }}
              >
                {selection.length === 1 && positioned.has(selection[0]) ? `Callout to ${positioned.get(selection[0])!.label}` : 'Callout — select one block first'}
              </Menu.Item>
              <Menu.Item disabled={legendRows.length === 0} onClick={() => annotate('legend')}>
                Legend
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
          <Popover position="bottom-end" withinPortal shadow="md">
            <Popover.Target>
              <Button size="compact-xs" variant="subtle" color="gray">
                Views
              </Button>
            </Popover.Target>
            <Popover.Dropdown p={8}>
              <Stack gap={6} w={240} data-testid="views">
                <Text size="xs" fw={600}>Presets</Text>
                <Group gap={4}>
                  {(['names', 'engineering', 'debug', 'presentation'] as ViewPreset[]).map((k) => (
                    <Button key={k} size="compact-xs" variant="default" onClick={() => updatePres((p) => applyPreset(p, k), `Apply ${k} preset`)}>
                      {k[0].toUpperCase() + k.slice(1)}
                    </Button>
                  ))}
                </Group>
                <Text size="xs" fw={600}>Saved views</Text>
                {savedViews.length === 0 && (
                  <Text size="xs" c="dimmed">
                    None yet.
                  </Text>
                )}
                {savedViews.map((v) => (
                  <Group key={v.name} gap={4} wrap="nowrap">
                    <Button size="compact-xs" variant="subtle" color="gray" justify="flex-start" style={{ flex: 1 }} disabled={viewGone(v)} title={viewGone(v) ? 'What it looked at is no longer in the model.' : undefined} onClick={() => applyView(v)}>
                      {v.name}
                    </Button>
                    <ActionIcon size="xs" variant="subtle" color="gray" aria-label={`Delete view ${v.name}`} onClick={() => updatePres((p) => ({ ...p, views: (p.views ?? []).filter((x) => x.name !== v.name) }), `Delete view ${v.name}`)}>
                      <IconTrash size={12} />
                    </ActionIcon>
                  </Group>
                ))}
                <Group gap={4} wrap="nowrap">
                  <TextInput size="xs" style={{ flex: 1 }} placeholder="Name this view" aria-label="View name" maxLength={60} value={viewName} onChange={(e) => setViewName(e.currentTarget.value)} />
                  <Button
                    size="compact-xs"
                    disabled={!viewName.trim()}
                    onClick={() => {
                      saveView(viewName.trim())
                      setViewName('')
                    }}
                  >
                    Save
                  </Button>
                </Group>
              </Stack>
            </Popover.Dropdown>
          </Popover>
          <Popover opened={searchOpen} onChange={setSearchOpen} position="bottom-end" withinPortal shadow="md">
            <Popover.Target>
              <Button size="compact-xs" variant={searchOpen ? 'light' : 'subtle'} color="gray" onClick={() => setSearchOpen((o) => !o)}>
                Search
              </Button>
            </Popover.Target>
            <Popover.Dropdown p={6}>
              <Stack gap={2} w={340} mah={420} style={{ overflowY: 'auto' }} data-testid="model-search">
                <TextInput
                  size="xs"
                  placeholder="Block, type, port, net, parameter, equation, issue"
                  aria-label="Search the model"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.currentTarget.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && hits[0]) goTo(hits[0])
                  }}
                  data-autofocus
                />
                {searchQuery.trim() && hits.length === 0 && (
                  <Text size="xs" c="dimmed" px={4}>
                    Nothing matches.
                  </Text>
                )}
                {hits.map((h) => (
                  <Button key={`${h.kind}|${h.label}|${h.detail}|${h.line}`} size="compact-xs" variant="subtle" color="gray" justify="flex-start" h="auto" py={2} aria-label={`${h.kind} ${h.label} ${h.detail}`} onClick={() => goTo(h)}>
                    <Stack gap={0} align="flex-start">
                      <Text size="xs" truncate maw={300}>
                        <Text span size="xs" c="dimmed" mr={6}>{h.kind}</Text>
                        {h.label}
                      </Text>
                      <Text size="10px" c="dimmed">{h.detail}</Text>
                    </Stack>
                  </Button>
                ))}
              </Stack>
            </Popover.Dropdown>
          </Popover>
          <Button size="compact-xs" variant={listOpen ? 'light' : 'subtle'} color="gray" aria-pressed={listOpen} onClick={() => setListOpen((o) => !o)}>
            List
          </Button>
          {onSourceEdit && (
            <Menu position="bottom-end" withinPortal>
              <Menu.Target>
                <Button size="compact-xs" variant="subtle" color="gray" aria-label="Edit components">
                  Edit
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item onClick={() => pasteHere(fragmentOf(), 'Duplicate')} disabled={selection.length === 0} rightSection={<Kbd size="xs">Ctrl D</Kbd>}>Duplicate</Menu.Item>
                <Menu.Item onClick={copySelection} disabled={selection.length === 0} rightSection={<Kbd size="xs">Ctrl C</Kbd>}>Copy</Menu.Item>
                <Menu.Item onClick={() => copySelection() && requestDelete()} disabled={selection.length === 0} rightSection={<Kbd size="xs">Ctrl X</Kbd>}>Cut</Menu.Item>
                <Menu.Item onClick={() => pasteHere(loadFragment(), 'Paste')} rightSection={<Kbd size="xs">Ctrl V</Kbd>}>Paste</Menu.Item>
                <Menu.Item onClick={startExtract} disabled={selection.length === 0}>Extract subsystem…</Menu.Item>
                <Menu.Item onClick={() => exportType && setExporting({ type: exportType, description: '' })} disabled={!exportType}>Export component…</Menu.Item>
                <Menu.Item onClick={() => importInput.current?.click()}>Import components…</Menu.Item>
                <Menu.Divider />
                <Menu.Item color="red" onClick={() => requestDelete()} disabled={selection.length === 0} rightSection={<Kbd size="xs">Del</Kbd>}>Delete…</Menu.Item>
              </Menu.Dropdown>
            </Menu>
          )}
          <Menu position="bottom-end" withinPortal>
            <Menu.Target>
              <Button size="compact-xs" variant="subtle" color="gray">
                Select
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>Shift+click or Shift+drag adds</Menu.Label>
              <Menu.Item onClick={selectAll} rightSection={<Kbd size="xs">Ctrl A</Kbd>}>
                All
              </Menu.Item>
              <Menu.Item onClick={selectConnected} disabled={selection.length === 0}>
                Connected
              </Menu.Item>
              <Menu.Item onClick={selectDomain} disabled={selection.length === 0}>
                Same domain
              </Menu.Item>
              <Menu.Item onClick={clearSelection} disabled={selection.length === 0} rightSection={<Kbd size="xs">Esc</Kbd>}>
                None
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
          <Menu position="bottom-end" withinPortal>
            <Menu.Target>
              <Button size="compact-xs" variant="subtle" color="gray">
                Arrange
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item onClick={() => previewArrange('selection')} disabled={selection.length === 0}>Arrange selection</Menu.Item>
              <Menu.Item onClick={() => previewArrange('circuit')} disabled={selection.length === 0}>Arrange circuit</Menu.Item>
              <Menu.Item onClick={() => previewArrange('all')}>Arrange all</Menu.Item>
              <Menu.Divider />
              {ARRANGE_ITEMS.map((item) =>
                item === null ? (
                  <Menu.Divider key="divider" />
                ) : (
                  <Menu.Item
                    key={item.op}
                    onClick={() => arrange(item.op)}
                    disabled={selection.length < (item.op.startsWith('spread') ? 3 : 2)}
                  >
                    {item.label}
                  </Menu.Item>
                )
              )}
              <Menu.Divider />
              {selection.length > 0 && selection.every((id) => lockedIds.has(id)) ? (
                <Menu.Item onClick={() => lockSelection(false)}>Unlock position</Menu.Item>
              ) : (
                <Menu.Item onClick={() => lockSelection(true)} disabled={selection.length === 0}>Lock position</Menu.Item>
              )}
              <Menu.Item onClick={() => setAreaName(`Area ${pres.areas.length + 1}`)} disabled={selection.length === 0}>Frame as area…</Menu.Item>
              <Menu.Item onClick={removeAreas} disabled={!pres.areas.some((a) => a.members.some((m) => selection.includes(m)))}>
                Remove area
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
          <Popover position="bottom-end" withinPortal shadow="md">
            <Popover.Target>
              <ActionIcon size="sm" variant="subtle" aria-label="View settings" title="View settings">
                <IconAdjustments size={15} />
              </ActionIcon>
            </Popover.Target>
            <Popover.Dropdown>
              <Stack gap={6} w={270}>
                {VIEW_CHOICES.map((c) => (
                  <div key={c.key}>
                    <Text size="xs" c="dimmed" mb={2}>
                      {c.label}
                    </Text>
                    <SegmentedControl
                      size="xs"
                      fullWidth
                      aria-label={c.label}
                      value={String(settings[c.key])}
                      data={c.data.map(([value, label]) => ({ value, label }))}
                      onChange={(v) => setSettings((s) => ({ ...s, [c.key]: c.key === 'grid' ? Number(v) : v }) as ViewSettings)}
                    />
                  </div>
                ))}
                <Switch size="xs" label="Snap to grid" checked={settings.snap} onChange={(e) => toggle('snap', e.currentTarget.checked)} />
                <Switch size="xs" label="Alignment guides" checked={settings.guides} onChange={(e) => toggle('guides', e.currentTarget.checked)} />
                <Switch size="xs" label="Port names" checked={settings.portLabels} onChange={(e) => toggle('portLabels', e.currentTarget.checked)} />
              </Stack>
            </Popover.Dropdown>
          </Popover>
          <Tooltip label="Zoom out">
            <ActionIcon size="sm" variant="subtle" aria-label="Zoom out" onClick={() => zoomBy(1 / 1.25)}>
              <IconZoomOut size={15} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Zoom in">
            <ActionIcon size="sm" variant="subtle" aria-label="Zoom in" onClick={() => zoomBy(1.25)}>
              <IconZoomIn size={15} />
            </ActionIcon>
          </Tooltip>
          <Menu position="bottom-end" withinPortal>
            <Menu.Target>
              <Button size="compact-xs" variant="subtle" color="gray" aria-label="Zoom level" miw={48}>
                {Math.round(zoom * 100)}%
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item onClick={fit} rightSection={<Kbd size="xs">⇧1</Kbd>}>Fit all</Menu.Item>
              <Menu.Item onClick={fitSelection} disabled={selection.length === 0} rightSection={<Kbd size="xs">⇧2</Kbd>}>
                Fit selection
              </Menu.Item>
              <Menu.Divider />
              {[0.5, 1, 2].map((z) => (
                <Menu.Item
                  key={z}
                  onClick={() => zoomBy(z / zoom)}
                  rightSection={z === 1 ? <Kbd size="xs">⇧0</Kbd> : undefined}
                >
                  {z * 100}%
                </Menu.Item>
              ))}
            </Menu.Dropdown>
          </Menu>
          <Tooltip label={history.done.length ? `Undo ${history.done.at(-1)!.label} (Ctrl+Z)` : 'Nothing to undo'}>
            <ActionIcon size="sm" variant="subtle" aria-label="Undo" disabled={!history.done.length} onClick={() => replay('undo')}>
              <IconArrowBackUp size={15} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label={history.undone.length ? `Redo ${history.undone.at(-1)!.label} (Ctrl+Shift+Z)` : 'Nothing to redo'}>
            <ActionIcon size="sm" variant="subtle" aria-label="Redo" disabled={!history.undone.length} onClick={() => replay('redo')}>
              <IconArrowForwardUp size={15} />
            </ActionIcon>
          </Tooltip>
          {onSourceEdit && !sourceBroken && (
            <Tooltip label="Add component (A, or double-click the canvas)">
              <ActionIcon size="sm" variant="subtle" aria-label="Add component" onClick={() => openQuickAdd()}>
                <IconPlus size={15} />
              </ActionIcon>
            </Tooltip>
          )}
          <Tooltip label="Fit all (Shift+1)">
            <ActionIcon size="sm" variant="subtle" aria-label="Fit to window" onClick={fit}>
              <IconArrowsMaximize size={15} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Reset layout (Arrange all)">
            <ActionIcon
              size="sm"
              variant="subtle"
              aria-label="Reset layout"
              onClick={() => previewArrange('all')}
            >
              <IconLayoutGrid size={15} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Export drawing (SVG, PNG, print)">
            <ActionIcon size="sm" variant="subtle" aria-label="Export…" onClick={() => setExportOpts((o) => o ?? { ...EXPORT_DEFAULTS, region: selection.length > 0 ? 'selection' : 'model' })}>
              <IconDownload size={15} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      <div
        ref={viewportRef}
        tabIndex={-1}
        style={{
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
          position: 'relative',
          outline: 'none',
          background: ink.canvas,
          touchAction: 'none',
          userSelect: 'none', // Shift+drag is a marquee, not a text selection
          cursor: drag.panning ? 'grabbing' : 'grab',
        }}
        onDoubleClick={(e) => {
          if (onSourceEdit && !sourceBroken && !(e.target as Element).closest('[data-node], [data-port], [data-wire]')) {
            openQuickAdd(e.clientX, e.clientY)
          }
        }}
        onDragOver={(e) => {
          if (onSourceEdit && !sourceBroken && e.dataTransfer.types.includes(COMPONENT_DRAG_TYPE)) e.preventDefault()
        }}
        onDrop={(e) => {
          const raw = e.dataTransfer.getData(COMPONENT_DRAG_TYPE)
          if (!raw) return
          e.preventDefault()
          choose(JSON.parse(raw) as QuickAddChoice, toDrawing(e.clientX, e.clientY))
        }}
        onPointerDown={(e) => {
          if (e.shiftKey && e.button === 0 && e.isPrimary) {
            e.preventDefault()
            const r = e.currentTarget.getBoundingClientRect()
            const p = { x: e.clientX - r.left, y: e.clientY - r.top }
            marqueeRef.current = { x0: p.x, y0: p.y, x1: p.x, y1: p.y }
            setMarquee(marqueeRef.current)
            return
          }
          takeControl()
          drag.startPan(e)
        }}
        onKeyDown={(e) => {
          // CFG-10: typing in a field on the canvas is text, never a command.
          if ((e.target as HTMLElement).closest('input, textarea, select, [contenteditable="true"]')) return
          const mod = e.ctrlKey || e.metaKey
          const clip = onSourceEdit && !sourceBroken && !e.altKey
            ? mod
              ? { c: copySelection, x: () => copySelection() && requestDelete(), v: () => pasteHere(loadFragment(), 'Paste'), d: () => pasteHere(fragmentOf(), 'Duplicate') }[e.key.toLowerCase()]
              : e.key === 'Delete' || e.key === 'Backspace' ? () => requestDelete() : undefined
            : undefined
          if (clip) {
            e.preventDefault()
            clip()
            return
          }
          // e.code: Shift+1 types "!" on most layouts.
          const command = e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey
            ? { Digit1: fit, Digit2: fitSelection, Digit0: () => zoomBy(1 / zoom) }[e.code]
            : undefined
          if (command) {
            e.preventDefault()
            command()
            return
          }
          if (e.key === 'l' && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault()
            setListOpen((o) => !o)
            return
          }
          if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault()
            setSearchOpen(true)
            return
          }
          if (e.key === 'a' && !e.ctrlKey && !e.metaKey && !e.altKey && onSourceEdit && !sourceBroken) {
            e.preventDefault()
            openQuickAdd()
            return
          }
          if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'z' || e.key.toLowerCase() === 'y')) {
            e.preventDefault()
            replay(e.key.toLowerCase() === 'y' || e.shiftKey ? 'redo' : 'undo')
            return
          }
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
            e.preventDefault()
            selectAll()
            return
          }
          if (e.key === 'Escape') {
            clearSelection()
            return
          }
          const dir = ARROWS[e.key]
          if (!dir) {
            return
          }
          e.preventDefault()
          // Alt+arrow moves keyboard focus to the nearest block that way.
          if (e.altKey) {
            const from = positioned.get((document.activeElement as Element | null)?.getAttribute('data-node') ?? '')
            const to = from && nearestInDirection(from, dir, placed.filter((n) => n.kind === 'instance'))
            if (to) {
              viewportRef.current?.querySelector<SVGGElement>(`[data-node="${CSS.escape(to)}"]`)?.focus()
            }
            return
          }
          const step = settings.snap ? settings.grid : e.shiftKey ? 20 : 8
          nudge(dir === 'left' ? -step : dir === 'right' ? step : 0, dir === 'up' ? -step : dir === 'down' ? step : 0)
        }}
      >
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          viewBox={`${-view.x / zoom} ${-view.y / zoom} ${(viewport.w || layout.width) / zoom} ${(viewport.h || layout.height) / zoom}`}
          xmlns="http://www.w3.org/2000/svg"
          role="application"
          aria-label="Component network schematic. Tab to nodes and ports. Enter connects or inspects. Escape cancels wiring. Arrow keys nudge a focused node."
        >
          {settings.background !== 'plain' && (
            <>
              <defs>
                <pattern id="schematic-bg" width={pitch} height={pitch} patternUnits="userSpaceOnUse">
                  {settings.background === 'dots' ? (
                    <circle cx={0} cy={0} r={1.1 / zoom} fill={ink.dot} />
                  ) : (
                    <path d={`M ${pitch} 0 H 0 V ${pitch}`} fill="none" stroke={ink.gridLine} strokeWidth={1 / zoom} />
                  )}
                </pattern>
              </defs>
              <rect
                data-background={settings.background}
                x={-view.x / zoom}
                y={-view.y / zoom}
                width={viewport.w / zoom}
                height={viewport.h / zoom}
                fill="url(#schematic-bg)"
                pointerEvents="none"
              />
            </>
          )}
          {/* Circuit bands: one frame per fluid loop / coupling network, so two
              circuits that share a bond-graph domain still read apart. */}
          <g>
            {groups.map((g) => {
              const style = styleOf(g.lineId)
              if (isolating && !layout.nodes.some((n) => (n.group === g.id || g.id === `domain:${g.label}`) && shown?.nodes.has(n.id))) {
                return null
              }
              return (
                <g key={g.id}>
                  <rect
                    x={g.x}
                    y={g.y}
                    width={g.w}
                    height={g.h}
                    rx={10}
                    fill={`${style.color}0d`}
                    stroke={`${style.color}44`}
                    strokeWidth={1}
                  />
                  <text x={g.x + 12} y={g.y + 15} fontSize={11} fontWeight={600} fill={style.color}>
                    {g.label.toUpperCase()}
                  </text>
                </g>
              )
            })}
            {areaFrames.map((a) =>
              isolating && !a.members.some((m) => shown?.nodes.has(m)) ? null : (
                <g key={a.id} data-area={a.label}>
                  <rect x={a.x} y={a.y} width={a.w} height={a.h} rx={8} fill="none" stroke={ink.subtext} strokeWidth={1.2} strokeDasharray="6 4" />
                  <text x={a.x + 10} y={a.y + 13} fontSize={11} fontWeight={600} fill={ink.subtext}>
                    {a.label}
                  </text>
                </g>
              ),
            )}
          </g>

          <g>
            {layout.edges.map((e) => {
              const pts = routes.get(e.id)
              if (!pts) {
                return null
              }
              const style = styleOf(e.lineId)
              const lit = active !== null && (e.from === active || e.to === active)
              const out = shown !== null && !shown.edges.has(e.id)
              if (out && isolating) {
                return null
              }
              const index = Number(netOf(e).slice(1))
              const openCard = () => setWireCard({ index, check: drawnCheck })
              const reading = overlayRead?.byEdge.get(e.id)
              const valued = reading?.state === 'value'
              const flow = overlaySet.arrows ? flowAlong(e, values) : undefined
              return (
                <g key={e.id}>
                <path
                  data-net={netOf(e)}
                  data-route={routeKey(e)}
                  data-conflict={routeConflicts.has(e.id) || undefined}
                  data-overlay={reading?.state}
                  data-flow={flow === undefined ? undefined : flow === null ? 'unknown' : flow === 0 ? 'zero' : flow > 0 ? 'forward' : 'reverse'}
                  d={pathOf(pts, hops.get(e.id))}
                  fill="none"
                  stroke={valued ? rampColor(reading.t!) : reading?.state === 'nonfinite' ? '#e03131' : reading ? ink.subtext : style.color}
                  strokeWidth={(valued ? 1.5 + 3.5 * reading.t! : style.width) + (lit ? 1.2 : 0)}
                  strokeDasharray={reading && !valued ? OVERLAY_DASH[reading.state] : style.dash}
                  strokeLinecap={style.cap}
                  strokeLinejoin="round"
                  strokeOpacity={out ? 0.15 : overlayRead && !reading ? 0.3 : 0.95}
                >
                  <title>
                    {edgeTitle(e)}
                    {reading?.value !== undefined && metric ? ` — ${metric.label} ${formatCompact(reading.value)} ${metric.units}` : ''}
                  </title>
                </path>
                {flow && !out ? <FlowArrow pts={pts} dir={flow} fill={ink.text} /> : null}
                {onSourceEdit && !out && (
                  <path
                    data-wire={e.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`Wire ${edgeTitle(e)}`}
                    d={pathOf(pts)}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={Math.max(8, 12 / zoom)}
                    style={{ cursor: savedRoutes[routeKey(e)]?.locked ? 'pointer' : 'move' }}
                    onPointerDown={(ev) => {
                      ev.stopPropagation()
                      startLaneDrag(ev, e)
                    }}
                    onDoubleClick={(ev) => {
                      ev.stopPropagation()
                      addBend(e, toDrawing(ev.clientX, ev.clientY))
                    }}
                    onClick={() => {
                      if (suppressClick.current) suppressClick.current = false
                      else openCard()
                    }}
                    onKeyDown={(ev) => {
                      if (ev.key === 'Enter' || ev.key === ' ') {
                        ev.preventDefault()
                        openCard()
                      }
                    }}
                  />
                )}
                </g>
              )
            })}
            {cardEdges.flatMap((e) => {
              const key = routeKey(e)
              const route = savedRoutes[key]
              if (!route || route.locked) return []
              return (liveRoute?.key === key ? liveRoute.points : route.points).map((p, k) => (
                <rect
                  // eslint-disable-next-line react/no-array-index-key -- a bend is its place on the route; a coordinate key would remount it mid-drag
                  key={`${key}:${k}`}
                  data-bend={`${key}:${k}`}
                  x={p.x - 4 / zoom}
                  y={p.y - 4 / zoom}
                  width={8 / zoom}
                  height={8 / zoom}
                  fill={ink.canvas}
                  stroke={ink.active}
                  strokeWidth={1.4 / zoom}
                  style={{ cursor: 'move' }}
                  onPointerDown={(ev) => moveBend(ev, key, k)}
                  onDoubleClick={(ev) => {
                    ev.stopPropagation()
                    removeBend(key, k)
                  }}
                >
                  <title>Bend — drag to move, double-click to remove</title>
                </rect>
              ))
            })}
            {wireDrag && (
              <line
                data-testid="wire-drag"
                data-transient
                x1={wireDrag.a[0]}
                y1={wireDrag.a[1]}
                x2={wireDrag.b[0]}
                y2={wireDrag.b[1]}
                stroke={ink.active}
                strokeWidth={1.6}
                strokeDasharray="4 3"
                pointerEvents="none"
              />
            )}
            {provisional?.check === checkResult &&
              (() => {
                const at = (end: WireEndpoint) => {
                  const n = positioned.get(end.instance)
                  const p = n?.ports.find((q) => q.port === end.port)
                  return n && p ? [n.x + p.dx, n.y + p.dy] : null
                }
                const a = at(provisional.from)
                const b = at(provisional.to)
                return a && b ? (
                  <path data-provisional data-transient d={`M${a[0]},${a[1]} L${b[0]},${b[1]}`} stroke={ink.active} strokeWidth={1.6} strokeDasharray="5 4" fill="none">
                    <title>Pending Check</title>
                  </path>
                ) : null
              })()}
          </g>

          <g>
            {layout.nodes.map((base) => {
              const n = positioned.get(base.id) ?? base
              const out = shown !== null && !shown.nodes.has(n.id)
              if (out && isolating) {
                return null
              }
              return n.kind === 'junction' ? (
                <circle
                  key={n.id}
                  data-ends={layout.edges.filter((e) => e.from === n.id || e.to === n.id).length}
                  data-net={edgeNet.get(layout.edges.find((e) => e.from === n.id || e.to === n.id)?.id ?? '')}
                  opacity={out ? 0.2 : undefined}
                  cx={n.x + n.w / 2}
                  cy={n.y + n.h / 2}
                  r={n.w / 2}
                  fill={styleOf(layout.edges.find((e) => e.from === n.id || e.to === n.id)?.lineId ?? '').color}
                  stroke={ink.halo}
                  strokeWidth={1.5}
                />
              ) : (
                <NodeBlock
                  key={n.id}
                  node={n}
                  faded={out}
                  zoom={printing ? 1 : zoom}
                  room={chipRoom.get(n.id) ?? { left: Infinity, right: Infinity }}
                  ink={ink}
                  locked={lockedIds.has(n.id)}
                  namesOnly={!printing && settings.detail === 'names'}
                  portLabels={settings.portLabels}
                  badge={badgeOf(n)}
                  active={active === n.id}
                  styleOf={styleOf}
                  wiring={Boolean(onEmitStatement)}
                  pendingPort={pendingPort}
                  highlighted={highlightIds.includes(n.id) || selected.has(n.id)}
                  onPointerDown={(e) => {
                    takeControl()
                    // Dragging a selected block carries the whole selection; locked blocks stay.
                    const ids = (selection.includes(n.id) ? selection : [n.id]).filter((id) => !lockedIds.has(id))
                    drag.startNode(e, ids, Object.fromEntries(ids.flatMap((id) => { const p = positioned.get(id); return p ? [[id, { x: p.x, y: p.y }]] : [] })))
                  }}
                  onClick={(shiftKey) => {
                    if (drag.moved()) {
                      return
                    }
                    if (shiftKey) {
                      setSelected((current) => {
                        const next = new Set(current)
                        if (next.has(n.id)) next.delete(n.id)
                        else next.add(n.id)
                        return next
                      })
                      return
                    }
                    // Selecting links to the declaration but keeps the canvas
                    // in front; the readout card's reveal action navigates.
                    setSelected(new Set([n.id]))
                    setPinned((p) => (p === n.id ? null : n.id))
                    const line = declarationOf(n)
                    if (line !== null) {
                      onSelectLine?.(line)
                    }
                  }}
                  onEnter={() => setHovered(n.id)}
                  onLeave={() => setHovered(null)}
                  onPort={(port) => clickPort(n.id, port)}
                  unconnected={drawnCheck?.ports?.length ? (openPorts.get(n.id.toLowerCase()) ?? NO_PORTS) : undefined}
                  look={styleFor(blockStyles, n.id, n.type ?? '')}
                  onPortDrag={(port, e) => startWireDrag(n.id, port, e)}
                  compat={wireSource ? (port) => compatOf(n.id, port) : undefined}
                />
              )
            })}
          </g>
          <g data-annotations>
            {annotations
              .filter((a) => a.scope === scope)
              .map((a) => {
                const at = noteDrag?.id === a.id ? noteDrag.at : a.at
                const body = annotationBody(a)
                const swatch = a.kind === 'legend' ? 22 : 0
                const w = Math.max(60, ...body.lines.map((l) => l.length * 6.4 + 14 + swatch))
                const h = body.lines.length * 15 + 8
                // A callout's leader ends on its block's edge, nearest the note's centre.
                const tip = body.to && { x: Math.min(Math.max(at.x + w / 2, body.to.x), body.to.x + body.to.w), y: Math.min(Math.max(at.y + h / 2, body.to.y), body.to.y + body.to.h) }
                return (
                  <g
                    key={a.id}
                    data-annotation={a.kind}
                    data-broken={body.broken || undefined}
                    role="button"
                    tabIndex={0}
                    aria-label={`${a.kind}: ${body.lines.join(', ')}`}
                    style={{ cursor: 'move' }}
                    onPointerDown={(e) => {
                      e.stopPropagation()
                      e.currentTarget.setPointerCapture(e.pointerId)
                      setNoteDrag({ id: a.id, from: { x: e.clientX, y: e.clientY }, at: a.at, moved: false })
                    }}
                    onPointerMove={(e) => {
                      if (noteDrag?.id !== a.id) return
                      const dx = (e.clientX - noteDrag.from.x) / zoom
                      const dy = (e.clientY - noteDrag.from.y) / zoom
                      setNoteDrag({ ...noteDrag, at: { x: Math.round(a.at.x + dx), y: Math.round(a.at.y + dy) }, moved: noteDrag.moved || Math.hypot(dx, dy) * zoom > 3 })
                    }}
                    onPointerUp={() => {
                      if (noteDrag?.id !== a.id) return
                      setNoteDrag(null)
                      if (noteDrag.moved) updatePres((p) => ({ ...p, annotations: (p.annotations ?? []).map((x) => (x.id === a.id ? { ...x, at: noteDrag.at } : x)) }), `Move ${a.kind}`)
                      else setNoteEdit({ id: a.id, text: a.text })
                    }}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return
                      e.stopPropagation()
                      setNoteEdit({ id: a.id, text: a.text })
                    }}
                  >
                    {tip && <line x1={at.x + w / 2} y1={at.y + h / 2} x2={tip.x} y2={tip.y} stroke={ink.subtext} strokeWidth={1.2} />}
                    {tip && <circle cx={tip.x} cy={tip.y} r={2.5} fill={ink.subtext} />}
                    <rect x={at.x} y={at.y} width={w} height={h} rx={a.kind === 'card' ? 6 : 2} fill={ink.block} stroke={body.broken ? '#fa5252' : ink.border} strokeWidth={1} strokeDasharray={body.broken ? '4 3' : undefined} />
                    {body.lines
                      .map((line, k) => ({ line, y: at.y + 15 * k + 15, color: a.kind === 'legend' ? legendRows[k]?.color : undefined, title: a.kind === 'card' && k === 0, value: a.kind === 'card' && k > 0 }))
                      .map((row) => (
                        <g key={row.y}>
                          {row.color && <line x1={at.x + 7} x2={at.x + 23} y1={row.y - 4} y2={row.y - 4} stroke={row.color} strokeWidth={3} />}
                          <text
                            x={at.x + 7 + swatch}
                            y={row.y}
                            fontSize={11}
                            fontWeight={row.title ? 600 : 400}
                            fontFamily={row.value ? 'monospace' : undefined}
                            fill={body.broken && row.line.startsWith('Link broken') ? '#fa5252' : ink.text}
                          >
                            {row.line}
                          </text>
                        </g>
                      ))}
                  </g>
                )
              })}
          </g>
          {guides && (
            <g data-testid="schematic-guides" data-transient pointerEvents="none" stroke={ink.guide} strokeWidth={1 / zoom} strokeDasharray={`${4 / zoom} ${3 / zoom}`}>
              {guides.xs.map((x) => (
                <line key={`x${x}`} x1={x} x2={x} y1={bounds.minY} y2={bounds.minY + bounds.h} />
              ))}
              {guides.ys.map((y) => (
                <line key={`y${y}`} x1={bounds.minX} x2={bounds.minX + bounds.w} y1={y} y2={y} />
              ))}
            </g>
          )}
        </svg>
        {marquee && (
          <div
            data-testid="schematic-marquee"
            style={{
              position: 'absolute',
              left: Math.min(marquee.x0, marquee.x1),
              top: Math.min(marquee.y0, marquee.y1),
              width: Math.abs(marquee.x1 - marquee.x0),
              height: Math.abs(marquee.y1 - marquee.y0),
              border: `1px dashed ${ink.marquee}`,
              background: ink.marqueeFill,
              pointerEvents: 'none',
            }}
          />
        )}
        {shown && focus && (
          <Paper
            withBorder
            shadow="sm"
            px="xs"
            py={4}
            radius="sm"
            role="status"
            style={{
              position: 'absolute',
              top: 8,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 'max-content',
              maxWidth: 'calc(100% - 16px)',
              zIndex: 6,
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <Group gap="xs" wrap="nowrap">
              <Text size="xs">
                {FOCUS_TITLES[focus.kind]} {positioned.get(focus.id)?.label}: showing{' '}
                {layout.nodes.filter((n) => n.kind === 'instance' && shown.nodes.has(n.id)).length} of{' '}
                {layout.nodes.filter((n) => n.kind === 'instance').length} components
                {isolating ? ' (the rest hidden)' : ''}
              </Text>
              <Button size="compact-xs" variant="light" onClick={() => setFocus(null)}>
                Show all
              </Button>
              <Kbd size="xs">Esc</Kbd>
            </Group>
          </Paper>
        )}
        {/* An isolated circuit is the whole drawing for now; no overview of the hidden rest. */}
        {!isolating && (
          <Minimap
            ink={ink}
            nodes={placed}
            bounds={bounds}
            view={view}
            viewport={viewport}
            onCenter={(p) => {
              takeControl()
              setView((v) => ({ ...v, x: viewport.w / 2 - p.x * v.zoom, y: viewport.h / 2 - p.y * v.zoom }))
            }}
          />
        )}
      </div>

      {adding}
      {editing}
      {exportDialog}
      <div role="status" aria-live="polite" data-testid="canvas-announcer" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clipPath: 'inset(50%)', whiteSpace: 'nowrap' }}>
        {announcement}
      </div>
      {(overlayRead || overlaySet.arrows) && (
        <Paper withBorder shadow="sm" p="xs" role="region" aria-label="Overlay legend" data-testid="overlay-legend" style={{ position: 'absolute', right: 8, top: 44, width: 230, zIndex: 4 }}>
          {metric && overlayRead && (
            <Stack gap={2}>
              <Text size="xs" fw={600}>
                {metric.label} [{metric.units || '-'}]
              </Text>
              <div style={{ height: 8, borderRadius: 2, background: `linear-gradient(to right, ${RAMP_STOPS.join(', ')})` }} />
              <Group justify="space-between" data-testid="overlay-scale">
                <Text size="10px">{Number.isFinite(overlayRead.min) ? formatCompact(overlayRead.min) : '—'}</Text>
                <Text size="10px">{Number.isFinite(overlayRead.max) ? formatCompact(overlayRead.max) : '—'}</Text>
              </Group>
              <Text size="10px" c="dimmed">
                Width and colour grow with the value. Dashed: no {metric.label} in the solve · dotted red: not finite · dash-dot: another unit. Faded: other domains.
              </Text>
            </Stack>
          )}
          {overlaySet.arrows && (
            <Text size="10px" c="dimmed" mt={metric ? 4 : 0}>
              ▶ measured flow: current and heat flow by their sign into a port, mass flow from a port named in toward one named out. No arrow: zero flow, or no solved flow and convention.
            </Text>
          )}
        </Paper>
      )}
      <Modal opened={noteEdit !== null} onClose={() => setNoteEdit(null)} title="Annotation" size="sm">
        {noteEdit && (() => {
          const a = annotations.find((x) => x.id === noteEdit.id)
          if (!a) return null
          const close = (change: (list: Annotation[]) => Annotation[], label: string) => {
            updatePres((p) => ({ ...p, annotations: change(p.annotations ?? []) }), label)
            setNoteEdit(null)
          }
          return (
            <Stack gap="xs">
              {a.target && (
                <Text size="xs" c="dimmed">
                  Linked to {a.target}
                </Text>
              )}
              {a.kind !== 'legend' && (
                <Textarea label={a.kind === 'card' ? 'Title (empty shows the variable)' : 'Text'} autosize minRows={2} maxLength={2000} value={noteEdit.text} onChange={(e) => setNoteEdit({ ...noteEdit, text: e.currentTarget.value })} data-autofocus />
              )}
              <Group justify="space-between">
                <Button size="xs" variant="subtle" color="red" onClick={() => close((list) => list.filter((x) => x.id !== a.id), `Delete ${a.kind}`)}>
                  Delete
                </Button>
                {a.kind !== 'legend' && (
                  <Button size="xs" onClick={() => close((list) => list.map((x) => (x.id === a.id ? { ...x, text: noteEdit.text } : x)), `Edit ${a.kind}`)}>
                    Save
                  </Button>
                )}
              </Group>
            </Stack>
          )
        })()}
      </Modal>
      {watch.length > 0 && (
        <Paper withBorder shadow="sm" p="xs" role="region" aria-label="Watch" data-testid="watch" style={{ position: 'absolute', left: 8, bottom: 8, width: 300, maxHeight: '40%', overflowY: 'auto', zIndex: 6 }}>
          <Text size="xs" fw={600} mb={2}>
            Watch
          </Text>
          {watch.map((name) => {
            const v = values.get(name)
            const owner = ownerOf(name)
            const current = Boolean(owner && selection.includes(owner.block))
            const shown = shownName(name)
            return (
              <Group key={name} gap={2} wrap="nowrap" bg={current ? 'var(--mantine-color-default-hover)' : undefined}>
                <Button
                  size="compact-xs"
                  variant="subtle"
                  color="gray"
                  justify="space-between"
                  style={{ flex: 1 }}
                  aria-current={current ? 'true' : undefined}
                  disabled={!owner}
                  onClick={() => {
                    if (!owner) return
                    openScope(scopeOf(owner.block))
                    setSelected(new Set([owner.block]))
                    seek.current = [owner.block]
                    setSeekTick((t) => t + 1)
                    setAnnouncement(`${v?.name ?? name}${owner.port ? `, port ${owner.port} of ${owner.block}` : ''}`)
                  }}
                  rightSection={
                    <Text size="xs" ff="monospace">
                      {v ? `${formatReading(v, formats[name]).text} ${formatReading(v, formats[name]).units}` : 'not solved'}
                    </Text>
                  }
                >
                  {shown}
                </Button>
                {v && <FormatButton reading={{ ...v, name: shown, label: shown }} format={formats[name]} onChange={(f) => setFormat(name, f)} />}
                <ActionIcon size="xs" variant="subtle" color="gray" aria-label={`Stop watching ${shown}`} onClick={() => toggleWatch(name)}>
                  ×
                </ActionIcon>
              </Group>
            )
          })}
        </Paper>
      )}
      {listOpen && (
        <Paper withBorder shadow="sm" p="xs" role="region" aria-label="Components and connections" data-testid="structured-list" style={{ position: 'absolute', left: 8, top: 44, width: 340, maxHeight: '75%', overflowY: 'auto', zIndex: 6 }}>
          <Group justify="space-between" gap={4}>
            <Text size="sm" fw={600} component="h3" m={0}>Components ({listNodes.length})</Text>
            <ActionIcon size="sm" variant="subtle" aria-label="Close list" onClick={() => setListOpen(false)}>×</ActionIcon>
          </Group>
          <Stack component="ul" gap={2} p={0} m={0} style={{ listStyle: 'none' }}>
            {listNodes.map((n) => (
              <Group component="li" key={n.id} gap={4} wrap="nowrap">
                <Text size="xs" style={{ flex: 1 }}>
                  {n.label} <Text span size="xs" c="dimmed">{n.type}</Text>
                  {(openPorts.get(n.id)?.size ?? 0) > 0 && <Text span size="xs" c="orange"> · {openPorts.get(n.id)!.size} open</Text>}
                </Text>
                <Button size="compact-xs" variant="subtle" aria-label={`Inspect ${n.label}`} onClick={() => { setSelected(new Set([n.id])); setPinned(n.id) }}>
                  Inspect
                </Button>
                {onSourceEdit && !scope && (
                  <Button size="compact-xs" variant="subtle" color="red" aria-label={`Delete ${n.label}`} onClick={() => requestDelete([n.id])}>
                    Delete…
                  </Button>
                )}
              </Group>
            ))}
          </Stack>
          <Text size="sm" fw={600} component="h3" mt="xs" mb={0}>Connections ({connections.length})</Text>
          <Stack component="ul" gap={2} p={0} m={0} style={{ listStyle: 'none' }}>
            {connections.map((c, k) => (
              <Group component="li" key={c.range?.[0] ?? c.endpoints.join('|')} gap={4} wrap="nowrap">
                <Text size="xs" style={{ flex: 1 }}>{c.endpoints.join(' — ')}</Text>
                <Button size="compact-xs" variant="subtle" aria-label={`Open connection ${c.endpoints.join(' — ')}`} onClick={() => setWireCard({ index: k, check: drawnCheck })}>
                  Open
                </Button>
              </Group>
            ))}
          </Stack>
          {onEmitStatement && <Text size="xs" c="dimmed" mt={4}>Join two ports with Connect from / to in the toolbar.</Text>}
        </Paper>
      )}
      {wireCard?.check === drawnCheck && connections[wireCard.index] && (
        <WireCard
          index={wireCard.index}
          connections={connections}
          text={text}
          editable={Boolean(onSourceEdit) && !sourceBroken}
          instanceLine={(name) => drawnCheck?.instances?.find((i) => i.name.toLowerCase() === name.toLowerCase())?.line ?? null}
          onReveal={onRevealLine}
          onApply={(edit) => {
            if (runEdit(edit)) setWireCard(null)
          }}
          onClose={() => {
            setWireCard(null)
            setInsertDraft(null)
          }}
          routeControls={routeControls}
          onInsertComponent={() => {
            const conn = connections[wireCard.index]
            const ends = conn.range ? writtenEndpoints(text.slice(conn.range[0], conn.range[1])) : []
            setInsertDraft({ index: wireCard.index, type: null, toA: '', toB: '', branch: ends.at(-1) ?? '', block: null })
          }}
        />
      )}
      {wireCard && insertPanel}
      {activeNode && activeReadout && (
        <ReadoutCard
          node={activeNode}
          readout={activeReadout}
          pinned={pinned === activeNode.id}
          localType={
            checkResult?.instances?.find((i) => i.name.toLowerCase() === activeNode.id)?.localType ??
            false
          }
          identity={drawnCheck?.instances?.find((i) => i.name.toLowerCase() === activeNode.id)}
          onRename={onSourceEdit ? rename : undefined}
          definitionLine={(name) => drawnCheck?.definitions?.find((d) => d.name.toLowerCase() === name.toLowerCase())?.line ?? null}
          onRevealLine={onRevealLine}
          styles={blockStyles}
          onStyle={pinned === activeNode.id ? setStyle : undefined}
          spec={specOf(activeNode.type)}
          text={text}
          onSetParam={onSourceEdit ? setParam : undefined}
          onReveal={() => revealInstance(activeNode)}
          onFocus={
            pinned === activeNode.id
              ? (kind) => {
                  // The card would cover what the command shows; the banner
                  // now carries the state and its way back.
                  setPinned(null)
                  setFocus({ kind, id: activeNode.id })
                  // Frame what an isolated circuit leaves on screen.
                  if (kind === 'circuit') {
                    const keep = focusOf(kind, activeNode.id, layout.nodes, layout.edges).nodes
                    frame(boxAround(placed.filter((n) => keep.has(n.id)), CHIP_OVERHANG + 5, 40))
                  }
                }
              : undefined
          }
          onNudge={pinned === activeNode.id ? nudge : undefined}
          shown={{ badge: badges[activeNode.id], watch, formats }}
          onShow={
            pinned === activeNode.id
              ? (how, name) => {
                  if (how === 'badge') toggleBadge(activeNode.id, name)
                  else if (how === 'watch') toggleWatch(name)
                  else annotate('card', name, { x: activeNode.x + activeNode.w + 30, y: activeNode.y - 50 })
                }
              : undefined
          }
          onFormat={pinned === activeNode.id ? setFormat : undefined}
          handoff={pinned === activeNode.id ? cardHandoff : undefined}
        />
      )}
    </Stack>
  )
}

/** Instances the document declares — types filtered against the component
 *  catalog and the document's own COMPONENT blocks, so prose in a comment can
 *  never become a node. */
function documentInstances(text: string): Map<string, { label: string; type: string }> {
  const known = new Set<string>(COMPONENT_CATALOG.map((c) => c.type.toLowerCase()))
  for (const local of declaredComponentTypes(text)) {
    known.add(local)
  }
  return declaredInstances(text, known)
}

function parseChoice(value: string | null): { instance: string; port: string } | null {
  if (!value) return null
  const sep = value.indexOf('::')
  if (sep < 0) return null
  return { instance: value.slice(0, sep), port: value.slice(sep + 2) }
}

let measure: CanvasRenderingContext2D | null | undefined
/** On-screen width of a chip name at `px`, measured in the page's UI font. */
function chipTextPx(text: string, px: number): number {
  if (measure === undefined) {
    measure = typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d')
  }
  if (!measure) {
    return 0.62 * px * text.length // no canvas (tests): average bold glyph width
  }
  measure.font = `600 ${px}px ${getComputedStyle(document.body).fontFamily}`
  return measure.measureText(text).width
}

/** A chip name that fits `widthPx` on screen, shortened with an ellipsis when
 *  it would not; the full name stays in the node's tooltip and the inspector. */
function fitLabel(label: string, widthPx: number): string {
  if (chipTextPx(label, MIN_LABEL_PX) <= widthPx) {
    return label
  }
  for (let n = label.length - 1; n > 1; n--) {
    const short = `${label.slice(0, n)}…`
    if (chipTextPx(short, MIN_LABEL_PX) <= widthPx) {
      return short
    }
  }
  return `${label[0]}…`
}

interface BlockProps {
  node: SchematicNode
  zoom: number
  /** Free drawing units each side of the block, shared with a row neighbour. */
  room: { left: number; right: number }
  ink: SchematicInk
  /** Drags, nudges and Arrange leave it where it is. */
  locked?: boolean
  /** Draw the name-only chip at every zoom. */
  namesOnly?: boolean
  /** Name each port beside it, at full detail. */
  portLabels?: boolean
  badge: (Reading & { format?: VariableFormat }) | null
  active: boolean
  styleOf: (id: string) => LineStyle
  wiring: boolean
  pendingPort: { instance: string; port: string } | null
  highlighted?: boolean
  /** Outside an explicit trace / neighbours command. */
  faded?: boolean
  onPointerDown: (e: React.PointerEvent) => void
  onClick: (shiftKey?: boolean) => void
  onEnter: () => void
  onLeave: () => void
  onPort: (port: string) => void
  /** Ports Check reports unjoined, lower-case. */
  unconnected?: ReadonlySet<string>
  look?: BlockStyle
  onPortDrag?: (port: string, e: React.PointerEvent) => void
  /** While a wire is drawn: whether each port may take it. */
  compat?: (port: string) => 'allowed' | 'prohibited' | 'unknown' | undefined
}

/** One component, drawn as its circuit symbol with its identity and its most
 *  telling number. */
function NodeBlock({
  node,
  zoom,
  room,
  ink,
  locked = false,
  namesOnly = false,
  portLabels = false,
  badge,
  active,
  styleOf,
  wiring,
  pendingPort,
  highlighted = false,
  faded = false,
  onPointerDown,
  onClick,
  onEnter,
  onLeave,
  onPort,
  unconnected,
  look,
  onPortDrag,
  compat,
}: Readonly<BlockProps>) {
  const glyph = glyphPath(node.shape)
  const GLYPH = 20
  // Level of detail: once the full card's name would draw below MIN_LABEL_PX,
  // show only the name, held at MIN_LABEL_PX on screen whatever the zoom.
  const chip = (look?.density ? look.density === 'names' : namesOnly) || zoom * LABEL_FONT < MIN_LABEL_PX
  // COMP-07: the glyph turns and mirrors in its square; text stays upright.
  const turn = `${look?.rotate ? `rotate(${look.rotate} 0.5 0.5)` : ''}${look?.mirror ? ' translate(1 0) scale(-1 1)' : ''}`
  const labelFont = look?.labelSize ?? LABEL_FONT
  const outside = look?.label === 'above' || look?.label === 'below'
  const chipFont = MIN_LABEL_PX / zoom
  // A name may take half the gap to each neighbour, less a visible margin, and
  // shifts toward the freer side when centring would not fit.
  const share = (gap: number) => Math.max(0, Math.min(CHIP_OVERHANG, gap / 2 - CHIP_GAP_PX / (2 * zoom)))
  const [sL, sR] = [share(room.left), share(room.right)]
  const chipLabel = chip ? fitLabel(node.label, (sL + node.w + sR) * zoom) : node.label
  const half = chip ? chipTextPx(chipLabel, MIN_LABEL_PX) / zoom / 2 : 0
  const chipX = Math.min(Math.max(node.w / 2, half - sL), node.w + sR - half)
  const activate = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick(e.shiftKey)
    }
  }
  return (
    <g
      transform={`translate(${node.x}, ${node.y})`}
      opacity={faded ? 0.25 : undefined}
      onPointerDown={onPointerDown}
      onClick={(e) => onClick(e.shiftKey)}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onKeyDown={activate}
      tabIndex={0}
      role="button"
      data-node={node.id}
      aria-pressed={highlighted}
      aria-label={`${node.type ?? 'component'} ${node.label}`}
      aria-description={locked ? 'position locked' : undefined}
      data-locked={locked || undefined}
      style={{ cursor: locked ? 'default' : 'move' }}
    >
      <title>{`${node.type ?? ''} ${node.label} — ${SHAPE_LABELS[node.shape]}`}</title>
      <rect
        width={node.w}
        height={node.h}
        rx={node.terminal ? 3 : 7}
        fill={active ? ink.blockActive : ink.block}
        data-plain={look?.accent ?? (node.terminal ? ink.borderTerminal : ink.border)}
        stroke={highlighted ? ink.highlight : active ? ink.active : (look?.accent ?? (node.terminal ? ink.borderTerminal : ink.border))}
        strokeWidth={highlighted || active ? 2.2 : 1.2}
        strokeDasharray={node.terminal ? '4 2' : undefined}
      />
      {chip && (
        <text
          x={chipX}
          y={node.h / 2}
          fontSize={chipFont}
          fontWeight={600}
          textAnchor="middle"
          dominantBaseline="central"
          fill={ink.text}
          stroke={ink.halo}
          strokeWidth={3 / zoom}
          paintOrder="stroke"
        >
          {chipLabel}
        </text>
      )}
      {!chip && glyph && (
        <g color={ink.glyph} transform={`translate(6, ${(node.h - GLYPH) / 2}) scale(${GLYPH})`}>
          <g transform={turn || undefined}>
            <path
              d={glyph}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.2}
              vectorEffect="non-scaling-stroke"
            />
            <path d={glyphFillPath(node.shape)} fill="currentColor" />
          </g>
        </g>
      )}
      {!chip && (
        <text
          data-label={look?.label ?? 'inside'}
          x={outside ? node.w / 2 : GLYPH + 12}
          y={look?.label === 'above' ? -8 : look?.label === 'below' ? node.h + labelFont + 4 : badge ? 19 : 22}
          textAnchor={outside ? 'middle' : undefined}
          fontSize={labelFont}
          fontWeight={600}
          fill={ink.text}
          stroke={outside ? ink.halo : undefined}
          strokeWidth={outside ? 3 : undefined}
          paintOrder={outside ? 'stroke' : undefined}
        >
          {node.label}
        </text>
      )}
      {!chip && (
        <text x={GLYPH + 12} y={badge ? 31 : 36} fontSize={10} fill={ink.subtext}>
          {node.type}
        </text>
      )}
      {!chip && badge && (
        <text data-badge x={GLYPH + 12} y={44} fontSize={10.5} fontWeight={600} fill={ink.badge}>
          {badgeText(badge, look?.precision)}
        </text>
      )}
      {locked && <IconLock x={node.w - 13} y={2} size={11} color={ink.subtext} aria-hidden />}
      {node.ports.map((p) => {
        const armed = pendingPort?.instance === node.id && pendingPort?.port === p.port
        const color = p.lineId ? styleOf(p.lineId).color : ink.portIdle
        const open = unconnected?.has(p.port.toLowerCase()) ?? false
        const fit = compat?.(p.port)
        return (
          <g
            key={p.port}
            tabIndex={wiring ? 0 : undefined}
            role={wiring ? 'button' : undefined}
            aria-label={`${node.label}.${p.port} port${open ? ', not connected' : ''}`}
            data-port={`${node.id}.${p.port}`}
            data-connected={unconnected ? String(!open) : undefined}
            data-compat={fit}
            onPointerDown={(e) => {
              if (wiring && onPortDrag && e.button === 0) {
                e.stopPropagation()
                onPortDrag(p.port, e)
              }
            }}
            onClick={(e) => {
              if (wiring) {
                e.stopPropagation()
                onPort(p.port)
              }
            }}
            onKeyDown={(e) => {
              if (!wiring) return
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                e.stopPropagation()
                onPort(p.port)
              }
            }}
            style={{ cursor: wiring ? 'crosshair' : 'move' }}
          >
            <title>{`${node.label}.${p.port}`}</title>
            {wiring && (
              // CFG-09: a finger needs about 22 px on screen whatever the zoom, but
              // never over a neighbouring port's centre, or that port is lost.
              <circle data-hit cx={p.dx} cy={p.dy} r={COARSE ? Math.max(10, Math.min(22 / zoom, 0.9 * Math.min(...node.ports.filter((q) => q !== p).map((q) => Math.hypot(q.dx - p.dx, q.dy - p.dy))))) : 10} fill="transparent" />
            )}
            {fit && fit !== 'unknown' && (
              <circle cx={p.dx} cy={p.dy} r={7} fill="none" strokeWidth={1.5} stroke={fit === 'allowed' ? 'var(--mantine-color-green-6)' : 'var(--mantine-color-red-6)'}>
                <title>{fit === 'allowed' ? 'Can connect here' : 'Incompatible with the wire being drawn'}</title>
              </circle>
            )}
            <circle
              cx={p.dx}
              cy={p.dy}
              r={armed ? 5 : 3.2}
              fill={armed ? ink.active : open ? ink.halo : color}
              stroke={open && !armed ? ink.portIdle : ink.halo}
              strokeWidth={open ? 1.4 : 1}
            />
            {portLabels && !chip && <PortName side={p.side} x={p.dx} y={p.dy} name={p.port} color={ink.portName} />}
          </g>
        )
      })}
    </g>
  )
}

/** A port's name outside its block, beside the stub rather than on it. */
function PortName({ side, x, y, name, color }: Readonly<{ side: PortSide; x: number; y: number; name: string; color: string }>) {
  const at = {
    left: { x: x - 4, y: y - 5, anchor: 'end' },
    right: { x: x + 4, y: y - 5, anchor: 'start' },
    top: { x: x + 5, y: y - 6, anchor: 'start' },
    bottom: { x: x + 5, y: y + 12, anchor: 'start' },
  }[side] as { x: number; y: number; anchor: 'start' | 'end' }
  return (
    <text x={at.x} y={at.y} textAnchor={at.anchor} fontSize={8.5} fill={color} pointerEvents="none">
      {name}
    </text>
  )
}

/** The hover/pin card: what this block is, what its ports are doing, what it
 *  computed, and what it was built from. */
/**
 * COMP-04 / RUN-02: each catalog parameter with its binding as written (or the
 * default it falls back to) beside its evaluated value. Editing is a draft
 * until Apply, so a half-typed value never reaches the model.
 */
function ParamInspector({
  spec,
  identity,
  text,
  evaluated,
  onSet,
}: Readonly<{
  spec: ComponentSpec
  identity: InstanceIdentityDto
  text: string
  evaluated: readonly { name: string; text: string }[]
  onSet: (inst: InstanceIdentityDto, name: string, value: string) => string | null
}>) {
  const [editing, setEditing] = useState<{ name: string; value: string; error: string | null } | null>(null)
  const written = (name: string) => {
    const r = identity.params?.find((p) => p.name === name.toLowerCase())?.range
    return r ? text.slice(r[0], r[1]) : null
  }
  const apply = () => {
    if (!editing) return
    const param = spec.params.find((p) => p.name === editing.name)!
    const error = paramValueError(param, editing.value) ?? (editing.value.trim() ? null : 'Enter a value.')
    const problem = error ?? onSet(identity, param.name, formatParamValue(param, editing.value))
    if (problem) setEditing({ ...editing, error: problem })
    else setEditing(null)
  }
  return (
    <Stack gap={2} mt={6} data-testid="param-inspector">
      <Text size="xs" fw={600} c="dimmed">
        parameters
      </Text>
      {spec.params.map((p) => {
        const source = written(p.name)
        const value = evaluated.find((e) => e.name.toLowerCase() === p.name.toLowerCase())?.text
        const open = editing?.name === p.name
        return (
          <Stack key={p.name} gap={0} data-param={p.name.toLowerCase()}>
            <Group gap={6} justify="space-between" wrap="nowrap" align="start">
              <Tooltip label={p.description || p.name} disabled={!p.description} multiline w={260}>
                <Text size="xs" c="dimmed">
                  {p.name}
                  {p.unit ? ` [${p.unit}]` : ''}
                </Text>
              </Tooltip>
              {!open && (
                <Button
                  size="compact-xs"
                  variant="subtle"
                  aria-label={`Edit ${p.name}`}
                  onClick={() => setEditing({ name: p.name, value: source ?? '', error: null })}
                >
                  <Text size="xs" ff="monospace" c={source ? undefined : 'dimmed'}>
                    {source ?? (p.defaultValue ? `default ${p.defaultValue}` : p.required ? 'not set' : 'default')}
                  </Text>
                </Button>
              )}
            </Group>
            {!open && (source || value) && (
              <Text size="xs" c="dimmed" ta="right" data-testid="param-value">
                = {value ?? 'not evaluated (Solve)'}
              </Text>
            )}
            {open && (
              <Group gap={4} wrap="nowrap" align="flex-start">
                {p.isSelector && p.values.length ? (
                  <Select
                    size="xs"
                    aria-label={`New ${p.name}`}
                    data={p.values}
                    value={editing.value || null}
                    error={editing.error}
                    onChange={(v) => setEditing({ ...editing, value: v ?? '', error: null })}
                  />
                ) : (
                  <TextInput
                    size="xs"
                    aria-label={`New ${p.name}`}
                    value={editing.value}
                    error={editing.error}
                    autoFocus
                    onChange={(e) => setEditing({ ...editing, value: e.currentTarget.value, error: null })}
                    onKeyDown={(e) => {
                      e.stopPropagation()
                      if (e.key === 'Enter') apply()
                      if (e.key === 'Escape') setEditing(null)
                    }}
                  />
                )}
                <Button size="compact-xs" onClick={apply}>
                  Apply
                </Button>
                <Button size="compact-xs" variant="default" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
              </Group>
            )}
          </Stack>
        )
      })}
    </Stack>
  )
}

type StyleScope = 'instance' | 'type' | 'project'

/**
 * CFG-01: edit the block's style at one scope. The block's own style beats its
 * type's, which beats the project's; Reset clears only the chosen scope.
 */
function StyleEditor({
  node,
  styles,
  onStyle,
}: Readonly<{ node: SchematicNode; styles: BlockStyles; onStyle: (scope: StyleScope, key: string, next: BlockStyle | null) => void }>) {
  const [scope, setScope] = useState<StyleScope>('instance')
  const type = node.type ?? ''
  const key = scope === 'type' ? type.toLowerCase() : node.id
  const own = scope === 'project' ? styles.project : scope === 'type' ? styles.types[key] : styles.instances[key]
  const set = (change: BlockStyle) => onStyle(scope, key, Object.fromEntries(Object.entries({ ...own, ...change }).filter(([, v]) => v !== undefined)))
  return (
    <Stack gap={4} mb={4} data-testid="style-editor">
      <SegmentedControl
        size="xs"
        value={scope}
        onChange={(v) => setScope(v as StyleScope)}
        data={[
          { value: 'instance', label: 'This block' },
          { value: 'type', label: `All ${type}`, disabled: !type },
          { value: 'project', label: 'Project' },
        ]}
      />
      <Group gap={4} wrap="nowrap">
        <ColorInput
          size="xs"
          aria-label="Outline colour"
          placeholder="Theme"
          format="hex"
          w={110}
          value={own?.accent ?? ''}
          onChange={(v) => set({ accent: /^#[0-9a-f]{6}$/i.test(v) ? v : undefined })}
        />
        <Select
          size="xs"
          aria-label="Readout digits"
          placeholder="Digits"
          w={90}
          data={['2', '3', '4', '5', '6', '7', '8']}
          value={own?.precision ? String(own.precision) : null}
          onChange={(v) => set({ precision: v ? Number(v) : undefined })}
          clearable
        />
        <Button size="compact-xs" variant="subtle" disabled={!own || Object.keys(own).length === 0} onClick={() => onStyle(scope, key, null)}>
          Reset
        </Button>
      </Group>
      <Group gap={4} wrap="nowrap">
        <SegmentedControl
          size="xs"
          aria-label="Rotate symbol"
          value={String(own?.rotate ?? 0)}
          onChange={(v) => set({ rotate: Number(v) ? (Number(v) as BlockStyle['rotate']) : undefined })}
          data={['0', '90', '180', '270'].map((v) => ({ value: v, label: `${v}°` }))}
        />
        <Switch size="xs" label="Mirror" checked={own?.mirror ?? false} onChange={(e) => set({ mirror: e.currentTarget.checked || undefined })} />
      </Group>
      <Group gap={4} wrap="nowrap">
        <Select size="xs" aria-label="Detail" placeholder="View's detail" w={110} data={[{ value: 'names', label: 'Name only' }, { value: 'full', label: 'Full card' }]} value={own?.density ?? null} onChange={(v) => set({ density: (v as BlockStyle['density']) ?? undefined })} clearable comboboxProps={{ withinPortal: false }} />
        <Select size="xs" aria-label="Name position" placeholder="Inside" w={90} data={[{ value: 'inside', label: 'Inside' }, { value: 'above', label: 'Above' }, { value: 'below', label: 'Below' }]} value={own?.label ?? null} onChange={(v) => set({ label: (v as BlockStyle['label']) ?? undefined })} clearable comboboxProps={{ withinPortal: false }} />
        <Select size="xs" aria-label="Name size" placeholder="Size" w={80} data={LABEL_SIZES.map(String)} value={own?.labelSize ? String(own.labelSize) : null} onChange={(v) => set({ labelSize: v ? Number(v) : undefined })} clearable comboboxProps={{ withinPortal: false }} />
      </Group>
      <Text size="xs" c="dimmed">
        This block overrides its type, which overrides the project. Turning or mirroring moves the ports with the symbol; the equations do not change.
      </Text>
    </Stack>
  )
}

/** 1-based line of a UTF-16 offset. */
const lineAt = (text: string, at: number) => text.slice(0, at).split('\n').length

/**
 * WIRE-05/06: inspect one connection and edit it through the source. Every
 * action previews its patch and what still joins each end before it applies;
 * a connection no single statement owns, or one written inside a component
 * definition, says why it cannot be edited here and opens its source instead.
 */
function WireCard({
  index,
  connections,
  text,
  editable,
  instanceLine,
  onReveal,
  onApply,
  onClose,
  routeControls,
  onInsertComponent,
}: Readonly<{
  index: number
  routeControls?: ReactNode
  onInsertComponent?: () => void
  connections: readonly ConnectionDto[]
  text: string
  editable: boolean
  instanceLine: (name: string) => number | null
  onReveal: (line: number) => void
  onApply: (edit: SourceEdit) => void
  onClose: () => void
}>) {
  const conn = connections[index]
  const [action, setAction] = useState<{ kind: 'remove' | 'net' } | { kind: 'disconnect'; endpoint: string } | null>(null)
  const net = netConnections(connections, index)
  const owned = (c: ConnectionDto) => Boolean(c.range) && !c.alias && !c.inDefinition
  const statementLine = conn.range ? lineAt(text, conn.range[0]) : null
  const blocked = !editable
    ? 'Fix the source errors first; the drawing shows the previous model.'
    : conn.alias
      ? `Joined by the shared stream name "${conn.alias}"; no connect statement owns it. Rename the stream in the source to split it.`
      : conn.inDefinition
        ? 'Written inside a component definition: editing it changes every instance.'
        : !conn.range
          ? 'Check again first: the source changed since this wire was drawn.'
          : null
  const openLine = statementLine ?? instanceLine(conn.endpoints[0].split('.').slice(0, -1).join('.'))

  let edit: SourceEdit | null = null
  let removed = new Set<number>()
  let touched: string[] = []
  try {
    if (action?.kind === 'remove' && conn.range) {
      edit = { label: `Remove ${text.slice(...conn.range)}`, changes: [removeStatement(text, conn.range)] }
      removed = new Set([index])
      touched = conn.endpoints
    } else if (action?.kind === 'disconnect') {
      edit = disconnectEndpoint(text, conn, action.endpoint)
      removed = new Set([index])
      touched = [action.endpoint]
    } else if (action?.kind === 'net' && net.every((k) => owned(connections[k]))) {
      edit = {
        label: `Delete net (${net.length} connections)`,
        changes: net.map((k) => removeStatement(text, connections[k].range!)),
      }
      applyChanges(text, edit.changes) // throws when two statements share a line span
      removed = new Set(net)
      touched = [...new Set(net.flatMap((k) => connections[k].endpoints))]
    }
  } catch {
    edit = null
  }
  const diff = edit?.changes.flatMap((c) => [
    ...text.slice(c.from, c.to).split('\n').filter(Boolean).map((l) => `- ${l}`),
    ...c.insert.split('\n').filter(Boolean).map((l) => `+ ${l}`),
  ])

  return (
    <Paper
      withBorder
      shadow="md"
      p="xs"
      radius="sm"
      data-testid="wire-card"
      style={{ position: 'absolute', left: 8, bottom: 8, maxWidth: 380, maxHeight: '70%', overflow: 'auto', zIndex: 6 }}
    >
      <Group gap={6} mb={4} wrap="nowrap">
        <Text size="sm" fw={700}>
          {conn.endpoints.join(' — ')}
        </Text>
        <ActionIcon size="xs" variant="subtle" ml="auto" aria-label="Close wire card" onClick={onClose}>
          ×
        </ActionIcon>
      </Group>
      <Text size="xs" c="dimmed">
        {[conn.domain, conn.connector, conn.fluid].filter(Boolean).join(' · ')}
      </Text>
      <Text size="xs" mb={4} data-testid="wire-owner">
        {conn.alias
          ? `Shared stream ${conn.alias}`
          : conn.inDefinition
            ? `In a component definition${statementLine ? `, line ${statementLine}` : ''}`
            : statementLine
              ? `connect statement, line ${statementLine}`
              : 'connect statement'}
      </Text>
      {blocked ? (
        <>
          <Text size="xs" c="orange" mb={4}>
            {blocked}
          </Text>
          {openLine !== null && (
            <Button size="compact-xs" variant="default" onClick={() => onReveal(openLine)}>
              {conn.inDefinition ? 'Open definition' : 'Open source'}
            </Button>
          )}
        </>
      ) : (
        <>
          <Group gap={4} mb={4}>
            <Button size="compact-xs" variant={action?.kind === 'remove' ? 'filled' : 'default'} onClick={() => setAction({ kind: 'remove' })}>
              Remove connection
            </Button>
            {conn.endpoints.map((endpoint) => (
              <Button
                key={endpoint}
                size="compact-xs"
                variant={action?.kind === 'disconnect' && action.endpoint === endpoint ? 'filled' : 'default'}
                onClick={() => setAction({ kind: 'disconnect', endpoint })}
              >
                Disconnect {endpoint}
              </Button>
            ))}
            {onInsertComponent && (
              <Button size="compact-xs" variant="default" onClick={onInsertComponent}>
                Insert component…
              </Button>
            )}
            {net.length > 1 && (
              <Button
                size="compact-xs"
                variant={action?.kind === 'net' ? 'filled' : 'default'}
                disabled={!net.every((k) => owned(connections[k]))}
                title={net.every((k) => owned(connections[k])) ? undefined : 'Part of this net has no connect statement of its own.'}
                onClick={() => setAction({ kind: 'net' })}
              >
                Delete whole net
              </Button>
            )}
          </Group>
          {action && !edit && (
            <Text size="xs" c="orange">
              This change cannot be written as a patch; edit the source directly.
            </Text>
          )}
          {edit && (
            <>
              <Text component="pre" size="xs" data-testid="wire-diff" style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'var(--mantine-font-family-monospace)' }}>
                {diff?.join('\n')}
              </Text>
              {touched.map((end) => {
                const via = joinedElsewhere(connections, removed, end)
                return (
                  <Text key={end} size="xs" c="dimmed">
                    {via.length
                      ? `${end} still joined via ${via.map((k) => connections[k].range ? `line ${lineAt(text, connections[k].range![0])}` : connections[k].endpoints.join(', ')).join('; ')}`
                      : `${end} left unconnected`}
                  </Text>
                )
              })}
              <Group gap={4} mt={6}>
                <Button size="compact-xs" color="red" onClick={() => onApply(edit!)}>
                  Apply
                </Button>
                <Button size="compact-xs" variant="default" onClick={() => setAction(null)}>
                  Cancel
                </Button>
              </Group>
            </>
          )}
        </>
      )}
      {routeControls}
    </Paper>
  )
}

/**
 * SYNC-10: the solve's blocks in the order it solved them, each with its
 * equations and the variables it solved. Dashed arcs show which earlier block
 * a block reads from. They are drawn unlike wires, because they are not wires.
 */
function DependencyView({
  blocks,
  links,
  ink,
  valueOf,
  pinned,
  onPin,
  onLine,
}: Readonly<{
  blocks: readonly BlockResult[]
  links: readonly BlockLink[]
  ink: SchematicInk
  valueOf: (name: string) => string | null
  pinned: ReadonlySet<string>
  onPin: (name: string) => void
  onLine: (equation: string) => void
}>) {
  const ROW = 16
  const left = 30 + Math.min(80, 12 * Math.max(0, ...links.map((l) => l.to - l.from)))
  const width = 420
  const boxes: { y: number; h: number }[] = []
  let y = 8
  for (const b of blocks) {
    const h = (1 + b.equations.length + b.variables.length) * ROW + 10
    boxes.push({ y, h })
    y += h + 22
  }
  const keyPress = (run: () => void) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      run()
    }
  }
  return (
    <Stack gap={4} data-testid="dependencies">
      <Text size="xs" c="dimmed" maw={560}>
        Blocks in the order the solver solved them. A dashed arrow means a block uses values an earlier block solved; it is not a physical connection. Equations in one block are solved together, in no order.
      </Text>
      <svg width={left + width + 10} height={y} role="group" aria-label="Solve dependencies" style={{ flexShrink: 0 }}>
        <defs>
          <marker id="dep-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0,0 L8,4 L0,8 z" fill={ink.subtext} />
          </marker>
        </defs>
        {links.map((l) => {
          const a = boxes[l.from]
          const b = boxes[l.to]
          const y1 = a.y + a.h - 8
          const y2 = b.y + 10
          const d = Math.min(left - 6, 14 + 12 * (l.to - l.from))
          return (
            <path key={`${l.from}-${l.to}`} data-dependency={`${l.from + 1}-${l.to + 1}`} d={`M ${left} ${y1} C ${left - d} ${y1}, ${left - d} ${y2}, ${left} ${y2}`} fill="none" stroke={ink.subtext} strokeWidth={1.2} strokeDasharray="5 4" markerEnd="url(#dep-arrow)">
              <title>{`Block ${l.to + 1} uses ${l.via.join(', ')} from block ${l.from + 1}`}</title>
            </path>
          )
        })}
        {blocks.map((b, k) => {
          const { y: top, h } = boxes[k]
          const together = b.equations.length > 1
          return (
            <g key={b.index} data-block={k + 1} role="group" aria-label={`Block ${k + 1}${together ? ', solved together' : ''}: solves ${b.variables.join(', ')}`}>
              <rect x={left} y={top} width={width} height={h} rx={6} fill={ink.block} stroke={ink.border} />
              <text x={left + 8} y={top + 15} fontSize={11} fontWeight={600} fill={ink.subtext}>
                {`Block ${k + 1}${together ? ' · solved together' : ''}`}
              </text>
              {b.equations.map((eq, e) => (
                <text key={eq} x={left + 8} y={top + 15 + ROW * (e + 1)} fontSize={11} fontFamily="monospace" fill={ink.text} role="button" tabIndex={0} aria-label={`Equation ${eq}`} style={{ cursor: 'pointer' }} onClick={() => onLine(eq)} onKeyDown={keyPress(() => onLine(eq))}>
                  {eq.length > 60 ? `${eq.slice(0, 59)}…` : eq}
                </text>
              ))}
              {b.variables.map((v, i) => {
                const value = valueOf(v)
                const on = pinned.has(v.toLowerCase())
                return (
                  <text
                    key={v}
                    x={left + 20}
                    y={top + 15 + ROW * (b.equations.length + i + 1)}
                    fontSize={11}
                    fill={on ? ink.badge : ink.subtext}
                    role="button"
                    tabIndex={0}
                    aria-pressed={on}
                    aria-label={`Card for ${v}`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => onPin(v.toLowerCase())}
                    onKeyDown={keyPress(() => onPin(v.toLowerCase()))}
                  >
                    {`${on ? '■' : '□'} ${v}${value ? ` = ${value}` : ''}`}
                  </text>
                )
              })}
            </g>
          )
        })}
      </svg>
    </Stack>
  )
}

const HANDOFFS: [SchematicHandoff, string][] = [
  ['plot', 'Plot'],
  ['table', 'Add to a parametric table'],
  ['state', 'Property diagram of its fluid'],
  ['sensitivity', 'Sensitivity of this output'],
]

/** A block's readings, port members labelled with their port (`in P`). */
function readingsOf(r: NodeReadout): Reading[] {
  return [...r.outputs, ...r.ports.flatMap((p) => p.readings.map((x) => ({ ...x, label: `${p.port} ${x.label}` })))]
}

/** RUN-03: one solved value, shown on the block or watched, in the unit and digits chosen for it. */
function ReadingRow({
  reading: r,
  shown,
  onShow,
  onFormat,
  handoff,
}: Readonly<{
  handoff?: Handoff
  reading: Reading
  shown?: { badge?: string; watch: readonly string[]; formats: Readonly<Record<string, VariableFormat>> }
  onShow?: (how: 'badge' | 'watch' | 'card', name: string) => void
  onFormat?: (name: string, f: VariableFormat | null) => void
}>) {
  const key = r.name.toLowerCase()
  const format = shown?.formats[key]
  const out = formatReading(r, format)
  const onBlock = shown?.badge === key
  const watched = shown?.watch.includes(key) ?? false
  return (
    <Group gap={4} justify="space-between" wrap="nowrap">
      <Text size="xs" c="dimmed">
        {r.label}
      </Text>
      <Group gap={2} wrap="nowrap">
        <Text size="xs" ff="monospace" c={out.stale ? 'orange' : undefined} title={out.stale ? `Shown in ${r.units}: ${format?.unit} was chosen for ${format?.from}` : undefined}>
          {out.text} {out.units}
        </Text>
        {onShow && (
          <>
            <ActionIcon size="xs" variant={onBlock ? 'light' : 'subtle'} color="gray" aria-pressed={onBlock} aria-label={`Show ${r.name} on the block`} onClick={() => onShow('badge', key)}>
              <IconPinned size={12} />
            </ActionIcon>
            <ActionIcon size="xs" variant={watched ? 'light' : 'subtle'} color="gray" aria-pressed={watched} aria-label={`Watch ${r.name}`} onClick={() => onShow('watch', key)}>
              <IconEye size={12} />
            </ActionIcon>
            <ActionIcon size="xs" variant="subtle" color="gray" aria-label={`Card for ${r.name} on the canvas`} onClick={() => onShow('card', key)}>
              <IconNote size={12} />
            </ActionIcon>
          </>
        )}
        {onFormat && <FormatButton reading={r} format={format} onChange={(f) => onFormat(key, f)} />}
        {handoff && (
          <Menu position="left-start" withinPortal shadow="md">
            <Menu.Target>
              <ActionIcon size="xs" variant="subtle" color="gray" aria-label={`Open ${r.name} in…`}>
                …
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              {HANDOFFS.map(([kind, label]) => {
                const why = handoff.reason(kind, r.name)
                return (
                  <Menu.Item key={kind} disabled={Boolean(why)} onClick={() => handoff.run(kind, r.name)}>
                    <Text size="xs">{label}</Text>
                    {why && (
                      <Text size="10px" c="dimmed" maw={220}>
                        {why}
                      </Text>
                    )}
                  </Menu.Item>
                )
              })}
            </Menu.Dropdown>
          </Menu>
        )}
      </Group>
    </Group>
  )
}

/** Display unit and digits for one variable. The engine checks a typed unit measures the same quantity; nothing is re-solved. */
function FormatButton({ reading: r, format, onChange }: Readonly<{ reading: Reading; format?: VariableFormat; onChange: (f: VariableFormat | null) => void }>) {
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { unit: _u, from: _f, scale: _s, shift: _h, ...digitsOnly } = format ?? {}
  const keep = (next: VariableFormat) => onChange(Object.keys(next).length > 0 ? next : null)
  const applyUnit = async () => {
    const unit = draft.trim()
    if (!unit || unit === r.units) return keep(digitsOnly)
    const c = (await wasmUnitConversions(r.units, [unit])).units[0]
    if (c?.scale === undefined) return setError(c?.error ?? `${unit} is not a unit.`)
    setError(null)
    keep({ ...format, unit, from: r.units, scale: c.scale, shift: c.shift ?? 0 })
  }
  return (
    <Popover position="left" withinPortal shadow="md" onOpen={() => setDraft(format?.from === r.units ? (format?.unit ?? '') : '')}>
      <Popover.Target>
        <ActionIcon size="xs" variant={format ? 'light' : 'subtle'} color="gray" aria-label={`Format ${r.name}`}>
          <IconAdjustments size={12} />
        </ActionIcon>
      </Popover.Target>
      <Popover.Dropdown p={6}>
        <Stack gap={4} w={210} data-testid="format-variable">
          <TextInput
            size="xs"
            label={`Display unit (solved in ${r.units || 'no unit'})`}
            placeholder={r.units}
            disabled={!r.units}
            value={draft}
            error={error}
            onChange={(e) => setDraft(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void applyUnit()
            }}
            onBlur={() => void applyUnit()}
          />
          <Select
            size="xs"
            label="Significant digits"
            data={['auto', ...Array.from({ length: 9 }, (_, k) => String(k + 2))]}
            value={format?.digits ? String(format.digits) : 'auto'}
            onChange={(v) => {
              const { digits: _d, ...rest } = format ?? {}
              keep(v && v !== 'auto' ? { ...rest, digits: Number(v) } : rest)
            }}
            comboboxProps={{ withinPortal: false }}
          />
          <Text size="10px" c="dimmed">
            Display only: the document and its inputs are unchanged.
          </Text>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  )
}

function ReadoutCard({
  node,
  readout,
  pinned,
  localType = false,
  identity,
  onRename,
  definitionLine,
  onRevealLine,
  styles,
  onStyle,
  spec,
  text,
  onSetParam,
  onNudge,
  onReveal,
  onFocus,
  shown,
  onShow,
  onFormat,
  handoff,
}: Readonly<{
  handoff?: Handoff
  node: SchematicNode
  readout: NodeReadout
  /** RUN-03: the block's chosen badge variable, the watch list and the formats. */
  shown?: { badge?: string; watch: readonly string[]; formats: Readonly<Record<string, VariableFormat>> }
  onShow?: (how: 'badge' | 'watch' | 'card', name: string) => void
  onFormat?: (name: string, f: VariableFormat | null) => void
  pinned: boolean
  localType?: boolean
  identity?: InstanceIdentityDto
  /** Rename the instance; returns why it cannot, or null once applied. */
  onRename?: (inst: InstanceIdentityDto, next: string) => string | null
  definitionLine?: (name: string) => number | null
  onRevealLine?: (line: number) => void
  styles?: BlockStyles
  onStyle?: (scope: StyleScope, key: string, next: BlockStyle | null) => void
  /** The catalog entry for the block's type, and the source, for the inspector. */
  spec?: ComponentSpec
  text?: string
  /** Bind a parameter to source text; returns why it cannot, or null once applied. */
  onSetParam?: (inst: InstanceIdentityDto, name: string, value: string) => string | null
  onNudge?: (dx: number, dy: number) => void
  onReveal?: () => void
  onFocus?: (kind: FocusKind) => void
}>) {
  const empty = readout.ports.length === 0 && readout.outputs.length === 0 && readout.params.length === 0
  const [draft, setDraft] = useState<string | null>(null)
  const [renameError, setRenameError] = useState<string | null>(null)
  const owner = identity?.definedIn ?? null
  const ownerLine = owner ? (definitionLine?.(owner) ?? null) : null
  const applyRename = () => {
    if (!identity || draft === null) return
    const problem = onRename?.(identity, draft.trim()) ?? null
    setRenameError(problem)
    if (!problem) setDraft(null)
  }
  return (
    <Paper
      withBorder
      shadow="md"
      p="xs"
      radius="sm"
      style={{
        position: 'absolute',
        right: 8,
        bottom: 8,
        maxWidth: 320,
        maxHeight: '70%',
        overflow: 'auto',
        pointerEvents: pinned ? 'auto' : 'none',
        zIndex: 5,
      }}
    >
      <Group gap={6} mb={4} wrap="nowrap">
        <Text size="sm" fw={700}>
          {node.label}
        </Text>
        <Text size="xs" c="dimmed">
          {node.type}
        </Text>
        {localType && (
          <Badge size="xs" variant="light" color="violet">
            local definition
          </Badge>
        )}
        {pinned && (
          <Badge size="xs" variant="light" color="teal" ml="auto">
            pinned
          </Badge>
        )}
        {onReveal && (
          <Button size="compact-xs" variant="subtle" onClick={onReveal}>
            Source
          </Button>
        )}
      </Group>
      {owner && (
        <Group gap={4} mb={4} wrap="nowrap" data-testid="instance-owner">
          <Text size="xs" c="violet">
            Defined in {owner} — editing changes every {owner}
          </Text>
          {ownerLine !== null && onRevealLine && (
            <Button size="compact-xs" variant="subtle" onClick={() => onRevealLine(ownerLine)}>
              Open definition
            </Button>
          )}
        </Group>
      )}
      {pinned && identity && onRename && (
        <Group gap={4} mb={4} wrap="nowrap" align="flex-start">
          {draft === null ? (
            <Button size="compact-xs" variant="default" onClick={() => setDraft(identity.name.split('.').pop() ?? '')}>
              Rename
            </Button>
          ) : (
            <>
              <TextInput
                size="xs"
                aria-label="New instance name"
                value={draft}
                error={renameError}
                autoFocus
                onChange={(e) => {
                  setDraft(e.currentTarget.value)
                  setRenameError(null)
                }}
                onKeyDown={(e) => {
                  e.stopPropagation()
                  if (e.key === 'Enter') applyRename()
                  if (e.key === 'Escape') setDraft(null)
                }}
              />
              <Button size="compact-xs" onClick={applyRename}>
                Apply
              </Button>
              <Button size="compact-xs" variant="default" onClick={() => setDraft(null)}>
                Cancel
              </Button>
            </>
          )}
        </Group>
      )}
      {styles && onStyle && <StyleEditor node={node} styles={styles} onStyle={onStyle} />}
      {onFocus && (
        <Group gap={4} mb={4}>
          <Button size="compact-xs" variant="default" onClick={() => onFocus('neighbours')}>
            Neighbours
          </Button>
          <Button size="compact-xs" variant="default" onClick={() => onFocus('trace')}>
            Trace net
          </Button>
          <Button size="compact-xs" variant="default" onClick={() => onFocus('circuit')}>
            Isolate circuit
          </Button>
        </Group>
      )}
      {onNudge && (
        <Group gap={4} mb={4}>
          <Button size="compact-xs" variant="default" aria-label="Nudge up" onClick={() => onNudge(0, -8)}>
            ↑
          </Button>
          <Button size="compact-xs" variant="default" aria-label="Nudge down" onClick={() => onNudge(0, 8)}>
            ↓
          </Button>
          <Button size="compact-xs" variant="default" aria-label="Nudge left" onClick={() => onNudge(-8, 0)}>
            ←
          </Button>
          <Button size="compact-xs" variant="default" aria-label="Nudge right" onClick={() => onNudge(8, 0)}>
            →
          </Button>
          <Text size="xs" c="dimmed">
            or arrow keys
          </Text>
        </Group>
      )}

      {empty && (
        <Text size="xs" c="dimmed">
          {SHAPE_LABELS[node.shape]} — no solved values yet. Press Solve.
        </Text>
      )}

      {readout.ports.map((p) => (
        <div key={p.port}>
          <Text size="xs" fw={600} c="dimmed" mt={4}>
            {p.port}
          </Text>
          {p.readings.map((r) => (
            <ReadingRow key={r.name} reading={r} shown={shown} onShow={onShow} onFormat={onFormat} handoff={handoff} />
          ))}
        </div>
      ))}

      {readout.outputs.length > 0 && (
        <>
          <Text size="xs" fw={600} c="teal" mt={6}>
            results
          </Text>
          {readout.outputs.map((r) => (
            <ReadingRow key={r.name} reading={r} shown={shown} onShow={onShow} onFormat={onFormat} handoff={handoff} />
          ))}
        </>
      )}

      {pinned && spec && identity && onSetParam ? (
        <ParamInspector spec={spec} identity={identity} text={text ?? ''} evaluated={readout.params} onSet={onSetParam} />
      ) : readout.params.length > 0 && (
        <>
          <Text size="xs" fw={600} c="dimmed" mt={6}>
            parameters
          </Text>
          {readout.params.map((p) => (
            <Group key={p.name} gap={6} justify="space-between" wrap="nowrap" align="start">
              <Text size="xs" c="dimmed">
                {p.name}
              </Text>
              <Text size="xs" ff="monospace" ta="right">
                {p.text}
              </Text>
            </Group>
          ))}
        </>
      )}
    </Paper>
  )
}

/**
 * Pointer dragging for both the canvas (pan) and individual blocks (move).
 * Kept in one hook because they share the same pointer-capture bookkeeping and
 * the same "did this actually move?" test that stops a drag from firing the
 * click handler underneath it.
 */
function useDragging(
  zoom: number,
  onMove: (ids: readonly string[], start: Positions, dx: number, dy: number) => void,
  setView: React.Dispatch<React.SetStateAction<View>>,
  onDragEnd: () => void,
  takeControl: () => void,
  onBackgroundClick: () => void,
) {
  // `ids` null is a pan; otherwise the blocks being dragged together, from
  // their positions when the drag began (x0, y0).
  const state = useRef<{
    ids: string[] | null
    x: number
    y: number
    x0: number
    y0: number
    start: Positions
    moved: boolean
  } | null>(null)
  const latest = useRef({ onBackgroundClick, onMove })
  useEffect(() => {
    latest.current = { onBackgroundClick, onMove }
  })
  const [panning, setPanning] = useState(false)

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const s = state.current
      if (!s) {
        return
      }
      const dx = e.clientX - s.x
      const dy = e.clientY - s.y
      if (Math.abs(e.clientX - s.x0) + Math.abs(e.clientY - s.y0) > 3) {
        s.moved = true
      }
      // A drag or pan is the user taking the view; auto-fit must not chase it.
      if (s.moved) {
        takeControl()
      }
      s.x = e.clientX
      s.y = e.clientY
      if (s.ids === null) {
        setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }))
        return
      }
      if (s.moved) {
        latest.current.onMove(s.ids, s.start, (e.clientX - s.x0) / zoom, (e.clientY - s.y0) / zoom)
      }
    }
    const up = () => {
      const s = state.current
      if (s?.ids === null) {
        setPanning(false)
        if (!s.moved) {
          latest.current.onBackgroundClick()
        }
      } else if (s?.moved) {
        // One workspace update per drag, not per frame.
        onDragEnd()
      }
      // Keep `moved` readable for the click that fires right after pointerup.
      setTimeout(() => {
        state.current = null
      }, 0)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }, [zoom, setView, onDragEnd, takeControl])

  return {
    panning,
    moved: () => state.current?.moved === true,
    /** Drop a pan in progress: a second finger turns it into a pinch. */
    cancel: () => {
      if (state.current?.ids === null) {
        state.current = null
        setPanning(false)
      }
    },
    startPan: (e: React.PointerEvent) => {
      // Only the first finger pans; a second one is a pinch (usePanZoom).
      if (e.button !== 0 || !e.isPrimary || state.current) {
        return
      }
      state.current = { ids: null, x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, start: {}, moved: false }
      setPanning(true)
    },
    startNode: (e: React.PointerEvent, ids: string[], start: Positions) => {
      if (e.button !== 0 || !e.isPrimary) {
        return
      }
      e.stopPropagation()
      state.current = { ids, x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, start, moved: false }
    },
  }
}

/**
 * Overview of the whole drawing with the visible area outlined, shown only
 * while part of the drawing is out of view. Click or drag on it to move there.
 * Mouse-only by design: Fit all / Fit selection are the keyboard route.
 */
function Minimap({
  ink,
  nodes,
  bounds,
  view,
  viewport,
  onCenter,
}: Readonly<{
  ink: SchematicInk
  nodes: readonly SchematicNode[]
  bounds: Box
  view: View
  viewport: { w: number; h: number }
  onCenter: (p: { x: number; y: number }) => void
}>) {
  const visible = visibleBox(view, viewport.w, viewport.h)
  if (viewport.w === 0 || contains(visible, bounds)) {
    return null
  }
  const v = { x: visible.minX, y: visible.minY, w: visible.w, h: visible.h }
  const world = boxAround([{ x: bounds.minX, y: bounds.minY, w: bounds.w, h: bounds.h }, v])!
  const scale = Math.min(160 / world.w, 120 / world.h)
  const toWorld = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    onCenter({ x: world.minX + (e.clientX - r.left) / scale, y: world.minY + (e.clientY - r.top) / scale })
  }
  return (
    <svg
      aria-hidden
      data-testid="schematic-minimap"
      width={world.w * scale}
      height={world.h * scale}
      viewBox={`${world.minX} ${world.minY} ${world.w} ${world.h}`}
      style={{
        position: 'absolute',
        left: 8, // the readout card holds the bottom-right corner
        bottom: 8,
        background: ink.minimap,
        border: `1px solid ${ink.border}`,
        borderRadius: 4,
        cursor: 'pointer',
      }}
      onPointerDown={(e) => {
        e.stopPropagation()
        e.currentTarget.setPointerCapture(e.pointerId)
        toWorld(e)
      }}
      onPointerMove={(e) => {
        if (e.buttons === 1) {
          toWorld(e)
        }
      }}
    >
      {nodes.map((n) => (
        <rect key={n.id} x={n.x} y={n.y} width={n.w} height={n.h} fill={ink.minimapNode} />
      ))}
      <rect
        x={v.x}
        y={v.y}
        width={v.w}
        height={v.h}
        fill={ink.marqueeFill}
        stroke={ink.marquee}
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

/**
 * Wheel and touch navigation. Ctrl/⌘+wheel — which is also what a trackpad
 * pinch sends — zooms about the pointer; a plain wheel or two-finger scroll
 * pans. Two touch pointers pinch-zoom about their midpoint and pan with it.
 * The wheel listener is native because React's is passive and cannot stop the
 * browser zooming the whole page.
 */
function usePanZoom(
  viewportRef: React.RefObject<HTMLDivElement | null>,
  drawn: boolean,
  zoomBy: (factor: number, at: { x: number; y: number }) => void,
  setView: React.Dispatch<React.SetStateAction<View>>,
  takeControl: () => void,
  cancelPan: () => void,
) {
  const zoomRef = useRef(zoomBy)
  const cancelRef = useRef(cancelPan)
  useEffect(() => {
    zoomRef.current = zoomBy
    cancelRef.current = cancelPan
  })
  useEffect(() => {
    const el = viewportRef.current
    if (!el) {
      return
    }
    const local = (e: { clientX: number; clientY: number }) => {
      const r = el.getBoundingClientRect()
      return { x: e.clientX - r.left, y: e.clientY - r.top }
    }
    const wheel = (e: WheelEvent) => {
      e.preventDefault()
      if (e.ctrlKey || e.metaKey) {
        // A mouse notch (~100) is one 10 % step; a pinch sends small deltas.
        zoomRef.current(1.001 ** -Math.max(-100, Math.min(100, e.deltaY)), local(e))
      } else {
        takeControl()
        setView((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }))
      }
    }
    const touches = new Map<number, { x: number; y: number }>()
    const spread = () => {
      const [a, b] = [...touches.values()]
      return { d: Math.hypot(a.x - b.x, a.y - b.y), mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } }
    }
    const down = (e: PointerEvent) => {
      if (e.pointerType === 'touch') {
        touches.set(e.pointerId, local(e))
        if (touches.size === 2) {
          cancelRef.current()
        }
      }
    }
    const move = (e: PointerEvent) => {
      if (!touches.has(e.pointerId)) {
        return
      }
      if (touches.size !== 2) {
        touches.set(e.pointerId, local(e))
        return
      }
      const before = spread()
      touches.set(e.pointerId, local(e))
      const after = spread()
      takeControl()
      setView((v) => ({ ...v, x: v.x + after.mid.x - before.mid.x, y: v.y + after.mid.y - before.mid.y }))
      if (before.d > 0) {
        zoomRef.current(after.d / before.d, after.mid)
      }
    }
    const up = (e: PointerEvent) => touches.delete(e.pointerId)
    el.addEventListener('wheel', wheel, { passive: false })
    el.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      el.removeEventListener('wheel', wheel)
      el.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [viewportRef, drawn, setView, takeControl])
}

/** "a.out → b.in  (EG50 · liquid)" — the hover description of one connection. */
const OVERLAY_DASH = { missing: '2 4', nonfinite: '1 3', unit: '8 3 2 3', value: undefined }

/** WIRE-10: a measured-flow arrowhead at the middle of a wire's longest run. */
function FlowArrow({ pts, dir, fill }: Readonly<{ pts: readonly { x: number; y: number }[]; dir: 1 | -1; fill: string }>) {
  let k = 1
  for (let i = 2; i < pts.length; i++) if (Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y) > Math.hypot(pts[k].x - pts[k - 1].x, pts[k].y - pts[k - 1].y)) k = i
  const [a, b] = [pts[k - 1], pts[k]]
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1
  const [ux, uy] = [((b.x - a.x) / len) * dir, ((b.y - a.y) / len) * dir]
  const [mx, my] = [(a.x + b.x) / 2, (a.y + b.y) / 2]
  const d = `M ${mx + ux * 5} ${my + uy * 5} L ${mx - ux * 4 - uy * 4} ${my - uy * 4 + ux * 4} L ${mx - ux * 4 + uy * 4} ${my - uy * 4 - ux * 4} Z`
  return <path data-arrow={dir > 0 ? 'forward' : 'reverse'} d={d} fill={fill} pointerEvents="none" />
}

function edgeTitle(e: SchematicEdge): string {
  const from = endpointName(e.from, e.fromPort)
  const to = endpointName(e.to, e.toPort)
  return `${from} → ${to}  (${lineDescription(e)})`
}

function endpointName(instance: string, port?: string): string {
  return port ? `${instance}.${port}` : instance
}

/** What flows in a line: its fluid qualified by connector type, or — outside
 *  the fluid domain, where neither exists — the domain itself. */
function lineDescription(e: SchematicEdge): string {
  if (!e.fluid) {
    return e.domain
  }
  return e.connector ? `${e.fluid} · ${e.connector}` : e.fluid
}

/** Terminals (sources, sinks, grounds) get a lighter outline to go with their
 *  dashed border — they bound the model rather than being part of it. */
/** "q = 6444.3 W" — the one number printed on a block. */
function badgeText(badge: Reading & { format?: VariableFormat }, digits?: number): string {
  const shown = formatReading(badge, { digits, ...badge.format })
  return `${badge.label} = ${shown.text}${shown.units ? ` ${shown.units}` : ''}`
}
