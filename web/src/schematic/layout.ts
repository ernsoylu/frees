// Geometry for the rendered component schematic. Pure functions over the
// backend's connection topology — no DOM, no React, so it is unit-testable.
//
// This lays out a CIRCUIT, not a graph. Three things follow from that:
//
//  1. Circuits are separated. A coolant loop and a refrigerant loop share the
//     bond-graph domain `fluid`, so a domain-only drawing braids them into one
//     ladder. Here the connection's connector type and working fluid partition
//     the network into circuits, and each circuit is laid out and framed on its
//     own band — which is how the same system reads on paper.
//
//  2. Flow sets the direction. The network is acausal, but the PORT NAMES are
//     not: `connect(A.out, B.in)` says A feeds B. Layering is longest-path over
//     that inferred flow direction, so a circuit reads source → … → sink left to
//     right instead of breadth-first out of whichever node happened to have the
//     most edges.
//
//  3. Couplings are visible as couplings. A heat, signal or mechanical node
//     between two fluid circuits is what makes the model one system (the
//     chiller wall tying refrigerant to coolant, say). Those attach to the top
//     and bottom of a block rather than its flow faces, so a cross-circuit
//     coupling never looks like more pipework.
//
// Routing is deliberately NOT baked into the layout: nodes can be dragged, so
// edge paths are recomputed from live positions at render time.

import { lineId, type LineKey } from './palette'
import { symbolOf, type Shape } from './symbols'

/** One connection node as the backend reports it. */
export interface Connection {
  domain: string
  endpoints: string[]
  /** Fluid connector type (`liquid`, `twophase`, …); absent outside fluid. */
  connector?: string | null
  /** Working fluid the node carries, when the model named one. */
  fluid?: string | null
  /** Per endpoint, the display prefix its member variables use — aligned with
   *  `endpoints` by index. Lets the drawing show an endpoint's solved state. */
  streams?: string[]
}

export type PortSide = 'left' | 'right' | 'top' | 'bottom'

export interface PortAnchor {
  port: string
  side: PortSide
  /** Offset from the node origin — absolute position is node.x + dx. */
  dx: number
  dy: number
  /** Line this port carries, when it is wired; drives the stub's color. */
  lineId?: string
}

export interface SchematicNode {
  /** Canonical lowercase instance name (matches endpoint prefixes). */
  id: string
  /** Display label — the instance name as written, when known. */
  label: string
  /** Component type when the document or a solve supplied it. */
  type?: string
  shape: Shape
  /** True for a model boundary (source/sink/ground) — drawn as a terminal. */
  terminal: boolean
  kind: 'instance' | 'junction'
  /** Id of the circuit band this node is drawn in. */
  group: string
  x: number
  y: number
  w: number
  h: number
  ports: PortAnchor[]
}

export interface SchematicEdge {
  id: string
  /** Line identity — what flows here; keys into the style map. */
  lineId: string
  domain: string
  connector?: string | null
  fluid?: string | null
  from: string
  to: string
  fromPort?: string
  toPort?: string
  /** Variable display prefixes at each end (`chlr.in`, `s2`), for readouts. */
  fromStream?: string
  toStream?: string
}

/**
 * Where the user has dragged each block, as an OFFSET from the position the
 * auto-layout gave it, keyed by lowercase instance name.
 *
 * Offsets rather than absolute coordinates, because the drawing is regenerated
 * from the document on every check: a component that gains an upstream stage
 * moves, and an absolute position saved against the old layout would leave the
 * block stranded — possibly on top of another one. An offset means "this far
 * from wherever the layout puts it", which survives the document growing.
 */
export type SchematicOffsets = Record<string, { dx: number; dy: number }>

/** One circuit: a connected run of a single line kind, framed and titled. */
export interface SchematicGroup {
  id: string
  label: string
  lineId: string
  x: number
  y: number
  w: number
  h: number
}

/**
 * Circuit frames for the nodes where they are now drawn. A frame keeps its laid
 * out extent and grows to enclose any member dragged past it, with the same
 * padding and title row the layout gives it, so a moved node never leaves its
 * circuit. Frames never shrink: the band order stays readable.
 */
export function framedGroups(groups: SchematicGroup[], nodes: Iterable<SchematicNode>): SchematicGroup[] {
  const byGroup = new Map<string, SchematicNode[]>()
  for (const n of nodes) {
    byGroup.set(n.group, [...(byGroup.get(n.group) ?? []), n])
  }
  return groups.map((g) => {
    let minX = g.x
    let minY = g.y
    let maxX = g.x + g.w
    let maxY = g.y + g.h
    for (const n of byGroup.get(g.id) ?? []) {
      minX = Math.min(minX, n.x - GROUP_PAD)
      minY = Math.min(minY, n.y - GROUP_TITLE - GROUP_PAD / 2)
      maxX = Math.max(maxX, n.x + n.w + GROUP_PAD)
      maxY = Math.max(maxY, n.y + n.h + GROUP_PAD)
    }
    return { ...g, x: minX, y: minY, w: maxX - minX, h: maxY - minY }
  })
}

/**
 * What an explicit context command shows, starting from one block:
 * - `neighbours`: the block and every block one connection away (a junction
 *   is passed through, not counted as the hop);
 * - `trace`: everything reachable along the lines the block itself sits on, so
 *   a heat exchanger traces both of its loops;
 * - `circuit`: the block's own circuit frame and the wires inside it.
 */
export type FocusKind = 'neighbours' | 'trace' | 'circuit'

export function focusOf(
  kind: FocusKind,
  start: string,
  nodes: readonly SchematicNode[],
  edges: readonly SchematicEdge[],
): { nodes: Set<string>; edges: Set<string> } {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  if (kind === 'circuit') {
    const group = byId.get(start)?.group
    const inside = new Set(nodes.filter((n) => n.group === group).map((n) => n.id))
    return { nodes: inside, edges: new Set(edges.filter((e) => inside.has(e.from) && inside.has(e.to)).map((e) => e.id)) }
  }
  const lines = new Set(edges.filter((e) => e.from === start || e.to === start).map((e) => e.lineId))
  const follow = (e: SchematicEdge) => kind === 'neighbours' || lines.has(e.lineId)
  const expand = (id: string) => kind === 'trace' || id === start || byId.get(id)?.kind === 'junction'
  const seen = { nodes: new Set([start]), edges: new Set<string>() }
  const queue = [start]
  while (queue.length > 0) {
    const u = queue.pop()!
    if (!expand(u)) {
      continue
    }
    for (const e of edges) {
      if ((e.from === u || e.to === u) && follow(e)) {
        seen.edges.add(e.id)
        const v = e.from === u ? e.to : e.from
        if (!seen.nodes.has(v)) {
          seen.nodes.add(v)
          queue.push(v)
        }
      }
    }
  }
  return seen
}

/** The connection set an edge was drawn for: one `connect(...)` or shared stream.
 *  A set of three or more ends is drawn as junction spokes `c<i>_<k>`. */
export function netOf(e: SchematicEdge): string {
  return e.id.split('_')[0]
}

/** Every block reachable from `start` along any connection, whatever its line. */
export function connectedTo(start: Iterable<string>, edges: readonly SchematicEdge[]): Set<string> {
  const seen = new Set(start)
  const queue = [...seen]
  while (queue.length > 0) {
    const u = queue.pop()!
    for (const e of edges) {
      const v = e.from === u ? e.to : e.to === u ? e.from : null
      if (v !== null && !seen.has(v)) {
        seen.add(v)
        queue.push(v)
      }
    }
  }
  return seen
}

export type ArrangeOp = 'left' | 'centre' | 'right' | 'top' | 'middle' | 'bottom' | 'spread-x' | 'spread-y'

type Placed = { id: string; x: number; y: number; w: number; h: number }

/**
 * How far each block moves to align the set on a shared edge or centre line
 * of their bounding box, or to spread them with equal gaps between
 * neighbours (the outermost two stay put; needs three or more).
 */
