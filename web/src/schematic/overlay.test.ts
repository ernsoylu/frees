import { describe, expect, it } from 'vitest'
import type { SchematicEdge } from './layout'
import { blockPowers, carriedAlong, edgeReadings, flowAlong, overlayMetrics, particlePeriods, phaseColor, phaseReadings, portPowers, powerSankey, rampColor } from './overlay'
import { indexVariables } from './readouts'

const FLOW: Record<string, string> = { fluid: 'mdot', heat: 'qdot', electrical: 'i', mechanical: 'tau', translational: 'f' }
// The rule the engine sends (`Connection::flow_into`): Kirchhoff flows are
// signed into the block; fluid mdot by the port name, `out` tested first.
const rule = (domain: string, stream: string, port: string) =>
  !FLOW[domain] ? null : domain !== 'fluid' ? { variable: `${stream}.${FLOW[domain]}`, into: 1 }
    : port.includes('out') ? { variable: `${stream}.mdot`, into: -1 } : port.includes('in') ? { variable: `${stream}.mdot`, into: 1 } : null
const edge = (id: string, domain: string, from: [string, string], to: [string, string]): SchematicEdge => {
  const [fromStream, toStream] = [from.join('.'), to.join('.')]
  return { id, lineId: domain, domain, from: from[0], to: to[0], fromPort: from[1], toPort: to[1], fromStream, toStream, fromFlow: rule(domain, fromStream, from[1]), toFlow: rule(domain, toStream, to[1]) }
}
const values = indexVariables([
  { name: 'pump.out.P', value: 300, units: 'kPa' },
  { name: 'pipe.in.P', value: 300, units: 'kPa' },
  { name: 'pipe.out.P', value: 100, units: 'kPa' },
  { name: 'pump.out.mdot', value: -2, units: 'kg/s' },
  { name: 'pipe.out.mdot', value: 2, units: 'kg/s' },
  { name: 'tank.port.mdot', value: 0, units: 'kg/s' },
  { name: 'r1.a.i', value: -0.5, units: 'A' },
  { name: 'vs.p.i', value: 0.5, units: 'A' },
  { name: 'odd.x.P', value: Number.NaN, units: 'kPa' },
])
const E = [
  edge('e1', 'fluid', ['pump', 'out'], ['pipe', 'in']),
  edge('e2', 'fluid', ['pipe', 'out'], ['sink', 'in']),
  edge('e3', 'fluid', ['tank', 'port'], ['odd', 'x']),
  edge('e4', 'electrical', ['vs', 'p'], ['r1', 'a']),
  edge('e5', 'fluid', ['a', 'out'], ['b', 'in']),
]

