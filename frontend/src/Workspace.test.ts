import { describe, it, expect } from 'vitest'
import { parseTopologyTypes, groupComponents } from './Workspace'
import { VariableResult } from './api'

const v = (name: string, value = 0): VariableResult => ({ name, value, units: '' })

describe('parseTopologyTypes', () => {
  it('maps instance name → type from the Mermaid topology, lowercased', () => {
    const topo =
      'flowchart LR\n' +
      '  n0["chlr<br/>TwoPhaseEvaporatorUA"]\n' +
      '  n1["Cmp<br/>TwoPhaseCompressor"]\n' +
      '  n0 --- n1\n'
    const map = parseTopologyTypes(topo)
    expect(map.get('chlr')).toBe('TwoPhaseEvaporatorUA')
    expect(map.get('cmp')).toBe('TwoPhaseCompressor')
  })

  it('returns an empty map when there is no topology', () => {
    expect(parseTopologyTypes(null).size).toBe(0)
    expect(parseTopologyTypes(undefined).size).toBe(0)
  })
})

describe('groupComponents', () => {
  it('keeps dotless names as plain scalars', () => {
    const { plain, components } = groupComponents([v('k_fin'), v('t_fin')], new Map())
    expect(plain.map((p) => p.name)).toEqual(['k_fin', 't_fin'])
    expect(components).toHaveLength(0)
  })

  it('groups dotted port-member names under their instance and strips the prefix', () => {
    const scalars = [
      v('chlr.out.h'),
      v('chlr.wall.qdot'),
      v('chlr.tevap'),
      v('cmp.in.h'),
      v('k_fin'),
    ]
    const typeMap = new Map([['chlr', 'TwoPhaseEvaporatorUA']])
    const { plain, components } = groupComponents(scalars, typeMap)

    expect(plain.map((p) => p.name)).toEqual(['k_fin'])
    expect(components.map((c) => c.name)).toEqual(['chlr', 'cmp'])

    const chlr = components[0]
    expect(chlr.type).toBe('TwoPhaseEvaporatorUA')
    // members sorted by label, prefix removed
    expect(chlr.members.map((m) => m.label)).toEqual(['out.h', 'tevap', 'wall.qdot'])

    // unknown type stays undefined (renders a generic "Component" pill)
    expect(components[1].type).toBeUndefined()
  })
})