export function arrangeDeltas(op: ArrangeOp, boxes: readonly Placed[]): Map<string, { dx: number; dy: number }> {
  const out = new Map<string, { dx: number; dy: number }>()
  if (boxes.length < 2) {
    return out
  }
  const minX = Math.min(...boxes.map((b) => b.x))
  const maxX = Math.max(...boxes.map((b) => b.x + b.w))
  const minY = Math.min(...boxes.map((b) => b.y))
  const maxY = Math.max(...boxes.map((b) => b.y + b.h))
  const spread = (axis: 'x' | 'y') => {
    const size = axis === 'x' ? 'w' : 'h'
    const sorted = [...boxes].sort((a, b) => a[axis] + a[size] / 2 - (b[axis] + b[size] / 2))
    const first = sorted[0]
    const last = sorted[sorted.length - 1]
    const span = last[axis] + last[size] - first[axis]
    const gap = (span - sorted.reduce((t, b) => t + b[size], 0)) / (sorted.length - 1)
    let at = first[axis]
    for (const b of sorted) {
      const d = at - b[axis]
      out.set(b.id, axis === 'x' ? { dx: d, dy: 0 } : { dx: 0, dy: d })
      at += b[size] + gap
    }
  }
  if (op === 'spread-x' || op === 'spread-y') {
    if (boxes.length >= 3) {
      spread(op === 'spread-x' ? 'x' : 'y')
    }
    return out
  }
  for (const b of boxes) {
    const dx = { left: minX - b.x, centre: (minX + maxX) / 2 - (b.x + b.w / 2), right: maxX - (b.x + b.w) }
    const dy = { top: minY - b.y, middle: (minY + maxY) / 2 - (b.y + b.h / 2), bottom: maxY - (b.y + b.h) }
    out.set(b.id, op in dx ? { dx: dx[op as keyof typeof dx], dy: 0 } : { dx: 0, dy: dy[op as keyof typeof dy] })
  }
  return out
}

/**
 * The block nearest `from` in an arrow-key direction: its centre must lie
 * within 45° of that direction; off-axis distance counts double.
 */
export function nearestInDirection(
  from: Placed,
  dir: 'left' | 'right' | 'up' | 'down',
  boxes: readonly Placed[],
): string | null {
  const cx = from.x + from.w / 2
  const cy = from.y + from.h / 2
  let best: string | null = null
  let bestScore = Infinity
  for (const b of boxes) {
    const dx = b.x + b.w / 2 - cx
    const dy = b.y + b.h / 2 - cy
    const [along, across] = dir === 'left' ? [-dx, dy] : dir === 'right' ? [dx, dy] : dir === 'up' ? [-dy, dx] : [dy, dx]
    if (b.id !== from.id && along > 0 && Math.abs(across) <= along) {
      const score = along + 2 * Math.abs(across)
      if (score < bestScore) {
        bestScore = score
        best = b.id
      }
    }
  }
  return best
}

export interface SchematicLayout {
  nodes: SchematicNode[]
  edges: SchematicEdge[]
  groups: SchematicGroup[]
  /** Every distinct line in the drawing, for the legend and the style map. */
  lines: LineKey[]
  width: number
  height: number
}

const NODE_H = 52
const NODE_MIN_W = 104
const CHAR_W = 7.4
const NODE_PAD = 30
const JUNCTION = 13
/** Horizontal gap between layers; chip names may share it with a neighbour. */
export const LAYER_GAP = 78
const ROW_GAP = 34
const MARGIN = 26
const GROUP_PAD = 22
const GROUP_TITLE = 22
const GROUP_GAP = 26

interface Endpoint {
  instance: string
  port?: string
  stream?: string
}

function splitEndpoint(raw: string, stream?: string): Endpoint {
  // A subsystem's own boundary (`sub1$a`) is a node of its scope; otherwise the
  // port follows the last dot, so a nested `sub1.r1.b` is block `sub1.r1`.
  const dot = raw.includes('$') ? -1 : raw.lastIndexOf('.')
  if (dot <= 0) {
    return { instance: raw.toLowerCase(), stream }
  }
  return { instance: raw.slice(0, dot).toLowerCase(), port: raw.slice(dot + 1), stream }
}

/**
 * HIER-01: the instance path a block id lives in — '' at top level, `sub1` for
 * `sub1.r1` and the boundary node `sub1$a`, `sub1.box` inside SUB1's BOX.
 */
export function scopeOf(id: string): string {
  const cut = id.startsWith('$') ? -1 : id.includes('$') ? id.indexOf('$') : id.lastIndexOf('.')
  return cut < 0 ? '' : id.slice(0, cut)
}

/** The scope a connection endpoint (`sub1.r1.b`, `sub1$a`, `vs.p`) belongs to. */
export const endpointScope = (raw: string) => scopeOf(splitEndpoint(raw).instance)

/** The block a connection endpoint is drawn on: `sub1.r1` for `sub1.r1.b`. */
export const endpointBlock = (raw: string) => splitEndpoint(raw).instance

function nodeWidth(label: string, type?: string): number {
  const longest = Math.max(label.length, (type ?? '').length)
  return Math.max(NODE_MIN_W, Math.round(longest * CHAR_W) + NODE_PAD)
}

/**
 * An `out`-ish port feeds; anything else is fed. Port names are the only
 * direction information an acausal network carries, and the standard library
 * is consistent about them (`out`, `hot_out`, `ref_out`, `discharge`).
 *
 * `b` counts only as a WHOLE port name — the two-terminal `a`/`b` convention.
 * As a prefix it does not: `b_in` is an inlet, and treating it as an outlet
 * put it on the wrong face of the block.
 */
function isOutlet(port?: string): boolean {
  if (port === undefined) {
    return false
  }
  return /^(out|outlet|b|discharge|supply)$/i.test(port)
    || /(^|_)(out|outlet|discharge|supply)\d*(_|$)/i.test(port)
}

/** Which face of a block a port attaches to. The DOMAIN decides first: heat
 *  goes up, everything non-fluid goes down, so cross-domain couplings never sit
 *  on the flow axis and can't be mistaken for pipework. */
function portSide(domain: string, port?: string): PortSide {
  switch (domain?.toLowerCase()) {
    case 'heat':
      return 'top'
    case 'fluid':
      return isOutlet(port) ? 'right' : 'left'
    default:
      return 'bottom'
  }
}

interface BuiltGraph {
  nodes: Map<string, SchematicNode>
  edges: SchematicEdge[]
  /** instance → ports it uses, with the side and line each carries. */
  portUse: Map<string, Map<string, { side: PortSide; lineId: string }>>
  /** Undirected adjacency restricted to one line kind, for circuit finding. */
  byLine: Map<string, Map<string, Set<string>>>
  /** Directed flow adjacency (upstream → downstream) per line kind. */
  flow: Map<string, Map<string, Set<string>>>
  lines: Map<string, LineKey>
}

function emptyGraph(): BuiltGraph {
  return {
    nodes: new Map(),
    edges: [],
    portUse: new Map(),
    byLine: new Map(),
    flow: new Map(),
    lines: new Map(),
  }
}

function addAdjacency(map: Map<string, Map<string, Set<string>>>, key: string, a: string, b: string) {
  let g = map.get(key)
  if (!g) {
    g = new Map()
    map.set(key, g)
  }
  if (!g.has(a)) {
    g.set(a, new Set())
  }
  if (!g.has(b)) {
    g.set(b, new Set())
  }
  g.get(a)?.add(b)
}