describe('overlay (RUN-04)', () => {
  it('offers only metrics the solve produced, one domain and unit per scale', () => {
    expect(overlayMetrics(E, values).map((m) => `${m.key} ${m.units}`)).toEqual(['fluid:p kPa', 'fluid:mdot kg/s', 'electrical:i A'])
    // A sequential member (here P read as a plain range by giving it no reference).
    const { byEdge, min, max } = edgeReadings(E, values, { key: 'fluid:h', label: 'fluid h', units: 'kPa' }, undefined)
    expect([min, max]).toEqual([Infinity, -Infinity])
    expect(byEdge.get('e1')).toEqual({ state: 'missing' })
    const p = edgeReadings(E, values, { key: 'fluid:p', label: 'fluid P', units: 'kPa' }, { reference: 200 })
    expect([p.min, p.reference, p.max]).toEqual([100, 200, 300])
    expect(Object.fromEntries(p.byEdge)).toEqual({
      e1: { state: 'value', value: 300, t: 1 },
      e2: { state: 'value', value: 100, t: 0 },
      e3: { state: 'nonfinite' },
      e5: { state: 'missing' },
    })
    expect(rampColor(0)).toBe('#440154')
    expect(rampColor(1)).toBe('#fde725')
  })

  it('draws measured flow by its sign convention, and no direction for zero or unknown', () => {
    // pump.out.mdot = -2: the stream runs backwards, from pipe to pump.
    expect(flowAlong(E[0], values)).toBe(-1)
    // pipe.out.mdot = 2 leaves pipe toward sink (sink has no value; read at pipe).
    expect(flowAlong(E[1], values)).toBe(1)
    // A fluid port named neither in nor out has no convention, even at zero.
    expect(flowAlong(E[2], values)).toBeNull()
    // r1.a.i = -0.5 flows out of R1 at a: against the wire, toward VS.
    expect(flowAlong(E[3], values)).toBe(-1)
    expect(flowAlong(E[4], values)).toBeNull()
    expect(flowAlong(edge('z', 'fluid', ['a', 'out'], ['b', 'in']), indexVariables([{ name: 'b.in.mdot', value: 0, units: 'kg/s' }]))).toBe(0)
  })

  it('carries power on shafts, and none on signal lines', () => {
    const shaft = edge('s', 'mechanical', ['motor', 'flange'], ['load', 'flange'])
    const v = indexVariables([
      { name: 'load.flange.tau', value: 3, units: 'N-m' },
      { name: 'load.flange.w', value: 10, units: 'rad/s' },
    ])
    expect(carriedAlong(shaft, v)).toBe(30)
    expect(flowAlong(edge('g', 'signal', ['pid', 'y'], ['valve', 'u']), v)).toBeNull()
    // Without the angular speed the shaft's power is unknown, never guessed.
    expect(carriedAlong(shaft, indexVariables([{ name: 'load.flange.tau', value: 3, units: 'N-m' }]))).toBeNull()
  })

  it('speeds particles by the log of the flow within each domain, and reverses them with its sign', () => {
    const p = particlePeriods(E, values)
    // e1 runs backwards at 2 kg/s, e2 forwards at 2 kg/s: same speed, opposite way.
    expect(p.get('e1')?.period).toBeCloseTo(0.4, 12)
    expect([p.get('e1')?.dir, p.get('e2')?.dir]).toEqual([-1, 1])
    expect(p.get('e2')?.period).toBe(p.get('e1')?.period)
    expect(p.get('e4')?.dir).toBe(-1)
    // No rule (e3) and no value (e5): no particles.
    expect(p.has('e3') || p.has('e5')).toBe(false)
    const slow = particlePeriods([E[0], edge('e6', 'fluid', ['c', 'out'], ['d', 'in'])], indexVariables([
      { name: 'pump.out.mdot', value: 100, units: 'kg/s' },
      { name: 'd.in.mdot', value: 1, units: 'kg/s' },
    ]))
    expect(slow.get('e1')?.period).toBeCloseTo(0.4, 12)
    expect(slow.get('e6')?.period).toBeCloseTo(1.6, 12)
  })

  it('diverges pressure about atmospheric, flows about zero, and clips a fixed range with a mark', () => {
    const P = { key: 'fluid:p', label: 'fluid P', units: 'kPa' }
    // Automatic: symmetric about 101.325 kPa, so 100 kPa sits just below the neutral middle.
    const auto = edgeReadings(E, values, P)
    expect(auto.reference).toBe(101.325)
    expect(auto.max - 101.325).toBeCloseTo(101.325 - auto.min, 9)
    expect(auto.byEdge.get('e2')!.t!).toBeLessThan(0.5)
    expect(auto.byEdge.get('e1')!.t).toBe(1)
    // A unit with no ambient value and no setting is a plain sequential scale.
    expect(edgeReadings(E, values, { ...P, units: 'mmHg' }).reference).toBeNull()
    // Signed flows diverge about zero: -2 and +2 kg/s at opposite ends.
    const m = edgeReadings(E, values, { key: 'fluid:mdot', label: 'fluid mdot', units: 'kg/s' })
    expect(m.reference).toBe(0)
    expect([m.byEdge.get('e1')!.t, m.byEdge.get('e2')!.t]).toEqual([0, 1])
    // A fixed lesson range: 300 kPa is beyond 250 and drawn at the top end, marked.
    const fixed = edgeReadings(E, values, P, { reference: 150, min: 120, max: 250 })
    expect(fixed.fixed).toBe(true)
    expect(fixed.byEdge.get('e1')).toEqual({ state: 'value', value: 300, t: 1, clipped: 'high' })
    expect(fixed.byEdge.get('e2')).toEqual({ state: 'value', value: 100, t: 0, clipped: 'low' })
  })

  it('reads phase from the engine, or from a recorded quality inside the dome, never from x = -1', () => {
    const tp = [edge('a', 'fluid', ['comp', 'out'], ['cond', 'in']), edge('b', 'fluid', ['valve', 'out'], ['evap', 'in']), edge('c', 'fluid', ['cond', 'out'], ['valve', 'in'])]
    const read = phaseReadings(tp, indexVariables([
      { name: 'evap.in.x', value: 0.3, units: '-' },
      { name: 'cond.out.x', value: -1, units: '-' },
    ]), { 'comp.out': { phase: 'superheated' } })
    expect(Object.fromEntries(read)).toEqual({ a: { phase: 'superheated' }, b: { phase: 'two-phase', x: 0.3 }, c: null })
    expect(phaseColor({ phase: 'superheated' })).toBe('#b2182b')
    expect(phaseColor({ phase: 'two-phase', x: 0 })).toBe('#1b7837')
    expect(phaseColor({ phase: 'two-phase', x: 1 })).toBe('#e08214')
  })
})

