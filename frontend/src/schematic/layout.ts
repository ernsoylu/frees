// Layered layout for the rendered component schematic. Pure functions over
// the backend's connection topology — no DOM, no React, so the geometry is
// unit-testable on its own.
//
// The network is ACAUSAL: a connect node has no inherent direction, so there
// is no "sources on the left" ordering to recover. Layers therefore come from
// a breadth-first sweep out of the most-connected instance (ties broken by
// declaration order, so the same document always lays out the same way), and
// within a layer the barycenter heuristic pulls each node toward the average
// position of its already-placed neighbours to cut crossings. Disconnected
// sub-networks (a separate hydraulic loop, a control chain) are laid out
// independently and stacked, which is also how they read on paper.

/** One connection node as the backend reports it. */
export interface Connection {
  domain: string
  endpoints: string[]
}

export interface SchematicNode {
  /** Canonical lowercase instance name (matches endpoint prefixes). */
  id: string
  /** Display label — the instance name as written, when known. */
  label: string
  /** Component type when a solve has supplied it. */
  type?: string
  kind: 'instance' | 'junction'
  x: number
  y: number
  w: number
  h: number
}

export interface SchematicEdge {
  id: string
  domain: string
  from: string
  to: string
  /** Port members the edge attaches to, for the hover title. */
  fromPort?: string
  toPort?: string
  /** SVG path: an orthogonal three-segment route. */
  path: string
}

export interface SchematicLayout {
  nodes: SchematicNode[]
  edges: SchematicEdge[]
  width: number
  height: number
}

const NODE_H = 46
const NODE_MIN_W = 92
const CHAR_W = 7.6
const NODE_PAD = 26
const JUNCTION = 12
const LAYER_GAP = 96
const ROW_GAP = 26
const MARGIN = 28

interface Endpoint {
  instance: string
  port?: string
}

function splitEndpoint(raw: string): Endpoint {
  const dot = raw.indexOf('.')
  if (dot <= 0) {
    return { instance: raw.toLowerCase() }
  }
  return { instance: raw.slice(0, dot).toLowerCase(), port: raw.slice(dot + 1) }
}

function nodeWidth(label: string, type?: string): number {
  const longest = Math.max(label.length, (type ?? '').length)
  return Math.max(NODE_MIN_W, Math.round(longest * CHAR_W) + NODE_PAD)
}

/**
 * Builds the placed graph. `labels` maps a lowercase instance name to its
 * written spelling and component type (from a solve, when one has run);
 * absent entries fall back to the lowercase name with no type.
 */
export function layoutSchematic(
  connections: readonly Connection[],
  labels: ReadonlyMap<string, { label: string; type?: string }> = new Map(),
): SchematicLayout {
  const nodes = new Map<string, SchematicNode>()
  const edges: SchematicEdge[] = []
  const adjacency = new Map<string, Set<string>>()

  const touch = (id: string, kind: 'instance' | 'junction') => {
    if (nodes.has(id)) {
      return
    }
    const known = labels.get(id)
    const label = known?.label ?? id
    nodes.set(id, {
      id,
      label,
      type: known?.type,
      kind,
      x: 0,
      y: 0,
      w: kind === 'junction' ? JUNCTION : nodeWidth(label, known?.type),
      h: kind === 'junction' ? JUNCTION : NODE_H,
    })
    adjacency.set(id, new Set())
  }

  const link = (a: string, b: string) => {
    adjacency.get(a)?.add(b)
    adjacency.get(b)?.add(a)
  }

  connections.forEach((conn, index) => {
    const ends = conn.endpoints.map(splitEndpoint)
    // An endpoint whose instance repeats within one connection (a component
    // wired to itself) still deserves both attachments, so nodes are keyed by
    // instance but edges keep their own port pair.
    ends.forEach((e) => touch(e.instance, 'instance'))
    if (ends.length === 2) {
      const [a, b] = ends
      if (a.instance === b.instance) {
        return // a self-loop carries no layout information; the ports show in the node
      }
      edges.push({
        id: `c${index}`,
        domain: conn.domain,
        from: a.instance,
        to: b.instance,
        fromPort: a.port,
        toPort: b.port,
        path: '',
      })
      link(a.instance, b.instance)
      return
    }
    // A junction (3+ endpoints, or a degenerate 1-endpoint node) becomes its
    // own small node so the star reads as one shared node rather than a
    // clique of edges that implies pairwise connections.
    const junctionId = `$node${index}`
    touch(junctionId, 'junction')
    ends.forEach((e, k) => {
      edges.push({
        id: `c${index}_${k}`,
        domain: conn.domain,
        from: junctionId,
        to: e.instance,
        toPort: e.port,
        path: '',
      })
      link(junctionId, e.instance)
    })
  })

  // Declaration order = first appearance among the endpoints; it breaks every
  // tie below so the layout is stable for a given document.
  const order = new Map<string, number>()
  ;[...nodes.keys()].forEach((id, i) => order.set(id, i))

  const placed = new Set<string>()
  let cursorY = MARGIN
  let maxX = 0

  for (const start of subgraphRoots(nodes, adjacency, order)) {
    if (placed.has(start)) {
      continue
    }
    const layers = bfsLayers(start, adjacency, placed)
    orderLayers(layers, adjacency, order)
    const height = assignCoordinates(layers, nodes, cursorY)
    for (const layer of layers) {
      for (const id of layer) {
        const n = nodes.get(id)
        if (n) {
          maxX = Math.max(maxX, n.x + n.w)
        }
      }
    }
    cursorY += height + ROW_GAP * 2
  }

  for (const edge of edges) {
    const a = nodes.get(edge.from)
    const b = nodes.get(edge.to)
    if (a && b) {
      edge.path = routeEdge(a, b)
    }
  }

  return {
    nodes: [...nodes.values()],
    edges,
    width: Math.max(maxX + MARGIN, MARGIN * 2),
    height: Math.max(cursorY - ROW_GAP * 2 + MARGIN, MARGIN * 2),
  }
}