/** Nodes, edges, per-line adjacency and inferred flow direction. */
function buildGraph(
  connections: readonly Connection[],
  labels: ReadonlyMap<string, { label: string; type?: string }>,
  instances: readonly string[],
): BuiltGraph {
  const g = emptyGraph()

  const touch = (id: string, kind: 'instance' | 'junction') => {
    if (g.nodes.has(id)) {
      return
    }
    const known = labels.get(id)
    const label = known?.label ?? id
    const sym = kind === 'junction' ? { shape: 'junction' as Shape, terminal: false } : symbolOf(known?.type)
    g.nodes.set(id, {
      id,
      label,
      type: known?.type,
      shape: sym.shape,
      terminal: sym.terminal,
      kind,
      group: '',
      x: 0,
      y: 0,
      w: kind === 'junction' ? JUNCTION : nodeWidth(label, known?.type),
      h: kind === 'junction' ? JUNCTION : NODE_H,
      ports: [],
    })
  }

  const notePort = (e: Endpoint, domain: string, line: string) => {
    if (!e.port) {
      return
    }
    let ports = g.portUse.get(e.instance)
    if (!ports) {
      ports = new Map()
      g.portUse.set(e.instance, ports)
    }
    ports.set(e.port, { side: portSide(domain, e.port), lineId: line })
  }

  connections.forEach((conn, index) => {
    const ends = conn.endpoints.map((raw, i) => splitEndpoint(raw, conn.streams?.[i]))
    const key: LineKey = { domain: conn.domain, connector: conn.connector, fluid: conn.fluid }
    const line = lineId(key)
    g.lines.set(line, key)
    ends.forEach((e) => {
      touch(e.instance, 'instance')
      notePort(e, conn.domain, line)
    })

    if (ends.length === 2) {
      addPairEdge(ends[0], ends[1], conn, line, `c${index}`, g)
      return
    }
    // A junction (3+ endpoints, or a degenerate 1-endpoint node) becomes its
    // own small node so the star reads as one shared node rather than a clique
    // of edges that would imply pairwise connections. A port joins one set, so
    // the set's first endpoint in sorted order names the junction, within its
    // scope (`sub1$node$sub1.r1.b`), whatever the statements' order.
    const first = conn.endpoints.map((raw) => raw.toLowerCase()).sort()[0] ?? ''
    const junctionId = `${endpointScope(first)}$node$${first}`
    touch(junctionId, 'junction')
    ends.forEach((e, k) => {
      // Direction still comes from the port: feeders point into the junction.
      const [from, to] = isOutlet(e.port) ? [e, { instance: junctionId }] : [{ instance: junctionId }, e]
      g.edges.push({
        id: `c${index}_${k}`,
        lineId: line,
        domain: conn.domain,
        connector: conn.connector,
        fluid: conn.fluid,
        from: from.instance,
        to: to.instance,
        fromPort: 'port' in from ? from.port : undefined,
        toPort: 'port' in to ? to.port : undefined,
        fromStream: 'stream' in from ? from.stream : undefined,
        toStream: 'stream' in to ? to.stream : undefined,
      })
      addAdjacency(g.byLine, line, junctionId, e.instance)
      addAdjacency(g.byLine, line, e.instance, junctionId)
      addAdjacency(g.flow, line, from.instance, to.instance)
    })
  })

  // Declared but unwired instances still get a node, so the canvas shows the
  // whole network — including the parts the user is about to connect.
  for (const instance of instances) {
    touch(instance.toLowerCase(), 'instance')
  }
  return g
}

/** A two-endpoint connection, oriented by port name. A component wired to
 *  itself carries no layout information, so it contributes no edge. */
function addPairEdge(a: Endpoint, b: Endpoint, conn: Connection, line: string, id: string, g: BuiltGraph): void {
  if (a.instance === b.instance) {
    return
  }
  // The outlet feeds the inlet; when neither or both say so, keep written order.
  const [from, to] = isOutlet(b.port) && !isOutlet(a.port) ? [b, a] : [a, b]
  g.edges.push({
    id,
    lineId: line,
    domain: conn.domain,
    connector: conn.connector,
    fluid: conn.fluid,
    from: from.instance,
    to: to.instance,
    fromPort: from.port,
    toPort: to.port,
    fromStream: from.stream,
    toStream: to.stream,
  })
  addAdjacency(g.byLine, line, a.instance, b.instance)
  addAdjacency(g.byLine, line, b.instance, a.instance)
  addAdjacency(g.flow, line, from.instance, to.instance)
}

/**
 * Assigns every node to a circuit. A circuit is a connected run of ONE line
 * kind — so the coolant loop, the refrigerant loop and the thermal network are
 * three circuits even though the chiller belongs to two of them.
 *
 * A node on more than one circuit is drawn in the one it has the most links
 * on, with fluid winning ties: a wall heat exchanger is a piece of the coolant
 * line that also touches heat, not a piece of the thermal network.
 */
function assignGroups(g: BuiltGraph): Map<string, string> {
  const group = new Map<string, string>()
  const score = new Map<string, number>()

  // Fluid lines are claimed first, so a node they contain keeps its fluid band
  // when a coupling line later reaches for it.
  const lineOrder = [...g.byLine.keys()].sort(
    (a, b) => rankBand(a) - rankBand(b) || a.localeCompare(b),
  )

  for (const line of lineOrder) {
    const adjacency = g.byLine.get(line)
    if (!adjacency) {
      continue
    }
    // Only a FLUID line is split into separate circuits. A coupling domain is
    // point-to-point by nature — every thermal mass hangs off exactly one heat
    // exchanger wall, and the wall belongs to its fluid loop — so splitting
    // heat by connectivity yields one band per mass. All of a coupling line's
    // nodes therefore share one band.
    const split = line.startsWith('fluid:')
    connectedComponents(adjacency).forEach((members, index) => {
      const groupId = `${line}#${split ? index : 0}`
      for (const id of members) {
        // Links within this circuit; fluid outranks a coupling domain.
        const links = (adjacency.get(id)?.size ?? 0) + (split ? 100 : 0)
        if (links > (score.get(id) ?? -1)) {
          score.set(id, links)
          group.set(id, groupId)
        }
      }
    })
  }

  // Anything the topology never touched (declared but unwired) gets its own band.
  for (const id of g.nodes.keys()) {
    if (!group.has(id)) {
      group.set(id, 'unwired#0')
    }
  }
  return group
}

/** Connected components of one line's adjacency, each a list of node ids.
 *  Roots are visited in name order so the same document always yields the same
 *  components in the same order. */
function connectedComponents(adjacency: ReadonlyMap<string, Set<string>>): string[][] {
  const seen = new Set<string>()
  const out: string[][] = []
  for (const start of [...adjacency.keys()].sort((a, b) => a.localeCompare(b))) {
    if (seen.has(start)) {
      continue
    }
    const members: string[] = []
    const stack = [start]
    seen.add(start)
    while (stack.length > 0) {
      const id = stack.pop() as string
      members.push(id)
      for (const n of adjacency.get(id) ?? []) {
        if (!seen.has(n)) {
          seen.add(n)
          stack.push(n)
        }
      }
    }
    out.push(members)
  }
  return out
}

/**
 * Longest-path layering over the inferred flow direction, restricted to the
 * nodes of one circuit. Sources land in layer 0 and each node sits one layer
 * past its furthest upstream neighbour, which is what makes a circuit read left
 * to right. A cycle (a genuinely closed loop) cannot be layered by depth alone,
 * so the walk stops at nodes it has already placed — the loop then reads as a
 * chain with its closing edge drawn back, exactly as it is drawn by hand.
 */
function layerCircuit(members: readonly string[], flow: ReadonlyMap<string, Set<string>>): string[][] {
  const inSet = new Set(members)
  const depth = longestPathDepths(members, inSet, flow)
  placeCycleRemnants(members, depth, flow)
  return bucketByDepth(members, depth)
}

/** Kahn's algorithm over the flow edges inside one circuit, recording each
 *  node's longest distance from a source. Nodes left in a cycle get no depth
 *  and are handled separately. */
function longestPathDepths(
  members: readonly string[],
  inSet: ReadonlySet<string>,
  flow: ReadonlyMap<string, Set<string>>,
): Map<string, number> {
  const depth = new Map<string, number>()
  const indegree = new Map<string, number>(members.map((id) => [id, 0]))
  for (const id of members) {
    for (const next of flow.get(id) ?? []) {
      if (inSet.has(next)) {
        indegree.set(next, (indegree.get(next) ?? 0) + 1)
      }
    }
  }
  const queue = members.filter((id) => indegree.get(id) === 0).sort((a, b) => a.localeCompare(b))
  for (const id of queue) {
    depth.set(id, 0)
  }
  // The queue grows as nodes are freed; iterating it picks those up in turn.
  for (const id of queue) {
    const downstream = [...(flow.get(id) ?? [])].filter((n) => inSet.has(n)).sort((a, b) => a.localeCompare(b))
    for (const next of downstream) {
      depth.set(next, Math.max(depth.get(next) ?? 0, (depth.get(id) ?? 0) + 1))
      indegree.set(next, (indegree.get(next) ?? 0) - 1)
      if (indegree.get(next) === 0) {
        queue.push(next)
      }
    }
  }
  return depth
}

