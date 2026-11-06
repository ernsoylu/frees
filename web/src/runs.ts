import type { SolveResponse, VariableResult } from './api'

/**
 * RUN-07: named scenarios and run comparison.
 *
 * A scenario is a named set of input values. The active one rides the solve's
 * override channel (`name = value [unit]` lines the engine applies in place of
 * the document's own assignment), so the document text never changes. Every
 * solve result carries a `RunIdentity`; a baseline is a pinned result, and a
 * comparison pairs its values with the current run's only where the sample
 * matches and the units convert.
 */
export interface ScenarioInput {
  name: string
  value: number
  /** As the engine reads it inside `[…]`; '' or '-' for none. */
  unit: string
}
export interface Scenario {
  name: string
  inputs: ScenarioInput[]
}
export interface ScenarioState {
  list: Scenario[]
  /** The active scenario's name; null solves the document's own inputs. */
  active: string | null
}
export const EMPTY_SCENARIOS: ScenarioState = { list: [], active: null }
export const DOCUMENT_INPUTS = 'Document inputs'

export type RunStatus = 'solved' | 'solved with warnings' | 'did not converge' | 'engine failed'
export interface RunIdentity {
  /** The model revision the run solved (`ModelRevisionTracker`). */
  revision: number
  /** The scenario solved, or `DOCUMENT_INPUTS`. */
  scenario: string
  /** Which sample of the run the values are: the steady solution, or one of several. */
  sample: string
  status: RunStatus
}

export function runStatus(r: SolveResponse): RunStatus {
  if (!r.success) return /in-browser solver failed/i.test(r.error ?? '') ? 'engine failed' : 'did not converge'
  return r.unitWarnings.length ? 'solved with warnings' : 'solved'
}

export function sampleOf(solutions: number, selected: number): string {
  return solutions > 1 ? `solution ${selected + 1} of ${solutions}` : 'steady solution'
}

export const describeRun = (run: RunIdentity) => `run ${run.revision} · ${run.scenario} · ${run.sample} · ${run.status}`

export const activeScenario = (s: ScenarioState) => s.list.find((x) => x.name === s.active) ?? null

/**
 * The active scenario's override lines. Only inputs the document still assigns
 * a literal value are applied (the slider policy): an override on a computed
 * variable would replace the equation defining it.
 */
export function scenarioOverrides(s: ScenarioState, pinnable: ReadonlySet<string>): string[] {
  return (activeScenario(s)?.inputs ?? [])
    .filter((i) => pinnable.has(i.name.toLowerCase()))
    .map((i) => `${i.name} = ${i.value}${i.unit && i.unit !== '-' ? ` [${i.unit}]` : ''}`)
}

const NAME = /^[A-Za-z_]\w{0,63}$/
// A unit as the engine writes one: letters, digits, `^ * / . -` and spaces; no `]`, `;` or newline.
const UNIT = /^[\w^*/. -]{0,40}$/
const record = (v: unknown): Record<string, unknown> | null => (v != null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null)

/**
 * Validate stored scenarios. The inputs become engine source lines, so a name
 * is an identifier, a value a finite number and a unit free of `]`, `;` and
 * line breaks; anything else is dropped and counted.
 */
export function sanitizeScenarios(raw: unknown): { state: ScenarioState; repaired: number } {
  const r = record(raw)
  if (!r) return { state: EMPTY_SCENARIOS, repaired: raw == null ? 0 : 1 }
  let repaired = 0
  const list: Scenario[] = []
  for (const v of Array.isArray(r.list) ? r.list : []) {
    const s = record(v)
    if (!s || typeof s.name !== 'string' || !s.name.trim() || s.name.length > 60 || list.length >= 50 || list.some((x) => x.name === s.name)) {
      repaired++
      continue
    }
    const inputs: ScenarioInput[] = []
    for (const i of Array.isArray(s.inputs) ? s.inputs : []) {
      const x = record(i)
      if (x && typeof x.name === 'string' && NAME.test(x.name) && typeof x.value === 'number' && Number.isFinite(x.value) && typeof x.unit === 'string' && UNIT.test(x.unit)
        && inputs.length < 200 && !inputs.some((y) => y.name.toLowerCase() === (x.name as string).toLowerCase())) inputs.push({ name: x.name, value: x.value, unit: x.unit })
      else repaired++
    }
    list.push({ name: s.name, inputs })
  }
  const active = typeof r.active === 'string' && list.some((s) => s.name === r.active) ? r.active : null
  if (r.active != null && active === null) repaired++
  return { state: { list, active }, repaired }
}

export const validUnit = (unit: string) => UNIT.test(unit)
export const validName = (name: string) => NAME.test(name)

/** A pinned result: its identity and its values, as solved. */
export interface Baseline {
  run: RunIdentity
  variables: VariableResult[]
}

export interface Comparison {
  name: string
  /** The current value's unit; the baseline is shown converted into it. */
  unit: string
  baseline: number | null
  current: number | null
  /** Why the pair is not compared, or null when it is. */
  unavailable: string | null
}

/** `scale`/`shift` taking a value in unit `from` into unit `to`, or null when they measure different things. */
export type Convert = (from: string, to: string) => { scale: number; shift: number } | null

/**
 * Pair baseline and current values by name (case-insensitive). A pair compares
 * only when both runs solved, describe the same sample and their units convert;
 * otherwise it says why it is unavailable.
 */
export function compareRuns(baseline: Baseline, current: Baseline, convert: Convert): Comparison[] {
  const usable = (r: RunIdentity) => r.status === 'solved' || r.status === 'solved with warnings'
  const runWhy = !usable(baseline.run) ? 'the baseline did not solve'
    : !usable(current.run) ? 'the current run did not solve'
    : baseline.run.sample !== current.run.sample ? `different samples (${baseline.run.sample} vs ${current.run.sample})` : null
  const before = new Map(baseline.variables.map((v) => [v.name.toLowerCase(), v]))
  const names = [...new Set([...current.variables.map((v) => v.name), ...baseline.variables.map((v) => v.name)].map((n) => n.toLowerCase()))]
  const now = new Map(current.variables.map((v) => [v.name.toLowerCase(), v]))
  return names.map((key) => {
    const [b, c] = [before.get(key), now.get(key)]
    const name = (c ?? b)!.name
    const unit = (c ?? b)!.units
    if (!b || !c) return { name, unit, baseline: b?.value ?? null, current: c?.value ?? null, unavailable: b ? 'not in the current run' : 'not in the baseline' }
    if (runWhy) return { name, unit, baseline: b.value, current: c.value, unavailable: runWhy }
    const same = b.units === c.units || (isNone(b.units) && isNone(c.units))
    // An unknown unit ('') converts to nothing but itself.
    const k = same ? { scale: 1, shift: 0 } : b.units && c.units ? convert(b.units, c.units) : null
    if (!k) return { name, unit, baseline: b.value, current: c.value, unavailable: `units differ (${b.units || 'unknown'} vs ${c.units || 'unknown'})` }
    return { name, unit, baseline: b.value * k.scale + k.shift, current: c.value, unavailable: null }
  })
}

const isNone = (u: string) => u === '-' || u === ''
