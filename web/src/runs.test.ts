import { expect, it } from 'vitest'
import { compareRuns, runState, sanitizeScenarios, scenarioOverrides, type Baseline, type RunIdentity } from './runs'

const run = (over: Partial<RunIdentity> = {}): RunIdentity => ({ revision: 1, scenario: 'Document inputs', sample: 'steady solution', status: 'solved', ...over })
const v = (name: string, value: number, units: string) => ({ name, value, units })

it('applies the active scenario only to inputs the document still assigns a literal', () => {
  const s = { list: [{ name: 'Hot day', inputs: [{ name: 'T_amb', value: 308, unit: 'K' }, { name: 'eta', value: 0.7, unit: '-' }, { name: 'Q', value: 5, unit: 'kW' }] }], active: 'Hot day' }
  expect(scenarioOverrides(s, new Set(['t_amb', 'eta']))).toEqual(['T_amb = 308 [K]', 'eta = 0.7'])
  expect(scenarioOverrides({ ...s, active: null }, new Set(['t_amb']))).toEqual([])
})

it('drops anything in a stored scenario that could not be a plain input line', () => {
  const { state, repaired } = sanitizeScenarios({
    list: [
      { name: 'Hot', inputs: [
        { name: 'T', value: 300, unit: 'K' },
        { name: 'x; y = 2', value: 1, unit: '' },
        { name: 'P', value: 1, unit: 'Pa]\nQ = 3 [W' },
        { name: 'Q', value: Number.NaN, unit: '' },
        { name: 't', value: 1, unit: 's' },
      ] },
      { name: 'Hot', inputs: [] },
      { name: '', inputs: [] },
    ],
    active: 'Cold',
  })
  expect(state).toEqual({ list: [{ name: 'Hot', inputs: [{ name: 'T', value: 300, unit: 'K' }] }], active: null })
  // three bad inputs, a case-duplicate input, two bad scenarios, a missing active one.
  expect(repaired).toBe(7)
})

it('compares only the same sample, solved, in convertible units; says why otherwise', () => {
  const convert = (from: string, to: string) => (from === 'kW' && to === 'W' ? { scale: 1000, shift: 0 } : from === 'C' && to === 'K' ? { scale: 1, shift: 273.15 } : null)
  const base: Baseline = { run: run(), variables: [v('Q', 2, 'kW'), v('T', 20, 'C'), v('m', 1, 'kg'), v('eta', 0.5, '-'), v('old', 1, 'm')] }
  const now: Baseline = { run: run({ revision: 4, scenario: 'Hot' }), variables: [v('q', 2500, 'W'), v('T', 300, 'K'), v('m', 1, 's'), v('eta', 0.6, ''), v('new', 2, 'm')] }
  expect(compareRuns(base, now, convert)).toEqual([
    { name: 'q', unit: 'W', baseline: 2000, current: 2500, unavailable: null },
    { name: 'T', unit: 'K', baseline: 293.15, current: 300, unavailable: null },
    { name: 'm', unit: 's', baseline: 1, current: 1, unavailable: 'units differ (kg vs s)' },
    { name: 'eta', unit: '', baseline: 0.5, current: 0.6, unavailable: null },
    { name: 'new', unit: 'm', baseline: null, current: 2, unavailable: 'not in the baseline' },
    { name: 'old', unit: 'm', baseline: 1, current: null, unavailable: 'not in the current run' },
  ])
  const other = compareRuns(base, { ...now, run: run({ sample: 'solution 2 of 2' }) }, convert)
  expect(other[0].unavailable).toBe('different samples (steady solution vs solution 2 of 2)')
  expect(compareRuns({ ...base, run: run({ status: 'did not converge' }) }, now, convert)[0].unavailable).toBe('the baseline did not solve')
})

it('labels live, running, stopped, recorded, failed, stale and current in that order', () => {
  const base = { live: false, busy: false, stopped: false, recorded: null, stale: false, run: run({ revision: 4 }) }
  expect(runState({ ...base, live: true, busy: true }).kind).toBe('live')
  expect(runState({ ...base, busy: true, stopped: true }).kind).toBe('running')
  expect(runState({ ...base, stopped: true, stale: true }).label).toBe('Stopped: the values are still run 4')
  expect(runState({ ...base, stopped: true, run: null }).label).toBe('Stopped: no result')
  expect(runState({ ...base, recorded: 't = 1.5 s', stale: true }).label).toBe('Recorded time: t = 1.5 s, run 4 (stale)')
  expect(runState({ ...base, stale: true, run: run({ revision: 4, status: 'did not converge' }) }).label).toBe('Failed: run 4 did not converge')
  expect(runState({ ...base, stale: true }).label).toBe('Stale: the inputs changed since run 4')
  expect(runState(base).label).toBe('Current: run 4')
  expect(runState({ ...base, run: null }).label).toBe('Not solved yet')
})