describe('M3: power at ports, per block, and as a Sankey', () => {
  // A 10 V battery drives 2 A through a resistor; a pump lifts water from h = 100 to 150 J/kg at 1 kg/s,
  // driven by a motor on a shaft at 10 rad/s and 6 N·m, with a junction-free heat loss of 5 W from the motor.
  const on = (e: SchematicEdge, net: string) => ({ ...e, lineId: net })
  const edges = [
    on(edge('e1', 'electrical', ['bat', 'p'], ['res', 'p']), 'n1'),
    on(edge('e2', 'electrical', ['res', 'n'], ['bat', 'n']), 'n2'),
    on(edge('e3', 'fluid', ['tank', 'out'], ['pump', 'in']), 'f1'),
    on(edge('e4', 'fluid', ['pump', 'out'], ['load', 'in']), 'f2'),
    on(edge('e5', 'mechanical', ['motor', 'shaft'], ['pump', 'shaft']), 's1'),
    on(edge('e6', 'heat', ['motor', 'case'], ['amb', 'port']), 'h1'),
    // A second wire to the same port must not count it twice.
    on(edge('e7', 'electrical', ['bat', 'p'], ['res', 'p']), 'n1'),
  ]
  const v = indexVariables([
    { name: 'bat.p.V', value: 10, units: 'V' }, { name: 'bat.p.I', value: -2, units: 'A' },
    { name: 'bat.n.V', value: 0, units: 'V' }, { name: 'bat.n.I', value: 2, units: 'A' },
    { name: 'res.p.V', value: 10, units: 'V' }, { name: 'res.p.I', value: 2, units: 'A' },
    { name: 'res.n.V', value: 0, units: 'V' }, { name: 'res.n.I', value: -2, units: 'A' },
    { name: 'tank.out.mdot', value: 1, units: 'kg/s' }, { name: 'tank.out.h', value: 100, units: 'J/kg' },
    { name: 'pump.in.mdot', value: 1, units: 'kg/s' }, { name: 'pump.in.h', value: 100, units: 'J/kg' },
    { name: 'pump.out.mdot', value: 1, units: 'kg/s' }, { name: 'pump.out.h', value: 150, units: 'J/kg' },
    { name: 'load.in.mdot', value: 1, units: 'kg/s' }, { name: 'load.in.h', value: 150, units: 'J/kg' },
    { name: 'motor.shaft.tau', value: -6, units: 'N-m' }, { name: 'motor.shaft.w', value: 10, units: 'rad/s' },
    { name: 'pump.shaft.tau', value: 6, units: 'N-m' }, { name: 'pump.shaft.w', value: 10, units: 'rad/s' },
    { name: 'motor.case.Qdot', value: -5, units: 'W' }, { name: 'amb.port.Qdot', value: 5, units: 'W' },
  ])

  it('signs each port into its block, once per port, and nets each block', () => {
    const ports = portPowers(edges, v)
    expect(ports.filter((p) => p.block === 'bat' && p.port === 'p')).toHaveLength(1)
    const net = blockPowers(ports)
    expect(Object.fromEntries(net)).toEqual({ bat: -20, res: 20, tank: -100, pump: 10, load: 150, motor: -65, amb: 5 })
  })

  it('sends each network\'s supply to the blocks taking power in, in proportion', () => {
    const { nodes, links } = powerSankey(portPowers(edges, v))
    const link = (a: string, b: string) => links.find((l) => nodes[l.source] === a && nodes[l.target] === b)?.value
    // The circuit is its own network: the battery feeds the resistor only.
    expect(link('bat', 'res')).toBe(20)
    expect(links.filter((l) => nodes[l.source] === 'bat')).toHaveLength(1)
    // The tank (100 W) and the motor (65 W) feed the load, the pump and the ambient (150, 10, 5 of 165).
    expect(link('tank', 'load')).toBeCloseTo(100 * 150 / 165, 12)
    expect(link('motor', 'amb')).toBeCloseTo(65 * 5 / 165, 12)
    expect(links.reduce((s, l) => s + l.value, 0)).toBeCloseTo(185, 12)
    // No block both supplies and takes: the diagram has no loops.
    expect(links.every((l) => !links.some((m) => m.source === l.target))).toBe(true)
  })
})
