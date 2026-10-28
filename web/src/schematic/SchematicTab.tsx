import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Kbd,
  Menu,
  Paper,
  Popover,
  SegmentedControl,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
  Tooltip,
  useComputedColorScheme,
} from '@mantine/core'
import {
  IconAdjustments,
  IconArrowsMaximize,
  IconDownload,
  IconLock,
  IconLayoutGrid,
  IconZoomIn,
  IconZoomOut,
} from '@tabler/icons-react'
import type { CheckResponse, ComponentResult, VariableResult } from '../api'
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
  type ArrangeOp,
  type FocusKind,
  type PortSide,
  type SchematicEdge,
  type SchematicNode,
} from './layout'
import { glyphFillPath, glyphPath, SHAPE_LABELS } from './symbols'
import { encapsulateSelection } from './encapsulation'
import { badgeFor, formatCompact, indexVariables, readoutFor, type NodeReadout } from './readouts'
import { COMPONENT_CATALOG } from '../componentCatalog'
import { boxAround, contains, frameBox, visibleBox, zoomAbout, type Box, type View } from './viewport'
import {
  arrangeBase,
  EMPTY_PRESENTATION,
  framesFor,
  guideSnap,
  resolveLegacy,
  snapToGrid,
  type SchematicPresentation,
  type ViewSettings,
} from './presentation'
import {
  alreadyConnected,
  connectStatement,
  endpointRef,
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
  onInsertBlock?: (block: string) => void
  /** How the drawing is presented — placed blocks, locks, areas, view
   *  settings — owned by the workspace so it rides the project file; the
   *  network itself is regenerated from the document on every check. */
  presentation?: SchematicPresentation
  onPresentationChange?: (next: SchematicPresentation) => void
  /** Instance ids to emphasize from a Check diagnosis (free quantities). */
  highlightIds?: readonly string[]
}

