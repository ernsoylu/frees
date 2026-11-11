import { expect, it } from 'vitest'
import { LiveStore } from './liveStore'

const header = { name: 'ball', vars: ['t', 'h'], units: ['s', 'm'], method: 'ida' }
const rowsOf = (times: number[]) => Float64Array.from(times.flatMap((t) => [t, 10 * t]))

it('keeps rows in order and grows past its first allocation', () => {
  const store = new LiveStore(2)
  const times = Array.from({ length: 5000 }, (_, i) => i / 10)
  store.push(rowsOf(times.slice(0, 3000)), 3000)
  store.push(rowsOf(times.slice(3000)), 2000)
  expect(store.size).toBe(5000)
  expect(store.dropped).toBe(0)
  const table = store.toTable(header, false)
  expect(table.rows.map((r) => r[0])).toEqual(times)
  expect(table.rows[4999]).toEqual([499.9, 4999])
  expect(table.endTime).toBe(499.9)
})

it('stays bounded: the oldest rows and their events go first', () => {
  const store = new LiveStore(2, 2 * 100)
  expect(store.capacity).toBe(100)
  for (let k = 0; k < 25; k++) {
    const times = Array.from({ length: 10 }, (_, i) => k * 10 + i)
    store.push(rowsOf(times), 10, [{ name: 'tick', time: k * 10 }])
  }
  expect(store.size).toBe(100)
  expect(store.dropped).toBe(150)
  const table = store.toTable(header, true)
  expect(table.rows.map((r) => r[0])).toEqual(Array.from({ length: 100 }, (_, i) => 150 + i))
  expect(table.events.map((e) => e.time)).toEqual([150, 160, 170, 180, 190, 200, 210, 220, 230, 240])
  expect(table.stopped).toBe(true)
  store.clear()
  expect(store.toTable(header, false).rows).toEqual([])
})

it('finds a window by time on a wrapped ring, rows at equal times included (L3b)', () => {
  const store = new LiveStore(2, 2 * 100)
  // 250 rows through a 100-row ring; t = 200 appears twice (an event row).
  const times = Array.from({ length: 250 }, (_, i) => (i <= 200 ? i : i - 1))
  store.push(rowsOf(times), times.length)
  expect(store.series(1, 199.5).t[0]).toBe(200)
  expect(Array.from(store.series(1, 200).t.slice(0, 3))).toEqual([200, 200, 201])
  expect(store.series(1, 300).t.length).toBe(0)
  expect(store.series(1).t.length).toBe(100)
  expect(store.series(1).t[0]).toBe(times[150])
  expect(store.series(1, 240).y[0]).toBe(2400)
})
