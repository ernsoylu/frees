import { describe, expect, it } from 'vitest'
import { arrangeDeltas, connectedTo, endpointScope, scopeOf, crossingHops, focusOf, framedGroups, HOP, manualRoute, nearestInDirection, nearestLane, pathOf, routeAll, routeCrosses, routeKey, layoutSchematic, routeEdge, type Connection, type SchematicEdge, type SchematicNode } from './layout'
import { boxesEntered } from '../test/schematicPaths'

const conn = (domain: string, ...endpoints: string[]): Connection => ({ domain, endpoints })
const fluidConn = (connector: string, fluid: string, ...endpoints: string[]): Connection => ({
  domain: 'fluid',
  connector,
  fluid,
  endpoints,
})

/** True when two placed nodes' boxes intersect. */
function overlaps(a: SchematicNode, b: SchematicNode): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
}

describe('layoutSchematic', () => {
  it('places both endpoints of a simple pair and connects them', () => {
    const out = layoutSchematic([conn('electrical', 'b.p', 'l.a')])
    expect(out.nodes.map((n) => n.id).sort()).toEqual(['b', 'l'])
    expect(out.edges).toHaveLength(1)
    expect(out.edges[0]).toMatchObject({ from: 'b', to: 'l', fromPort: 'p', toPort: 'a', domain: 'electrical' })
    expect(out.width).toBeGreaterThan(0)
    expect(out.height).toBeGreaterThan(0)
  })

  it('turns a 3-way node into a junction rather than a clique', () => {
    const out = layoutSchematic([conn('fluid', 'a.out', 'b.in', 'c.in')])
    const junctions = out.nodes.filter((n) => n.kind === 'junction')
    expect(junctions).toHaveLength(1)
    // Three edges radiate from the junction — not three pairwise edges.
    expect(out.edges).toHaveLength(3)
    const touching = out.edges.filter((e) => e.from === junctions[0].id || e.to === junctions[0].id)
    expect(touching).toHaveLength(3)
  })

  it('orients an edge from the outlet to the inlet', () => {
    // Port names are the only direction an acausal network carries, and the
    // reading "source on the left" depends on honouring them whichever order
    // the document wrote the endpoints in.
    const forward = layoutSchematic([conn('fluid', 'a.out', 'b.in')]).edges[0]
    const backward = layoutSchematic([conn('fluid', 'b.in', 'a.out')]).edges[0]
    expect(forward).toMatchObject({ from: 'a', to: 'b' })
    expect(backward).toMatchObject({ from: 'a', to: 'b' })
  })

  it('reads a chain left to right in flow order', () => {
    const out = layoutSchematic([
      conn('fluid', 'src.out', 'pmp.in'),
      conn('fluid', 'pmp.out', 'hx.in'),
      conn('fluid', 'hx.out', 'snk.in'),
    ])
    const x = (id: string) => out.nodes.find((n) => n.id === id)?.x ?? 0
    expect(x('src')).toBeLessThan(x('pmp'))
    expect(x('pmp')).toBeLessThan(x('hx'))
    expect(x('hx')).toBeLessThan(x('snk'))
  })

  it('never overlaps two placed nodes', () => {
    const out = layoutSchematic([
      conn('fluid', 'pump.out', 'hx.hot_in'),
      conn('fluid', 'hx.hot_out', 'valve.in'),
      conn('fluid', 'valve.out', 'tank.in'),
      conn('fluid', 'tank.out', 'pump.in'),
      conn('heat', 'hx.cold_out', 'rad.in'),
      conn('heat', 'rad.out', 'amb.p'),
      conn('signal', 'ctl.sig', 'valve.cmd', 'pump.cmd'),
    ])
    for (let i = 0; i < out.nodes.length; i++) {
      for (let j = i + 1; j < out.nodes.length; j++) {
        expect(
          overlaps(out.nodes[i], out.nodes[j]),
          `${out.nodes[i].id} overlaps ${out.nodes[j].id}`,
        ).toBe(false)
      }
    }
  })

  it('is deterministic for the same document', () => {
    const input = [
      conn('fluid', 'a.out', 'b.in'),
      conn('fluid', 'b.out', 'c.in'),
      conn('heat', 'c.h', 'd.h', 'e.h'),
    ]
    expect(JSON.stringify(layoutSchematic(input))).toEqual(JSON.stringify(layoutSchematic(input)))
  })

  it('handles a closed loop without hanging or collapsing', () => {
    // Every node feeds another, so no node has in-degree zero — the layering
    // has to survive a genuine cycle.
    const out = layoutSchematic([
      conn('fluid', 'a.out', 'b.in'),
      conn('fluid', 'b.out', 'c.in'),
      conn('fluid', 'c.out', 'a.in'),
    ])
    expect(out.nodes.filter((n) => n.kind === 'instance')).toHaveLength(3)
    expect(new Set(out.nodes.map((n) => n.x)).size).toBeGreaterThan(1)
  })

  it('opens a closed loop at its pump, and only at a block on the loop', () => {
    const x = (out: ReturnType<typeof layoutSchematic>, id: string) => out.nodes.find((n) => n.id === id)!.x
    const loop = layoutSchematic(
      [conn('fluid', 'tank.out', 'pmp.in'), conn('fluid', 'pmp.out', 'hx.in'), conn('fluid', 'hx.out', 'tank.in')],
      new Map([['pmp', { label: 'PMP', type: 'LiquidPump' }]]),
    )
    expect(x(loop, 'pmp')).toBeLessThan(x(loop, 'hx'))
    expect(x(loop, 'hx')).toBeLessThan(x(loop, 'tank'))
    // hp carries two streams, so hp–coil is a loop; the fan after it is not on it.
    const twin = layoutSchematic(
      [conn('fluid', 'src.out', 'hp.in1'), conn('fluid', 'hp.out1', 'coil.in'), conn('fluid', 'coil.out', 'hp.in2'), conn('fluid', 'hp.out2', 'fan.in')],
      new Map([['fan', { label: 'FAN', type: 'MoistAirFan' }]]),
    )
    expect(x(twin, 'src')).toBeLessThan(x(twin, 'hp'))
    expect(x(twin, 'hp')).toBeLessThan(x(twin, 'fan'))
  })

  it('takes display labels and types from the solve when available', () => {
    const out = layoutSchematic(
      [conn('fluid', 'pmp.out', 'tnk.in')],
      new Map([
        ['pmp', { label: 'Pmp', type: 'LiquidPump' }],
        ['tnk', { label: 'Tnk', type: 'LiquidTank' }],
      ]),
    )
    const pump = out.nodes.find((n) => n.id === 'pmp')
    expect(pump?.label).toBe('Pmp')
    expect(pump?.type).toBe('LiquidPump')
    expect(pump?.shape).toBe('pump')
    // Without a solve the lowercase wire name is still shown, never blank.
    const bare = layoutSchematic([conn('fluid', 'pmp.out', 'tnk.in')])
    expect(bare.nodes.find((n) => n.id === 'pmp')?.label).toBe('pmp')
    expect(bare.nodes.find((n) => n.id === 'pmp')?.type).toBeUndefined()
  })

  it('drops a self-connection but keeps its instance', () => {
    const out = layoutSchematic([conn('fluid', 'a.out', 'a.in')])
    expect(out.nodes.map((n) => n.id)).toEqual(['a'])
    expect(out.edges).toHaveLength(0)
  })

  it('handles an empty topology', () => {
    const out = layoutSchematic([])
    expect(out.nodes).toEqual([])
    expect(out.edges).toEqual([])
    expect(out.groups).toEqual([])
    expect(out.width).toBeGreaterThan(0)
  })
})

