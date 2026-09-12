import { describe, expect, it } from 'vitest'
import { encapsulateSelection } from './encapsulation'
import type { SchematicEdge, SchematicNode } from './layout'

const node = (id: string): SchematicNode => ({
  id, label: id, shape: 'block', terminal: false, kind: 'instance', group: 'fluid#0',
  x: 0, y: 0, w: 100, h: 50, ports: [],
})

const edge = (from: string, to: string, fromPort: string, toPort: string): SchematicEdge => ({
  id: `${from}-${to}`, lineId: 'fluid', domain: 'fluid', from, to, fromPort, toPort,
})

describe('encapsulateSelection', () => {
  it('emits selected declarations, internal wires, and exposed ports', () => {
    const result = encapsulateSelection({
      name: 'Loop',
      selected: new Set(['a', 'b']),
      nodes: [node('a'), node('b'), node('sink')],
      edges: [edge('a', 'b', 'out', 'in'), edge('b', 'sink', 'out', 'in')],
      source: 'Pipe a(P=1)\nPipe b(P=2)\nPipe sink(P=3)',
    })
    expect(result).toContain('function [out] = Loop()')
    expect(result).toContain('Pipe a(P=1)')
    expect(result).toContain('connect(a.out, b.in)')
    expect(result).toContain('connect(out, b.out)')
  })

  it('rejects an empty selection', () => {
    expect(() => encapsulateSelection({ name: 'Loop', selected: new Set(), nodes: [], edges: [], source: '' })).toThrow(
      'Select at least one component',
    )
  })

  it('rejects disconnected selections', () => {
    expect(() => encapsulateSelection({
      name: 'Loop', selected: new Set(['a', 'b']), nodes: [node('a'), node('b')], edges: [], source: 'Pipe a()\nPipe b()',
    })).toThrow('one connected group')
  })
})
