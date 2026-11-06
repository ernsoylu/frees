import type { OdeTableDto, VariableResult } from './api'

/**
 * RUN-05: recorded-result playback. Playback moves through the samples a
 * dynamic solve recorded; it never solves and never interpolates. The engine
 * records no row at an event, so a value between two samples across an event
 * would blend the values before and after it. Every view reads the same
 * sample, so the diagram, the plot cursor and an export agree.
 */
export interface Timeline {
  table: string
  /** The time column's name (column 0) and unit, as the table states them. */
  timeVar: string
  timeUnit: string
  times: number[]
  /** Each event with the first recorded sample at or after it. */
  events: { name: string; time: number; index: number }[]
  /** A stop event ended the run early. */
  stopped: boolean
}

export function timelineOf(t: OdeTableDto | undefined): Timeline | null {
  if (!t || t.vars.length === 0) return null
  const times = t.rows.map((r) => r[0])
  if (times.length < 2 || !times.every((x): x is number => typeof x === 'number' && Number.isFinite(x))) return null
  const events = t.events.map((e) => ({ ...e, index: firstAtOrAfter(times, e.time) })).filter((e) => e.index >= 0)
  return { table: t.name, timeVar: t.vars[0], timeUnit: t.units[0] ?? '', times, events, stopped: t.stopped }
}

function firstAtOrAfter(times: readonly number[], t: number): number {
  const tol = 1e-9 * Math.max(1, Math.abs(t))
  return times.findIndex((x) => x >= t - tol)
}

/**
 * Values at sample `k`, named as the solve names them (`body$port$t` reads as
 * `body.port.t`), in the table's (SI) units. A missing value is left out, so
 * a view shows it unavailable rather than as a number.
 */
export function variablesAt(t: OdeTableDto, k: number): VariableResult[] {
  const row = t.rows[k] ?? []
  return t.vars.flatMap((name, j) => {
    const value = row[j]
    return j > 0 && typeof value === 'number' && Number.isFinite(value) ? [{ name: name.replaceAll('$', '.'), value, units: t.units[j] ?? '' }] : []
  })
}

/**
 * The solved values with the run's recorded ones at sample `k` in place of
 * their end-of-run values. A recorded variable with no value at `k` is left
 * out rather than shown with its final value.
 */
export function playbackVariables(solved: readonly VariableResult[], t: OdeTableDto, k: number): VariableResult[] {
  const recorded = new Set(t.vars.slice(1).map((n) => n.replaceAll('$', '.').toLowerCase()))
  return [...solved.filter((v) => !recorded.has(v.name.toLowerCase())), ...variablesAt(t, k)]
}

/** How a time of the run reads: `t = 12.5 s`. */
export function timeAt(tl: Timeline, t: number): string {
  const unit = tl.timeUnit && tl.timeUnit !== '-' ? ' ' + tl.timeUnit : ''
  return `${tl.timeVar} = ${Number(t.toPrecision(6))}${unit}`
}

export const timeLabel = (tl: Timeline, k: number) => timeAt(tl, tl.times[k])

/** A whole run plays in ten seconds at 1×. */
export const PLAY_SECONDS = 10

/** The sample to show `wallSeconds` after sample `k` at `speed`: always at least the next one, never past the end. */
export function advance(tl: Timeline, k: number, wallSeconds: number, speed: number): number {
  const last = tl.times.length - 1
  const span = tl.times[last] - tl.times[0]
  const target = tl.times[k] + (span / PLAY_SECONDS) * speed * wallSeconds
  let next = k + 1
  while (next < last && tl.times[next + 1] <= target) next++
  return Math.min(next, last)
}