describe('circuit grouping', () => {
  it('separates two fluid circuits that share a bond-graph domain', () => {
    // The exact case a domain-coloured drawing cannot express: coolant and
    // refrigerant are both `domain: fluid`.
    const out = layoutSchematic([
      fluidConn('liquid', 'eg50', 'pumpin.out', 'pump.in'),
      fluidConn('liquid', 'eg50', 'pump.out', 'hx.in'),
      fluidConn('twophase', 'r1234yf', 'feed.out', 'evap.in'),
      fluidConn('twophase', 'r1234yf', 'evap.out', 'cmp.in'),
    ])
    const groupOf = (id: string) => out.nodes.find((n) => n.id === id)?.group
    expect(groupOf('pump')).toBe(groupOf('pumpin'))
    expect(groupOf('evap')).toBe(groupOf('cmp'))
    expect(groupOf('pump')).not.toBe(groupOf('evap'))
    expect(out.groups).toHaveLength(2)
  })

  it('bands the circuits apart vertically', () => {
    const out = layoutSchematic([
      fluidConn('liquid', 'eg50', 'a.out', 'b.in'),
      fluidConn('twophase', 'r1234yf', 'x.out', 'y.in'),
    ])
    const [first, second] = out.groups
    expect(second.y).toBeGreaterThanOrEqual(first.y + first.h)
  })

  it('keeps a heat-exchanger wall in its fluid circuit, not the thermal one', () => {
    // A wall HX is a piece of the coolant line that also touches heat. Drawing
    // it in the thermal band would tear the coolant line in half.
    const out = layoutSchematic([
      fluidConn('liquid', 'eg50', 'pump.out', 'hx.in'),
      fluidConn('liquid', 'eg50', 'hx.out', 'snk.in'),
      conn('heat', 'hx.wall', 'mass.port'),
    ])
    const groupOf = (id: string) => out.nodes.find((n) => n.id === id)?.group
    expect(groupOf('hx')).toBe(groupOf('pump'))
    expect(groupOf('mass')).not.toBe(groupOf('hx'))
  })

  it('names each circuit by what flows in it', () => {
    const out = layoutSchematic(
      [fluidConn('liquid', 'eg50', 'a.out', 'b.in'), conn('heat', 'b.wall', 'm.port')],
      new Map(),
      [],
      new Map(),
      (key) => (key.fluid ? `${key.fluid}/${key.connector}` : key.domain),
    )
    expect(out.groups.map((g) => g.label).sort()).toEqual(['eg50/liquid', 'heat'])
  })

  it('keeps a coupling domain in ONE band instead of one band per pendant', () => {
    // Every thermal mass hangs off exactly one wall, and the wall belongs to
    // its fluid loop — so splitting heat by connectivity would make a separate
    // full-width band for each mass.
    const out = layoutSchematic([
      fluidConn('liquid', 'eg50', 'pump.out', 'hx1.in'),
      fluidConn('liquid', 'eg50', 'hx1.out', 'hx2.in'),
      fluidConn('liquid', 'eg50', 'hx2.out', 'snk.in'),
      conn('heat', 'hx1.wall', 'm1.port'),
      conn('heat', 'hx2.wall', 'm2.port'),
    ])
    expect(out.groups.filter((g) => g.lineId === 'heat')).toHaveLength(1)
    expect(out.nodes.find((n) => n.id === 'm1')?.group).toBe(out.nodes.find((n) => n.id === 'm2')?.group)
  })

  it('aligns each pendant coupling under the block it couples to', () => {
    // The whole value of a coupling band: a short vertical drop from the cold
    // plate to its battery, not a wire across the drawing.
    const out = layoutSchematic([
      fluidConn('liquid', 'eg50', 'pump.out', 'hx1.in'),
      fluidConn('liquid', 'eg50', 'hx1.out', 'hx2.in'),
      fluidConn('liquid', 'eg50', 'hx2.out', 'snk.in'),
      conn('heat', 'hx1.wall', 'm1.port'),
      conn('heat', 'hx2.wall', 'm2.port'),
    ])
    const centre = (id: string) => {
      const n = out.nodes.find((x) => x.id === id)
      return n ? n.x + n.w / 2 : NaN
    }
    // Each mass tracks its own exchanger, and they keep the same left-to-right
    // order — m1 under hx1, m2 under hx2.
    expect(centre('m1')).toBeLessThan(centre('m2'))
    expect(Math.abs(centre('m1') - centre('hx1'))).toBeLessThan(60)
    expect(Math.abs(centre('m2') - centre('hx2'))).toBeLessThan(60)
    // A row, not a column.
    expect(out.nodes.find((n) => n.id === 'm1')?.y).toBe(out.nodes.find((n) => n.id === 'm2')?.y)
  })

  it('still layers a coupling network that has real internal structure', () => {
    // A wall stack is not a set of pendants; its structure is the point.
    const out = layoutSchematic([
      conn('heat', 'src.port', 'cond.in'),
      conn('heat', 'cond.out', 'mass.a'),
      conn('heat', 'mass.b', 'conv.in'),
      conn('heat', 'conv.out', 'amb.port'),
    ])
    const ys = new Set(out.nodes.map((n) => n.y))
    const xs = new Set(out.nodes.map((n) => n.x))
    expect(xs.size).toBeGreaterThan(1)
    expect(ys.size).toBeGreaterThanOrEqual(1)
  })

  it('slots a coupling band next to the circuit it couples to most', () => {
    // Two loops bridged by heat: the thermal band belongs BETWEEN them, or its
    // couplings have to cross a whole unrelated circuit.
    const out = layoutSchematic([
      fluidConn('liquid', 'eg50', 'pump.out', 'hx1.in'),
      fluidConn('liquid', 'eg50', 'hx1.out', 'hx2.in'),
      fluidConn('twophase', 'r1234yf', 'feed.out', 'evap.in'),
      conn('heat', 'hx1.wall', 'm1.port'),
      conn('heat', 'hx2.wall', 'm2.port'),
      conn('heat', 'evap.wall', 'm3.port'),
    ])
    const order = out.groups.map((g) => g.lineId)
    expect(order[0]).toContain('liquid')
    expect(order[1]).toBe('heat')
    expect(order[2]).toContain('twophase')
  })

  it('aligns a pendant to a circuit stacked BELOW its own band', () => {
    // The thermal band sits between the two loops, so a cabin mass coupled to
    // the refrigerant evaporator is positioned against a band drawn after it.
    // Horizontal placement therefore cannot follow the stacking order.
    const out = layoutSchematic([
      fluidConn('liquid', 'eg50', 'pump.out', 'hx1.in'),
      fluidConn('liquid', 'eg50', 'hx1.out', 'hx2.in'),
      fluidConn('liquid', 'eg50', 'hx2.out', 'snk.in'),
      fluidConn('twophase', 'r1234yf', 'feed.out', 'xv.in'),
      fluidConn('twophase', 'r1234yf', 'xv.out', 'evap.in'),
      fluidConn('twophase', 'r1234yf', 'evap.out', 'cmp.in'),
      fluidConn('twophase', 'r1234yf', 'cmp.out', 'liq.in'),
      conn('heat', 'hx1.wall', 'm1.port'),
      conn('heat', 'evap.wall', 'cab.port'),
    ])
    const centre = (id: string) => {
      const n = out.nodes.find((x) => x.id === id)
      return n ? n.x + n.w / 2 : NaN
    }
    // `cab` couples to `evap`, which is in the band drawn after the heat band.
    expect(out.groups.findIndex((g) => g.lineId === 'heat')).toBeLessThan(
      out.groups.findIndex((g) => g.lineId.includes('twophase')),
    )
    expect(Math.abs(centre('cab') - centre('evap'))).toBeLessThan(60)
  })

  it('reports every distinct line for the legend', () => {
    const out = layoutSchematic([
      fluidConn('liquid', 'eg50', 'a.out', 'b.in'),
      fluidConn('twophase', 'r1234yf', 'x.out', 'y.in'),
      conn('heat', 'b.wall', 'm.port'),
    ])
    expect(out.lines).toHaveLength(3)
    expect(out.lines.filter((l) => l.domain === 'fluid').map((l) => l.fluid).sort()).toEqual([
      'eg50',
      'r1234yf',
    ])
  })
})

