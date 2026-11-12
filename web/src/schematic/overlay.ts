// RUN-04 / WIRE-10: solved values drawn on the wires. One metric at a time, one
// domain and one unit on one scale, and only what the solve produced — a wire
// whose stream has no such variable is marked missing, never interpolated.

import type { StreamPhase, VariableResult } from '../api'
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
  /** Phase H: beyond a fixed range, drawn at the end it passed with a mark. */
  clipped?: 'low' | 'high'
}

/** Phase H: a metric's scale settings — a reference to diverge about, and a fixed range. */
export interface ScaleSetting {
  reference?: number
  min?: number
  max?: number
}

/** The members whose scale diverges about a reference: temperature, pressure, and signed flows (about zero). */
const DIVERGING_MEMBERS = new Set(['t', 'p', 'mdot', 'qdot', 'i', 'tau', 'f'])
const FLOW_MEMBERS = new Set(['mdot', 'qdot', 'i', 'tau', 'f'])
/** Ambient temperature and atmospheric pressure, in the units a result can carry. */
const AMBIENT: Record<string, Record<string, number>> = {
  t: { K: 293.15, C: 20, F: 68, R: 527.67 },
  p: { Pa: 101325, kPa: 101.325, MPa: 0.101325, bar: 1.01325, psi: 14.6959, atm: 1 },
}

/** Whether a metric's scale can diverge about a reference. */
export const canDiverge = (metric: Metric) => DIVERGING_MEMBERS.has(metric.key.split(':')[1])

