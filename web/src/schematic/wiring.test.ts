import { describe, it, expect } from 'vitest'
import {
  alreadyConnected,
  compatibility,
  portIndex,
  netConnections,
  joinedElsewhere,
  connectStatement,
  groupByInstance,
  hasUnknownUnitWarning,
  instancesInDiagnosis,
  parseFreeQuantities,
  previewDomain,
  previewWire,
  searchLibrary,
} from './wiring'

describe('previewDomain', () => {
  it('uses the catalog library for ordinary ports', () => {
    expect(previewDomain('Resistor', 'a')).toBe('electrical')
    expect(previewDomain('Pipe', 'in')).toBe('fluid')
    expect(previewDomain('Conduction', 'a')).toBe('heat')
  })

  it('overrides wall/heat ports on mixed devices', () => {
    expect(previewDomain('LiquidWallHX', 'in')).toBe('fluid')
    expect(previewDomain('LiquidWallHX', 'wall')).toBe('heat')
  })

  it('does not invent a domain for an unknown type', () => {
    expect(previewDomain('MyCustomThing', 'foo')).toBeNull()
  })
})

describe('previewWire', () => {
  it('rejects wiring a component to itself', () => {
    const r = previewWire(
      { instance: 'r1', port: 'a', label: 'R1', type: 'Resistor' },
      { instance: 'r1', port: 'b', label: 'R1', type: 'Resistor' },
    )
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toMatch(/different component/i)
  })

  it('names both endpoints of an electrical-to-fluid attempt', () => {
    const r = previewWire(
      { instance: 'r1', port: 'a', label: 'R1', type: 'Resistor' },
      { instance: 'line', port: 'in', label: 'LINE', type: 'Pipe' },
    )
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.reason).toMatch(/electrical/)
      expect(r.reason).toMatch(/fluid/)
      expect(r.reason).toContain('R1.a')
      expect(r.reason).toContain('LINE.in')
    }
  })

  it('allows a valid fluid chain and a heat coupling', () => {
    expect(
      previewWire(
        { instance: 'sup', port: 'out', label: 'SUP', type: 'Source' },
        { instance: 'line', port: 'in', label: 'LINE', type: 'Pipe' },
      ).ok,
    ).toBe(true)
    expect(
      previewWire(
        { instance: 'hx', port: 'wall', label: 'HX', type: 'LiquidWallHX' },
        { instance: 'wall', port: 'a', label: 'W', type: 'Conduction' },
      ).ok,
    ).toBe(true)
  })

  it('allows unknown custom connectors rather than inventing physics', () => {
    expect(
      previewWire(
        { instance: 'a', port: 'foo', label: 'A', type: 'Mystery' },
        { instance: 'b', port: 'bar', label: 'B', type: 'Mystery' },
      ).ok,
    ).toBe(true)
  })

  it('rejects reconnecting endpoints already in one connection-set', () => {
    const r = previewWire(
      { instance: 'a', port: 'out', label: 'A', type: 'Source' },
      { instance: 'b', port: 'in', label: 'B', type: 'Pipe' },
      [{ domain: 'fluid', endpoints: ['a.out', 'b.in', 'c.in'] }],
    )
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toMatch(/already/)
  })

  it('allows a legal branch onto a third port of an existing node', () => {
    // A.out is on the node; C.out is not — this is a branch, not a duplicate.
    expect(
      previewWire(
        { instance: 'c', port: 'out', label: 'C', type: 'Source' },
        { instance: 'a', port: 'out', label: 'A', type: 'Source' },
        [{ domain: 'fluid', endpoints: ['a.out', 'b.in'] }],
      ).ok,
    ).toBe(true)
  })
})

describe('alreadyConnected', () => {
  it('matches case-insensitively and ignores raw-string formatting', () => {
    expect(
      alreadyConnected([{ domain: 'fluid', endpoints: ['SUP.out', 'LINE.in'] }], 'sup.out', 'line.in'),
    ).toBe(true)
    expect(
      alreadyConnected([{ domain: 'fluid', endpoints: ['SUP.out', 'LINE.in'] }], 'sup.out', 'ret.in'),
    ).toBe(false)
  })
})

describe('connectStatement', () => {
  it('uses display labels', () => {
    expect(
      connectStatement(
        { instance: 'sup', port: 'out', label: 'SUP' },
        { instance: 'line', port: 'in', label: 'LINE' },
      ),
    ).toBe('connect(SUP.out, LINE.in)')
  })
})