/** A genuinely closed loop has no source to start from, so the topological
 *  walk never reaches it. Each remaining node is placed one layer past its
 *  deepest feeder that WAS placed — the loop then reads as a chain with its
 *  closing edge drawn back, exactly as it is drawn by hand. */
function placeCycleRemnants(
  members: readonly string[],
  depth: Map<string, number>,
  flow: ReadonlyMap<string, Set<string>>,
): void {
  for (const id of members) {
    if (depth.has(id)) {
      continue
    }
    let d = 0
    for (const [from, tos] of flow) {
      if (tos.has(id) && depth.has(from)) {
        d = Math.max(d, (depth.get(from) ?? 0) + 1)
      }
    }
    depth.set(id, d)
  }
}

/** Depth map → dense layer lists, one column per depth. */
function bucketByDepth(members: readonly string[], depth: ReadonlyMap<string, number>): string[][] {
  const layers: string[][] = []
  for (const id of members) {
    const d = depth.get(id) ?? 0
    while (layers.length <= d) {
      layers.push([])
    }
    layers[d].push(id)
  }
  return layers.filter((l) => l.length > 0)
}

/** Barycenter sweeps: each node drifts toward the mean position of its
 *  neighbours in the previous layer, the cheap standard way to cut crossings. */
function orderLayers(
  layers: string[][],
  adjacency: ReadonlyMap<string, Set<string>>,
  order: ReadonlyMap<string, number>,
): void {
  for (let sweep = 0; sweep < 3; sweep++) {
    for (let i = 1; i < layers.length; i++) {
      const previous = new Map(layers[i - 1].map((id, k) => [id, k]))
      layers[i] = [...layers[i]].sort((a, b) => {
        const ba = barycenter(a, previous, adjacency)
        const bb = barycenter(b, previous, adjacency)
        return ba - bb || (order.get(a) ?? 0) - (order.get(b) ?? 0)
      })
    }
  }
}

function barycenter(
  id: string,
  previous: ReadonlyMap<string, number>,
  adjacency: ReadonlyMap<string, Set<string>>,
): number {
  let sum = 0
  let count = 0
  for (const neighbour of adjacency.get(id) ?? []) {
    const at = previous.get(neighbour)
    if (at !== undefined) {
      sum += at
      count++
    }
  }
  return count === 0 ? Number.MAX_SAFE_INTEGER : sum / count
}

/** Fluid circuits are the spine (0), coupling bands hang off them (1), and
 *  unwired components trail at the end (2). */
function rankBand(id: string): number {
  if (id.startsWith('fluid:')) {
    return 0
  }
  return id.startsWith('unwired') ? 2 : 1
}

/**
 * Band order. Fluid circuits are the spine and keep their declaration order;
 * a coupling band (heat, signal, mechanical) is slotted immediately AFTER the
 * fluid circuit it has the most links to, so its couplings are short and stay
 * out of the other circuits. In the common shape — two loops bridged by a heat
 * network — that puts the thermal band between them instead of below both,
 * which is where the coupling lines would otherwise have to cross a whole
 * unrelated circuit to reach it.
 */
function orderBands(
  ids: readonly string[],
  members: ReadonlyMap<string, string[]>,
  g: BuiltGraph,
): string[] {
  const fluid = ids.filter((id) => id.startsWith('fluid:')).sort((a, b) => a.localeCompare(b))
  const unwired = ids.filter((id) => id.startsWith('unwired'))
  const coupling = ids
    .filter((id) => !id.startsWith('fluid:') && !id.startsWith('unwired'))
    .sort((a, b) => a.localeCompare(b))

  const bandOf = new Map<string, string>()
  for (const [band, nodes] of members) {
    for (const id of nodes) {
      bandOf.set(id, band)
    }
  }

  const out = [...fluid]
  for (const band of coupling) {
    const best = mostLinkedFluidBand(band, bandOf, g)
    const at = best === undefined ? out.length : out.indexOf(best) + 1
    out.splice(at, 0, band)
  }
  return [...out, ...unwired]
}

/** The fluid band a coupling band has the most edges into, if any. */
function mostLinkedFluidBand(
  band: string,
  bandOf: ReadonlyMap<string, string>,
  g: BuiltGraph,
): string | undefined {
  const links = new Map<string, number>()
  const note = (inside: string, outside: string) => {
    if (bandOf.get(inside) !== band) {
      return
    }
    const other = bandOf.get(outside)
    if (other?.startsWith('fluid:')) {
      links.set(other, (links.get(other) ?? 0) + 1)
    }
  }
  for (const e of g.edges) {
    // Either end may be the one inside this band.
    note(e.from, e.to)
    note(e.to, e.from)
  }
  let best: string | undefined
  for (const [target, count] of links) {
    if (best === undefined || count > (links.get(best) ?? 0)) {
      best = target
    }
  }
  return best
}

/**
 * Places a band of PENDANT couplings — thermal masses, ambient nodes, probes —
 * in a ROW at the horizontal position of the blocks they couple to. This is
 * what turns a coupling into something a reader can follow: the battery sits
 * under its cold plate and the line between them is a short vertical drop,
 * instead of both being stacked in a column and joined by a wire that crosses
 * the whole drawing.
 *
 * Applies only when the band is genuinely a set of pendants: no node has more
 * than one neighbour INSIDE the band. A thermal network with real internal
 * structure (a wall stack conduction → mass → convection) has a node with two
 * internal neighbours and falls through to the normal layered placement, where
 * its structure is what matters. Returns null in that case.
 */
/** Each node's neighbours WITHIN the band, or null if any node has more than
 *  one — the signal that this is a real network rather than a set of pendants. */
function internalNeighbours(
  ids: readonly string[],
  inside: ReadonlySet<string>,
  adjacency: ReadonlyMap<string, Set<string>> | undefined,
): Map<string, string[]> | null {
  const out = new Map<string, string[]>()
  for (const id of ids) {
    const kin = [...(adjacency?.get(id) ?? [])].filter((n) => inside.has(n))
    if (kin.length > 1) {
      return null
    }
    out.set(id, kin)
  }
  return out
}

/** For each node, the mean centre of its partners OUTSIDE the band — i.e. the
 *  x it wants to sit at. Nodes with no outside partner are simply absent. */
function partnerPositions(
  ids: readonly string[],
  inside: ReadonlySet<string>,
  g: BuiltGraph,
): Map<string, number> {
  const target = new Map<string, number>()
  for (const id of ids) {
    let sum = 0
    let count = 0
    for (const e of g.edges) {
      const other = edgePartner(e, id)
      if (other === null || inside.has(other)) {
        continue
      }
      const n = g.nodes.get(other)
      if (n) {
        sum += n.x + n.w / 2
        count++
      }
    }
    if (count > 0) {
      target.set(id, sum / count)
    }
  }
  return target
}

/** The other end of an edge from `id`'s point of view, or null if `id` is not
 *  on it. */
function edgePartner(e: SchematicEdge, id: string): string | null {
  if (e.from === id) {
    return e.to
  }
  return e.to === id ? e.from : null
}

function placeCouplingRow(
  ids: readonly string[],
  g: BuiltGraph,
  line: string,
  originX: number,
  originY: number,
): { w: number; h: number } | null {
  if (ids.length < 2) {
    return null
  }
  const inside = new Set(ids)
  const internal = internalNeighbours(ids, inside, g.byLine.get(line))
  if (internal === null) {
    return null // real internal structure — layer it instead
  }

  const target = partnerPositions(ids, inside, g)
  // A node whose only link is inside the band (an ambient source feeding a
  // junction) follows that neighbour rather than being exiled to the end.
  for (const id of ids) {
    if (target.has(id)) {
      continue
    }
    const kin = internal.get(id)?.find((n) => target.has(n))
    target.set(id, kin !== undefined ? (target.get(kin) as number) : Number.MAX_SAFE_INTEGER)
  }

  const ordered = [...ids].sort((a, b) => (target.get(a) ?? 0) - (target.get(b) ?? 0))
  let cursor = originX
  let height = 0
  for (const id of ordered) {
    const n = g.nodes.get(id)
    if (!n) {
      continue
    }
    const wanted = target.get(id) as number
    // Honour the partner's position where there is room; otherwise pack left
    // to right so two nodes never land on top of each other.
    const centred = wanted === Number.MAX_SAFE_INTEGER ? cursor : wanted - n.w / 2
    n.x = Math.max(cursor, centred)
    n.y = originY
    cursor = n.x + n.w + ROW_GAP
    height = Math.max(height, n.h)
  }
  return { w: Math.max(0, cursor - ROW_GAP - originX), h: height }
}

