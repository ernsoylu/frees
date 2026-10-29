import { describe, expect, it } from 'vitest'
import { EV_TOPOLOGY } from './evTopology.fixture'
import { layoutSchematic, pathOf, routeAll, type SchematicGroup, type SchematicNode } from './layout'
import { arrangeBase, arrangeBlocks, EMPTY_PRESENTATION, framesFor, guideSnap, resolveLegacy, sanitizePresentation, snapToGrid, styleFor } from './presentation'
import { boxesEntered } from '../test/schematicPaths'

const ev = layoutSchematic(EV_TOPOLOGY)
const blocks = (nodes: SchematicNode[]) => nodes.filter((n) => n.kind === 'instance')
const overlapping = (nodes: SchematicNode[]) => {
  const out: string[] = []
  for (const a of nodes) {
    for (const b of nodes) {
      if (a.id < b.id && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) {
        out.push(`${a.id}/${b.id}`)
      }
    }
  }
  return out
}

describe('arrangeBase', () => {
  it('leaves the layout alone at normal spacing, horizontal', () => {
    expect(arrangeBase(ev, { spacing: 'normal', orientation: 'horizontal' })).toBe(ev)
  })

  it('scales positions but not sizes, without overlaps', () => {
    for (const spacing of ['compact', 'roomy'] as const) {
      const out = arrangeBase(ev, { spacing, orientation: 'horizontal' })
      expect(out.nodes.map((n) => n.w)).toEqual(ev.nodes.map((n) => n.w))
      expect(overlapping(out.nodes)).toEqual([])
    }
    const pump = (l: typeof ev) => l.nodes.find((n) => n.id === 'pump')!
    const centre = (n: SchematicNode) => n.x + n.w / 2
    expect(centre(pump(arrangeBase(ev, { spacing: 'roomy', orientation: 'horizontal' })))).toBeCloseTo(centre(pump(ev)) * 1.25)
  })

  it('keeps wires clear of blocks at every spacing and orientation', () => {
    for (const orientation of ['horizontal', 'vertical'] as const) {
      for (const spacing of ['compact', 'normal', 'roomy'] as const) {
        const out = arrangeBase(ev, { spacing, orientation })
        expect(overlapping(out.nodes)).toEqual([])
        const routes = routeAll(out.edges, new Map(out.nodes.map((n) => [n.id, n])), out.nodes)
        for (const [id, pts] of routes) {
          expect(boxesEntered(pathOf(pts), blocks(out.nodes)), `${orientation} ${spacing} ${id}`).toEqual([])
        }
      }
    }
  })

  it('turns flow top to bottom: ports on the turned sides', () => {
    const out = arrangeBase(ev, { spacing: 'normal', orientation: 'vertical' })
    const pumpIn = ev.nodes.find((n) => n.id === 'pump')!.ports
    const turned = out.nodes.find((n) => n.id === 'pump')!.ports
    expect(turned.map((p) => p.side)).toEqual(pumpIn.map((p) => ({ left: 'top', right: 'bottom', top: 'left', bottom: 'right' })[p.side]))
    // Downstream is now below rather than to the right, on the same centre line.
    const [pumpin, pump] = ['pumpin', 'pump'].map((id) => out.nodes.find((n) => n.id === id)!)
    expect(pump.y).toBeGreaterThan(pumpin.y)
    expect(pump.x + pump.w / 2).toBeCloseTo(pumpin.x + pumpin.w / 2)
  })
})

describe('framesFor', () => {
  const frame = (id: string, lineId: string, x: number, y: number): SchematicGroup => ({ id, label: id, lineId, x, y, w: 100, h: 50 })
  const groups = [frame('a', 'water/1', 0, 0), frame('b', 'water/2', 0, 100), frame('c', 'heat', 0, 200)]
  const domainOf = (line: string) => line.split('/')[0]

  it('frames each circuit, each domain, or nothing', () => {
    expect(framesFor('circuit', groups, [], domainOf)).toHaveLength(3)
    expect(framesFor('none', groups, [], domainOf)).toEqual([])
    const byDomain = framesFor('domain', groups, [], domainOf)
    expect(byDomain.map((g) => [g.label, g.y, g.h])).toEqual([
      ['water', 0, 150],
      ['heat', 200, 50],
    ])
  })
})

