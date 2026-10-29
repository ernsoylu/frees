import { describe, expect, it } from 'vitest'
import type { ConnectionDto, InstanceIdentityDto } from '../api'
import { appendStatement, applyChanges, disconnectEndpoint, instanceAt, invertChanges, removeStatement, renamedIds, renameId, renameInstance, renameProblem, suggestFix } from './sourceEdit'

const TEXT = '// Kühler ✓ 🧊\nFan F(dP=1)\nconnect(A.out, F.in, B.in) // tee\nconnect(F.out, C.in)\nx = 1'
const at = (s: string) => [TEXT.indexOf(s), TEXT.indexOf(s) + s.length] as [number, number]

describe('source transactions', () => {
  it('patches only the given ranges and inverts exactly', () => {
    const changes = [{ from: at('F(')[0], to: at('F(')[0] + 1, insert: 'FAN' }, { from: TEXT.length, to: TEXT.length, insert: '\ny = 2' }]
    const after = applyChanges(TEXT, changes)
    expect(after).toBe(TEXT.replace('Fan F(', 'Fan FAN(') + '\ny = 2')
    expect(applyChanges(after, invertChanges(TEXT, changes))).toBe(TEXT)
    expect(() => applyChanges(TEXT, [{ from: 0, to: 5, insert: '' }, { from: 3, to: 4, insert: '' }])).toThrow()
  })

  it('removes a statement with its line, or alone when the line holds more', () => {
    expect(applyChanges(TEXT, [removeStatement(TEXT, at('connect(F.out, C.in)'))])).toBe(TEXT.replace('connect(F.out, C.in)\n', ''))
    const tee = at('connect(A.out, F.in, B.in)')
    expect(applyChanges(TEXT, [removeStatement(TEXT, tee)])).toContain('\n // tee\n')
    expect(appendStatement('a = 1', 'b = 2')).toEqual({ from: 5, to: 5, insert: '\nb = 2\n' })
  })

  it('disconnects one endpoint of a junction, or removes a two-way connection', () => {
    const tee: ConnectionDto = { domain: 'fluid', endpoints: ['a.out', 'f.in', 'b.in'], range: at('connect(A.out, F.in, B.in)') }
    const edit = disconnectEndpoint(TEXT, tee, 'f.in')!
    expect(applyChanges(TEXT, edit.changes)).toContain('connect(A.out, B.in) // tee')
    const pair: ConnectionDto = { domain: 'fluid', endpoints: ['f.out', 'c.in'], range: at('connect(F.out, C.in)') }
    expect(applyChanges(TEXT, disconnectEndpoint(TEXT, pair, 'c.in')!.changes)).not.toContain('C.in')
    expect(disconnectEndpoint(TEXT, { ...pair, range: null }, 'c.in')).toBeNull() // a shared stream has no statement
  })

  it('renames at the scoped references and refuses clashes in that scope', () => {
    const f: InstanceIdentityDto = { name: 'f', label: 'F', type: 'fan', line: 2, localType: false, refs: [[at('F(')[0], at('F(')[0] + 1], [at('F.in')[0], at('F.in')[0] + 1], [at('F.out')[0], at('F.out')[0] + 1]] }
    const c: InstanceIdentityDto = { name: 'c', label: 'C', type: 'sink', line: 9, localType: false, refs: [] }
    const nestedC = { ...c, name: 'box.fan', definedIn: 'box' }
    expect(applyChanges(TEXT, renameInstance(f, 'Supply').changes)).toBe(
      TEXT.replace('Fan F(', 'Fan Supply(').replace('F.in', 'Supply.in').replace('F.out', 'Supply.out'),
    )
    expect(renameProblem(f, 'c', [f, c])).toMatch(/already uses/)
    expect(renameProblem(f, 'fan', [f, nestedC])).toBeNull() // another scope
    expect(renameProblem(f, '2x', [f])).toMatch(/starts with a letter/)
    expect(renameProblem(f, 'f', [f])).toBeNull() // case-only rename of itself is allowed
  })
})

describe('instance identity at the caret and under rename (SYNC-04/09)', () => {
  const inner = { name: 'u1.p', label: 'u1.p', type: 'Pipe', line: 2, localType: false, definedIn: 'Unit', refs: [[30, 31]] as [number, number][] }
  const all: InstanceIdentityDto[] = [
    { name: 'u1', label: 'u1', type: 'Unit', line: 5, localType: true, range: [50, 60], refs: [[50, 52], [70, 72]] },
    { name: 'u2', label: 'u2', type: 'Unit', line: 6, localType: true, range: [61, 69], refs: [[61, 63]] },
    inner,
    { ...inner, name: 'u2.p', label: 'u2.p' },
  ]
  it('maps the caret to the instance written there', () => {
    expect(instanceAt(all, 71)).toBe('u1')
    expect(instanceAt(all, 66)).toBe('u2')
    expect(instanceAt(all, 30)).toBe('u1.p')
    expect(instanceAt(all, 0)).toBeNull()
  })
  it('moves a nested rename under every instance of its definition', () => {
    const renames = renamedIds(inner, 'Q', all)
    expect([...renames]).toEqual([['u1.p', 'u1.q'], ['u2.p', 'u2.q']])
    expect(renameId('u2.p.wall', renames)).toBe('u2.q.wall')
    expect(renameId('u2.pump', renames)).toBe('u2.pump')
  })
})

describe('previewed fixes (RUN-09)', () => {
  const catalog = [
    { type: 'VoltageSource', ports: ['p', 'n'] },
    { type: 'Ground', ports: ['port'] },
  ]
  const fix = (message: string, text: string) => {
    const edit = suggestFix(message, text, catalog)
    return edit && [edit.label, applyChanges(text, edit.changes)]
  }
  it('renames a duplicate, retypes a typo and repairs a port', () => {
    expect(fix("Component instance 'src' is declared more than once.", 'VoltageSource SRC(E = 2)\nVoltageSource SRC(E = 3)\n')).toEqual([
      'Rename the second SRC to SRC2',
      'VoltageSource SRC(E = 2)\nVoltageSource SRC2(E = 3)\n',
    ])
    expect(fix("Unknown component type 'voltagesorce' for instance 'src'.", 'VoltageSorce SRC(E = 2)\n')?.[1]).toBe('VoltageSource SRC(E = 2)\n')
    expect(fix("connect(...): 'src.nn' is not a port (instance.port) or a stream name.", 'VoltageSource SRC(E = 2)\nGround G()\nconnect(SRC.nn, G.port)\n')).toEqual([
      'Change port SRC.nn to n',
      'VoltageSource SRC(E = 2)\nGround G()\nconnect(SRC.n, G.port)\n',
    ])
  })
  it('offers nothing when no single fix is near', () => {
    expect(suggestFix("Unknown component type 'zzzzzz' for instance 'a'.", 'Zzzzzz A()\n', catalog)).toBeNull()
    expect(suggestFix('Singular Jacobian', 'x = 1', catalog)).toBeNull()
  })
})