describe('port anchors', () => {
  const ports = new Map([['p', ['in', 'out', 'wall']]])

  it('puts flow inlets left, outlets right and a coupling on the face toward its partner', () => {
    // A cross-domain coupling on the flow axis reads as more pipework; on the
    // top or bottom face it reads as what it is. The heat band sits below.
    const out = layoutSchematic(
      [conn('fluid', 'p.out', 'q.in'), conn('fluid', 'z.out', 'p.in'), conn('heat', 'p.wall', 'm.port')],
      new Map(),
      [],
      ports,
    )
    const node = out.nodes.find((n) => n.id === 'p')
    const side = (port: string) => node?.ports.find((a) => a.port === port)?.side
    expect(side('in')).toBe('left')
    expect(side('out')).toBe('right')
    expect(side('wall')).toBe('bottom')
  })

  it('places declared ports that are not wired yet', () => {
    const out = layoutSchematic([], new Map(), ['p'], ports)
    const node = out.nodes.find((n) => n.id === 'p')
    expect(node?.ports.map((a) => a.port).sort()).toEqual(['in', 'out', 'wall'])
  })

  it('spaces several ports along a face without collisions', () => {
    const out = layoutSchematic([], new Map(), ['p'], new Map([['p', ['a_in', 'b_in', 'c_in']]]))
    const left = out.nodes.find((n) => n.id === 'p')?.ports.filter((a) => a.side === 'left') ?? []
    expect(left).toHaveLength(3)
    expect(new Set(left.map((a) => a.dy)).size).toBe(3)
  })

  it.each([
    // p/n/port name no outlet, so the junction has no place in the flow order.
    ['nothing feeds', [conn('electrical', 'sup.p', 'htr.p'), conn('electrical', 'sup.n', 'htr.n', 'gnd.port')]],
    // b reads as an outlet, but in a circuit it is only a terminal.
    ['a b terminal feeds', [conn('electrical', 'sup.p', 'htr.a'), conn('electrical', 'htr.b', 'sup.n', 'gnd.port')]],
  ])('places a circuit junction %s among its members, and faces each terminal toward its partner', (_, conns) => {
    const out = layoutSchematic(conns)
    const at = (id: string) => out.nodes.find((n) => n.id === id)!
    const centre = (n: SchematicNode) => ({ x: n.x + n.w / 2, y: n.y + n.h / 2 })
    const j = centre(out.nodes.find((n) => n.kind === 'junction')!)
    const members = ['sup', 'htr', 'gnd'].map((id) => centre(at(id)))
    expect(j.x).toBeGreaterThan(Math.min(...members.map((m) => m.x)))
    expect(j.x).toBeLessThan(Math.max(...members.map((m) => m.x)))
    for (const e of out.edges) {
      for (const [id, port, other] of [[e.from, e.fromPort, e.to], [e.to, e.toPort, e.from]] as const) {
        const a = at(id).ports.find((q) => q.port === port)
        if (!a) continue
        const [from, to] = [centre(at(id)), centre(at(other))]
        const toward = { left: to.x < from.x, right: to.x > from.x, top: to.y < from.y, bottom: to.y > from.y }[a.side]
        expect(toward, `${id}.${port} on ${a.side}`).toBe(true)
      }
    }
  })

  it('gives junctions no ports', () => {
    const out = layoutSchematic([conn('fluid', 'a.out', 'b.in', 'c.in')])
    expect(out.nodes.find((n) => n.kind === 'junction')?.ports).toEqual([])
  })
})

