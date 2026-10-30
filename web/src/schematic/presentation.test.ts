import { describe, expect, it } from 'vitest'
import { EV_TOPOLOGY } from './evTopology.fixture'
import { layoutSchematic, pathOf, routeAll, type SchematicGroup, type SchematicNode } from './layout'
import { applyPreset, arrangeBase, arrangeBlocks, EMPTY_PRESENTATION, renamePresentation, transformSymbols, framesFor, guideSnap, resolveLegacy, sanitizePresentation, snapToGrid, styleFor } from './presentation'
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

describe('shown variables (RUN-03)', () => {
  it('round-trips badges, watch rows and formats, and drops malformed ones', () => {
    const shown = {
      badges: { chlr: 'chlr.q', 'sub1.r1': 'sub1.r1.a.i' },
      watch: ['chlr.in.p', 'x[2]'],
      formats: { 'chlr.in.p': { unit: 'bar', from: 'kPa', scale: 0.01, shift: 0, digits: 4 }, 'chlr.q': { digits: 3 } },
    }
    const { presentation, repaired } = sanitizePresentation({
      ...EMPTY_PRESENTATION,
      badges: { ...shown.badges, 'bad id': 'x', fan: 'Not A Name' },
      watch: [...shown.watch, 'chlr.in.p', 7],
      formats: { ...shown.formats, a: { unit: 'bar' }, b: { digits: 1 }, c: { scale: 0 } },
    })
    expect([presentation.badges, presentation.watch, presentation.formats]).toEqual([shown.badges, shown.watch, shown.formats])
    expect(repaired).toBe(7) // two badges, a duplicate and a number in watch, three formats
    expect(sanitizePresentation({ ...EMPTY_PRESENTATION, overlay: { metric: 'fluid:p', arrows: true } }).presentation.overlay).toEqual({ metric: 'fluid:p', arrows: true })
    // CFG-02: a line colour is kept only for a known kind and as #rrggbb; a bad width falls back.
    const lines = sanitizePresentation({ ...EMPTY_PRESENTATION, view: { ...EMPTY_PRESENTATION.view, lineWidth: 'huge' }, lineColors: { electrical: '#FF00FF', twophase: 'red', piping: '#123456' } })
    expect(lines.presentation.lineColors).toEqual({ electrical: '#ff00ff' })
    expect(lines.presentation.view.lineWidth).toBe('normal')
    expect(lines.repaired).toBe(3)
    expect(sanitizePresentation({ ...EMPTY_PRESENTATION, overlay: { metric: 'drop table', arrows: 1 } })).toMatchObject({ presentation: { overlay: { metric: '', arrows: false } }, repaired: 1 })
  })
})

describe('saved views and presets (VIEW-08)', () => {
  it('keeps a whole view, drops a broken one, and presets touch view settings only', () => {
    const good = { name: 'Loop', scope: 'sub1', camera: { x: -40, y: 12, zoom: 1.5 }, view: { ...EMPTY_PRESENTATION.view, detail: 'names' as const }, overlay: { metric: 'fluid:p', arrows: true }, badges: { pump: 'pump.w' }, focus: { kind: 'trace' as const, id: 'pump' } }
    const { presentation, repaired } = sanitizePresentation({
      ...EMPTY_PRESENTATION,
      views: [good, { ...good }, { ...good, name: 'Zoomed', camera: { x: 0, y: 0, zoom: 0 } }, { ...good, name: 'Odd', view: { detail: 'everything' } }, { ...good, name: 'Bad focus', focus: { kind: 'all', id: 'pump' } }],
    })
    expect(presentation.views).toEqual([good])
    expect(repaired).toBe(4) // a duplicate name, zero zoom, an unknown detail, an unknown focus
    const p = { ...EMPTY_PRESENTATION, positions: { a: { x: 1, y: 2 } }, overlay: { metric: 'fluid:p', arrows: false } }
    const debug = applyPreset(p, 'debug')
    expect([debug.view.portLabels, debug.view.grouping, debug.overlay, debug.positions]).toEqual([true, 'domain', p.overlay, p.positions])
    expect(applyPreset(p, 'presentation')).toMatchObject({ view: { background: 'plain', guides: false }, overlay: { metric: '', arrows: false } })
  })
})

