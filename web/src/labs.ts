// Phase M1: graded live labs. A lab is a lesson run live with a finite input
// timeline the engine applies itself (`liveTimeline`), so the run is the same
// at any frame rate and after every reset. Its grades are measured on the run's
// own rows and events, in SI, against reference values the lab states with
// their derivation.

import type { LiveChunk, LiveOpenResult } from './wasm/liveClient'

/** One timeline entry: literal assignments as the sliders write them, applied at the first row at or after `at`. */
export interface LabTimelineEntry {
  at: number
  set: string[]
}

export type LabMeasure =
  /** A column's value at a row time. */
  | { kind: 'value'; column: string; time: number }
  /** A column's largest or smallest row value over `[from, to]`. */
  | { kind: 'max' | 'min'; column: string; from: number; to: number }
  /** The time of the first crossing named `event` after `after`. */
  | { kind: 'event'; event: string; after: number }
  /** The time between the first two crossings named `event` after `after`. */
  | { kind: 'interval'; event: string; after: number }

export interface LabGrade {
  label: string
  measure: LabMeasure
  /** The reference value, SI. */
  expected: number
  /** The absolute tolerance, SI. */
  tolerance: number
  /** The SI unit the values are shown in. */
  unit: string
}

export interface LiveLab {
  /** What the run does, in one or two sentences. */
  brief: string
  timeline: LabTimelineEntry[]
  /** Pause conditions (L4); a grade may time their crossings. */
  watches?: string[]
  grades: LabGrade[]
  /** Where the reference values come from. */
  reference: string
  /** Sim seconds per wall second the Live bar plays it at (default 1). */
  speed?: number
}

/** A finished lab run: the block's columns, its rows, its events. */
export interface LabRun {
  vars: string[]
  rows: number[][]
  events: { name: string; time: number }[]
}

export interface LabResult {
  label: string
  expected: number
  measured: number | null
  tolerance: number
  unit: string
  pass: boolean
}

/** Columns are flat names (`body$port$T`); a lab writes them as variables (`body.port.T`), without case. */
const columnOf = (vars: string[], name: string) => {
  const key = name.toLowerCase().replaceAll('.', '$')
  return vars.findIndex((v) => v.toLowerCase() === key)
}

export function measure(run: LabRun, m: LabMeasure): number | null {
  if (m.kind === 'event' || m.kind === 'interval') {
    const times = run.events.filter((e) => e.name === m.event && e.time > m.after).map((e) => e.time)
    if (m.kind === 'event') return times[0] ?? null
    return times.length >= 2 ? times[1] - times[0] : null
  }
  const c = columnOf(run.vars, m.column)
  if (c < 0) return null
  if (m.kind === 'value') return run.rows.find((r) => Math.abs(r[0] - m.time) <= 1e-9 * Math.max(1, Math.abs(m.time)))?.[c] ?? null
  const window = run.rows.filter((r) => r[0] >= m.from && r[0] <= m.to).map((r) => r[c])
  if (!window.length) return null
  return m.kind === 'max' ? Math.max(...window) : Math.min(...window)
}

export function gradeLab(lab: LiveLab, run: LabRun): LabResult[] {
  return lab.grades.map((g) => {
    const measured = measure(run, g.measure)
    return {
      label: g.label,
      expected: g.expected,
      measured,
      tolerance: g.tolerance,
      unit: g.unit,
      pass: measured !== null && Math.abs(measured - g.expected) <= g.tolerance,
    }
  })
}

/** The open request with the lab's timeline and pause conditions. */
export function labRequest(request: string, lab: LiveLab): string {
  return JSON.stringify({ ...JSON.parse(request), liveTimeline: lab.timeline, ...(lab.watches?.length ? { liveWatches: lab.watches } : {}) })
}

/** What a headless lab run needs of a live client. */
export interface LabDriver {
  open: (source: string, request: string, block: number, revision: number) => Promise<LiveOpenResult | null>
  advance: (tTarget: number, budgetMs: number) => Promise<LiveChunk | null>
  dispose: () => void
}

/**
 * Run a lab headless to the block's end time, through the pauses its watches
 * make, and collect what the grades read. The visible run in the Live bar is
 * the same run: the engine applies the timeline at the same rows.
 */
export async function runLab(driver: LabDriver, source: string, request: string, lab: LiveLab, block = 0): Promise<LabRun> {
  const opened = await driver.open(source, labRequest(request, lab), block, 0)
  if (!opened) throw new Error('The lab run was overtaken by another.')
  if (!opened.ok) throw new Error(opened.error)
  const tf = opened.settings?.tf ?? Number.POSITIVE_INFINITY
  const run: LabRun = { vars: opened.table.vars, rows: [], events: [] }
  try {
    for (;;) {
      const chunk = await driver.advance(tf, 1000)
      if (!chunk) throw new Error('The lab run was overtaken by another.')
      for (let i = 0; i < chunk.numRows; i++) run.rows.push(Array.from(chunk.rows.subarray(i * chunk.numCols, (i + 1) * chunk.numCols)))
      run.events.push(...chunk.events)
      if (chunk.error) throw new Error(chunk.error)
      const last = run.rows.at(-1)?.[0]
      if (chunk.finished || (last !== undefined && last >= tf)) break
      // A chunk ends at a pause, a timeline change or the budget; an empty one with nothing to pause at means no progress.
      if (chunk.numRows === 0 && !chunk.paused && !chunk.inputs?.length) throw new Error('The lab run stopped making progress.')
    }
  } finally {
    driver.dispose()
  }
  return run
}
