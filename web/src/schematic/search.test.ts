import { beforeAll, describe, expect, it } from 'vitest'
// @ts-expect-error Node built-in module not declared in Vite client tsconfig
import { readFileSync } from 'node:fs'
// @ts-expect-error Node built-in module not declared in Vite client tsconfig
import { resolve } from 'node:path'
// @ts-expect-error Node built-in module not declared in Vite client tsconfig
import { fileURLToPath } from 'node:url'
import { check, initSync } from '../wasm/pkg/frees.js'
import { searchModel } from './search'

beforeAll(() => {
  initSync({ module: readFileSync(resolve(fileURLToPath(import.meta.url), '../../wasm/pkg/frees_bg.wasm')) })
})

const TEXT = `function [a, b] = Pair(R_load)
  Resistor R1(R=R_load)
  Resistor R2(R=R_load)
  port(a)
  port(b)
  connect(R1.b, R2.b)
  connect(a, R1.a)
  connect(b, R2.a)
end
R_load = 5 [ohm]
VoltageSource VS(E=10 [V])
Pair SUB1(R_load=R_load)
Ground G()
connect(VS.p, SUB1.a)
connect(SUB1.b, VS.n, G.port)
I_load = SUB1.R1.a.I
`

describe('searchModel', () => {
  it('finds blocks, types, ports, nets, bindings and statements with their scope', () => {
    const c = JSON.parse(check(TEXT, '{}'))
    const find = (q: string) => searchModel(c, TEXT, [], q).map((h) => [h.kind, h.label, h.scope, h.select.join(',')])
    expect(find('r1')).toEqual([
      ['block', 'R1', 'sub1', 'sub1.r1'],
      ['port', 'R1.a', 'sub1', 'sub1.r1'],
      ['port', 'R1.b', 'sub1', 'sub1.r1'],
      ['net', 'sub1.r1.b — sub1.r2.b', 'sub1', 'sub1.r1,sub1.r2'],
      ['net', 'sub1$a — sub1.r1.a', 'sub1', 'sub1$a,sub1.r1'],
      ['parameter', 'R1.r = R_load', 'sub1', 'sub1.r1'],
      ['statement', 'Resistor R1(R=R_load)', 'sub1', 'sub1.r1'],
      ['statement', 'connect(R1.b, R2.b)', 'sub1', 'sub1.r1,sub1.r2'],
      ['statement', 'connect(a, R1.a)', 'sub1', 'sub1.r1'],
      ['statement', 'I_load = SUB1.R1.a.I', '', 'sub1'],
    ])
    expect(searchModel(c, TEXT, [], 'resistor', (t) => (t === 'resistor' ? 'Resistor' : t)).map((h) => [h.kind, h.label, h.scope, h.select.join(',')]).slice(0, 1)).toEqual([['type', 'Resistor', 'sub1', 'sub1.r1,sub1.r2']])
    expect(searchModel(c, TEXT, [{ text: 'G.port is odd', instance: 'g' }], 'odd')).toMatchObject([{ kind: 'issue', scope: '', select: ['g'] }])
    expect(searchModel(c, TEXT, [], '  ')).toEqual([])
  })
})
