// Phase K4: the rows of a live run, in a bounded ring.
//
// A live run has no end, so its history cannot grow without limit: the store
// keeps the newest rows up to a fixed number of values (about 32 MB) and
// counts what it dropped. On a pause or a stop it becomes an ordinary ODE
// Table DTO, so Playback, run comparison and CSV export read it as they read a
// batch run.

import type { OdeTableDto } from './api'
import type { LiveEvent, LiveTable } from './wasm/liveClient'

/** The most values (rows × columns) a store keeps. */
export const MAX_VALUES = 4_000_000
const FIRST_ROWS = 1024

export class LiveStore {
  private buf: Float64Array
  /** Index (in rows) of the oldest kept row within `buf`. */
  private start = 0
  private count = 0
  /** Rows pushed out of the ring by newer ones. */
  dropped = 0
  private events: LiveEvent[] = []
  readonly capacity: number
  /** Bumped on every push and clear, for drawings that follow the store (L3b). */
  version = 0
  private readonly listeners = new Set<() => void>()

  /** Call `listener` after every push and clear; returns the unsubscribe. */
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private changed(): void {
    this.version += 1
    for (const listener of this.listeners) listener()
  }

  constructor(readonly numCols: number, maxValues = MAX_VALUES) {
    this.capacity = Math.max(2, Math.floor(maxValues / Math.max(1, numCols)))
    this.buf = new Float64Array(Math.min(this.capacity, FIRST_ROWS) * numCols)
  }

  get size(): number {
    return this.count
  }

  private rowsAllocated(): number {
    return this.buf.length / this.numCols
  }

  /** Grow (doubling, up to the capacity) before the ring has to wrap. */
  private grow(): void {
    const rows = Math.min(this.capacity, this.rowsAllocated() * 2)
    const next = new Float64Array(rows * this.numCols)
    for (let i = 0; i < this.count; i++) next.set(this.rowAt(i), i * this.numCols)
    this.buf = next
    this.start = 0
  }

  private rowAt(i: number): Float64Array {
    const slot = (this.start + i) % this.rowsAllocated()
    return this.buf.subarray(slot * this.numCols, (slot + 1) * this.numCols)
  }

  /** Append `numRows` row-major rows. */
  push(rows: Float64Array, numRows: number, events: readonly LiveEvent[] = []): void {
    for (let r = 0; r < numRows; r++) {
      if (this.count === this.rowsAllocated() && this.count < this.capacity) this.grow()
      const row = rows.subarray(r * this.numCols, (r + 1) * this.numCols)
      if (this.count < this.rowsAllocated()) {
        this.buf.set(row, ((this.start + this.count) % this.rowsAllocated()) * this.numCols)
        this.count += 1
      } else {
        this.buf.set(row, this.start * this.numCols)
        this.start = (this.start + 1) % this.rowsAllocated()
        this.dropped += 1
      }
    }
    this.events.push(...events)
    this.changed()
  }

  /** Row `i`, oldest first. */
  row(i: number): number[] {
    return Array.from(this.rowAt(i))
  }

  /** Phase L3: the time column and column `col` of the kept rows at or after `from`, oldest first. */
  series(col: number, from = Number.NEGATIVE_INFINITY): { t: Float64Array; y: Float64Array } {
    // Rows arrive in time order (a reset clears the store), so the first row
    // at or after `from` is found by bisection: a short window of a long run
    // costs its own rows, not the whole history.
    let first = 0
    let past = this.count
    while (first < past) {
      const mid = (first + past) >>> 1
      if (this.rowAt(mid)[0] < from) first = mid + 1
      else past = mid
    }
    const t = new Float64Array(this.count - first)
    const y = new Float64Array(this.count - first)
    for (let i = first; i < this.count; i++) {
      const row = this.rowAt(i)
      t[i - first] = row[0]
      y[i - first] = row[col]
    }
    return { t, y }
  }

  clear(): void {
    this.start = 0
    this.count = 0
    this.dropped = 0
    this.events = []
    this.changed()
  }

  /**
   * The kept rows as an ODE Table: the events the kept rows cover, and the run
   * ended where its newest row is (a stop event's time, when one ended it).
   */
  toTable(header: LiveTable, stopped: boolean): OdeTableDto {
    const rows = Array.from({ length: this.count }, (_, i) => this.row(i))
    const first = rows[0]?.[0] ?? Number.NEGATIVE_INFINITY
    const endTime = rows.at(-1)?.[0] ?? first
    return {
      name: header.name,
      vars: header.vars,
      units: header.units,
      rows,
      events: this.events.filter((e) => e.time >= first),
      method: header.method,
      stopped,
      endTime,
    }
  }
}