type Positions = SchematicPresentation['positions']

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
  onEmitStatement,
  onInsertBlock,
  presentation: saved,
  onPresentationChange,
  highlightIds = [],
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
  const presRef = useRef<SchematicPresentation>(saved ?? EMPTY_PRESENTATION)
  const [pres, setPres] = useState(saved ?? EMPTY_PRESENTATION)
  const applyPres = useCallback((next: SchematicPresentation) => {
    presRef.current = next
    setPres(next)
  }, [])
  /** Change the presentation and publish it at once — anything but a drag frame. */
  const updatePres = (change: (p: SchematicPresentation) => SchematicPresentation) => {
    const next = change(presRef.current)
    applyPres(next)
    onPresentationChange?.(next)
  }
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
  const [componentName, setComponentName] = useState('CustomComponent')
  const toggle = (key: 'snap' | 'guides' | 'portLabels', on: boolean) => setSettings((s) => ({ ...s, [key]: on }))
  // A user area being named (VIEW-05), and v3 positions that matched no block.
  const [areaName, setAreaName] = useState<string | null>(null)
  const [unresolved, setUnresolved] = useState(0)
  // Alignment lines shown while a drag sits on one.
  const [guides, setGuides] = useState<{ xs: number[]; ys: number[] } | null>(null)
  const lastEmitted = useRef<{ a: string; b: string } | null>(null)

  const connections = useMemo(() => checkResult?.connections ?? [], [checkResult])

  const labels = useMemo(() => {
    const map = new Map<string, { label: string; type?: string }>()
    // The document covers the un-solved case; Check identity then a solve
    // refine nested scopes the text scan cannot distinguish.
    for (const [instance, hit] of documentInstances(text)) {
      map.set(instance, hit)
    }
    for (const i of checkResult?.instances ?? []) {
      map.set(i.name.toLowerCase(), { label: i.label, type: i.type })
    }
    for (const c of components ?? []) {
      map.set(c.name.toLowerCase(), { label: c.name, type: c.type })
    }
    return map
  }, [checkResult, components, text])

  const declaredIds = useMemo(() => [...documentInstances(text).keys()], [text])
  // The canvas element exists only while there is something to draw; effects
  // that attach to it re-run when it appears.
  const drawn = connections.length > 0 || declaredIds.length > 0

  // The document wires components but the canvas has no topology. Either no
  // check has run since the last edit (checkResult is null), or one ran and
  // did not get far enough to expand the network. Only the second is an error.
  const topologyMissing = useMemo(
    () => connections.length === 0 && /^\s*connect\s*\(/im.test(text),
    [connections, text],
  )

  /** Each instance's declared ports, by component type, so unwired ports show. */
  const portsByInstance = useMemo(() => {
    const byType = new Map(COMPONENT_CATALOG.map((c) => [c.type.toLowerCase(), c.ports]))
    const out = new Map<string, readonly string[]>()
    for (const [instance, hit] of documentInstances(text)) {
      const ports = byType.get(hit.type.toLowerCase())
      if (ports && ports.length > 0) {
        out.set(instance, ports)
      }
    }
    return out
  }, [text])

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
    () => arrangeBase(rawLayout, { spacing: settings.spacing, orientation: settings.orientation }),
    [rawLayout, settings.spacing, settings.orientation],
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
      const p = pres.positions[n.id]
      map.set(n.id, p ? { ...n, x: p.x, y: p.y } : n)
    }
    return map
  }, [layout.nodes, pres.positions])

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
  // Every wire routed once per arrangement, against the blocks and each other.
  const routes = useMemo(() => routeAll(layout.edges, positioned, placed), [layout.edges, positioned, placed])
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
    return { minX, minY, w: maxX - minX, h: maxY - minY }
  }, [layout.width, layout.height, groups, areaFrames, positioned])

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

  const nodeKey = layout.nodes.map((n) => n.id).join(',')

  /**
   * Hands the current arrangement to the workspace, so it rides the project
   * file. Positions of blocks the document no longer declares are dropped here
   * rather than as the network changes: a stale entry is harmless to draw (no
   * node looks it up), and pruning at save time means editing a document never
   * discards a position the user set on a block that survives the edit.
   */
  const commit = useCallback(() => {
    if (!onPresentationChange) {
      return
    }
    const alive = new Set(nodeKey.split(','))
    const positions = Object.fromEntries(Object.entries(presRef.current.positions).filter(([id]) => alive.has(id)))
    onPresentationChange({ ...presRef.current, positions })
  }, [nodeKey, onPresentationChange])

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
    const preview = previewWire(from, to, connections)
    if (!preview.ok) {
      setWireNote(preview.reason)
      setPendingPort(null)
      return
    }
    const statement = connectStatement(from, to)
    lastEmitted.current = { a: endpointRef(from), b: endpointRef(to) }
    onEmitStatement(statement)
    setPendingPort(null)
    setSelectFrom(null)
    setSelectTo(null)
    setWireNote(`Connection added; checking…  Undo (Ctrl+Z) removes the statement.`)
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
  const moveBlocks = (deltas: ReadonlyMap<string, { dx: number; dy: number }>) => {
    const positions = { ...presRef.current.positions }
    for (const [id, d] of deltas) {
      const n = positioned.get(id)
      if (n && !lockedIds.has(id)) {
        positions[id] = { x: n.x + d.dx, y: n.y + d.dy }
      }
    }
    takeControl()
    updatePres((p) => ({ ...p, positions }))
  }
  /** Lock (or unlock) the selection where it is drawn now. */
  const lockSelection = (on: boolean) =>
    updatePres((p) => ({
      ...p,
      positions: on ? { ...p.positions, ...Object.fromEntries(selection.flatMap((id) => { const n = positioned.get(id); return n ? [[id, { x: n.x, y: n.y }]] : [] })) } : p.positions,
      locked: on ? [...new Set([...p.locked, ...selection])] : p.locked.filter((id) => !selection.includes(id)),
    }))
  const addArea = (label: string) => {
    updatePres((p) => ({ ...p, areas: [...p.areas, { id: `area-${Date.now().toString(36)}`, label, members: selection }] }))
    setAreaName(null)
  }
  const removeAreas = () => updatePres((p) => ({ ...p, areas: p.areas.filter((a) => !a.members.some((m) => selection.includes(m))) }))
  const nudge = (dx: number, dy: number) => moveBlocks(new Map(selection.map((id) => [id, { dx, dy }])))
  const arrange = (op: ArrangeOp) => moveBlocks(arrangeDeltas(op, selection.flatMap((id) => positioned.get(id) ?? [])))
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

  const exportSvg = () => {
    const svg = svgRef.current
    if (!svg) {
      return
    }
    // The live viewBox frames what is on screen; an export has to frame the
    // whole drawing, including anything the user has dragged out of view.
    const { minX, minY, w, h } = bounds
    const clone = svg.cloneNode(true) as SVGSVGElement
    clone.querySelector('[data-background]')?.remove()
    clone.setAttribute('viewBox', `${minX} ${minY} ${w} ${h}`)
    clone.setAttribute('width', String(Math.round(w)))
    clone.setAttribute('height', String(Math.round(h)))
    const xml = new XMLSerializer().serializeToString(clone)
    const blob = new Blob([xml], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'schematic.svg'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

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
    const positions = { ...presRef.current.positions }
    for (const id of ids) {
      if (start[id]) {
        positions[id] = { x: start[id].x + dx, y: start[id].y + dy }
      }
    }
    applyPres({ ...presRef.current, positions })
  }
  const endDrag = useCallback(() => {
    setGuides(null)
    commit()
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

  if (!drawn) {
    return (
      <Stack gap="xs" p="md" align="center" justify="center" h="100%">
        <Text size="sm" c="dimmed" ta="center" maw={430}>
          No component network to draw. Instantiate components and wire them — with
          <Text span ff="monospace" size="sm">{' connect(a.out, b.in) '}</Text>
          or by sharing a stream name — then press Check.
        </Text>
      </Stack>
    )
  }

  return (
    <Stack gap={4} h="100%" style={{ minHeight: 0, position: 'relative' }}>
      <Group gap="xs" px="xs" pt={4} wrap="wrap">
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
        {onInsertBlock && selected.size > 1 && (
          <Group gap={4} wrap="nowrap">
            <TextInput size="xs" value={componentName} onChange={(e) => setComponentName(e.currentTarget.value)} w={150} aria-label="Custom component name" />
            <Button size="compact-xs" onClick={() => {
              try {
                onInsertBlock(encapsulateSelection({ name: componentName, selected, nodes: layout.nodes, edges: layout.edges, source: text }))
                setSelected(new Set())
              } catch (error) {
                setWireNote(error instanceof Error ? error.message : String(error))
              }
            }}>Encapsulate</Button>
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
        {unresolved > 0 && (
          <Text size="xs" c="orange">
            {unresolved} saved block position{unresolved === 1 ? '' : 's'} from an older file match no block; kept in the project for recovery
          </Text>
        )}
        <Group gap={2} ml="auto">
          {selection.length > 1 && (
            <Badge size="xs" variant="light" color="yellow" mr={4}>
              {selection.length} selected
            </Badge>
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
              <Button size="compact-xs" variant="subtle" color="gray" disabled={selection.length === 0}>
                Arrange
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
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
              {selection.every((id) => lockedIds.has(id)) ? (
                <Menu.Item onClick={() => lockSelection(false)}>Unlock position</Menu.Item>
              ) : (
                <Menu.Item onClick={() => lockSelection(true)}>Lock position</Menu.Item>
              )}
              <Menu.Item onClick={() => setAreaName(`Area ${pres.areas.length + 1}`)}>Frame as area…</Menu.Item>
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
          <Tooltip label="Fit all (Shift+1)">
            <ActionIcon size="sm" variant="subtle" aria-label="Fit to window" onClick={fit}>
              <IconArrowsMaximize size={15} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Reset layout">
            <ActionIcon
              size="sm"
              variant="subtle"
              aria-label="Reset layout"
              onClick={() => {
                // Locked blocks keep their place; v3 positions not yet placed are dropped.
                updatePres((p) => ({ ...p, positions: Object.fromEntries(Object.entries(p.positions).filter(([id]) => lockedIds.has(id))), legacyOffsets: {} }))
                fit()
              }}
            >
              <IconLayoutGrid size={15} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Export SVG">
            <ActionIcon size="sm" variant="subtle" aria-label="Export SVG" onClick={exportSvg}>
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
          // e.code: Shift+1 types "!" on most layouts.
          const command = e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey
            ? { Digit1: fit, Digit2: fitSelection, Digit0: () => zoomBy(1 / zoom) }[e.code]
            : undefined
          if (command) {
            e.preventDefault()
            command()
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
              return (
                <path
                  key={e.id}
                  data-net={netOf(e)}
                  d={pathOf(pts, hops.get(e.id))}
                  fill="none"
                  stroke={style.color}
                  strokeWidth={lit ? style.width + 1.2 : style.width}
                  strokeDasharray={style.dash}
                  strokeLinecap={style.cap}
                  strokeLinejoin="round"
                  strokeOpacity={out ? 0.15 : 0.95}
                >
                  <title>{edgeTitle(e)}</title>
                </path>
              )
            })}
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
                  zoom={zoom}
                  room={chipRoom.get(n.id) ?? { left: Infinity, right: Infinity }}
                  ink={ink}
                  locked={lockedIds.has(n.id)}
                  namesOnly={settings.detail === 'names'}
                  portLabels={settings.portLabels}
                  badge={badgeFor(n, readouts.get(n.id) ?? { ports: [], outputs: [], params: [] })}
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
                />
              )
            })}
          </g>
          {guides && (
            <g data-testid="schematic-guides" pointerEvents="none" stroke={ink.guide} strokeWidth={1 / zoom} strokeDasharray={`${4 / zoom} ${3 / zoom}`}>
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

      {activeNode && activeReadout && (
        <ReadoutCard
          node={activeNode}
          readout={activeReadout}
          pinned={pinned === activeNode.id}
          localType={
            checkResult?.instances?.find((i) => i.name.toLowerCase() === activeNode.id)?.localType ??
            false
          }
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
  badge: { label: string; value: number; units: string } | null
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
}: Readonly<BlockProps>) {
  const glyph = glyphPath(node.shape)
  const GLYPH = 20
  // Level of detail: once the full card's name would draw below MIN_LABEL_PX,
  // show only the name, held at MIN_LABEL_PX on screen whatever the zoom.
  const chip = namesOnly || zoom * LABEL_FONT < MIN_LABEL_PX
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
        stroke={highlighted ? ink.highlight : active ? ink.active : node.terminal ? ink.borderTerminal : ink.border}
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
          <path
            d={glyph}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.2}
            vectorEffect="non-scaling-stroke"
          />
          <path d={glyphFillPath(node.shape)} fill="currentColor" />
        </g>
      )}
      {!chip && (
        <text x={GLYPH + 12} y={badge ? 19 : 22} fontSize={LABEL_FONT} fontWeight={600} fill={ink.text}>
          {node.label}
        </text>
      )}
      {!chip && (
        <text x={GLYPH + 12} y={badge ? 31 : 36} fontSize={10} fill={ink.subtext}>
          {node.type}
        </text>
      )}
      {!chip && badge && (
        <text x={GLYPH + 12} y={44} fontSize={10.5} fontWeight={600} fill={ink.badge}>
          {badgeText(badge)}
        </text>
      )}
      {locked && <IconLock x={node.w - 13} y={2} size={11} color={ink.subtext} aria-hidden />}
      {node.ports.map((p) => {
        const armed = pendingPort?.instance === node.id && pendingPort?.port === p.port
        const color = p.lineId ? styleOf(p.lineId).color : ink.portIdle
        return (
          <g
            key={p.port}
            tabIndex={wiring ? 0 : undefined}
            role={wiring ? 'button' : undefined}
            aria-label={`${node.label}.${p.port} port`}
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
              <circle cx={p.dx} cy={p.dy} r={10} fill="transparent" />
            )}
            <circle
              cx={p.dx}
              cy={p.dy}
              r={armed ? 5 : 3.2}
              fill={armed ? ink.active : color}
              stroke={ink.halo}
              strokeWidth={1}
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
function ReadoutCard({
  node,
  readout,
  pinned,
  localType = false,
  onNudge,
  onReveal,
  onFocus,
}: Readonly<{
  node: SchematicNode
  readout: NodeReadout
  pinned: boolean
  localType?: boolean
  onNudge?: (dx: number, dy: number) => void
  onReveal?: () => void
  onFocus?: (kind: FocusKind) => void
}>) {
  const empty = readout.ports.length === 0 && readout.outputs.length === 0 && readout.params.length === 0
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
            <Group key={r.label} gap={6} justify="space-between" wrap="nowrap">
              <Text size="xs" c="dimmed">
                {r.label}
              </Text>
              <Text size="xs" ff="monospace">
                {formatCompact(r.value)} {r.units}
              </Text>
            </Group>
          ))}
        </div>
      ))}

      {readout.outputs.length > 0 && (
        <>
          <Text size="xs" fw={600} c="teal" mt={6}>
            results
          </Text>
          {readout.outputs.map((r) => (
            <Group key={r.label} gap={6} justify="space-between" wrap="nowrap">
              <Text size="xs" c="dimmed">
                {r.label}
              </Text>
              <Text size="xs" ff="monospace">
                {formatCompact(r.value)} {r.units}
              </Text>
            </Group>
          ))}
        </>
      )}

      {readout.params.length > 0 && (
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
function badgeText(badge: { label: string; value: number; units: string }): string {
  const unit = badge.units ? ` ${badge.units}` : ''
  return `${badge.label} = ${formatCompact(badge.value)}${unit}`
}
