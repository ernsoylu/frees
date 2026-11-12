// liveRecorder.test.ts — Phase L5: a recording keeps every row of its span at
// full precision, ends on its duration or when ended, and says how it ended.

import { expect, it } from 'vitest'
import { LiveRecorder } from './liveRecorder'
import type { LiveInputChange } from './wasm/liveClient'

const header = { name: 'tank', vars: ['time', 'L'], units: ['s', 'm'], method: 'ida' }
const settings = { method: 'ida', rtol: 1e-6, atol: 1e-9, t0: 0, tf: 10, points: 101, step: null, maxStep: null }
const provenance = { backend: 'rustprop', fluids: ['Water'] }
const meta = { header, settings, provenance }
/** Rows `[t, L]` at 0.1 s from `i0` to `i1`, with values no short decimal holds. */
const rows = (i0: number, i1: number) => Float64Array.from(Array.from({ length: i1 - i0 + 1 }, (_, k) => [(i0 + k) / 10, Math.PI / (i0 + k + 1)]).flat())
type Recording = { status: string; reason: string | null; span: { from: number; to: number; requested: number | null }; rows: number[][]; events: unknown[]; solver: unknown; provenance: unknown; columns: unknown; inputs: { unit: string; changes: LiveInputChange[] } }
const json = (r: LiveRecorder) => JSON.parse(JSON.stringify(r)) as Recording

it('records a finite duration from the first row, exactly, and completes there', () => {
  const r = new LiveRecorder(meta, 1, null, () => [])
  r.push(rows(0, 4), 5, [{ name: 'e1', time: 0.25 }])
  expect(r.status).toBe('recording')
  r.push(rows(5, 14), 10, [{ name: 'late', time: 1.2 }])
  expect(r.status).toBe('complete')
  r.push(rows(15, 20), 6, [])
  const file = json(r)
  // Rows coarser than the duration: the row past the end closes it, so the duration is covered.
  const coarse = new LiveRecorder(meta, 1, null, () => [])
  coarse.push(Float64Array.from([0, 1, 1.5, 2, 3, 3]), 3, [])
  expect(json(coarse)).toMatchObject({ status: 'complete', rows: [[0, 1], [1.5, 2]], span: { from: 0, to: 1.5 } })
  expect(file.rows).toHaveLength(11)
  expect(file.rows.at(-1)![0]).toBe(1)
  // Through JSON and back, every value is the engine's to the bit.
  expect(file.rows[6][1]).toBe(Math.PI / 7)
  expect(file.events).toEqual([{ name: 'e1', time: 0.25 }])
  expect(file.span).toMatchObject({ from: 0, to: 1, requested: 1 })
  expect(file.solver).toEqual(settings)
  expect(file.provenance).toEqual(provenance)
  expect(file.columns).toEqual([{ name: 'time', unit: 's' }, { name: 'L', unit: 'm' }])
})

it('starts at the current row, skips rows it has, and snapshots the input timeline when ended', () => {
  const log: LiveInputChange[] = [{ time: 0.2, name: 'q', value: 3 }]
  const r = new LiveRecorder(meta, null, [0.5, 1.25], () => log)
  r.push(rows(3, 7), 5, [])
  expect(json(r).rows.map((row) => row[0])).toEqual([0.5, 0.6, 0.7])
  log.push({ time: 0.6, name: 'q', value: 4 })
  expect(json(r).inputs.changes).toHaveLength(2)
  r.end('partial', 'The run was reset at t = 0.7.')
  log.length = 0
  const file = json(r)
  expect(file).toMatchObject({ status: 'partial', reason: 'The run was reset at t = 0.7.', inputs: { unit: 'SI' } })
  expect(file.inputs.changes).toHaveLength(2)
  // An ended recording takes nothing more, and its first ending stands.
  r.push(rows(8, 9), 2, [])
  r.end('failed', 'later')
  expect(json(r)).toMatchObject({ status: 'partial', rows: { length: 3 } })
})

it('ends partial at its size limit, keeping the rows up to it', () => {
  const r = new LiveRecorder(meta, null, null, () => [], 14)
  r.push(rows(0, 9), 10, [])
  const file = json(r)
  expect(file.rows).toHaveLength(7)
  expect(file.status).toBe('partial')
  expect(file.reason).toBe('The recording reached its limit of 14 values at t = 0.6; the rows up to it are kept.')
})

it('saves the events of the span it saved, including one a later chunk covers', () => {
  // Coarse rows: the recording ends on the 1.5 s row, so the 1.2 s event is inside it.
  const coarse = new LiveRecorder(meta, 1, null, () => [])
  coarse.push(Float64Array.from([0, 1, 1.5, 2, 3, 3]), 3, [{ name: 'in', time: 1.2 }, { name: 'out', time: 2.5 }])
  expect(json(coarse).events).toEqual([{ name: 'in', time: 1.2 }])
  // A chunk that ends on a step past its last row: its event waits for the row that covers it.
  const r = new LiveRecorder(meta, null, null, () => [])
  r.push(rows(0, 1), 2, [{ name: 'early', time: 0.15 }])
  expect(json(r).events).toEqual([])
  r.push(rows(2, 2), 1, [])
  expect(json(r).events).toEqual([{ name: 'early', time: 0.15 }])
  // At the size limit, the events up to the last row kept are saved.
  const full = new LiveRecorder(meta, null, null, () => [], 14)
  full.push(rows(0, 9), 10, [{ name: 'kept', time: 0.55 }, { name: 'past', time: 0.85 }])
  expect(json(full).events).toEqual([{ name: 'kept', time: 0.55 }])
})
