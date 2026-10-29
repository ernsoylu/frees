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

/**
 * Port flows that are positive INTO a block (electrical I, heat Q̇), and the
 * fluid stream flow, positive from a component's `in` to its `out`.
 */
const INTO: Record<string, string> = { electrical: 'i', heat: 'qdot' }
const role = (port?: string) => (port && /^(in|inlet)\d*$|_in\d*$/i.test(port) ? 1 : port && /^(out|outlet)\d*$|_out\d*$/i.test(port) ? -1 : 0)

/**
 * WIRE-10: the measured flow along a wire — 1 from `from` to `to`, -1 against
 * it, 0 when it is zero — or null when no solved flow and sign convention say
 * which way (a fluid port named neither in nor out, a domain with no flow).
 */
export function flowAlong(e: SchematicEdge, values: ReadonlyMap<string, VariableResult>): 1 | -1 | 0 | null {
  const domain = e.domain.toLowerCase()
  // Flow into the block at an end, by that end's convention.
  const into = (stream: string | undefined, port: string | undefined): number | null => {
    if (!stream) return null
    if (INTO[domain]) return values.get(`${stream}.${INTO[domain]}`.toLowerCase())?.value ?? null
    if (domain !== 'fluid' || !role(port)) return null
    const mdot = values.get(`${stream}.mdot`.toLowerCase())?.value
    return mdot === undefined ? null : role(port) * mdot
  }
  const atTo = into(e.toStream, e.toPort)
  const atFrom = into(e.fromStream, e.fromPort)
  const along = atTo !== null ? atTo : atFrom !== null ? -atFrom : null
  if (along === null || !Number.isFinite(along)) return null
  return along === 0 ? 0 : along > 0 ? 1 : -1
}
