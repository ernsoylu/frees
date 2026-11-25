import { expect, it } from 'vitest'
import type { OdeTableDto } from './api'
import { PLAY_SECONDS, playbackVariables, playTime, sampleAt, timeLabel, timelineOf, variablesAt } from './playback'

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

it('holds a sample until play reaches the next one and stops at the end', () => {
  const tl = timelineOf(table)!
  // 4 s of run in 10 s of wall time at 1×: 0.1 s of wall time is less than one sample.
  expect(sampleAt(tl, playTime(tl, 0, 0.1, 1))).toBe(0)
  expect(sampleAt(tl, playTime(tl, 0, 5, 1))).toBe(2)
  expect(sampleAt(tl, playTime(tl, 0, 5, 2))).toBe(4)
  expect(sampleAt(tl, playTime(tl, 4, 1, 4))).toBe(4)
})

// U07: a whole run plays in PLAY_SECONDS / speed of wall time, however coarse,
// dense or irregular its grid. Ticks of 100 ms, as the playback bar's.
it.each([
  ['sparse', Array.from({ length: 11 }, (_, i) => i * 100)],
  ['dense', Array.from({ length: 1001 }, (_, i) => i)],
  ['irregular', [0, 1, 2, 3, 500, 501, 990, 1000]],
])('plays a %s grid in PLAY_SECONDS / speed', (_, times) => {
  const tl = { table: 'ode', timeVar: 'time', timeUnit: 's', times, events: [], stopped: false }
  for (const speed of [0.25, 1, 4]) {
    let wall = 0
    while (sampleAt(tl, playTime(tl, times[0], wall, speed)) < times.length - 1) wall += 0.1
    expect(Math.abs(wall - PLAY_SECONDS / speed), `${speed}×`).toBeLessThan(0.1 + 1e-9)
  }
})