describe('annotations (VIEW-09) and rename', () => {
  it('keeps linked annotations, drops malformed ones, and a rename moves every key and link', () => {
    const notes = [
      { id: 'n1', kind: 'note' as const, scope: '', at: { x: 10, y: 20 }, text: 'Pump sizing\nsee report', target: '' },
      { id: 'n2', kind: 'callout' as const, scope: 'sub1', at: { x: 0, y: 0 }, text: '', target: 'sub1.r1' },
      { id: 'n3', kind: 'card' as const, scope: 'sub1', at: { x: 5, y: 5 }, text: '', target: 'sub1.r1.a.i' },
    ]
    const { presentation, repaired } = sanitizePresentation({
      ...EMPTY_PRESENTATION,
      annotations: [...notes, { ...notes[0] }, { ...notes[1], id: 'n4', target: '' }, { ...notes[2], id: 'n5', target: 'Not A Var' }, { ...notes[0], id: 'x', text: 'odd id' }],
    })
    expect(presentation.annotations).toEqual(notes)
    expect(repaired).toBe(4) // a duplicate id, a callout to nothing, a malformed variable, a malformed id
    const p = {
      ...presentation,
      positions: { 'sub1.r1': { x: 1, y: 1 } },
      badges: { 'sub1.r1': 'sub1.r1.a.i' },
      watch: ['sub1.r1.a.v', 'sub1.r10.a.v'],
      formats: { 'sub1.r1.a.i': { digits: 3 } },
      views: [{ name: 'V', scope: 'sub1', camera: { x: 0, y: 0, zoom: 1 }, view: EMPTY_PRESENTATION.view, overlay: { metric: '', arrows: false }, badges: { 'sub1.r1': 'sub1.r1.a.i' }, focus: { kind: 'trace' as const, id: 'sub1.r1' } }],
    }
    const moved = renamePresentation(p, new Map([['sub1.r1', 'sub1.ra']]))
    expect(Object.keys(moved.positions)).toEqual(['sub1.ra'])
    expect(moved.badges).toEqual({ 'sub1.ra': 'sub1.ra.a.i' })
    expect(moved.watch).toEqual(['sub1.ra.a.v', 'sub1.r10.a.v']) // whole segments only
    expect(Object.keys(moved.formats)).toEqual(['sub1.ra.a.i'])
    expect(moved.views[0]).toMatchObject({ scope: 'sub1', badges: { 'sub1.ra': 'sub1.ra.a.i' }, focus: { id: 'sub1.ra' } })
    expect(moved.annotations.map((a) => a.target)).toEqual(['', 'sub1.ra', 'sub1.ra.a.i'])
  })
})

describe('symbol transforms (COMP-07)', () => {
  it('turns and mirrors ports with the symbol, keeping their names, and validates the style', () => {
    const node = { id: 'p', label: 'P', type: 'Pump', shape: 'pump', terminal: false, kind: 'instance', group: 'g', x: 0, y: 0, w: 100, h: 50, ports: [
      { port: 'in', side: 'left', dx: 0, dy: 25 },
      { port: 'out', side: 'right', dx: 100, dy: 25 },
      { port: 'shaft', side: 'top', dx: 50, dy: 0 },
    ] } as SchematicNode
    const at = (rotate: 0 | 90 | 180 | 270, mirror = false) =>
      transformSymbols({ nodes: [node] } as Parameters<typeof transformSymbols>[0], { project: {}, types: {}, instances: { p: { rotate, mirror } } }).nodes[0].ports.map((q) => `${q.port} ${q.side} ${q.dx},${q.dy}`)
    expect(at(90)).toEqual(['in top 50,0', 'out bottom 50,50', 'shaft right 100,25'])
    expect(at(180)).toEqual(['in right 100,25', 'out left 0,25', 'shaft bottom 50,50'])
    expect(at(0, true)).toEqual(['in right 100,25', 'out left 0,25', 'shaft top 50,0'])
    expect(at(90, true)).toEqual(['in bottom 50,50', 'out top 50,0', 'shaft right 100,25'])
    const { presentation, repaired } = sanitizePresentation({ ...EMPTY_PRESENTATION, styles: { project: { label: 'below', labelSize: 14 }, types: { pump: { rotate: 90, mirror: true, density: 'names' } }, instances: { p: { rotate: 45, labelSize: 40, label: 'left' } } } })
    expect(presentation.styles).toEqual({ project: { label: 'below', labelSize: 14 }, types: { pump: { rotate: 90, mirror: true, density: 'names' } }, instances: { p: {} } })
    expect(repaired).toBe(3)
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