/** Places one circuit's layers in columns; returns its bounding size. */
function placeCircuit(
  layers: string[][],
  nodes: Map<string, SchematicNode>,
  originX: number,
  originY: number,
): { w: number; h: number } {
  const columnHeights = layers.map((layer) =>
    layer.reduce((h, id) => h + (nodes.get(id)?.h ?? NODE_H) + ROW_GAP, -ROW_GAP),
  )
  const tallest = Math.max(0, ...columnHeights)
  let x = originX
  layers.forEach((layer, li) => {
    const widest = Math.max(...layer.map((id) => nodes.get(id)?.w ?? NODE_MIN_W))
    let y = originY + (tallest - columnHeights[li]) / 2
    for (const id of layer) {
      const n = nodes.get(id)
      if (!n) {
        continue
      }
      n.x = x + (widest - n.w) / 2
      n.y = y
      y += n.h + ROW_GAP
    }
    x += widest + LAYER_GAP
  })
  return { w: Math.max(0, x - LAYER_GAP - originX), h: tallest }
}

/** Port anchors for a node: wired ports take the side their line implies,
 *  unwired catalog ports fall back to the name. Ports are spread along the
 *  face in a stable order so the drawing does not jitter between checks. */
function anchorPorts(node: SchematicNode, declared: readonly string[], used: ReadonlyMap<string, { side: PortSide; lineId: string }>): PortAnchor[] {
  if (node.kind !== 'instance') {
    return []
  }
  const sides: Record<PortSide, { port: string; lineId?: string }[]> = { left: [], right: [], top: [], bottom: [] }
  const names = declared.length > 0 ? declared : [...used.keys()]
  for (const port of names) {
    const hit = used.get(port)
    const unwiredSide: PortSide = isOutlet(port) ? 'right' : 'left'
    sides[hit?.side ?? unwiredSide].push({ port, lineId: hit?.lineId })
  }
  const out: PortAnchor[] = []
  for (const side of ['left', 'right', 'top', 'bottom'] as PortSide[]) {
    const list = sides[side]
    list.forEach((p, i) => {
      // Evenly spaced along the face, inset from the corners.
      const t = (i + 1) / (list.length + 1)
      out.push({ port: p.port, side, lineId: p.lineId, ...faceOffset(side, node, t) })
    })
  }
  return out
}

/** Where along a node's face a port sits: pinned to the edge on the axis the
 *  face fixes, spread by `t` along the other. */
function faceOffset(side: PortSide, node: SchematicNode, t: number): { dx: number; dy: number } {
  switch (side) {
    case 'left':
      return { dx: 0, dy: node.h * t }
    case 'right':
      return { dx: node.w, dy: node.h * t }
    case 'top':
      return { dx: node.w * t, dy: 0 }
    default:
      return { dx: node.w * t, dy: node.h }
  }
}

/**
 * Builds the placed drawing. `labels` maps a lowercase instance name to its
 * written spelling and component type; `ports` gives each instance's declared
 * port list (from the component catalog) so unwired ports still show.
 */
export function layoutSchematic(
  connections: readonly Connection[],
  labels: ReadonlyMap<string, { label: string; type?: string }> = new Map(),
  instances: readonly string[] = [],
  ports: ReadonlyMap<string, readonly string[]> = new Map(),
  groupLabel: (line: LineKey, index: number) => string = (line) => line.domain,
): SchematicLayout {
  const g = buildGraph(connections, labels, instances)
  const groupOf = assignGroups(g)

  // Declaration order = first appearance; breaks every tie so a given document
  // always lays out the same way.
  const order = new Map<string, number>()
  ;[...g.nodes.keys()].forEach((id, i) => order.set(id, i))

  const members = new Map<string, string[]>()
  for (const [id, group] of groupOf) {
    if (!members.has(group)) {
      members.set(group, [])
    }
    members.get(group)?.push(id)
  }

  const groupIds = orderBands([...members.keys()], members, g)
  const sizes = placeBandsHorizontally(groupIds, members, order, g)
  const { groups, height, width } = stackBands(groupIds, members, sizes, g, groupLabel)

  for (const node of g.nodes.values()) {
    node.ports = anchorPorts(node, ports.get(node.id) ?? [], g.portUse.get(node.id) ?? new Map())
  }

  return {
    nodes: [...g.nodes.values()],
    edges: g.edges,
    groups,
    lines: [...g.lines.values()],
    width,
    height,
  }
}

/**
 * Lays out each band's contents left to right, FLUID BANDS FIRST whatever
 * order the bands are stacked in: a coupling band positions each pendant under
 * the block it couples to, so every fluid band must already have an x by then.
 * Vertical placement is a separate pass. Returns each band's size.
 */
function placeBandsHorizontally(
  groupIds: readonly string[],
  members: ReadonlyMap<string, string[]>,
  order: ReadonlyMap<string, number>,
  g: BuiltGraph,
): Map<string, { w: number; h: number }> {
  const sizes = new Map<string, { w: number; h: number }>()
  const originX = MARGIN + GROUP_PAD
  for (const groupId of [...groupIds].sort((a, b) => rankBand(a) - rankBand(b))) {
    const ids = (members.get(groupId) ?? []).sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0))
    const line = lineOfBand(groupId)
    // A band of pendant couplings is aligned to its partners; anything with
    // real structure of its own is layered.
    let size = placeCouplingRow(ids, g, line, originX, 0)
    if (!size) {
      const layers = layerCircuit(ids, g.flow.get(line) ?? new Map())
      orderLayers(layers, g.byLine.get(line) ?? new Map(), order)
      size = placeCircuit(layers, g.nodes, originX, 0)
    }
    sizes.set(groupId, size)
    for (const id of ids) {
      const n = g.nodes.get(id)
      if (n) {
        n.group = groupId
      }
    }
  }
  return sizes
}

/** Stacks the bands in display order, shifting each band's nodes down onto it,
 *  and builds the frames. Every frame spans the drawing so the bands read as
 *  bands rather than as boxes of differing width. */
function stackBands(
  groupIds: readonly string[],
  members: ReadonlyMap<string, string[]>,
  sizes: ReadonlyMap<string, { w: number; h: number }>,
  g: BuiltGraph,
  groupLabel: (line: LineKey, index: number) => string,
): { groups: SchematicGroup[]; width: number; height: number } {
  const groups: SchematicGroup[] = []
  let cursorY = MARGIN
  let maxX = 0

  for (const groupId of groupIds) {
    const size = sizes.get(groupId) ?? { w: 0, h: 0 }
    const line = lineOfBand(groupId)
    const originY = cursorY + GROUP_TITLE + GROUP_PAD / 2
    for (const id of members.get(groupId) ?? []) {
      const n = g.nodes.get(id)
      if (n) {
        n.y += originY
      }
    }
    const key = g.lines.get(line)
    groups.push({
      id: groupId,
      lineId: line,
      label: key ? groupLabel(key, indexOfBand(groupId)) : 'unwired',
      x: MARGIN,
      y: cursorY,
      w: size.w + GROUP_PAD * 2,
      h: size.h + GROUP_TITLE + GROUP_PAD * 1.5,
    })
    maxX = Math.max(maxX, MARGIN + size.w + GROUP_PAD * 2)
    cursorY += size.h + GROUP_TITLE + GROUP_PAD * 1.5 + GROUP_GAP
  }

  for (const group of groups) {
    group.w = maxX - MARGIN
  }
  return {
    groups,
    width: Math.max(maxX + MARGIN, MARGIN * 2),
    height: Math.max(cursorY - GROUP_GAP + MARGIN, MARGIN * 2),
  }
}

/** A band id is `<lineId>#<index>`; these split it back apart. */
function lineOfBand(groupId: string): string {
  return groupId.slice(0, groupId.lastIndexOf('#'))
}

function indexOfBand(groupId: string): number {
  return Number(groupId.slice(groupId.lastIndexOf('#') + 1))
}

