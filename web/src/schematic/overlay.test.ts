import { describe, expect, it } from 'vitest'
import type { SchematicEdge } from './layout'
import { edgeReadings, flowAlong, overlayMetrics, rampColor } from './overlay'
import { indexVariables } from './readouts'

const edge = (id: string, domain: string, from: [string, string], to: [string, string]): SchematicEdge => ({
  id, lineId: domain, domain, from: from[0], to: to[0], fromPort: from[1], toPort: to[1], fromStream: `${from[0]}.${from[1]}`, toStream: `${to[0]}.${to[1]}`,
})
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
    const { byEdge, min, max } = edgeReadings(E, values, { key: 'fluid:p', label: 'fluid P', units: 'kPa' })
    expect([min, max]).toEqual([100, 300])
    expect(Object.fromEntries(byEdge)).toEqual({
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
})