describe('routeEdge', () => {
  const out = layoutSchematic(
    [conn('fluid', 'a.out', 'b.in'), conn('heat', 'a.wall', 'm.port')],
    new Map(),
    [],
    new Map([['a', ['in', 'out', 'wall']]]),
  )
  const node = (id: string) => out.nodes.find((n) => n.id === id) as SchematicNode

  it('produces a finite orthogonal path between two placed nodes', () => {
    const path = routeEdge(node('a'), node('b'), 'out', 'in')
    expect(path).toMatch(/^M [\d.-]+ [\d.-]+/)
    expect(path).not.toMatch(/NaN|Infinity/)
  })

  it('leaves a node through the face its port sits on', () => {
    // The heat coupling exits downward, toward the band below, so its first
    // move is vertical.
    const heat = routeEdge(node('a'), node('m'), 'wall', 'port')
    const [, x0, y0, , x1, y1] = heat.split(/[ ,]+/)
    expect(Number(x1)).toBe(Number(x0))
    expect(Number(y1)).toBeGreaterThan(Number(y0))
  })

  it('survives a dragged node (recomputes from live positions)', () => {
    const moved = { ...node('b'), x: node('b').x - 400, y: node('b').y + 260 }
    const path = routeEdge(node('a'), moved, 'out', 'in')
    expect(path).not.toMatch(/NaN/)
    expect(path).not.toEqual(routeEdge(node('a'), node('b'), 'out', 'in'))
  })

  it('moves the route around an intervening block', () => {
    const a = node('a')
    const b = { ...node('b'), x: a.x + a.w + 400, y: a.y }
    const blocker = { ...a, id: 'blocker', x: a.x + a.w + 150, w: 104 }
    const path = routeEdge(a, b, 'out', 'in', [a, b, blocker])
    expect(path).toContain('V')
    expect(boxesEntered(path, [a, b, blocker])).toEqual([])
  })

  it('takes a backward loop round both of its own blocks', () => {
    // b sits left of a and the wire runs a.out (right face) → b.in (left face):
    // the straight midline would cut through both.
    const a = node('a')
    const b = { ...node('b'), x: a.x - 300, y: a.y }
    const path = routeEdge(a, b, 'out', 'in', [a, b])
    expect(boxesEntered(path, [a, b])).toEqual([])
  })
})