/** Absolute position of a port anchor, given the node's live position. */
export function anchorAt(node: SchematicNode, port: string | undefined): { x: number; y: number; side: PortSide } {
  const hit = node.ports.find((p) => p.port === port)
  if (!hit) {
    return { x: node.x + node.w / 2, y: node.y + node.h / 2, side: 'right' }
  }
  return { x: node.x + hit.dx, y: node.y + hit.dy, side: hit.side }
}

/**
 * Orthogonal route between two ports, leaving each node along the face its
 * port sits on. Recomputed from live positions, so it stays correct while a
 * node is being dragged.
 *
 * Past the two port stubs, no segment may enter a component box: not another
 * block's, and not either endpoint's own (a loop that turns back has to go
 * round them). Junctions are exempt, since edges meet there. The route is the
 * cheapest clear candidate; if none is clear, the one with fewest crossings.
 */
export function routeEdge(
  a: SchematicNode,
  b: SchematicNode,
  fromPort?: string,
  toPort?: string,
  obstacles: readonly SchematicNode[] = [],
): string {
  return pathOf(routePoints(a, b, fromPort, toPort, obstacles))
}

/** The polyline `routeEdge` draws: port, stub end, lanes, stub end, port.
 *  The first and last segments are always the two port stubs. */
export function routePoints(
  a: SchematicNode,
  b: SchematicNode,
  fromPort?: string,
  toPort?: string,
  obstacles: readonly SchematicNode[] = [],
  wired?: Wired,
): Pt[] {
  const p = anchorAt(a, fromPort)
  const q = anchorAt(b, toPort)
  const p1 = stubOut(p, STUB)
  const q1 = stubOut(q, STUB)
  // Another set's junction dot is an obstacle too: a wire through it would
  // read as joining that set.
  const boxes = obstacles.filter(
    (n) => n.id !== a.id && n.id !== b.id && (n.kind === 'instance' || (wired && wired.junctions.get(n.id) !== wired.net)),
  )
  for (const n of [a, b]) {
    if (n.kind === 'instance') {
      boxes.push(n)
    }
  }
  const vertical = p.side === 'top' || p.side === 'bottom' || q.side === 'top' || q.side === 'bottom'
  const pts = bestRoute(p1, q1, a, b, boxes, vertical, wired)
  // The port stubs stay segments of their own, first and last.
  return [{ x: p.x, y: p.y }, ...simplify(pts), { x: q.x, y: q.y }]
}

/**
 * Routes every edge against the blocks and against the wires already laid, so
 * two different connection sets never share a lane: a lane another set uses
 * costs as much as a long detour, and each lane also offers parallel tracks
 * beside it. Wires of one set may share a lane (they are one connection).
 * Deterministic: edges are laid in layout order.
 */
export function routeAll(
  edges: readonly SchematicEdge[],
  nodes: ReadonlyMap<string, SchematicNode>,
  obstacles: readonly SchematicNode[],
  /** WIRE-07: the user's bends by edge id; those wires are drawn through them. */
  manual: ReadonlyMap<string, readonly Pt[]> = new Map(),
): Map<string, Pt[]> {
  const occupied: Occupancy = new Map()
  // Every port stub is known before any route is chosen: a lane must not run
  // along or across another set's stub, which would read as entering its port.
  const stubs: Wired['stubs'] = new Map()
  for (const e of edges) {
    const a = nodes.get(e.from)
    const b = nodes.get(e.to)
    if (a && b) {
      for (const [n, port] of [[a, e.fromPort], [b, e.toPort]] as const) {
        const p = anchorAt(n, port)
        const [u, v] = [{ x: p.x, y: p.y }, stubOut(p, STUB)]
        occupy([u, v], netOf(e), occupied)
        // A stub is shorter than a bucket, so it spans at most two.
        const { vertical, at, lo, hi } = laneOf(u, v)
        for (const k of new Set([Math.floor(lo / BUCKET), Math.floor(hi / BUCKET)])) {
          const key = laneKey(vertical, k)
          stubs.set(key, [...(stubs.get(key) ?? []), { net: netOf(e), at, lo, hi }])
        }
      }
    }
  }
  const junctions = new Map<string, string>()
  for (const e of edges) {
    for (const id of [e.from, e.to]) {
      if (nodes.get(id)?.kind === 'junction') {
        junctions.set(id, netOf(e))
      }
    }
  }
  const out = new Map<string, Pt[]>()
  // Hand-routed wires are laid first: the automatic ones route around them.
  for (const e of edges) {
    const a = nodes.get(e.from)
    const b = nodes.get(e.to)
    const bends = manual.get(e.id)
    if (a && b && bends) {
      const pts = manualRoute(a, b, e.fromPort, e.toPort, bends)
      occupy(pts.slice(1, -1), netOf(e), occupied)
      out.set(e.id, pts)
    }
  }
  for (const e of edges) {
    const a = nodes.get(e.from)
    const b = nodes.get(e.to)
    if (a && b && !manual.has(e.id)) {
      const net = netOf(e)
      const pts = routePoints(a, b, e.fromPort, e.toPort, obstacles, { net, occupied, stubs, junctions })
      occupy(pts.slice(1, -1), net, occupied)
      out.set(e.id, pts)
    }
  }
  return out
}

/**
 * A wire's identity for its saved route: its two ports, which survive a
 * re-check that renumbers connections. A junction end is `*`, since a port
 * joins at most one junction.
 */
export function routeKey(e: Pick<SchematicEdge, 'from' | 'to' | 'fromPort' | 'toPort'>): string {
  const end = (id: string, port?: string) => (id.includes('$node$') ? '*' : `${id}.${port ?? ''}`)
  return [end(e.from, e.fromPort), end(e.to, e.toPort)].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)).join('|')
}

/**
 * WIRE-07: the orthogonal polyline through the user's bends, from port stub to
 * port stub. An unaligned step turns horizontally first, so moving an end
 * keeps every bend and only re-squares the legs that meet it.
 */
export function manualRoute(a: SchematicNode, b: SchematicNode, fromPort: string | undefined, toPort: string | undefined, bends: readonly Pt[]): Pt[] {
  const p = anchorAt(a, fromPort)
  const q = anchorAt(b, toPort)
  const pts: Pt[] = []
  let prev = stubOut(p, STUB)
  pts.push(prev)
  for (const w of [...bends, stubOut(q, STUB)]) {
    if (prev.x !== w.x && prev.y !== w.y) pts.push({ x: w.x, y: prev.y })
    pts.push({ x: w.x, y: w.y })
    prev = w
  }
  return [{ x: p.x, y: p.y }, ...simplify(pts), { x: q.x, y: q.y }]
}

/** The lane of `pts` nearest `at` (never a port stub), and the foot of the perpendicular. */
export function nearestLane(pts: readonly Pt[], at: Pt): { index: number; foot: Pt } {
  let best = { index: 1, foot: pts[1] ?? at, d: Infinity }
  for (let j = 1; j < pts.length - 2; j++) {
    const [u, v] = [pts[j], pts[j + 1]]
    const foot = {
      x: Math.min(Math.max(at.x, Math.min(u.x, v.x)), Math.max(u.x, v.x)),
      y: Math.min(Math.max(at.y, Math.min(u.y, v.y)), Math.max(u.y, v.y)),
    }
    const d = Math.hypot(at.x - foot.x, at.y - foot.y)
    if (d < best.d) best = { index: j, foot, d }
  }
  return { index: best.index, foot: best.foot }
}

/** The blocks a route's lanes (not its port stubs) pass through. */
export function routeCrosses(pts: readonly Pt[], blocks: Iterable<SchematicNode>): string[] {
  const out: string[] = []
  for (const n of blocks) {
    if (n.kind !== 'instance') continue
    for (let i = 2; i < pts.length - 1; i++) {
      const [u, v] = [pts[i - 1], pts[i]]
      const across = u.y === v.y && u.y > n.y && u.y < n.y + n.h && Math.max(u.x, v.x) > n.x && Math.min(u.x, v.x) < n.x + n.w
      const down = u.x === v.x && u.x > n.x && u.x < n.x + n.w && Math.max(u.y, v.y) > n.y && Math.min(u.y, v.y) < n.y + n.h
      if (across || down) {
        out.push(n.id)
        break
      }
    }
  }
  return out
}

