import { expect, it } from 'vitest'
import type { OdeTableDto } from './api'
import { advance, playbackVariables, timeLabel, timelineOf, variablesAt } from './playback'

const table: OdeTableDto = {
  name: 'Tank',
  vars: ['time', 'level', 'valve$q'],
  units: ['s', 'm', 'm^3/s'],
  rows: [
    [0, 0, 1],
    [1, 1, 1],
    [2, 2, null],
    [3, 0.5, 1],
    [4, 1.5, 1],
  ],
  events: [{ name: 'trip', time: 2.4 }, { name: 'late', time: 9 }],
  method: 'ode45',
  stopped: false,
  endTime: 4,
}

it('builds a timeline whose events land on the first sample at or after them', () => {
  const tl = timelineOf(table)!
  expect(tl.times).toEqual([0, 1, 2, 3, 4])
  // No row is recorded at the event, so it reads at the next sample, never between two.
  expect(tl.events).toEqual([{ name: 'trip', time: 2.4, index: 3 }])
  expect(timeLabel(tl, 3)).toBe('time = 3 s')
  expect(timelineOf(undefined)).toBeNull()
  expect(timelineOf({ ...table, rows: [[0, 0, 0]] })).toBeNull()
  expect(timelineOf({ ...table, rows: [[0, 0, 0], [null, 1, 1]] })).toBeNull()
})

it('reads one recorded sample, leaving a missing value out instead of showing the final one', () => {
  expect(variablesAt(table, 1)).toEqual([
    { name: 'level', value: 1, units: 'm' },
    { name: 'valve.q', value: 1, units: 'm^3/s' },
  ])
  const solved = [
    { name: 'Area', value: 2, units: 'm^2' },
    { name: 'LEVEL', value: 1.5, units: 'm' },
    { name: 'valve.q', value: 1, units: 'm^3/s' },
  ]
  expect(playbackVariables(solved, table, 2)).toEqual([
    { name: 'Area', value: 2, units: 'm^2' },
    { name: 'level', value: 2, units: 'm' },
  ])
})

it('advances by whole samples at the chosen speed and stops at the end', () => {
  const tl = timelineOf(table)!
  // 4 s of run in 10 s of wall time at 1×: 0.1 s of wall time is less than one sample.
  expect(advance(tl, 0, 0.1, 1)).toBe(1)
  expect(advance(tl, 0, 5, 1)).toBe(2)
  expect(advance(tl, 0, 5, 2)).toBe(4)
  expect(advance(tl, 4, 1, 4)).toBe(4)
})