describe('unwired instances', () => {
  it('places a declared component that has no connections yet', () => {
    const out = layoutSchematic([conn('fluid', 'src.out', 'pmp.in')], new Map(), ['src', 'pmp', 'snk'])
    expect(out.nodes.map((n) => n.id).sort()).toEqual(['pmp', 'snk', 'src'])
    const snk = out.nodes.find((n) => n.id === 'snk')
    expect(snk).toBeDefined()
    expect(out.edges.some((e) => e.from === 'snk' || e.to === 'snk')).toBe(false)
  })

  it('does not duplicate an instance that is already wired', () => {
    const out = layoutSchematic([conn('fluid', 'a.out', 'b.in')], new Map(), ['a', 'b'])
    expect(out.nodes.filter((n) => n.kind === 'instance')).toHaveLength(2)
  })
})

describe('framedGroups', () => {
  const out = layoutSchematic([conn('fluid', 'a.out', 'b.in')], new Map(), ['a', 'b'])
  const inside = (n: SchematicNode, g: { x: number; y: number; w: number; h: number }) =>
    n.x >= g.x && n.y >= g.y && n.x + n.w <= g.x + g.w && n.y + n.h <= g.y + g.h

  it('keeps the laid-out frames when nothing has moved', () => {
    expect(framedGroups(out.groups, out.nodes)).toEqual(out.groups)
  })

  it('grows a frame to enclose a member dragged past it, and leaves its extent otherwise', () => {
    const b = out.nodes.find((n) => n.id === 'b')!
    const moved = { ...b, x: b.x + 900, y: b.y - 400 }
    const [frame] = framedGroups(out.groups, out.nodes.map((n) => (n.id === 'b' ? moved : n)))
    const laid = out.groups.find((g) => g.id === b.group)!
    expect(frame.id).toBe(laid.id)
    expect(inside(moved, frame)).toBe(true)
    // Still covers what it covered before; the title row stays above the node.
    expect(frame.x).toBe(laid.x)
    expect(frame.x + frame.w).toBeGreaterThan(laid.x + laid.w)
    expect(moved.y - frame.y).toBeGreaterThanOrEqual(22)
  })
})

