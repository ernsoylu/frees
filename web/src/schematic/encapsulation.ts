import type { SchematicEdge, SchematicNode } from './layout'

export interface EncapsulationInput {
  name: string
  selected: ReadonlySet<string>
  nodes: readonly SchematicNode[]
  edges: readonly SchematicEdge[]
  source: string
}

/** Build a canonical component block from a selected, connected subgraph. */
export function encapsulateSelection(input: EncapsulationInput): string {
  const name = input.name.trim()
  if (!/^[A-Za-z_]\w*$/.test(name)) throw new Error('Component name must be an identifier')
  const selected = input.nodes.filter((n) => n.kind === 'instance' && input.selected.has(n.id))
  if (selected.length === 0) throw new Error('Select at least one component')

  const selectedIds = new Set(selected.map((n) => n.id))
  const reachable = new Set<string>([selected[0].id])
  while (true) {
    const before = reachable.size
    for (const edge of input.edges) {
      if (selectedIds.has(edge.from) && selectedIds.has(edge.to) &&
          (reachable.has(edge.from) || reachable.has(edge.to))) {
        reachable.add(edge.from)
        reachable.add(edge.to)
      }
    }
    if (reachable.size === before) break
  }
  if (reachable.size !== selected.length) throw new Error('Selection must be one connected group')
  for (const edge of input.edges) {
    const fromInside = selectedIds.has(edge.from)
    const toInside = selectedIds.has(edge.to)
    if (fromInside !== toInside && (!edge.fromPort || !edge.toPort)) {
      throw new Error('Selection includes a junction without explicit ports')
    }
    if (fromInside && toInside && (!edge.fromPort || !edge.toPort)) {
      throw new Error('Selection includes an edge without explicit ports')
    }
  }
  const boundary = input.edges.flatMap((edge) => {
    const fromInside = selectedIds.has(edge.from)
    const toInside = selectedIds.has(edge.to)
    if (fromInside === toInside || !edge.fromPort || !edge.toPort) return []
    const instance = fromInside ? edge.from : edge.to
    const port = fromInside ? edge.fromPort : edge.toPort
    return [{ instance, port }]
  })
  const ports = unique(boundary.map(({ port }) => port))
  if (ports.length === 0 && selected.length > 1) {
    throw new Error('Selection must expose at least one connected port')
  }

  const declarations = selected.map((node) => declarationFor(input.source, node.id)).join('\n')
  const internal = input.edges
    .filter((edge) => selectedIds.has(edge.from) && selectedIds.has(edge.to) && edge.fromPort && edge.toPort)
    .map((edge) => `  connect(${edge.from}.${edge.fromPort}, ${edge.to}.${edge.toPort})`)
  const exposed = boundary.map(({ instance, port }) => `  connect(${port}, ${instance}.${port})`)
  return [
    `function [${ports.join(', ')}] = ${name}()` ,
    ...ports.map((port) => `  port(${port})`),
    ...declarations.split('\n').filter(Boolean).map((line) => `  ${line.trim()}`),
    ...internal,
    ...exposed,
    'end',
  ].join('\n')
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)]
}

function declarationFor(source: string, id: string): string {
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)
  const line = source.split('\n').find((raw) => new RegExp(`^\\s*[A-Za-z_]\\w*\\s+${escaped}\\s*\\(`, 'i').test(raw))
  if (!line) throw new Error(`Could not find declaration for ${id}`)
  return line.trim()
}
