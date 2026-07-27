import { describe, expect, it } from 'vitest'
import { layoutSchematic, portAnchors, type Connection, type SchematicNode } from './layout'

const conn = (domain: string, ...endpoints: string[]): Connection => ({ domain, endpoints })

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
    expect(out.edges[0].path).toMatch(/^M /)
    expect(out.width).toBeGreaterThan(0)
    expect(out.height).toBeGreaterThan(0)
  })

  it('turns a 3-way node into a junction rather than a clique', () => {
    const out = layoutSchematic([conn('fluid', 'a.out', 'b.in', 'c.in')])
    const junctions = out.nodes.filter((n) => n.kind === 'junction')
    expect(junctions).toHaveLength(1)
    // Three edges radiate from the junction — not three pairwise edges.
    expect(out.edges).toHaveLength(3)
    expect(out.edges.every((e) => e.from === junctions[0].id)).toBe(true)
    expect(out.edges.map((e) => e.to).sort()).toEqual(['a', 'b', 'c'])
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
        expect(overlaps(out.nodes[i], out.nodes[j])).toBe(false)
      }
    }
  })

  it('is deterministic for the same document', () => {
    const input = [
      conn('fluid', 'a.out', 'b.in'),
      conn('fluid', 'b.out', 'c.in'),
      conn('heat', 'c.h', 'd.h', 'e.h'),
    ]
    const first = layoutSchematic(input)
    const second = layoutSchematic(input)
    expect(JSON.stringify(second)).toEqual(JSON.stringify(first))
  })

  it('stacks disconnected sub-networks instead of interleaving them', () => {
    const out = layoutSchematic([
      conn('fluid', 'a.out', 'b.in'),
      conn('electrical', 'x.p', 'y.a'),
    ])
    const fluidY = out.nodes.filter((n) => n.id === 'a' || n.id === 'b').map((n) => n.y)
    const elecY = out.nodes.filter((n) => n.id === 'x' || n.id === 'y').map((n) => n.y)
    const fluidBottom = Math.max(...fluidY)
    const elecTop = Math.min(...elecY)
    const separated = elecTop > fluidBottom || Math.min(...fluidY) > Math.max(...elecY)
    expect(separated).toBe(true)
  })

  it('takes display labels and types from the solve when available', () => {
    const out = layoutSchematic(
      [conn('fluid', 'pmp.out', 'tnk.in')],
      new Map([
        ['pmp', { label: 'Pmp', type: 'Pump' }],
        ['tnk', { label: 'Tnk', type: 'Tank' }],
      ]),
    )
    const pump = out.nodes.find((n) => n.id === 'pmp')
    expect(pump?.label).toBe('Pmp')
    expect(pump?.type).toBe('Pump')
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
    expect(out.width).toBeGreaterThan(0)
  })

  it('routes every edge between placed nodes', () => {
    const out = layoutSchematic([
      conn('fluid', 'a.out', 'b.in'),
      conn('fluid', 'b.out', 'c.in'),
      conn('fluid', 'c.out', 'a.in'),
    ])
    const ids = new Set(out.nodes.map((n) => n.id))
    for (const e of out.edges) {
      expect(ids.has(e.from)).toBe(true)
      expect(ids.has(e.to)).toBe(true)
      expect(e.path.length).toBeGreaterThan(0)
      expect(e.path).not.toMatch(/NaN/)
    }
  })
})

describe('portAnchors', () => {
  const node = { id: 'p', label: 'P', kind: 'instance' as const, x: 100, y: 50, w: 120, h: 46 }

  it('puts inlets left and outlets right', () => {
    const anchors = portAnchors(node, ['in', 'out'])
    const inlet = anchors.find((a) => a.port === 'in')
    const outlet = anchors.find((a) => a.port === 'out')
    expect(inlet).toMatchObject({ side: 'left', x: 100 })
    expect(outlet).toMatchObject({ side: 'right', x: 220 })
    // Both sit on the node's vertical span.
    for (const a of anchors) {
      expect(a.y).toBeGreaterThan(node.y)
      expect(a.y).toBeLessThan(node.y + node.h)
    }
  })

  it('reads compound port names', () => {
    const anchors = portAnchors(node, ['ref_in', 'ref_out', 'cool_in', 'cool_out'])
    expect(anchors.filter((a) => a.side === 'left').map((a) => a.port)).toEqual(['ref_in', 'cool_in'])
    expect(anchors.filter((a) => a.side === 'right').map((a) => a.port)).toEqual(['ref_out', 'cool_out'])
  })

  it('spaces several ports down an edge without collisions', () => {
    const anchors = portAnchors(node, ['a_in', 'b_in', 'c_in'])
    const ys = anchors.map((a) => a.y)
    expect(new Set(ys).size).toBe(3)
    expect([...ys].sort((x, y) => x - y)).toEqual(ys)
  })

  it('splits ports that name neither side, deterministically', () => {
    const anchors = portAnchors(node, ['p', 'g', 'wall'])
    expect(anchors).toHaveLength(3)
    expect(anchors.filter((a) => a.side === 'left').length).toBeGreaterThan(0)
    expect(anchors.filter((a) => a.side === 'right').length).toBeGreaterThan(0)
    // Same input, same placement.
    expect(portAnchors(node, ['p', 'g', 'wall'])).toEqual(anchors)
  })

  it('gives junctions and portless nodes nothing', () => {
    expect(portAnchors({ ...node, kind: 'junction' }, ['in'])).toEqual([])
    expect(portAnchors(node, [])).toEqual([])
  })
})

describe('unwired instances', () => {
  it('places a declared component that has no connections yet', () => {
    const out = layoutSchematic([conn('fluid', 'src.out', 'pmp.in')], new Map(), ['src', 'pmp', 'snk'])
    expect(out.nodes.map((n) => n.id).sort()).toEqual(['pmp', 'snk', 'src'])
    // The unwired one is placed, just without edges.
    const snk = out.nodes.find((n) => n.id === 'snk')
    expect(snk).toBeDefined()
    expect(out.edges.some((e) => e.from === 'snk' || e.to === 'snk')).toBe(false)
  })

  it('does not duplicate an instance that is already wired', () => {
    const out = layoutSchematic([conn('fluid', 'a.out', 'b.in')], new Map(), ['a', 'b'])
    expect(out.nodes.filter((n) => n.kind === 'instance')).toHaveLength(2)
  })
})
