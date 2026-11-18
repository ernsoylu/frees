import { describe, expect, it } from 'vitest'
import type { CheckResponse, SolveResponse } from './api'
import { allProblems, checkProblems, linesWriting, problemLine, problemSummary } from './problems'

const check = (over: Partial<CheckResponse>): CheckResponse =>
  ({ solvable: true, equations: 0, unknowns: 0, variables: [], unitWarnings: [], inferredUnits: {}, message: '', ...over }) as CheckResponse

describe('problems', () => {
  it('lists syntax errors with their lines and nothing else as an error', () => {
    const ps = checkProblems(check({ solvable: false, message: 'bad', errors: [{ line: 3, column: 1, message: 'unexpected )' }] }))
    expect(ps).toEqual([{ source: 'Check', severity: 'error', text: 'unexpected )', line: 3 }])
  })

  it('attributes free quantities to their instance and resolves its source line', () => {
    const c = check({
      solvable: false,
      message: '2 equations, 3 unknowns',
      diagnosis: { code: 'underspecified', subjects: ['src.p.i'] },
      instances: [{ name: 'SRC', label: 'SRC', type: 'Source', line: 7, localType: false }],
      ports: [{ instance: 'SRC', port: 'n', domain: 'electrical', connected: false }, { instance: 'PID', port: 'out', domain: 'signal', connected: false }],
      unitWarnings: ['x: m vs s'],
    })
    const ps = checkProblems(c)
    expect(ps.map((p) => [p.source, p.severity])).toEqual([['Check', 'error'], ['Check', 'error'], ['Schematic', 'warning'], ['Units', 'warning']])
    expect(problemLine(ps[0], c.instances)).toBeUndefined()
    expect(problemLine(ps[1], c.instances)).toBe(7)
    expect(problemSummary(ps)).toBe('2 errors, 2 warnings')
  })

  it('adds a failed solve once and does not repeat a warning Check already gave', () => {
    const solve = { success: false, error: 'did not converge', failedBlockIndex: 2, unitWarnings: ['x: m vs s', 'y: K vs C'] } as SolveResponse
    const ps = allProblems(check({ unitWarnings: ['x: m vs s'] }), solve)
    expect(ps.map((p) => p.text)).toEqual(['x: m vs s', 'Block 2: did not converge', 'y: K vs C'])
    expect(problemSummary([])).toBe('No problems')
  })

  it('finds the lines that write a variable as a whole word', () => {
    expect(linesWriting('T1 = 5\nT10 = T1 + 1\n{ t1 }\nh.T1 = 2\nT1[2] = 3', 'T1').map((l) => l.line)).toEqual([1, 2, 3])
  })
})
