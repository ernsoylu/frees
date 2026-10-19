import { expect, it } from 'vitest'
import { checkPill, tablePill } from './WorkspaceChrome'
import type { CheckResponse, TableRowResult, TableStats } from './api'

const checked: CheckResponse = {
  solvable: true, equations: 12, unknowns: 12, variables: [], unitWarnings: [],
  inferredUnits: {}, errors: [], errorLine: null,
  message: 'No syntax errors were detected. There are 12 equations and 12 variables.',
}

it('shows successful checks as structurally solvable, preserving warnings and actual errors', () => {
  expect(checkPill(checked)).toMatchObject({ color: 'green', label: 'Structurally solvable', message: checked.message })
  expect(checkPill({ ...checked, unitWarnings: ['Unknown unit foo'] }).label).toBe('Structurally solvable · unconverted units')
  expect(checkPill({ ...checked, solvable: false, message: 'Underspecified. No syntax errors were detected.' }).label).toBe('Underspecified')
  expect(checkPill({ ...checked, solvable: false, errors: [{ line: 1, column: 2, message: 'Expected expression' }] }).label).toBe('Syntax error')
  expect(checkPill({ ...checked, solvable: false, errors: undefined, message: 'Syntax error: expected expression' }).label).toBe('Syntax error')
})

// An accessor sweep (`y = TableAvg('y') + 1`) can stop at the pass cap with
// every row solved; the pill must say the table did not converge rather than
// report the rows as a success.
it('reports an accessor table stopped at the pass cap as not converged', () => {
  const rows: TableRowResult[] = [{ success: true, values: { y: 12 }, error: null }]
  const stats: TableStats = {
    converged: false, passes: 12, termination: 'pass-limit', accessor: true,
    runs: 1, solved: 1, failed: 0, equations: 1, unknowns: 1, iterations: 12, elapsedMillis: 3, maxResidual: 0,
  }
  expect(tablePill(rows, null, '', stats)).toMatchObject({
    color: 'orange', label: 'Table not converged', message: '12 passes; pass-limit. Last-pass values are provisional.',
  })
  expect(tablePill(rows, null, '', { ...stats, converged: true, passes: 2, termination: 'completed' }))
    .toMatchObject({ color: 'green', label: '1/1 runs solved' })
})