/** Sub-network roots, most-connected first so the busiest node anchors each
 *  layout; declaration order breaks ties. */
function subgraphRoots(
  nodes: ReadonlyMap<string, SchematicNode>,
  adjacency: ReadonlyMap<string, Set<string>>,
  order: ReadonlyMap<string, number>,
): string[] {
  return [...nodes.keys()].sort((a, b) => {
    const da = adjacency.get(a)?.size ?? 0
    const db = adjacency.get(b)?.size ?? 0
    return db - da || (order.get(a) ?? 0) - (order.get(b) ?? 0)
  })
}

/** Breadth-first layers out of `start`, marking every reached node placed. */
function bfsLayers(
  start: string,
  adjacency: ReadonlyMap<string, Set<string>>,
  placed: Set<string>,
): string[][] {
  const layers: string[][] = []
  let frontier = [start]
  placed.add(start)
  while (frontier.length > 0) {
    layers.push(frontier)
    const next: string[] = []
    for (const id of frontier) {
      for (const neighbour of [...(adjacency.get(id) ?? [])].sort()) {
        if (!placed.has(neighbour)) {
          placed.add(neighbour)
          next.push(neighbour)
        }
      }
    }
    frontier = next
  }
  return layers
}

/** Two barycenter sweeps: each node drifts toward the mean position of its
 *  neighbours in the neighbouring layer, which is the cheap standard way to
 *  cut edge crossings without a full crossing-minimisation pass. */
function orderLayers(
  layers: string[][],
  adjacency: ReadonlyMap<string, Set<string>>,
  order: ReadonlyMap<string, number>,
): void {
  const indexIn = (layer: string[]) => {
    const m = new Map<string, number>()
    layer.forEach((id, i) => m.set(id, i))
    return m
  }
  for (let sweep = 0; sweep < 2; sweep++) {
    for (let i = 1; i < layers.length; i++) {
      const previous = indexIn(layers[i - 1])
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

/** Places each layer in its own column, vertically centred; returns the
 *  sub-network's height. */
function assignCoordinates(
  layers: string[][],
  nodes: Map<string, SchematicNode>,
  topY: number,
): number {
  const columnHeights = layers.map((layer) =>
    layer.reduce((h, id) => h + (nodes.get(id)?.h ?? NODE_H) + ROW_GAP, -ROW_GAP),
  )
  const tallest = Math.max(0, ...columnHeights)
  let x = MARGIN
  layers.forEach((layer, li) => {
    const widest = Math.max(...layer.map((id) => nodes.get(id)?.w ?? NODE_MIN_W))
    let y = topY + (tallest - columnHeights[li]) / 2
    for (const id of layer) {
      const n = nodes.get(id)
      if (!n) {
        continue
      }
      // Centre each node in its column so mixed-width layers stay aligned.
      n.x = x + (widest - n.w) / 2
      n.y = y
      y += n.h + ROW_GAP
    }
    x += widest + LAYER_GAP
  })
  return tallest
}

/** Orthogonal three-segment route between two node borders (out the right
 *  side, across a shared mid-column, into the left side) — the reading a
 *  schematic expects. Same-column pairs get a simple side-to-side curve. */
function routeEdge(a: SchematicNode, b: SchematicNode): string {
  const [left, right] = a.x <= b.x ? [a, b] : [b, a]
  const y1 = left.y + left.h / 2
  const y2 = right.y + right.h / 2
  const x1 = left.x + left.w
  const x2 = right.x
  if (x2 - x1 < 24) {
    // Overlapping columns: bow around the right-hand side rather than
    // drawing a line back through the node boxes.
    const bx = Math.max(x1, x2) + 34
    return `M ${round(x1)} ${round(y1)} C ${round(bx)} ${round(y1)}, ${round(bx)} ${round(y2)}, ${round(x2)} ${round(y2)}`
  }
  const mid = round((x1 + x2) / 2)
  return `M ${round(x1)} ${round(y1)} H ${mid} V ${round(y2)} H ${round(x2)}`
}

function round(v: number): number {
  return Math.round(v * 10) / 10
}