describe('focusOf', () => {
  // Water loop A–J–{B,C}, with B also on an air line B–D–E; F stands apart.
  const node = (id: string, group: string, kind: 'instance' | 'junction' = 'instance') =>
    ({ id, group, kind }) as SchematicNode
  const nodes = [node('a', 'w'), node('j', 'w', 'junction'), node('b', 'w'), node('c', 'w'), node('d', 'air'), node('e', 'air'), node('f', 'x')]
  const edge = (id: string, from: string, to: string, lineId: string) => ({ id, from, to, lineId }) as SchematicEdge
  const edges = [
    edge('aj', 'a', 'j', 'water'),
    edge('jb', 'j', 'b', 'water'),
    edge('jc', 'j', 'c', 'water'),
    edge('bd', 'b', 'd', 'air'),
    edge('de', 'd', 'e', 'air'),
  ]
  const ids = (s: Set<string>) => [...s].sort()

  it('neighbours pass through a junction but stop at the next block', () => {
    const f = focusOf('neighbours', 'a', nodes, edges)
    expect(ids(f.nodes)).toEqual(['a', 'b', 'c', 'j'])
    expect(ids(f.edges)).toEqual(['aj', 'jb', 'jc'])
    expect(ids(focusOf('neighbours', 'b', nodes, edges).nodes)).toEqual(['a', 'b', 'c', 'd', 'j'])
  })

  it('trace follows every line the block sits on, and only those', () => {
    expect(ids(focusOf('trace', 'b', nodes, edges).nodes)).toEqual(['a', 'b', 'c', 'd', 'e', 'j'])
    expect(ids(focusOf('trace', 'a', nodes, edges).nodes)).toEqual(['a', 'b', 'c', 'j'])
  })

  it('circuit keeps the block\'s own frame and the wires inside it', () => {
    const f = focusOf('circuit', 'b', nodes, edges)
    expect(ids(f.nodes)).toEqual(['a', 'b', 'c', 'j'])
    expect(ids(f.edges)).toEqual(['aj', 'jb', 'jc'])
  })
})

describe('selection geometry', () => {
  const boxes = [
    { id: 'a', x: 0, y: 0, w: 100, h: 50 },
    { id: 'b', x: 150, y: 30, w: 60, h: 50 },
    { id: 'c', x: 400, y: 10, w: 80, h: 50 },
  ]
  const after = (op: Parameters<typeof arrangeDeltas>[0]) => {
    const d = arrangeDeltas(op, boxes)
    return boxes.map((b) => ({ id: b.id, x: b.x + d.get(b.id)!.dx, y: b.y + d.get(b.id)!.dy, w: b.w, h: b.h }))
  }

  it('aligns on the shared edge or centre line of the bounding box', () => {
    expect(after('left').map((b) => b.x)).toEqual([0, 0, 0])
    expect(after('right').map((b) => b.x + b.w)).toEqual([480, 480, 480])
    expect(after('centre').map((b) => b.x + b.w / 2)).toEqual([240, 240, 240])
    expect(after('top').map((b) => b.y)).toEqual([0, 0, 0])
    expect(after('bottom').map((b) => b.y + b.h)).toEqual([80, 80, 80])
    expect(after('middle').map((b) => b.y + b.h / 2)).toEqual([40, 40, 40])
    expect(after('top').map((b) => b.x)).toEqual([0, 150, 400]) // the other axis is untouched
  })

  it('spreads with equal gaps, keeping the outermost two in place', () => {
    const s = after('spread-x')
    expect(s.map((b) => b.x)).toEqual([0, 220, 400]) // gaps (480 - 240) / 2 = 120: a ends at 100, b starts at 220
    expect(arrangeDeltas('spread-x', boxes.slice(0, 2)).size).toBe(0)
  })

  it('finds the nearest block in an arrow direction', () => {
    expect(nearestInDirection(boxes[0], 'right', boxes)).toBe('b')
    expect(nearestInDirection(boxes[1], 'right', boxes)).toBe('c')
    expect(nearestInDirection(boxes[1], 'left', boxes)).toBe('a')
    expect(nearestInDirection(boxes[0], 'up', boxes)).toBeNull()
  })

  it('collects everything connected, across lines', () => {
    const edges = [
      { id: '1', from: 'a', to: 'j', lineId: 'w' },
      { id: '2', from: 'j', to: 'b', lineId: 'w' },
      { id: '3', from: 'b', to: 'd', lineId: 'air' },
      { id: '4', from: 'x', to: 'y', lineId: 'w' },
    ] as SchematicEdge[]
    expect([...connectedTo(['a'], edges)].sort()).toEqual(['a', 'b', 'd', 'j'])
  })
})

