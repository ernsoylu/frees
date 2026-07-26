import { describe, expect, it } from 'vitest'
import { EV_TOPOLOGY } from './evTopology.fixture'
import { layoutSchematic, type SchematicNode } from './layout'

/**
 * Roadmap item 9's acceptance case, as a regression test: the shipped EV
 * thermal-management example must lay out as a legible two-loop diagram with
 * correct connectivity. "Legible" is checked as the properties that make a
 * drawing readable — nothing overlaps, both domains survive, the junctions
 * are junctions, and the canvas doesn't degenerate into a single line.
 */
describe('EV thermal-management example', () => {
  const layout = layoutSchematic(EV_TOPOLOGY)

  const overlaps = (a: SchematicNode, b: SchematicNode) =>
    a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

  it('places every instance in the network', () => {
    const instances = new Set<string>()
    for (const c of EV_TOPOLOGY) {
      for (const e of c.endpoints) {
        instances.add(e.split('.')[0])
      }
    }
    const placed = layout.nodes.filter((n) => n.kind === 'instance').map((n) => n.id)
    expect(new Set(placed)).toEqual(instances)
    expect(instances.size).toBe(26)
  })

  it('renders the three shared nodes as junctions, not cliques', () => {
    const junctions = layout.nodes.filter((n) => n.kind === 'junction')
    expect(junctions).toHaveLength(3)
    // The radiator bank shares one ambient node across three walls: four
    // edges out of one junction, not six pairwise edges.
    const radiator = junctions.find((j) =>
      layout.edges.filter((e) => e.from === j.id).length === 4)
    expect(radiator).toBeDefined()
  })

  it('keeps both physical domains distinguishable', () => {
    const domains = new Set(layout.edges.map((e) => e.domain))
    expect(domains).toEqual(new Set(['fluid', 'heat']))
  })

  it('draws without overlapping any two nodes', () => {
    for (let i = 0; i < layout.nodes.length; i++) {
      for (let j = i + 1; j < layout.nodes.length; j++) {
        expect(
          overlaps(layout.nodes[i], layout.nodes[j]),
          `${layout.nodes[i].id} overlaps ${layout.nodes[j].id}`,
        ).toBe(false)
      }
    }
  })

  it('spreads the network over a two-dimensional canvas', () => {
    // A degenerate layout (everything in one column or one row) is unreadable;
    // a real network should use both axes.
    const xs = new Set(layout.nodes.map((n) => Math.round(n.x)))
    const ys = new Set(layout.nodes.map((n) => Math.round(n.y)))
    expect(xs.size).toBeGreaterThan(3)
    expect(ys.size).toBeGreaterThan(3)
    expect(layout.width).toBeGreaterThan(400)
    expect(layout.height).toBeGreaterThan(200)
  })

  it('routes every edge with a finite path', () => {
    expect(layout.edges.length).toBeGreaterThan(EV_TOPOLOGY.length)
    for (const e of layout.edges) {
      expect(e.path).toMatch(/^M [\d.-]+ [\d.-]+/)
      expect(e.path).not.toMatch(/NaN|Infinity/)
    }
  })
})