type Wired = {
  net: string
  occupied: Occupancy
  /** Port stubs by position: horizontal ones keyed by x bucket, vertical by y. */
  stubs: Map<number, { net: string; at: number; lo: number; hi: number }[]>
  /** The set each junction node belongs to. */
  junctions: ReadonlyMap<string, string>
}

/** Length of the port stub every wire leaves and enters by. */
const STUB = 14
/** Stub index bucket: wider than a stub. */
const BUCKET = 16

/** Radius of the hop a wire makes over an unrelated wire it crosses. */
export const HOP = 4

/**
 * Where each wire hops: at every crossing with a wire of a DIFFERENT
 * connection set, the horizontal one hops, unless it is a port stub, in which
 * case the lane crossing it hops instead. Crossings within one set get none,
 * and hops closer than an arc's width to a bend or to each other are dropped.
 */
export function crossingHops(wires: ReadonlyMap<string, Pt[]>, netOfWire: (id: string) => string): Map<string, Pt[]> {
  // A straight run is tested as one line, across the seam between a lane and
  // its port stub; each piece remembers whether it is a stub.
  type Piece = { lo: number; hi: number; stub: boolean }
  type Run = { id: string; net: string; at: number; lo: number; hi: number; pieces: Piece[] }
  const across: Run[] = []
  const down: Run[] = []
  for (const [id, pts] of wires) {
    let run: (Run & { vertical: boolean }) | null = null
    for (let i = 1; i < pts.length; i++) {
      const { vertical, at, lo, hi } = laneOf(pts[i - 1], pts[i])
      if (lo === hi) {
        continue
      }
      const piece = { lo, hi, stub: i === 1 || i === pts.length - 1 }
      if (run && run.vertical === vertical && run.at === at) {
        run.lo = Math.min(run.lo, lo)
        run.hi = Math.max(run.hi, hi)
        run.pieces.push(piece)
      } else {
        run = { id, net: netOfWire(id), at, lo, hi, pieces: [piece], vertical }
        ;(vertical ? down : across).push(run)
      }
    }
  }
  // The non-stub piece of a run with room for a whole arc around `x`.
  const room = (r: Run, x: number) => r.pieces.some((p) => !p.stub && x > p.lo + HOP && x < p.hi - HOP)
  const found = new Map<string, Pt[]>()
  const add = (id: string, p: Pt) => found.set(id, [...(found.get(id) ?? []), p])
  for (const h of across) {
    for (const v of down) {
      if (h.net === v.net || !(v.at > h.lo && v.at < h.hi && h.at > v.lo && h.at < v.hi)) {
        continue
      }
      if (room(h, v.at)) {
        add(h.id, { x: v.at, y: h.at })
      } else if (room(v, h.at)) {
        add(v.id, { x: v.at, y: h.at })
      }
    }
  }
  // Adjacent tracks are 2·HOP apart or more, so their hops just touch.
  for (const [id, hops] of found) {
    const kept: Pt[] = []
    for (const p of hops.sort((m, n) => m.x - n.x || m.y - n.y)) {
      if (!kept.some((k) => (k.x === p.x || k.y === p.y) && Math.abs(k.x - p.x) + Math.abs(k.y - p.y) < 2 * HOP)) {
        kept.push(p)
      }
    }
    found.set(id, kept)
  }
  return found
}

/** SVG path data for a routed polyline, hopping over the given points. */
export function pathOf(pts: readonly Pt[], hops: readonly Pt[] = []): string {
  let d = `M ${round(pts[0].x)} ${round(pts[0].y)}`
  for (let i = 1; i < pts.length; i++) {
    const [u, v] = [pts[i - 1], pts[i]]
    if (i === 1 || i === pts.length - 1) {
      d += ` L ${round(v.x)} ${round(v.y)}` // a port stub
    } else if (u.x === v.x && u.y === v.y) {
      continue
    } else if (u.y === v.y) {
      const dir = Math.sign(v.x - u.x)
      for (const h of [...hops].sort((m, n) => (m.x - n.x) * dir)) {
        if (h.y === u.y && (h.x - u.x) * dir > 0 && (v.x - h.x) * dir > 0) {
          // Clockwise left-to-right (and anticlockwise back) bulges upward.
          d += ` H ${round(h.x - dir * HOP)} A ${HOP} ${HOP} 0 0 ${dir > 0 ? 1 : 0} ${round(h.x + dir * HOP)} ${round(h.y)}`
        }
      }
      d += ` H ${round(v.x)}`
    } else {
      const dir = Math.sign(v.y - u.y)
      for (const h of [...hops].sort((m, n) => (m.y - n.y) * dir)) {
        if (h.x === u.x && (h.y - u.y) * dir > 0 && (v.y - h.y) * dir > 0) {
          // Clockwise downward (and anticlockwise up) bulges to the right.
          d += ` V ${round(h.y - dir * HOP)} A ${HOP} ${HOP} 0 0 ${dir > 0 ? 1 : 0} ${round(h.x)} ${round(h.y + dir * HOP)}`
        }
      }
      d += ` V ${round(v.y)}`
    }
  }
  return d
}

/** Drops repeated points and merges straight runs into one segment. */
function simplify(pts: readonly Pt[]): Pt[] {
  const out: Pt[] = []
  for (const p of pts) {
    const last = out[out.length - 1]
    if (last && last.x === p.x && last.y === p.y) {
      continue
    }
    const prev = out[out.length - 2]
    if (prev && last && ((prev.x === last.x && last.x === p.x) || (prev.y === last.y && last.y === p.y))) {
      out[out.length - 1] = p
    } else {
      out.push(p)
    }
  }
  return out
}

/** Segments laid so far, bucketed by lane coordinate (x for vertical, y for
 *  horizontal) in TRACK-wide buckets, so near-coincident lanes are found too. */
type Occupancy = Map<number, { at: number; lo: number; hi: number; net: string }[]>

/** A numeric map key for a bucket of vertical or horizontal lanes. */
function laneKey(vertical: boolean, bucket: number): number {
  return bucket * 2 + (vertical ? 1 : 0)
}

function laneOf(u: Pt, v: Pt) {
  const vertical = u.x === v.x
  return {
    vertical,
    at: vertical ? u.x : u.y,
    lo: vertical ? Math.min(u.y, v.y) : Math.min(u.x, v.x),
    hi: vertical ? Math.max(u.y, v.y) : Math.max(u.x, v.x),
  }
}

function occupy(pts: readonly Pt[], net: string, occupied: Occupancy) {
  for (let i = 1; i < pts.length; i++) {
    const { vertical, at, lo, hi } = laneOf(pts[i - 1], pts[i])
    const key = laneKey(vertical, Math.round(at / TRACK))
    occupied.set(key, [...(occupied.get(key) ?? []), { at, lo, hi, net }])
  }
}

/** Length a route runs on, beside (closer than a track) or end-to-end against
 *  another set's wire or port stub, plus a stub-length charge for every other
 *  set's stub it crosses. */
function sharedLength(pts: readonly Pt[], wired: Wired): number {
  let total = 0
  for (let i = 1; i < pts.length; i++) {
    const [u, v] = [pts[i - 1], pts[i]]
    if (u.x === v.x && u.y === v.y) {
      continue
    }
    const { vertical, at, lo, hi } = laneOf(u, v)
    const k = Math.round(at / TRACK)
    for (const key of [k - 1, k, k + 1]) {
      for (const t of wired.occupied.get(laneKey(vertical, key)) ?? []) {
        if (t.net !== wired.net && Math.abs(t.at - at) < TRACK) {
          total += Math.max(0, Math.min(hi, t.hi + TRACK / 2) - Math.max(lo, t.lo - TRACK / 2))
        }
      }
    }
    // Perpendicular stubs whose span covers this lane's coordinate.
    for (const st of wired.stubs.get(laneKey(!vertical, Math.floor(at / BUCKET))) ?? []) {
      if (st.net !== wired.net && st.at >= lo && st.at <= hi && at >= st.lo && at <= st.hi) {
        total += 2 * STUB
      }
    }
  }
  return total
}

/** Spacing between parallel wires of different sets sharing a corridor. */
const TRACK = 8

export type Pt = { x: number; y: number }

/** Clearance between a wire and a component box. Less than the port stub, so a
 *  stub end is always outside its own block's clearance. */
const CLEAR = 6

