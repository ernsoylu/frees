import { describe, expect, it } from 'vitest'
import type { ConnectionDto, OdeTableDto } from '../api'
import { cursorFor, TRAIL, xyTrail } from './playbackCursor'

const table = (rows: (number | null)[][]): OdeTableDto => ({
  name: 'run',
  vars: ['time', 'cook$vent$p', 'cook$vent$h', 'prv$out$p', 'prv$out$h', 'room$port$t'],
  units: ['s', 'Pa', 'J/kg', 'Pa', 'J/kg', 'K'],
  numRows: rows.length,
  numCols: 6,
  rows,
  events: [],
  method: 'ida',
  stopped: false,
  endTime: rows.at(-1)?.[0] ?? 0,
} as OdeTableDto)

const water: ConnectionDto[] = [
  { domain: 'fluid', endpoints: ['cook.vent', 'prv.in'], connector: 'twophase', fluid: 'water', streams: ['cook.vent', 'prv.in'] },
  { domain: 'fluid', endpoints: ['prv.out', 'atm.in'], connector: 'twophase', fluid: 'water', streams: ['prv.out', 'atm.in'] },
  { domain: 'fluid', endpoints: ['a.out', 'b.in'], connector: 'twophase', fluid: 'water', streams: ['a.out', 'b.in'] },
  { domain: 'fluid', endpoints: ['c.out', 'd.in'], connector: 'twophase', fluid: 'R134a', streams: ['c.out', 'd.in'] },
]

describe('playback cursor (H3)', () => {
  it('draws each node of the fluid at the sample, from recorded columns only', () => {
    const t = table([
      [0, 1e5, 1e5, 1e5, 1e5, 300],
      [10, 2e5, 4e5, 1.5e5, 3e5, 301],
      [20, 3e5, 5e5, null, 3.5e5, 302],
    ])
    const c = cursorFor(water, t, 1, 'h', 'P', 'Water', { x: false, y: true })
    expect(c.points).toEqual([
      { label: 'cook.vent', x: 4e5, y: 2e5 },
      { label: 'prv.out', x: 3e5, y: 1.5e5 },
    ])
    // A node whose state the run did not record is a gap, never an end-of-run value.
    expect(c.gaps).toEqual(['a.out: the run did not record h and P'])
    // The trail runs up to the current sample, not beyond it.
    expect(c.trail.map((r) => r.x)).toEqual([[1e5, 4e5], [1e5, 3e5]])
    // A missing value at the sample: a gap with its reason, and a break in the trail.
    const later = cursorFor(water, t, 2, 'h', 'P', 'water', { x: false, y: true })
    expect(later.gaps).toContain('prv.out: not finite at this sample')
    expect(later.trail[1].y).toEqual([1e5, 1.5e5, null])
  })

  it('breaks the trail where a log axis cannot show a value, and bounds its length', () => {
    const rows = Array.from({ length: TRAIL + 10 }, (_, k) => [k, k === TRAIL + 5 ? 0 : 1e5 + k, 1e5, 1e5, 1e5, 300])
    const c = cursorFor(water.slice(0, 1), table(rows), TRAIL + 9, 'h', 'P', 'water', { x: false, y: true })
    expect(c.trail[0].y).toHaveLength(TRAIL)
    expect(c.trail[0].y[TRAIL - 5]).toBeNull()
    expect(cursorFor(water.slice(0, 1), table(rows), TRAIL + 5, 'h', 'P', 'water', { x: false, y: true }).gaps).toEqual(['cook.vent: not positive on a log axis at this sample'])
  })

  it('takes moist-air nodes for the psychrometric chart', () => {
    const air: ConnectionDto[] = [{ domain: 'fluid', endpoints: ['ahu.out', 'room.in'], connector: 'moistair', fluid: 'air', streams: ['ahu.out', 'room.in'] }]
    const t: OdeTableDto = { ...table([[0, 0, 0, 0, 0, 0]]), vars: ['time', 'ahu$out$t', 'ahu$out$w'], rows: [[0, 295, 0.008]] }
    expect(cursorFor(air, t, 0, 'T', 'w', null).points).toEqual([{ label: 'ahu.out', x: 295, y: 0.008 }])
    expect(cursorFor(water, t, 0, 'T', 'w', null).points).toEqual([])
  })
})

describe('X-Y playback trail (H4)', () => {
  it('follows recorded samples of a phase portrait up to the current one, with gaps', () => {
    const t: OdeTableDto = { ...table([]), vars: ['time', 'x', 'osc$v'], rows: [[0, 1, 0], [1, 0, -1], [2, -1, null], [3, 0, 1]] }
    expect(xyTrail(t, 2, 'x', ['osc.v', 'missing'])).toEqual([{ label: 'osc.v', x: [1, 0, null], y: [0, -1, null] }])
    const long: OdeTableDto = { ...t, rows: Array.from({ length: TRAIL + 5 }, (_, k) => [k, k, -k]) }
    const [trail] = xyTrail(long, TRAIL + 4, 'x', ['osc.v'])
    expect(trail.x).toHaveLength(TRAIL)
    expect(trail.x.at(-1)).toBe(TRAIL + 4)
  })
})
