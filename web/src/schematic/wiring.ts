// Preview wiring rules for the schematic. Check remains the authority for
// signal writers, fluid families, and junction physics — this module only
// stops the obvious mistakes (same instance, mixed bond-graph domain,
// reconnecting an existing node) before a `connect(...)` is inserted.

import type { ConnectionDto, PortDto } from '../api'
import { COMPONENT_CATALOG } from '../componentCatalog'

export interface WireEndpoint {
  instance: string
  port: string
  /** Display spelling of the instance, when known. */
  label?: string
  type?: string
}

export type WirePreview =
  | { ok: true; pending?: string }
  | { ok: false; reason: string }

/** Whether two ports may be joined, from the engine's port metadata (WIRE-02). */
export type Compatibility =
  | { kind: 'allowed' }
  | { kind: 'prohibited'; reason: string }
  | { kind: 'unknown'; reason: string }

/** The connector a fluid port of any family accepts. */
const ANY_FLUID = 'fluid'

/**
 * Engine-classified compatibility. Unknown — a port the last Check did not
 * classify, such as one just declared — is neither allowed nor refused: the
 * wire may be added and Check decides.
 */
export function compatibility(a: PortDto | undefined, b: PortDto | undefined): Compatibility {
  const name = (p: PortDto) => `${p.instance}.${p.port}`
  if (!a || !b) {
    const known = a ?? b
    return { kind: 'unknown', reason: `Pending: Check has not classified ${known ? `the port joining ${name(known)}` : 'either port'} yet.` }
  }
  if (a.domain !== b.domain) {
    return { kind: 'prohibited', reason: `Cannot wire ${a.domain} ${name(a)} to ${b.domain} ${name(b)}.` }
  }
  const [ca, cb] = [a.connector ?? ANY_FLUID, b.connector ?? ANY_FLUID]
  if (a.domain === 'fluid' && ca !== cb && ca !== ANY_FLUID && cb !== ANY_FLUID) {
    return { kind: 'prohibited', reason: `Cannot join a ${ca} line (${name(a)}) to a ${cb} line (${name(b)}).` }
  }
  return { kind: 'allowed' }
}

/** Port metadata by `instance.port`, lowercase. */
export function portIndex(ports: readonly PortDto[] | undefined): Map<string, PortDto> {
  return new Map((ports ?? []).map((p) => [`${p.instance}.${p.port}`.toLowerCase(), p]))
}

const LIBRARY_DOMAIN: Record<string, string> = {
  ac: 'fluid',
  control: 'signal',
  electrical: 'electrical',
  fluid: 'fluid',
  heat: 'heat',
  hydraulic: 'fluid',
  liquid: 'fluid',
  mechanical: 'mechanical',
  moistair: 'fluid',
  pneumatic: 'fluid',
  powertrain: 'mechanical',
  signal: 'signal',
  twophase: 'fluid',
}

/** Port names that override the component's library domain. */
const PORT_DOMAIN: Record<string, string> = {
  wall: 'heat',
  heat: 'heat',
  thermal: 'heat',
  shaft: 'mechanical',
  rot: 'mechanical',
  u: 'signal',
  cmd: 'signal',
}

function catalogLibrary(type: string | undefined): string | undefined {
  if (!type) return undefined
  const spec = COMPONENT_CATALOG.find((c) => c.type.toLowerCase() === type.toLowerCase())
  return spec?.library
}

/** Bond-graph domain for a port, or null when we must not guess. */
export function previewDomain(type: string | undefined, port: string): string | null {
  const p = port.toLowerCase()
  if (PORT_DOMAIN[p]) return PORT_DOMAIN[p]
  const lib = catalogLibrary(type)
  if (lib && LIBRARY_DOMAIN[lib]) return LIBRARY_DOMAIN[lib]
  return null
}

export function endpointRef(ep: WireEndpoint): string {
  return `${(ep.label ?? ep.instance).trim()}.${ep.port.trim()}`
}

export function canonRef(ref: string): string {
  return ref.trim().toLowerCase().replace(/\s+/g, '')
}

/** True when both endpoints already belong to one connection-set. */
export function alreadyConnected(
  connections: readonly ConnectionDto[],
  a: string,
  b: string,
): boolean {
  const na = canonRef(a)
  const nb = canonRef(b)
  if (!na || !nb || na === nb) return false
  return connections.some((c) => {
    const set = new Set((c.endpoints ?? []).map(canonRef))
    return set.has(na) && set.has(nb)
  })
}

