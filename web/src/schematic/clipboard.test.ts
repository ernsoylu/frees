import { describe, expect, it } from 'vitest'
import type { CheckResponse } from '../api'
import { copyFragment, deleteImpact, pasteFragment } from './clipboard'
import { applyChanges } from './sourceEdit'

const TEXT = `function [a, b] = Box()
port(a)
port(b)
end
Source SRC(mdot=m_in)
Box B1()
Sink SNK()
connect(SRC.out, B1.a)
connect(B1.b, SNK.in)
Q = B1.a.mdot * 2
`
const at = (s: string): [number, number] => [TEXT.indexOf(s), TEXT.indexOf(s) + s.length]
const inst = (name: string, type: string, decl: string, localType = false) =>
  ({ name, label: name.toUpperCase(), type, line: 0, range: at(decl), localType, definedIn: null, params: [] as { name: string; range: [number, number] }[] })
const src = inst('src', 'source', 'Source SRC(mdot=m_in)')
src.params = [{ name: 'mdot', range: at('m_in') }]
const check = {
  instances: [src, inst('b1', 'box', 'Box B1()', true), inst('snk', 'sink', 'Sink SNK()')],
  connections: [
    { domain: 'fluid', endpoints: ['src.out', 'b1.a'], range: at('connect(SRC.out, B1.a)') },
    { domain: 'fluid', endpoints: ['b1.b', 'snk.in'], range: at('connect(B1.b, SNK.in)') },
  ],
  definitions: [{ name: 'box', line: 1, range: at('function [a, b] = Box()\nport(a)\nport(b)\nend') }],
} as unknown as CheckResponse

describe('clipboard', () => {
  it('copies internal wiring, local types and dependencies; reports external wires', () => {
    const f = copyFragment(TEXT, check, new Set(['src', 'b1']), { src: { x: 10, y: 20 } })
    expect(f.connects).toEqual([['SRC.out', 'B1.a']])
    expect(f.external).toEqual(['B1.b — SNK.in'])
    expect(f.definitions.map((d) => d.name)).toEqual(['box'])
    expect(f.uses).toEqual(['m_in'])
    // Into a document that already has SRC and no Box or m_in.
    const p = pasteFragment('Source SRC(mdot=1)\n', f, ['SRC'], [], { dx: 40, dy: 40 })
    expect(p.renames).toEqual([['SRC', 'SRC2']])
    expect(p.block).toBe(`${f.definitions[0].text}\nSource SRC2(mdot=m_in)\nBox B1()\nconnect(SRC2.out, B1.a)`)
    expect(p.added).toEqual(['box'])
    expect(p.missing).toEqual(['m_in'])
    expect(p.positions).toEqual({ src2: { x: 50, y: 60 } })
    // Into its own document: the definition is reused, m_in is still missing.
    expect(pasteFragment(TEXT, f, ['SRC', 'B1', 'SNK'], [{ name: 'box', text: f.definitions[0].text }], { dx: 0, dy: 0 }).reused).toEqual([{ name: 'box', differs: false }])
  })

  it('deletes a block with the connections it owns and reports equations that read it', () => {
    const d = deleteImpact(TEXT, check, new Set(['b1']))
    expect(applyChanges(TEXT, d.edit.changes)).toBe(TEXT.replace('Box B1()\n', '').replace('connect(SRC.out, B1.a)\n', '').replace('connect(B1.b, SNK.in)\n', ''))
    expect(d.removed).toEqual(['connect(SRC.out, B1.a)', 'connect(B1.b, SNK.in)'])
    expect(d.equations).toEqual([{ line: 10, text: 'Q = B1.a.mdot * 2' }])
  })
})