describe('diagnosis helpers', () => {
  it('extracts free quantities and groups them by instance', () => {
    const msg =
      'There are 5 equations and 7 variables. The problem is underspecified and cannot be solved. ' +
      'Free quantities (no defining relation): LINE.in.P, LINE.out.P, RET.in.mdot.'
    expect(parseFreeQuantities(msg)).toEqual(['LINE.in.P', 'LINE.out.P', 'RET.in.mdot'])
    expect(instancesInDiagnosis(msg).sort()).toEqual(['line', 'ret'])
    expect(groupByInstance(parseFreeQuantities(msg)).map((g) => g.instance).sort()).toEqual([
      'line',
      'ret',
    ])
  })

  it('detects unknown-unit warnings', () => {
    expect(hasUnknownUnitWarning(['unknown unit `bananas`: the literal was left unconverted'])).toBe(
      true,
    )
    expect(hasUnknownUnitWarning(['T_out: mixing K with C'])).toBe(false)
  })
})

describe('engine-classified compatibility', () => {
  const port = (instance: string, p: string, domain: string, connector: string | null = null, connected = false) => ({ instance, port: p, domain, connector, connected })
  it('allows, prohibits, or leaves pending', () => {
    expect(compatibility(port('a', 'out', 'fluid', 'liquid'), port('b', 'in', 'fluid', 'liquid')).kind).toBe('allowed')
    expect(compatibility(port('a', 'out', 'fluid', 'liquid'), port('b', 'in', 'fluid', 'fluid')).kind).toBe('allowed')
    expect(compatibility(port('a', 'out', 'fluid', 'liquid'), port('b', 'in', 'fluid', 'moistair'))).toMatchObject({ kind: 'prohibited', reason: /liquid line/ })
    expect(compatibility(port('a', 'p', 'electrical'), port('b', 'wall', 'heat'))).toMatchObject({ kind: 'prohibited', reason: /electrical a.p to heat b.wall/ })
    expect(compatibility(port('a', 'p', 'electrical'), undefined).kind).toBe('unknown')
  })
  it('previewWire defers to the engine, and marks unclassified wires pending', () => {
    const ports = portIndex([port('a', 'out', 'fluid', 'liquid'), port('b', 'in', 'fluid', 'moistair')])
    expect(previewWire({ instance: 'a', port: 'out' }, { instance: 'b', port: 'in' }, [], ports)).toMatchObject({ ok: false })
    expect(previewWire({ instance: 'a', port: 'out' }, { instance: 'new', port: 'in' }, [], ports)).toMatchObject({ ok: true, pending: /decided by Check/ })
  })
})

describe('net topology (WIRE-05)', () => {
  const conns = [
    { domain: 'fluid', endpoints: ['a.out', 'b.in'] },
    { domain: 'fluid', endpoints: ['b.in', 'c.in'] },
    { domain: 'fluid', endpoints: ['d.out', 'e.in'] },
  ]
  it('groups connections sharing endpoints and finds what still joins an end', () => {
    expect(netConnections(conns, 0)).toEqual([0, 1])
    expect(netConnections(conns, 2)).toEqual([2])
    expect(joinedElsewhere(conns, new Set([0]), 'B.in')).toEqual([1])
    expect(joinedElsewhere(conns, new Set([0]), 'a.out')).toEqual([])
  })
})

describe('searchLibrary', () => {
  it('puts document types first and matches type, tag or library', () => {
    const hits = searchLibrary('fan', ['MyFan'])
    expect(hits[0]).toMatchObject({ type: 'MyFan', local: true })
    expect(hits.some((h) => h.type === 'MoistAirFan' && !h.local)).toBe(true)
    expect(searchLibrary('moistair', []).every((h) => h.library === 'moistair' || /moistair/i.test(h.type + h.summary))).toBe(true)
  })
  it('ranks the type typed in full first, then types it starts', () => {
    expect(searchLibrary('resistor', []).slice(0, 1).map((h) => h.type)).toEqual(['Resistor'])
  })
  it('filters by domain and drops untyped local types', () => {
    const hits = searchLibrary('', ['MyFan'], 'electrical')
    expect(hits.some((h) => h.local)).toBe(false)
    expect(hits.some((h) => h.type === 'Resistor')).toBe(true)
    expect(hits.some((h) => h.type === 'MoistAirFan')).toBe(false)
  })
})