export function previewWire(
  from: WireEndpoint,
  to: WireEndpoint,
  connections: readonly ConnectionDto[] = [],
  ports?: ReadonlyMap<string, PortDto>,
): WirePreview {
  if (from.instance.toLowerCase() === to.instance.toLowerCase()) {
    return { ok: false, reason: 'Pick a port on a different component.' }
  }
  const aRef = endpointRef(from)
  const bRef = endpointRef(to)
  if (alreadyConnected(connections, aRef, bRef)) {
    return {
      ok: false,
      reason: `${aRef} and ${bRef} are already in the same connection — not added.`,
    }
  }
  // Engine metadata decides when the last Check classified both ports.
  if (ports && ports.size > 0) {
    const key = (ep: WireEndpoint) => `${ep.instance}.${ep.port}`.toLowerCase()
    const c = compatibility(ports.get(key(from)), ports.get(key(to)))
    if (c.kind === 'prohibited') return { ok: false, reason: c.reason }
    if (c.kind === 'allowed') return { ok: true }
  }
  const da = previewDomain(from.type, from.port)
  const db = previewDomain(to.type, to.port)
  // Unknown/custom connectors: do not invent a physics assumption.
  if (da && db && da !== db) {
    return {
      ok: false,
      reason: `Cannot wire ${da} ${aRef} to ${db} ${bRef}.`,
    }
  }
  return { ok: true, pending: `${aRef} — ${bRef}: compatibility is decided by Check.` }
}

export function connectStatement(from: WireEndpoint, to: WireEndpoint): string {
  return `connect(${endpointRef(from)}, ${endpointRef(to)})`
}

/** Instance ids mentioned as free/redundant quantities in a Check diagnosis. */
export function instancesInDiagnosis(message: string): string[] {
  const names = new Set<string>()
  const re = /\b([A-Za-z_][A-Za-z0-9_]*)\.(?:[A-Za-z_][A-Za-z0-9_]*)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(message)) !== null) {
    names.add(m[1].toLowerCase())
  }
  return [...names]
}

/** Group dotted member names by instance for a compact next-action list. */
export function groupByInstance(names: readonly string[]): { instance: string; members: string[] }[] {
  const map = new Map<string, string[]>()
  for (const raw of names) {
    const name = raw.trim()
    const dot = name.indexOf('.')
    const instance = (dot >= 0 ? name.slice(0, dot) : name).toLowerCase()
    const list = map.get(instance) ?? []
    list.push(name)
    map.set(instance, list)
  }
  return [...map.entries()].map(([instance, members]) => ({ instance, members }))
}

export function parseFreeQuantities(message: string): string[] {
  const m = /Free quantit(?:y|ies) \(no defining relation\):\s*([^\n]+)/i.exec(message)
  if (!m) return []
  const section = m[1].split(/\. Coupled|\. A common/)[0]
  return [...section.matchAll(/[A-Za-z_][\w$]*(?:\.[A-Za-z_][\w$]*)+/g)].map((x) => x[0])
}

export function hasUnknownUnitWarning(warnings: readonly string[]): boolean {
  return warnings.some((w) => /unknown unit/i.test(w))
}

export const LOCAL_ENGINE_FAILURE =
  'The in-browser solver failed. Use Stop to reset the worker, then Check again.'

/** Every connection joined to `index` through shared endpoints — one physical net. */
export function netConnections(connections: readonly ConnectionDto[], index: number): number[] {
  const seen = new Set([index])
  const ends = new Set(connections[index]?.endpoints.map(canonRef))
  for (let grew = true; grew; ) {
    grew = false
    connections.forEach((c, k) => {
      if (!seen.has(k) && c.endpoints.some((e) => ends.has(canonRef(e)))) {
        seen.add(k)
        c.endpoints.forEach((e) => ends.add(canonRef(e)))
        grew = true
      }
    })
  }
  return [...seen].sort((a, b) => a - b)
}

/** The connections other than `removed` that still touch `endpoint`. */
export function joinedElsewhere(connections: readonly ConnectionDto[], removed: ReadonlySet<number>, endpoint: string): number[] {
  const ref = canonRef(endpoint)
  return connections.flatMap((c, k) => (!removed.has(k) && c.endpoints.some((e) => canonRef(e) === ref) ? [k] : []))
}