/** The reference a metric diverges about — the setting, else zero for a flow, else ambient in its unit — or null for a sequential scale. */
export function referenceOf(metric: Metric, setting?: ScaleSetting): number | null {
  const member = metric.key.split(':')[1]
  if (!DIVERGING_MEMBERS.has(member)) return null
  if (setting?.reference !== undefined) return setting.reference
  return FLOW_MEMBERS.has(member) ? 0 : (AMBIENT[member]?.[metric.units] ?? null)
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

export interface Readings {
  byEdge: Map<string, EdgeReading>
  /** The scale's ends, and its centre for a diverging scale. */
  min: number
  max: number
  reference: number | null
  fixed: boolean
}

/**
 * Each wire's reading of `metric`; only that domain's wires in that unit share
 * the scale. Phase H: a temperature, pressure or flow diverges about its
 * reference (symmetric when automatic), and a fixed range clips with a mark.
 */
export function edgeReadings(edges: readonly SchematicEdge[], values: ReadonlyMap<string, VariableResult>, metric: Metric, setting?: ScaleSetting): Readings {
  const [domain, member] = metric.key.split(':')
  const byEdge = new Map<string, EdgeReading>()
  let lo = Infinity
  let hi = -Infinity
  for (const e of edges) {
    if (e.domain.toLowerCase() !== domain) continue
    const v = valueAt(e, member, values)
    if (!v) byEdge.set(e.id, { state: 'missing' })
    else if (!Number.isFinite(v.value)) byEdge.set(e.id, { state: 'nonfinite' })
    else if (v.units !== metric.units) byEdge.set(e.id, { state: 'unit', value: v.value })
    else {
      byEdge.set(e.id, { state: 'value', value: v.value })
      lo = Math.min(lo, v.value)
      hi = Math.max(hi, v.value)
    }
  }
  const reference = referenceOf(metric, setting)
  const fixed = setting?.min !== undefined && setting?.max !== undefined && setting.min < setting.max
  let [min, max] = fixed ? [setting!.min!, setting!.max!] : [lo, hi]
  if (!fixed && reference !== null && Number.isFinite(lo)) {
    const half = Math.max(Math.abs(hi - reference), Math.abs(lo - reference))
    ;[min, max] = [reference - half, reference + half]
  }
  for (const r of byEdge.values()) {
    if (r.state !== 'value') continue
    const v = r.value!
    if (fixed && v < min) r.clipped = 'low'
    if (fixed && v > max) r.clipped = 'high'
    const c = Math.min(max, Math.max(min, v))
    const centre = reference !== null && reference > min && reference < max ? reference : null
    r.t = max <= min ? 0.5
      : centre === null ? (c - min) / (max - min)
      : c < centre ? 0.5 * (c - min) / (centre - min) : 0.5 + 0.5 * (c - centre) / (max - centre)
  }
  return { byEdge, min, max, reference, fixed }
}

/** Five-stop diverging ramp: blue below the reference, neutral grey at it, red above. */
const DIVERGING = ['#2166ac', '#67a9cf', '#8c8c8c', '#ef8a62', '#b2182b']
export const DIVERGING_STOPS = DIVERGING

/** Phase H: the quality-aware scale. Single phase is never a negative quality. */
export const PHASE_METRIC: Metric = { key: 'fluid:phase', label: 'fluid phase', units: '' }
export const PHASE_COLORS = { subcooled: '#2166ac', superheated: '#b2182b', supercritical: '#762a83', dome: ['#1b7837', '#e08214'] } as const

/**
 * Each fluid wire's phase: the engine's classification of the solved state,
 * else, during playback, a recorded quality in [0, 1]. Without either a wire
 * reads as unknown — a recorded quality of −1 says single phase, not which.
 */
export function phaseReadings(edges: readonly SchematicEdge[], values: ReadonlyMap<string, VariableResult>, phases: Readonly<Record<string, StreamPhase>> | undefined): Map<string, StreamPhase | null> {
  const out = new Map<string, StreamPhase | null>()
  for (const e of edges) {
    if (e.domain.toLowerCase() !== 'fluid') continue
    const streams = [e.fromStream, e.toStream].filter((s): s is string => !!s).map((s) => s.toLowerCase())
    const known = streams.map((s) => phases?.[s]).find(Boolean)
    const x = streams.map((s) => values.get(`${s}.x`)?.value).find((v) => v !== undefined && v >= 0 && v <= 1)
    out.set(e.id, known ?? (x !== undefined ? { phase: 'two-phase', x } : null))
  }
  return out
}

/** The colour of a phase: inside the dome it runs from green at x = 0 to orange at x = 1. */
export function phaseColor(p: StreamPhase): string {
  if (p.phase !== 'two-phase') return PHASE_COLORS[p.phase]
  return mixHex(PHASE_COLORS.dome[0], PHASE_COLORS.dome[1], Math.min(1, Math.max(0, p.x ?? 0.5)))
}

export function divergingColor(t: number): string {
  return rampOf(DIVERGING, t)
}

function mixHex(a: string, b: string, f: number): string {
  const mix = (i: number) => Math.round(parseInt(a.slice(i, i + 2), 16) + (parseInt(b.slice(i, i + 2), 16) - parseInt(a.slice(i, i + 2), 16)) * f).toString(16).padStart(2, '0')
  return `#${[1, 3, 5].map(mix).join('')}`
}

function rampOf(stops: readonly string[], t: number): string {
  const x = Math.min(1, Math.max(0, t)) * (stops.length - 1)
  const k = Math.min(stops.length - 2, Math.floor(x))
  return mixHex(stops[k], stops[k + 1], x - k)
}

/** Five-stop sequential ramp (viridis), legible on light and dark. */
const RAMP = ['#440154', '#3b528b', '#21918c', '#5ec962', '#fde725']
export function rampColor(t: number): string {
  return rampOf(RAMP, t)
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

/** M3: the across value that turns each domain's flow into power; heat flow is power already. */
const POWER_OF: Record<string, string | null> = { electrical: 'v', mechanical: 'w', translational: 'vel', fluid: 'h', heat: null }

/** One port's power, W, signed into its block: V·I, τ·ω, F·v, ṁ·h or Q̇. */
export interface PortPower {
  block: string
  port: string
  domain: string
  /** The connection the port is on, so a Sankey can balance each net. */
  net: string
  power: number
}

/**
 * Phase M3: the power at every port the engine gives a flow-into rule for
 * (`Connection::flow_into`), each port once however many wires meet it. A
 * port with no rule (signal, a fluid port named neither in nor out, a
 * definition's boundary) or no finite value contributes nothing.
 */
export function portPowers(edges: readonly SchematicEdge[], values: ReadonlyMap<string, VariableResult>): PortPower[] {
  const seen = new Map<string, PortPower>()
  const value = (name: string) => {
    const v = values.get(name.toLowerCase())?.value
    return v !== undefined && Number.isFinite(v) ? v : undefined
  }
  for (const e of edges) {
    const domain = e.domain.toLowerCase()
    if (!(domain in POWER_OF)) continue
    for (const [block, port, rule, stream] of [[e.from, e.fromPort, e.fromFlow, e.fromStream], [e.to, e.toPort, e.toFlow, e.toStream]] as const) {
      const key = `${block}|${port}`
      if (!rule || !port || seen.has(key)) continue
      const across = POWER_OF[domain]
      const flow = value(rule.variable)
      const a = across === null ? 1 : stream ? value(`${stream}.${across}`) : undefined
      if (flow === undefined || a === undefined) continue
      seen.set(key, { block, port, domain, net: e.lineId, power: rule.into * flow * a })
    }
  }
  return [...seen.values()]
}

/** M3: each block's net power in, W — positive where it dissipates or stores, negative where it supplies. */
export function blockPowers(ports: readonly PortPower[]): Map<string, number> {
  const out = new Map<string, number>()
  for (const p of ports) out.set(p.block, (out.get(p.block) ?? 0) + p.power)
  return out
}

/**
 * M3: an energy Sankey from block nets. A port's own V·I or ṁ·h moves with
 * the ground and the enthalpy reference, and around a closed loop it only
 * circulates; a block's net does not (in steady state what enters it leaves).
 * So within each connected network, every block that supplies energy (net < 0)
 * sends it to the blocks that take it out (net > 0), shared in proportion to
 * what each takes: a balance, not the route energy takes along the wires.
 */
export function powerSankey(ports: readonly PortPower[]): { nodes: string[]; links: { source: number; target: number; value: number }[] } {
  // Blocks on the same connection are one network.
  const parent = new Map<string, string>()
  const root = (b: string): string => {
    const p = parent.get(b) ?? b
    if (p === b) return b
    const r = root(p)
    parent.set(b, r)
    return r
  }
  const firstOn = new Map<string, string>()
  for (const p of ports) {
    const other = firstOn.get(p.net)
    if (other === undefined) firstOn.set(p.net, p.block)
    else parent.set(root(p.block), root(other))
  }
  const groups = new Map<string, [string, number][]>()
  for (const [block, net] of blockPowers(ports)) groups.set(root(block), [...(groups.get(root(block)) ?? []), [block, net]])
  const nodes: string[] = []
  const index = (name: string) => {
    const k = nodes.indexOf(name)
    return k >= 0 ? k : nodes.push(name) - 1
  }
  const links: { source: number; target: number; value: number }[] = []
  for (const group of groups.values()) {
    const takers = group.filter(([, n]) => n > 0)
    const taken = takers.reduce((s, [, n]) => s + n, 0)
    for (const [src, n] of group) if (n < 0) for (const [sink, t] of takers) links.push({ source: index(src), target: index(sink), value: (-n * t) / taken })
  }
  return { nodes, links }
}
