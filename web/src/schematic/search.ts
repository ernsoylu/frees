// VIEW-07: one search over everything the canvas can point at — blocks, types,
// ports, nets, parameter bindings, source statements and Check's issues. Each
// hit names its scope and what to select there, so picking it opens the right
// subsystem without the caller knowing how the hit was found.

import type { CheckResponse } from '../api'
import { endpointBlock, endpointScope, scopeOf } from './layout'

export type HitKind = 'block' | 'type' | 'port' | 'net' | 'parameter' | 'statement' | 'issue'

export interface SearchHit {
  kind: HitKind
  label: string
  detail: string
  /** The scope to open; null leaves the canvas where it is. */
  scope: string | null
  /** Block ids in that scope to select and centre. */
  select: string[]
  /** 1-based source line to reveal, for statements and issues. */
  line: number | null
}

export interface SearchIssue {
  text: string
  line?: number
  instance?: string
}

const PER_KIND = 20

/** `spell` gives a type its written spelling; Check lower-cases nested ones. */
export function searchModel(
  check: CheckResponse | null | undefined,
  text: string,
  issues: readonly SearchIssue[],
  query: string,
  spell: (type: string) => string = (t) => t,
): SearchHit[] {
  const q = query.trim().toLowerCase()
  if (!q || !check) return []
  const instances = check.instances ?? []
  const label = new Map(instances.map((i) => [i.name.toLowerCase(), i.label]))
  const where = (scope: string) => (scope ? `in ${scope.split('.').map((_, k, p) => label.get(p.slice(0, k + 1).join('.')) ?? p[k]).join(' › ')}` : 'in Model')
  const lineOf = (offset: number) => text.slice(0, offset).split('\n').length
  const hits: SearchHit[] = []
  const add = (kind: HitKind, list: (SearchHit & { key: string })[]) => {
    // Matches that start with the query first, then the rest in model order.
    const starts = (h: { key: string }) => (h.key.startsWith(q) ? 0 : 1)
    hits.push(...list.filter((h) => h.key.includes(q)).sort((a, b) => starts(a) - starts(b)).slice(0, PER_KIND).map(({ key: _, ...h }) => ({ ...h, kind })))
  }

  add('block', instances.map((i) => {
    const id = i.name.toLowerCase()
    return { kind: 'block', key: `${i.label} ${i.name}`.toLowerCase(), label: i.label, detail: `${spell(i.type)} ${where(scopeOf(id))}`, scope: scopeOf(id), select: [id], line: i.line }
  }))

  const byType = new Map<string, { type: string; scope: string; ids: string[] }>()
  for (const i of instances) {
    const id = i.name.toLowerCase()
    const k = `${i.type.toLowerCase()}|${scopeOf(id)}`
    const t = byType.get(k) ?? { type: spell(i.type), scope: scopeOf(id), ids: [] }
    t.ids.push(id)
    byType.set(k, t)
  }
  add('type', [...byType.values()].map((t) => ({ kind: 'type', key: t.type.toLowerCase(), label: t.type, detail: `${t.ids.length} ${where(t.scope)}`, scope: t.scope, select: t.ids, line: null })))

  add('port', (check.ports ?? []).map((p) => {
    const id = p.instance.toLowerCase()
    const name = `${label.get(id) ?? p.instance}.${p.port}`
    return { kind: 'port', key: name.toLowerCase(), label: name, detail: `${p.domain}${p.connected ? '' : ', not connected'} ${where(scopeOf(id))}`, scope: scopeOf(id), select: [id], line: null }
  }))

  add('net', (check.connections ?? []).map((c) => {
    const name = c.alias ?? c.endpoints.join(' — ')
    const scope = endpointScope(c.endpoints[0] ?? '')
    return { kind: 'net', key: `${c.alias ?? ''} ${c.endpoints.join(' ')}`.toLowerCase(), label: name, detail: `${c.fluid ?? c.domain} ${where(scope)}`, scope, select: [...new Set(c.endpoints.map(endpointBlock))], line: c.range ? lineOf(c.range[0]) : null }
  }))

  add('parameter', instances.flatMap((i) => {
    const id = i.name.toLowerCase()
    return (i.params ?? []).map((p) => {
      const binding = `${i.label}.${p.name} = ${text.slice(p.range[0], p.range[1])}`
      return { kind: 'parameter' as const, key: binding.toLowerCase(), label: binding, detail: `${spell(i.type)} ${where(scopeOf(id))}`, scope: scopeOf(id), select: [id], line: lineOf(p.range[0]) }
    })
  }))

  // A statement selects the blocks it names, through each instance's own refs.
  let start = 0
  add('statement', text.split('\n').map((raw, k) => {
    const from = start
    start += raw.length + 1
    const named = instances.filter((i) => i.refs?.some(([a]) => a >= from && a < from + raw.length)).map((i) => i.name.toLowerCase())
    const scope = named.length ? scopeOf(named[0]) : null
    const line = raw.trim()
    return { kind: 'statement', key: line ? line.toLowerCase() : '', label: line.length > 80 ? `${line.slice(0, 79)}…` : line, detail: `line ${k + 1}`, scope, select: named.filter((id) => scopeOf(id) === scope), line: k + 1 }
  }))

  add('issue', issues.map((i) => {
    const id = i.instance?.toLowerCase()
    return { kind: 'issue', key: i.text.toLowerCase(), label: i.text, detail: id ? where(scopeOf(id)) : i.line ? `line ${i.line}` : 'whole model', scope: id ? scopeOf(id) : null, select: id ? [id] : [], line: i.line ?? null }
  }))
  return hits
}