describe('wire semantics', () => {
  // Polylines: port, stub end, …, stub end, port.
  const h = [{ x: 0, y: 50 }, { x: 10, y: 50 }, { x: 190, y: 50 }, { x: 200, y: 50 }]
  const v = [{ x: 100, y: 0 }, { x: 100, y: 10 }, { x: 100, y: 90 }, { x: 100, y: 100 }]

  it('hops a horizontal wire over an unrelated vertical one, and only then', () => {
    const wires = new Map([['h', h], ['v', v]])
    expect(crossingHops(wires, (id) => id).get('h')).toEqual([{ x: 100, y: 50 }])
    expect(crossingHops(wires, (id) => id).has('v')).toBe(false)
    expect(crossingHops(wires, () => 'same set').size).toBe(0)
  })

  it('never hops on a port stub: the lane crossing it hops instead', () => {
    const stubCross = [{ x: 95, y: 50 }, { x: 105, y: 50 }, { x: 105, y: 80 }, { x: 110, y: 80 }]
    const hops = crossingHops(new Map([['s', stubCross], ['v', v]]), (id) => id)
    expect(hops.has('s')).toBe(false)
    expect(hops.get('v')).toEqual([{ x: 100, y: 50 }])
    expect(pathOf(v, hops.get('v'))).toBe(`M 100 0 L 100 10 V ${50 - HOP} A ${HOP} ${HOP} 0 0 1 100 ${50 + HOP} V 90 L 100 100`)
  })

  it('treats a straight run as one line across the lane–stub seam', () => {
    // h's lane ends at x=100 and its stub carries straight on: v crosses there.
    const seam = [{ x: 40, y: 50 }, { x: 54, y: 50 }, { x: 100, y: 50 }, { x: 114, y: 50 }]
    expect(crossingHops(new Map([['h', seam], ['v', v]]), (id) => id).get('v')).toEqual([{ x: 100, y: 50 }])
  })

  it('draws a hop as an arc that leaves the line and comes back to it', () => {
    const d = pathOf(h, [{ x: 100, y: 50 }])
    expect(d).toBe(`M 0 50 L 10 50 H ${100 - HOP} A ${HOP} ${HOP} 0 0 1 ${100 + HOP} 50 H 190 L 200 50`)
    // Right to left the arc sweeps the other way, so it still bulges up.
    expect(pathOf([...h].reverse(), [{ x: 100, y: 50 }])).toContain(`A ${HOP} ${HOP} 0 0 0 ${100 - HOP} 50`)
  })

  it('lays two different connection sets on separate tracks, one set on one', () => {
    // Two pairs whose cheapest route is the same vertical lane.
    const n = (id: string, x: number, y: number) =>
      ({ id, label: id, kind: 'instance', group: 'g', shape: 'pipe', terminal: false, x, y, w: 104, h: 52, ports: [] }) as unknown as SchematicNode
    const nodes = new Map([n('a', 0, 0), n('b', 400, 300), n('c', 0, 20), n('d', 400, 320)].map((x) => [x.id, x]))
    const edge = (id: string, from: string, to: string) => ({ id, from, to, lineId: 'w' }) as SchematicEdge
    const lanes = (r: Map<string, { x: number; y: number }[]>, id: string) =>
      r.get(id)!.slice(1, -1).flatMap((p, i, a) => (i > 0 && a[i - 1].x === p.x ? [p.x] : []))
    const apart = routeAll([edge('c1', 'a', 'b'), edge('c2', 'c', 'd')], nodes, [...nodes.values()])
    expect(lanes(apart, 'c1')).toHaveLength(1)
    expect(lanes(apart, 'c1')[0]).not.toBe(lanes(apart, 'c2')[0])
    const together = routeAll([edge('c1_0', 'a', 'b'), edge('c1_1', 'c', 'd')], nodes, [...nodes.values()])
    expect(lanes(together, 'c1_0')[0]).toBe(lanes(together, 'c1_1')[0])
  })
})

