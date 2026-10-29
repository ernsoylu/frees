import { beforeAll, describe, expect, it } from 'vitest'
// @ts-expect-error Node built-in module not declared in Vite client tsconfig
import { readFileSync } from 'node:fs'
// @ts-expect-error Node built-in module not declared in Vite client tsconfig
import { resolve } from 'node:path'
// @ts-expect-error Node built-in module not declared in Vite client tsconfig
import { fileURLToPath } from 'node:url'
import { check, initSync, solve } from '../wasm/pkg/frees.js'
import { componentFile, editInterface, extractSubsystem, importComponents, movePresentation } from './encapsulation'
import { EMPTY_PRESENTATION } from './presentation'
import { applyChanges } from './sourceEdit'

beforeAll(() => {
  initSync({ module: readFileSync(resolve(fileURLToPath(import.meta.url), '../../wasm/pkg/frees_bg.wasm')) })
})

const TEXT = `R_load = 5 [ohm]
VoltageSource VS(E=10 [V])
Resistor R1(R=R_load)
Resistor R2(R=2*R_load*cos(0))
Ground G()
connect(VS.p, R1.a)
connect(R1.b, R2.b)
connect(R2.a, VS.n, G.port)
I_load = R1.a.I
`
const value = (src: string, name: string) =>
  (JSON.parse(solve(src, '{}')).variables as { name: string; value: number }[]).find((v) => v.name === name)?.value

describe('extractSubsystem', () => {
  it('exposes unique ports, passes captured names in, re-points readers, and solves the same', () => {
    const x = extractSubsystem(TEXT, JSON.parse(check(TEXT, '{}')), new Set(['r1', 'r2']), 'Pair', 'SUB1')
    expect(x.blocked).toEqual([])
    expect(x.ports.map((p) => p.name)).toEqual(['R1_a', 'R2_a'])
    expect(x.captures).toEqual([{ name: 'R_load', value: 'R_load' }])
    expect(x.references).toEqual([{ line: 9, before: 'I_load = R1.a.I', after: 'I_load = SUB1.R1.a.I' }])
    const out = applyChanges(TEXT, x.edit.changes)
    expect(out).toContain('Pair SUB1(R_load=R_load)\nGround G()\nconnect(VS.p, SUB1.R1_a)\nconnect(SUB1.R2_a, VS.n, G.port)\nI_load = SUB1.R1.a.I')
    expect(out).toContain('  connect(R1.b, R2.b)\n  connect(R1_a, R1.a)\n  connect(R2_a, R2.a)\nend')
    expect(value(out, 'I_load')).toBeCloseTo(value(TEXT, 'I_load')!, 12)
  })

  it('blocks a taken name and an empty selection', () => {
    const c = JSON.parse(check(TEXT, '{}'))
    expect(extractSubsystem(TEXT, c, new Set(['r1']), 'Resistor', 'VS').blocked).toEqual([
      'A component named Resistor already exists; choose another name.',
      'VS is already declared; choose another name.',
    ])
    expect(extractSubsystem(TEXT, c, new Set(), 'Pair', 'SUB1').blocked[0]).toBe('Select the top-level blocks to extract.')
  })

  it('moves the blocks layout under the subsystem', () => {
    const p = movePresentation({ ...EMPTY_PRESENTATION, positions: { r1: { x: 1, y: 2 }, vs: { x: 0, y: 0 } }, locked: ['r1'] }, new Set(['r1']), 'SUB1', { x: 5, y: 5 })
    expect(p.positions).toEqual({ 'sub1.r1': { x: 1, y: 2 }, vs: { x: 0, y: 0 }, sub1: { x: 5, y: 5 } })
    expect(p.locked).toEqual(['sub1.r1'])
  })
})

describe('editInterface', () => {
  let PAIR = ''
  const c = () => JSON.parse(check(PAIR, '{}'))
  beforeAll(() => {
    PAIR = applyChanges(TEXT, extractSubsystem(TEXT, JSON.parse(check(TEXT, '{}')), new Set(['r1', 'r2']), 'Pair', 'SUB1').edit.changes)
  })

  it('renames a port inside the definition and at every instance, and still solves', () => {
    const plan = editInterface(PAIR, c(), 'Pair', { rename: ['R1_a', 'hot'] })
    expect(plan.instances).toBe(1)
    expect(plan.statements.map((s) => s.after)).toEqual([
      'function [hot, R2_a] = Pair(R_load)',
      'port(hot)',
      'connect(hot, R1.a)',
      'connect(VS.p, SUB1.hot)',
    ])
    expect(value(applyChanges(PAIR, plan.edit.changes), 'I_load')).toBeCloseTo(value(TEXT, 'I_load')!, 12)
  })

  it('removes a port and the connections to it; adds one; refuses a built-in', () => {
    const plan = editInterface(PAIR, c(), 'Pair', { remove: 'R2_a' })
    expect(plan.statements).toEqual([
      { line: 3, before: 'function [R1_a, R2_a] = Pair(R_load)', after: 'function [R1_a] = Pair(R_load)' },
      { line: 5, before: 'port(R2_a)', after: '' },
      { line: 10, before: 'connect(R2_a, R2.a)', after: '' },
      { line: 15, before: 'connect(SUB1.R2_a, VS.n, G.port)', after: 'connect(VS.n, G.port)' },
    ])
    expect(editInterface(PAIR, c(), 'Pair', { add: 'mid' }).statements.map((s) => s.after)).toEqual(['function [R1_a, R2_a, mid] = Pair(R_load)', 'port(R2_a)\n  port(mid)'])
    expect(editInterface(PAIR, c(), 'Resistor', { remove: 'a' }).blocked).toEqual(['Resistor is not defined in this document; built-in components cannot be changed.'])
  })
})

describe('component files', () => {
  it('exports a definition with its header and imports it without touching a differing one', () => {
    const pair = applyChanges(TEXT, extractSubsystem(TEXT, JSON.parse(check(TEXT, '{}')), new Set(['r1', 'r2']), 'Pair', 'SUB1').edit.changes)
    const file = componentFile(pair, JSON.parse(check(pair, '{}')), 'Pair', 'Two resistors')
    expect(file.split('\n').slice(0, 5), file).toEqual(['// Component: Pair', '// Description: Two resistors', '// Ports: R1_a, R2_a', '// Parameters: R_load', '// Uses: Resistor (built-in)'])
    const incoming = JSON.parse(check(file, '{}')).definitions.map((d: { name: string; range: [number, number] }) => ({ name: d.name, text: file.slice(d.range[0], d.range[1]) }))
    const fresh = importComponents(TEXT, JSON.parse(check(TEXT, '{}')), incoming, new Set())
    expect(fresh.added).toEqual(['pair'])
    expect(applyChanges(TEXT, fresh.edit.changes)).toContain('function [R1_a, R2_a] = Pair(R_load)')
    const other = pair.replace('2*R_load', '3*R_load')
    const kept = importComponents(other, JSON.parse(check(other, '{}')), incoming, new Set())
    expect([kept.differs, kept.edit.changes]).toEqual([['pair'], []])
    expect(importComponents(other, JSON.parse(check(other, '{}')), incoming, new Set(['pair'])).replaced).toEqual(['pair'])
  })
})
