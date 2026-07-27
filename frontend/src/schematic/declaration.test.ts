import { describe, expect, it } from 'vitest'
import { declarationLine, instanceTypes } from './declaration'

const DOC = `// A two-loop network
Pump P1(eta=0.7)
TwoPhaseEvaporator EVAP(UA=1200)
connect(P1.out, EVAP.in)
q = P1.out.mdot * 2
`

describe('declarationLine', () => {
  it('finds the line that declares an instance', () => {
    expect(declarationLine(DOC, 'P1')).toBe(2)
    expect(declarationLine(DOC, 'EVAP')).toBe(3)
  })

  it('is case-insensitive like the language', () => {
    expect(declarationLine(DOC, 'p1')).toBe(2)
    expect(declarationLine(DOC, 'evap')).toBe(3)
  })

  it('ignores references in connects and equations', () => {
    // P1 appears on lines 4 and 5 too; the declaration is still line 2.
    expect(declarationLine('connect(P1.out, EVAP.in)\nPump P1(eta=0.7)', 'P1')).toBe(2)
  })

  it('skips commented-out declarations', () => {
    expect(declarationLine('// Pump P1(eta=0.7)\nPump P1(eta=0.9)', 'P1')).toBe(2)
  })

  it('returns null when the instance is absent', () => {
    expect(declarationLine(DOC, 'NOPE')).toBeNull()
    expect(declarationLine('', 'P1')).toBeNull()
  })

  it('does not treat a name that merely prefixes another as a match', () => {
    expect(declarationLine('Pump P10(eta=0.7)', 'P1')).toBeNull()
  })
})

describe('instanceTypes', () => {
  it('reads instance declarations from the document', () => {
    const types = instanceTypes('LiquidSource SRC(fluid$=Water)\nLiquidPump PMP(eta=0.7)\n')
    expect(types.get('src')).toBe('LiquidSource')
    expect(types.get('pmp')).toBe('LiquidPump')
  })

  it('ignores connects, blocks and comments', () => {
    const types = instanceTypes([
      '// Pump P1(eta=0.7)',
      'connect(SRC.out, PMP.in)',
      'FUNCTION f(x)',
      'TABLE t(x)',
      'DYNAMIC d(t = 0 .. 1)',
      'Pump P1(eta=0.7)',
    ].join('\n'))
    expect([...types.keys()]).toEqual(['p1'])
  })

  it('is empty for a component-free document', () => {
    expect(instanceTypes('x = 2\ny = x + 1').size).toBe(0)
  })
})