// ponytail: every edge is rerouted whenever a block moves (routeAll is
// memoised on positions, so once per drag frame). If that frame grows too
// slow, reroute only the edges near the moved blocks.
function bestRoute(
  p1: Pt,
  q1: Pt,
  a: SchematicNode,
  b: SchematicNode,
  boxes: readonly SchematicNode[],
  vertical: boolean,
  wired?: Wired,
): Pt[] {
  // Lanes: the shared midline the layout aligns on, the stub ends, beside each
  // endpoint, around both, and beside any box in the way.
  const xs = [(p1.x + q1.x) / 2, p1.x, q1.x, a.x - 30, a.x + a.w + 30, b.x - 30, b.x + b.w + 30]
  const ys = [(p1.y + q1.y) / 2, p1.y, q1.y, Math.min(a.y, b.y) - 30, Math.max(a.y + a.h, b.y + b.h) + 30]
  const near = { x0: Math.min(p1.x, q1.x) - 60, x1: Math.max(p1.x, q1.x) + 60, y0: Math.min(p1.y, q1.y) - 60, y1: Math.max(p1.y, q1.y) + 60 }
  for (const n of boxes) {
    if (n.x < near.x1 && n.x + n.w > near.x0 && n.y < near.y1 && n.y + n.h > near.y0) {
      xs.push(n.x - 2 * CLEAR, n.x + n.w + 2 * CLEAR)
      ys.push(n.y - 2 * CLEAR, n.y + n.h + 2 * CLEAR)
    }
  }
  // Running on another set's wire reads as one connection: price it like a
  // long detour, so a free lane wins whenever there is one.
  const shared = (pts: Pt[]) => (wired ? sharedLength(pts, wired) : 0)
  const extra = (pts: Pt[]) => 20 * shared(pts)
  const cost = (pts: Pt[]) => routeCost(pts) + extra(pts)
  // Blocks in rows and columns share lanes; test each lane once.
  const attempt = (tracks: number[]) => {
    const lanes = (vs: number[]) => [...new Set(vs.flatMap((v) => tracks.map((t) => round(v + t))))]
    const viaX = lanes(xs).map((x) => [p1, { x, y: p1.y }, { x, y: q1.y }, q1])
    const viaY = lanes(ys).map((y) => [p1, { x: p1.x, y }, { x: q1.x, y }, q1])
    // Flow prefers a vertical lane and couplings a horizontal one; on a tie the
    // preferred family wins because the first cheapest candidate is kept.
    let best = pickRoute(vertical ? [...viaY, ...viaX] : [...viaX, ...viaY], boxes, extra)
    if (best.hits > 0) {
      // Two lanes and a crossing: out of the stub, along, across, along, in. The
      // first lane stays by the source block and the last by the target block.
      const detours: Pt[][] = []
      for (const x1 of tracks.flatMap((t) => [p1.x, a.x - 30, a.x + a.w + 30].map((x) => x + t))) {
        for (const x2 of [q1.x, b.x - 30, b.x + b.w + 30]) {
          for (const y of ys.slice(0, 5)) {
            detours.push([p1, { x: x1, y: p1.y }, { x: x1, y }, { x: x2, y }, { x: x2, y: q1.y }, q1])
          }
        }
      }
      const alt = pickRoute(detours, boxes, extra)
      if (alt.hits < best.hits) {
        best = alt
      }
    }
    return best
  }
  let best = attempt([0])
  // Only when every plain lane is taken by another set are the parallel tracks
  // beside each lane tried; most wires never need them.
  if (wired && shared(best.pts) > 0) {
    const alt = attempt([-1, 1, -2, 2, -3, 3].map((k) => k * TRACK))
    if (alt.hits < best.hits || (alt.hits === best.hits && cost(alt.pts) < cost(best.pts))) {
      best = alt
    }
  }
  return best.pts
}

function pickRoute(
  candidates: Pt[][],
  allBoxes: readonly SchematicNode[],
  extra: (pts: Pt[]) => number = () => 0,
): { pts: Pt[]; hits: number } {
  // Only boxes inside the candidates' joint extent can be hit.
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity]
  for (const pts of candidates) {
    for (const p of pts) {
      x0 = Math.min(x0, p.x)
      y0 = Math.min(y0, p.y)
      x1 = Math.max(x1, p.x)
      y1 = Math.max(y1, p.y)
    }
  }
  const boxes = allBoxes.filter((n) => n.x - CLEAR < x1 && n.x + n.w + CLEAR > x0 && n.y - CLEAR < y1 && n.y + n.h + CLEAR > y0)
  const crossing = boxesAcross(boxes)
  // Shortest first (a stable sort keeps the preferred family ahead on ties).
  // The answer is the cheapest clear route counting `extra` (never negative),
  // so once a clear one is found, any candidate whose length alone costs as
  // much cannot win and the rest are never checked.
  const ranked = candidates.map((pts) => ({ pts, base: routeCost(pts) })).sort((u, v) => u.base - v.base)
  let best = { pts: ranked[0].pts, hits: Infinity, cost: Infinity }
  for (const { pts, base } of ranked) {
    if (best.hits === 0 && base >= best.cost) {
      break
    }
    // Once a clear route exists, one hit disqualifies.
    const limit = Math.max(1, best.hits)
    let hits = 0
    for (let i = 1; i < pts.length && hits < limit; i++) {
      const [u, v] = [pts[i - 1], pts[i]]
      if (u.x === v.x && u.y === v.y) {
        continue
      }
      for (const n of crossing(u.x === v.x, u.x === v.x ? u.x : u.y)) {
        if (segmentHits(u, v, n) && ++hits >= limit) {
          break
        }
      }
    }
    if (hits < best.hits || (hits === 0 && base < best.cost)) {
      const cost = base + extra(pts)
      if (hits < best.hits || cost < best.cost) {
        best = { pts, hits, cost }
      }
    }
  }
  return best
}

function routeCost(pts: Pt[]): number {
  let cost = 0
  for (let i = 1; i < pts.length; i++) {
    const [u, v] = [pts[i - 1], pts[i]]
    const step = Math.abs(u.x - v.x) + Math.abs(u.y - v.y)
    cost += step > 0 ? step + 20 : 0
  }
  return cost
}

/**
 * The boxes whose clearance a vertical (or horizontal) line at `at` crosses,
 * found from the boxes sorted along the other axis: none starting more than
 * the widest box before the line can reach it.
 */
function boxesAcross(boxes: readonly SchematicNode[]): (vertical: boolean, at: number) => SchematicNode[] {
  const axis = (vertical: boolean) => {
    const order = [...boxes].sort((a, b) => (vertical ? a.x - b.x : a.y - b.y))
    const lo = order.map((n) => (vertical ? n.x : n.y) - CLEAR)
    const hi = order.map((n) => (vertical ? n.x + n.w : n.y + n.h) + CLEAR)
    return { order, lo, hi, widest: Math.max(0, ...order.map((_, i) => hi[i] - lo[i])) }
  }
  const index = [axis(false), axis(true)]
  return (vertical, at) => {
    const { order, lo, hi, widest } = index[vertical ? 1 : 0]
    let [l, r] = [0, order.length]
    while (l < r) {
      const m = (l + r) >> 1
      if (lo[m] <= at - widest) l = m + 1
      else r = m
    }
    const out: SchematicNode[] = []
    for (let i = l; i < order.length && lo[i] < at; i++) {
      if (hi[i] > at) out.push(order[i])
    }
    return out
  }
}

/** True when an axis-aligned segment enters a box's clearance. */
function segmentHits(u: Pt, v: Pt, n: SchematicNode): boolean {
  const left = n.x - CLEAR
  const right = n.x + n.w + CLEAR
  const top = n.y - CLEAR
  const bottom = n.y + n.h + CLEAR
  return Math.max(u.x, v.x) > left && Math.min(u.x, v.x) < right && Math.max(u.y, v.y) > top && Math.min(u.y, v.y) < bottom
}

function stubOut(p: { x: number; y: number; side: PortSide }, d: number): { x: number; y: number } {
  switch (p.side) {
    case 'left':
      return { x: p.x - d, y: p.y }
    case 'right':
      return { x: p.x + d, y: p.y }
    case 'top':
      return { x: p.x, y: p.y - d }
    default:
      return { x: p.x, y: p.y + d }
  }
}

function round(v: number): number {
  return Math.round(v * 10) / 10
}