describe('snapping', () => {
  it('snaps to the grid', () => {
    expect([snapToGrid(23, 16), snapToGrid(24, 16), snapToGrid(-9, 16)]).toEqual([16, 32, -16])
  })

  it('guides align the nearest edge or centre within tolerance, per axis', () => {
    const others = [{ x: 100, y: 0, w: 100, h: 50 }]
    // Left edge 3 units from the other's left; middle 2 from its middle.
    const g = guideSnap({ x: 103, y: 202, w: 60, h: 46 }, others, 6)
    expect(g.dx).toBe(-3)
    expect(g.xs).toEqual([100])
    expect(g.dy).toBe(0) // 202 is far from 0, 25 and 50
    // Top is 2 off, but the middle lines up exactly and wins.
    expect(guideSnap({ x: 400, y: 2, w: 60, h: 46 }, others, 6)).toEqual({ dx: 0, dy: 0, xs: [], ys: [25] })
  })
})

describe('resolveLegacy', () => {
  it('makes v3 offsets absolute against the legacy layout and keeps strays for recovery', () => {
    const pump = ev.nodes.find((n) => n.id === 'pump')!
    const { presentation, unresolved } = resolveLegacy(
      { ...EMPTY_PRESENTATION, positions: { batt: { x: 5, y: 6 } }, legacyOffsets: { pump: { dx: 40, dy: -20 }, batt: { dx: 1, dy: 1 }, gone: { dx: 9, dy: 9 } } },
      ev.nodes,
    )
    expect(presentation.positions.pump).toEqual({ x: pump.x + 40, y: pump.y - 20 })
    expect(presentation.positions.batt).toEqual({ x: 5, y: 6 }) // a v4 position wins
    expect(presentation.legacyOffsets).toEqual({ gone: { dx: 9, dy: 9 } })
    expect(unresolved).toBe(1)
  })
})

describe('style scopes (CFG-01) and identifier validation (CFG-07)', () => {
  it('takes the block, then its type, then the project', () => {
    const styles = { project: { accent: '#111111', precision: 3 }, types: { pump: { accent: '#222222' } }, instances: { p1: { precision: 6 } } }
    expect(styleFor(styles, 'p1', 'Pump')).toEqual({ accent: '#222222', precision: 6 })
    expect(styleFor(styles, 'p2', 'Pump')).toEqual({ accent: '#222222', precision: 3 })
    expect(styleFor(styles, 'v1', 'Valve')).toEqual({ accent: '#111111', precision: 3 })
  })
  it('drops malformed styles and ids that name no block, and counts them', () => {
    const { presentation, repaired } = sanitizePresentation({
      positions: { 'u1.p': { x: 1, y: 2 }, $node3: { x: 0, y: 0 }, 'not an id': { x: 0, y: 0 } },
      locked: ['u1', 'x;y'],
      styles: {
        project: { accent: 'red', precision: 4 },
        types: { pump: { accent: '#abcdef' }, 'Bad Type': { precision: 3 } },
        instances: { p1: { precision: 99, accent: '#000000' } },
      },
    })
    expect(Object.keys(presentation.positions)).toEqual(['u1.p', '$node3'])
    expect(presentation.locked).toEqual(['u1'])
    expect(presentation.styles).toEqual({ project: { precision: 4 }, types: { pump: { accent: '#abcdef' } }, instances: { p1: { accent: '#000000' } } })
    expect(repaired).toBe(5) // position, lock, project accent, bad type key, precision 99
  })
})

describe('wire routes (WIRE-07)', () => {
  it('round-trips bends and locks, and drops malformed ones', () => {
    const routes = { 'fan.out|sup.in': { points: [{ x: 1, y: 2 }], locked: true }, '*|l.a': { points: [] } }
    const { presentation, repaired } = sanitizePresentation({ ...EMPTY_PRESENTATION, routes: { ...routes, bad: { points: [{ x: 'a' }] }, worse: 3 } })
    expect(presentation.routes).toEqual(routes)
    expect(repaired).toBe(2)
  })
})

describe('arrangeBlocks (VIEW-04)', () => {
  it('returns unlocked targets to the layout with their unlocked routes; locks hold', () => {
    const p = {
      ...EMPTY_PRESENTATION,
      positions: { a: { x: 1, y: 1 }, b: { x: 2, y: 2 }, c: { x: 3, y: 3 } },
      locked: ['b'],
      routes: { 'a.out|c.in': { points: [] }, 'b.out|c.in': { points: [], locked: true }, 'c.out|d.in': { points: [] } },
    }
    const { presentation, moved } = arrangeBlocks(p, ['a', 'b'])
    expect(moved).toEqual(['a'])
    expect(presentation.positions).toEqual({ b: { x: 2, y: 2 }, c: { x: 3, y: 3 } })
    expect(Object.keys(presentation.routes)).toEqual(['b.out|c.in', 'c.out|d.in'])
  })
})
