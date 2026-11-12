// Phase L5: the recorder. A recording keeps every accepted row of a live run
// from where it started, apart from the display ring (which drops the oldest
// rows), until a finite duration elapses or it is exported. It ends with a
// status: complete, partial (the run ended, reset or closed first, or the
// recording hit its size limit) or failed (the integration failed), and the
// reason. Its file carries the rows at full precision, the units, the solver
// settings, the input timeline and the property provenance.

import type { LiveEvent, LiveInputChange, LiveProvenance, LiveSettings, LiveTable } from './wasm/liveClient'
import { MAX_VALUES } from './liveStore'

export type RecordingStatus = 'recording' | 'complete' | 'partial' | 'failed'

export interface RecordingMeta {
  header: LiveTable
  settings: LiveSettings | null
  provenance: LiveProvenance | null
}

const fmt = (v: number) => String(Number(v.toPrecision(5)))

export class LiveRecorder {
  private readonly parts: Float64Array[] = []
  private readonly events: LiveEvent[] = []
  /** Events after the newest kept row, kept once a row covers them. */
  private pending: LiveEvent[] = []
  rows = 0
  /** It has been saved to a file. */
  exported = false
  status: RecordingStatus = 'recording'
  reason: string | null = null
  /** Sim time of the newest row kept. */
  last: number | null = null
  private readonly wallStart = new Date().toISOString()
  private wallEnd: string | null = null
  private inputs: LiveInputChange[] = []
  private readonly cols: number

  /**
   * Record from the row at `from` (kept, as the state the recording starts
   * in) on, or from the run's first row when `from` is `null`; for `duration`
   * of sim time, or until it is ended when `null`.
   */
  constructor(
    private readonly meta: RecordingMeta,
    readonly duration: number | null,
    first: number[] | null,
    private readonly inputLog: () => LiveInputChange[],
    private readonly maxValues = MAX_VALUES,
  ) {
    this.cols = meta.header.vars.length
    if (first) this.keep(Float64Array.from(first), 1)
  }

  get block(): string {
    return this.meta.header.name
  }

  /** The sim time the recording started at, once it has a row. */
  get from(): number | null {
    return this.rows > 0 ? this.parts[0][0] : null
  }

  /** The time the recording ends at, when it has a duration and a start. */
  get until(): number | null {
    const from = this.from
    return this.duration === null || from === null ? null : from + this.duration
  }

  private keep(rows: Float64Array, n: number) {
    this.parts.push(rows.slice(0, n * this.cols))
    this.rows += n
    this.last = rows[(n - 1) * this.cols]
  }

  /** Take a chunk's rows after the newest kept one, up to the duration's end. */
  push(rows: Float64Array, numRows: number, events: readonly LiveEvent[]): void {
    if (this.status !== 'recording') return
    const cols = this.cols
    let first = 0
    while (first < numRows && this.last !== null && rows[first * cols] <= this.last) first++
    const start = this.from ?? (first < numRows ? rows[first * cols] : null)
    const until = this.duration === null || start === null ? null : start + this.duration
    // Grid times are `linspace` values: a row within a rounding of the end is the end row.
    const slack = until === null ? 0 : 1e-9 * Math.max(1, Math.abs(until))
    let end = first
    let done = false
    // The first row at or past the end is the recording's last, so it covers the duration.
    for (; until !== null && end < numRows; end++) {
      if (rows[end * cols] >= until - slack) {
        end += 1
        done = true
        break
      }
    }
    if (until === null) end = numRows
    let n = end - first
    if ((this.rows + n) * cols > this.maxValues) {
      n = Math.max(0, Math.floor(this.maxValues / cols) - this.rows)
      if (n > 0) this.keep(rows.subarray(first * cols), n)
      this.collect(events)
      this.end('partial', `The recording reached its limit of ${this.maxValues.toLocaleString('en-US')} values at t = ${fmt(this.last ?? 0)}; the rows up to it are kept.`)
      return
    }
    if (n > 0) this.keep(rows.subarray(first * cols), n)
    this.collect(events)
    if (done) this.end('complete', null)
  }

  /**
   * Keep the events inside the saved span, from the first row to the newest.
   * An event past the newest row waits: a chunk can end on a step past its
   * last row, so the next chunk's rows may still cover it.
   */
  private collect(events: readonly LiveEvent[]) {
    const from = this.from
    const all = [...this.pending, ...events]
    this.pending = []
    if (from === null || this.last === null) return
    for (const e of all) {
      if (e.time < from) continue
      if (e.time <= this.last) this.events.push(e)
      else this.pending.push(e)
    }
  }

  /** End the recording; it keeps what it has. */
  end(status: Exclude<RecordingStatus, 'recording'>, reason: string | null): void {
    if (this.status !== 'recording') return
    this.status = status
    this.reason = reason
    this.wallEnd = new Date().toISOString()
    this.inputs = this.inputLog().slice()
  }

  /** The recording as its file's JSON. */
  toJSON(): object {
    const { header, settings, provenance } = this.meta
    const rows: number[][] = []
    for (const part of this.parts) for (let i = 0; i < part.length; i += this.cols) rows.push(Array.from(part.subarray(i, i + this.cols)))
    return {
      format: 'frees-live-recording',
      version: 1,
      block: header.name,
      status: this.status,
      reason: this.reason,
      span: { from: this.from, to: this.last, requested: this.duration, unit: header.units[0] || 's' },
      wall: { started: this.wallStart, ended: this.wallEnd },
      solver: settings,
      provenance,
      columns: header.vars.map((name, i) => ({ name, unit: header.units[i] ?? '' })),
      rows,
      events: this.events,
      // Every input change since the run opened, values in SI: the ones before
      // `span.from` are what was in force when the recording started.
      inputs: { unit: 'SI', changes: this.status === 'recording' ? this.inputLog().slice() : this.inputs },
    }
  }
}

/** Save a recording as `<block>-recording.json`. */
export function downloadRecording(r: LiveRecorder): void {
  const url = URL.createObjectURL(new Blob([JSON.stringify(r)], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `${r.block.replace(/[^\w.-]+/g, '_') || 'live'}-recording.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
  r.exported = true
}
