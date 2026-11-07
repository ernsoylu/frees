// RUN-04 / WIRE-10: solved values drawn on the wires. One metric at a time, one
// domain and one unit on one scale, and only what the solve produced — a wire
// whose stream has no such variable is marked missing, never interpolated.

import type { VariableResult } from '../api'
import type { SchematicEdge } from './layout'
import { MEMBERS } from './readouts'

export interface Metric {
  /** `domain:member`, e.g. `fluid:p`. */
  key: string
  label: string
  units: string
}

export type EdgeState = 'value' | 'missing' | 'nonfinite' | 'unit'

export interface EdgeReading {
  state: EdgeState
  value?: number
  /** 0–1 along the scale, for a value. */
  t?: number
}

const valueAt = (e: SchematicEdge, member: string, values: ReadonlyMap<string, VariableResult>) =>
  [e.fromStream, e.toStream].map((s) => (s ? values.get(`${s}.${member}`.toLowerCase()) : undefined)).find(Boolean)

/** The metrics some wire has a solved value for, by domain then member order. */
export function overlayMetrics(edges: readonly SchematicEdge[], values: ReadonlyMap<string, VariableResult>): Metric[] {
  const out: Metric[] = []
  for (const [domain, members] of Object.entries(MEMBERS)) {
    for (const [member, label] of members) {
      const hit = edges.filter((e) => e.domain.toLowerCase() === domain).map((e) => valueAt(e, member, values)).find((v) => v && Number.isFinite(v.value))
      if (hit) out.push({ key: `${domain}:${member}`, label: `${domain} ${label}`, units: hit.units })
    }
  }
  return out
}

/** Each wire's reading of `metric`; only that domain's wires in that unit share the scale. */
export function edgeReadings(edges: readonly SchematicEdge[], values: ReadonlyMap<string, VariableResult>, metric: Metric): { byEdge: Map<string, EdgeReading>; min: number; max: number } {
  const [domain, member] = metric.key.split(':')
  const byEdge = new Map<string, EdgeReading>()
  let min = Infinity
  let max = -Infinity
  for (const e of edges) {
    if (e.domain.toLowerCase() !== domain) continue
    const v = valueAt(e, member, values)
    if (!v) byEdge.set(e.id, { state: 'missing' })
    else if (!Number.isFinite(v.value)) byEdge.set(e.id, { state: 'nonfinite' })
    else if (v.units !== metric.units) byEdge.set(e.id, { state: 'unit', value: v.value })
    else {
      byEdge.set(e.id, { state: 'value', value: v.value })
      min = Math.min(min, v.value)
      max = Math.max(max, v.value)
    }
  }
  for (const r of byEdge.values()) if (r.state === 'value') r.t = max > min ? (r.value! - min) / (max - min) : 0.5
  return { byEdge, min, max }
}

/** Five-stop sequential ramp (viridis), legible on light and dark. */
const RAMP = ['#440154', '#3b528b', '#21918c', '#5ec962', '#fde725']
export function rampColor(t: number): string {
  const x = Math.min(1, Math.max(0, t)) * (RAMP.length - 1)
  const k = Math.min(RAMP.length - 2, Math.floor(x))
  const mix = (a: string, b: string, f: number) => Math.round(parseInt(a, 16) + (parseInt(b, 16) - parseInt(a, 16)) * f).toString(16).padStart(2, '0')
  const [a, b] = [RAMP[k], RAMP[k + 1]]
  return `#${[1, 3, 5].map((i) => mix(a.slice(i, i + 2), b.slice(i, i + 2), x - k)).join('')}`
}
export const RAMP_STOPS = RAMP

/** What a wire's particles carry, per domain; the signal domain carries nothing. */
export const CARRIES: Record<string, string> = {
  fluid: 'mass flow',
  heat: 'heat flow (energy, not matter)',
  electrical: 'current',
  mechanical: 'shaft power (τ·ω)',
  translational: 'power (F·v)',
}
/** Shafts and rods carry power: the flow into the block times the across value. */
const POWER_ACROSS: Record<string, string> = { mechanical: 'w', translational: 'vel' }

/**
 * Phase H: what a wire carries, signed from `from` to `to` — mass flow,
 * Q̇, current, or power on a shaft — or null when the engine gives no rule
 * at either end or the solve has no finite value. The sign comes only from
 * the engine's flow-into rule (`Connection::flow_into`), never from drawing
 * order or a gradient.
 */
export function carriedAlong(e: SchematicEdge, values: ReadonlyMap<string, VariableResult>): number | null {
  const across = POWER_ACROSS[e.domain.toLowerCase()]
  const into = (rule: SchematicEdge['toFlow'], stream: string | undefined): number | null => {
    const flow = rule ? values.get(rule.variable.toLowerCase())?.value : undefined
    if (!rule || flow === undefined || !Number.isFinite(flow)) return null
    if (!across) return rule.into * flow
    const w = stream ? values.get(`${stream}.${across}`.toLowerCase())?.value : undefined
    return w === undefined || !Number.isFinite(w) ? null : rule.into * flow * w
  }
  const atTo = into(e.toFlow, e.toStream)
  if (atTo !== null) return atTo
  const atFrom = into(e.fromFlow, e.fromStream)
  return atFrom === null ? null : -atFrom
}

/**
 * WIRE-10: the measured flow along a wire — 1 from `from` to `to`, -1 against
 * it, 0 when it is zero — or null when the engine's convention does not say.
 */
export function flowAlong(e: SchematicEdge, values: ReadonlyMap<string, VariableResult>): 1 | -1 | 0 | null {
  const along = carriedAlong(e, values)
  return along === null ? null : along === 0 ? 0 : along > 0 ? 1 : -1
}

/**
 * Phase H: each wire's particle period (seconds per dash spacing), from the log
 * of what it carries normalised within its domain: the largest flow of a
 * domain moves fastest. A wire with no direction or no flow has none. The
 * speed is schematic, not a physical velocity.
 */
export function particlePeriods(edges: readonly SchematicEdge[], values: ReadonlyMap<string, VariableResult>): Map<string, { period: number; dir: 1 | -1 }> {
  const carried = edges.flatMap((e) => {
    const q = CARRIES[e.domain.toLowerCase()] ? carriedAlong(e, values) : null
    return q ? [{ e, q, log: Math.log10(Math.abs(q)) }] : []
  })
  const range = new Map<string, [number, number]>()
  for (const { e, log } of carried) {
    const [lo, hi] = range.get(e.domain) ?? [Infinity, -Infinity]
    range.set(e.domain, [Math.min(lo, log), Math.max(hi, log)])
  }
  return new Map(carried.map(({ e, q, log }) => {
    const [lo, hi] = range.get(e.domain)!
    const t = hi > lo ? (log - lo) / (hi - lo) : 1
    return [e.id, { period: PARTICLE_SLOW - (PARTICLE_SLOW - PARTICLE_FAST) * t, dir: q > 0 ? 1 : -1 }]
  }))
}
const PARTICLE_SLOW = 1.6
const PARTICLE_FAST = 0.4
/** Pixels between particles along a wire. */
export const PARTICLE_GAP = 16