describe('manual routes (WIRE-07)', () => {
  const block = (id: string, x: number, port: string, side: 'left' | 'right'): SchematicNode => ({
    id, label: id, shape: 'generic' as SchematicNode['shape'], terminal: false, kind: 'instance', group: 'g',
    x, y: 0, w: 100, h: 40, ports: [{ port, side, dx: side === 'right' ? 100 : 0, dy: 20 }],
  })
  const b = block('b', 0, 'p', 'right')
  const l = block('l', 300, 'a', 'left')
  const e: SchematicEdge = { id: 'c0', lineId: 'x', domain: 'electrical', from: 'b', to: 'l', fromPort: 'p', toPort: 'a' }
  const bend = { x: 200, y: -60 }

  it('keys a wire by its ports, independent of connection numbering', () => {
    expect(routeKey(e)).toBe('b.p|l.a')
    expect(routeKey({ from: '$node$b.p', to: 'l', toPort: 'a' })).toBe('*|l.a')
  })

  it('runs orthogonally through every bend and keeps them when an end moves', () => {
    const pts = manualRoute(b, l, 'p', 'a', [bend])
    expect(pts).toEqual([{ x: 100, y: 20 }, { x: 114, y: 20 }, { x: 200, y: 20 }, bend, { x: 286, y: -60 }, { x: 286, y: 20 }, { x: 300, y: 20 }])
    expect(manualRoute(b, { ...l, y: 100 }, 'p', 'a', [bend])).toContainEqual(bend)
    // Laid first by routeAll, through the same bend.
    expect(routeAll([e], new Map([['b', b], ['l', l]]), [b, l], new Map([['c0', [bend]]])).get('c0')).toEqual(pts)
  })

  it('finds the lane under the pointer and the blocks a route runs through', () => {
    const pts = manualRoute(b, l, 'p', 'a', [bend])
    expect(nearestLane(pts, { x: 203, y: -20 })).toEqual({ index: 2, foot: { x: 200, y: -20 } })
    expect(routeCrosses(pts, [b, l])).toEqual([])
    expect(routeCrosses(manualRoute(b, l, 'p', 'a', [{ x: 350, y: -60 }, { x: 350, y: 100 }]), [b, l])).toEqual(['l'])
  })
})

describe('scopes (HIER-01)', () => {
  it('names a junction by its scope and first endpoint, not by statement order', () => {
    const junctions = (cs: Connection[]) => layoutSchematic(cs).nodes.filter((n) => n.kind === 'junction').map((n) => n.id)
    const root = conn('electrical', 'VS.n', 'R1.b', 'G.port')
    const inner = conn('electrical', 'sub1.r2.b', 'sub1.r1.b', 'sub1$a')
    expect(junctions([root])).toEqual(['$node$g.port'])
    expect(junctions([inner])).toEqual(['sub1$node$sub1$a'])
    expect(junctions([conn('electrical', 'x.a', 'y.a'), root])).toEqual(['$node$g.port'])
  })
  it('places nested blocks and boundary nodes in their subsystem', () => {
    expect(['vs.p', 'sub1.r1_a', 'sub1.r1.b', 'sub1$r1_a', 'sub1.box.inner.in', 'sub1.box$a'].map(endpointScope)).toEqual(['', '', 'sub1', 'sub1', 'sub1.box', 'sub1.box'])
    expect(['vs', 'sub1.r1', '$node$vs.n', 'sub1$a', 'sub1$node$sub1.r1.b'].map(scopeOf)).toEqual(['', 'sub1', '', 'sub1', 'sub1'])
    const l = layoutSchematic([{ domain: 'electrical', endpoints: ['sub1$a', 'sub1.r1.a'] }, { domain: 'electrical', endpoints: ['sub1.r1.b', 'sub1.r2.b'] }])
    expect(l.nodes.map((n) => n.id).sort()).toEqual(['sub1$a', 'sub1.r1', 'sub1.r2'])
  })
})
