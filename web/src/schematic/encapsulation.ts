// HIER-02/03: turn selected top-level blocks into a subsystem — a local
// definition plus the one instance that replaces them — as one source edit.
// Everything is cut from the ranges Check reported, so the moved declarations
// keep their text, and nothing is written until the preview is applied.

import type { CheckResponse } from '../api'
import { COMPONENT_CATALOG } from '../componentCatalog'
import { stripComments } from './declaration'
import type { SchematicPresentation } from './presentation'
import { removeStatement, writtenEndpoints, type SourceChange, type SourceEdit } from './sourceEdit'

export interface Extraction {
  edit: SourceEdit
  /** The generated definition, and the declaration that replaces the blocks. */
  definition: string
  declaration: string
  /** Declarations and connections that move inside, as written. */
  moved: string[]
  internal: string[]
  /** Exposed ports: each joins `inside` endpoints to the `outside` ones. */
  ports: { name: string; inside: string[]; outside: string[] }[]
  /** Names the moved parameter values read from the parent, passed in. */
  captures: { name: string; value: string }[]
  /** Statements elsewhere that read a moved block, re-pointed into the subsystem. */
  references: { line: number; before: string; after: string }[]
  /** What must be resolved before anything is written. */
  blocked: string[]
}

const IDENT = /^[A-Za-z_]\w*$/
const head = (endpoint: string) => endpoint.split('.')[0].trim().toLowerCase()
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)

export function extractSubsystem(
  text: string,
  check: CheckResponse | null,
  ids: ReadonlySet<string>,
  typeName: string,
  instanceName: string,
): Extraction {
  const blocked: string[] = []
  const all = check?.instances ?? []
  const picked = all.filter((i) => !i.definedIn && i.range && ids.has(i.name.toLowerCase()))
  if (picked.length === 0) blocked.push('Select the top-level blocks to extract.')
  const type = typeName.trim()
  const name = instanceName.trim()
  if (!IDENT.test(type)) blocked.push(`"${type}" is not a valid component name.`)
  else if ((check?.definitions ?? []).some((d) => d.name === type.toLowerCase()) || COMPONENT_CATALOG.some((c) => c.type.toLowerCase() === type.toLowerCase())) {
    blocked.push(`A component named ${type} already exists; choose another name.`)
  }
  if (!IDENT.test(name)) blocked.push(`"${name}" is not a valid instance name.`)
  else if (all.some((i) => !i.definedIn && i.name.toLowerCase() === name.toLowerCase())) blocked.push(`${name} is already declared; choose another name.`)

  const changes: SourceChange[] = []
  const consumed: [number, number][] = picked.map((i) => i.range!)
  const internal: string[] = []
  const boundary: { range: [number, number]; ends: string[]; inside: string[]; outside: string[] }[] = []
  for (const c of check?.connections ?? []) {
    if (c.inDefinition) continue
    if (!c.range) {
      const mine = c.endpoints.filter((e) => ids.has(head(e)))
      if (mine.length > 0) blocked.push(`${mine.join(', ')} join by the shared stream ${c.alias ?? '?'}; write it as a connect(...) first.`)
      continue
    }
    const ends = writtenEndpoints(text.slice(c.range[0], c.range[1]))
    const inside = ends.filter((e) => ids.has(head(e)))
    if (inside.length === 0) continue
    const outside = ends.filter((e) => !ids.has(head(e)))
    consumed.push(c.range)
    if (outside.length === 0) {
      internal.push(`connect(${inside.join(', ')})`)
      changes.push(removeStatement(text, c.range))
    } else {
      boundary.push({ range: c.range, ends, inside, outside })
    }
  }

  // Exposed port names: the inner port's own name, or `R1_a` when two
  // children would both expose an `a`.
  const local = (e: string) => e.split('.').slice(1).join('_')
  const count = new Map<string, number>()
  for (const b of boundary) count.set(local(b.inside[0]).toLowerCase(), (count.get(local(b.inside[0]).toLowerCase()) ?? 0) + 1)
  const taken = new Set<string>()
  const ports = boundary.map((b) => {
    let port = (count.get(local(b.inside[0]).toLowerCase()) ?? 0) > 1 ? b.inside[0].replace('.', '_').replace(/\./g, '_') : local(b.inside[0])
    for (let k = 2; taken.has(port.toLowerCase()); k++) port = `${port.replace(/\d+$/, '')}${k}`
    taken.add(port.toLowerCase())
    let first = true
    const rewritten = b.ends.flatMap((e) => (!ids.has(head(e)) ? [e] : first ? ((first = false), [`${name}.${port}`]) : []))
    changes.push({ from: b.range[0], to: b.range[1], insert: `connect(${rewritten.join(', ')})` })
    return { name: port, inside: b.inside, outside: b.outside }
  })

  // Captures: a name a moved parameter value reads that the rest of the
  // document defines becomes a parameter of the definition, passed in as
  // written. A name nothing else mentions (a built-in constant) stays as is.
  let rest = text
  for (const i of picked) rest = rest.slice(0, i.range![0]) + ' '.repeat(i.range![1] - i.range![0]) + rest.slice(i.range![1])
  rest = stripComments(rest)
  const captures = new Map<string, string>()
  for (const i of picked) {
    for (const p of i.params ?? []) {
      if (p.name.endsWith('$')) continue
      const value = text.slice(p.range[0], p.range[1]).replace(/\[[^\]]*\]/g, ' ')
      for (const [token] of value.matchAll(/\b[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*\b(?!\s*\()/g)) {
        if (ids.has(head(token)) || !new RegExp(`\\b${escape(token.split('.')[0])}\\b`, 'i').test(rest)) continue
        captures.set(token.replace(/\./g, '_'), token)
      }
    }
  }
  const moved = picked.map((i) => text.slice(i.range![0], i.range![1]))
  const body = moved.map((d) => {
    for (const [param, token] of captures) if (param !== token) d = d.replace(new RegExp(`\\b${escape(token)}\\b`, 'g'), param)
    return d
  })

  // Statements elsewhere that read a moved block now read it inside the subsystem.
  const inside = (at: number) => consumed.some(([a, b]) => a <= at && at < b)
  const refs = picked.flatMap((i) => (i.refs ?? []).filter(([at]) => !inside(at)).map(([at]) => at))
  for (const at of refs) changes.push({ from: at, to: at, insert: `${name}.` })
  const lineOf = (at: number) => text.slice(0, at).split('\n').length
  const references = [...new Set(refs.map(lineOf))].sort((a, b) => a - b).map((line) => {
    const start = text.split('\n').slice(0, line - 1).join('\n').length + (line > 1 ? 1 : 0)
    const before = text.split('\n')[line - 1]
    const after = refs.filter((at) => lineOf(at) === line).sort((a, b) => b - a).reduce((s, at) => s.slice(0, at - start) + `${name}.` + s.slice(at - start), before)
    return { line, before: before.trim(), after: after.trim() }
  })

  const portNames = ports.map((p) => p.name)
  const definition = [
    `function [${portNames.join(', ')}] = ${type}(${[...captures.keys()].join(', ')})`,
    ...portNames.map((p) => `  port(${p})`),
    ...body.map((d) => `  ${d}`),
    ...internal.map((c) => `  ${c}`),
    ...ports.map((p) => `  connect(${p.name}, ${p.inside.join(', ')})`),
    'end',
  ].join('\n')
  const declaration = `${type} ${name}(${[...captures].map(([param, token]) => `${param}=${token}`).join(', ')})`
  // The subsystem takes the place of the first block; the others go.
  picked.forEach((i, k) => changes.push(k === 0 ? { from: i.range![0], to: i.range![1], insert: `${definition}\n${declaration}` } : removeStatement(text, i.range!)))
  const sorted = changes.sort((a, b) => a.from - b.from || a.to - b.to).filter((c, k, list) => k === 0 || c.from >= list[k - 1].to)
  return {
    edit: { label: `Extract ${name}`, changes: sorted },
    definition,
    declaration,
    moved,
    internal,
    ports,
    captures: [...captures].map(([param, value]) => ({ name: param, value })),
    references,
    blocked,
  }
}

/**
 * The extracted blocks' layout, locks and styles move under the subsystem
 * (`r1` → `sub1.r1`), so its inside opens as it was arranged; the subsystem
 * takes their area membership and sits at `at`. Routes to them are dropped.
 */
export function movePresentation(p: SchematicPresentation, ids: ReadonlySet<string>, instance: string, at: { x: number; y: number }): SchematicPresentation {
  const inst = instance.toLowerCase()
  const under = <T,>(o: Record<string, T>) => Object.fromEntries(Object.entries(o).map(([id, v]) => [ids.has(id) ? `${inst}.${id}` : id, v]))
  return {
    ...p,
    positions: { ...under(p.positions), [inst]: at },
    locked: p.locked.map((id) => (ids.has(id) ? `${inst}.${id}` : id)),
    areas: p.areas.map((a) => ({ ...a, members: [...new Set(a.members.map((m) => (ids.has(m) ? inst : m)))] })),
    styles: { ...p.styles, instances: under(p.styles.instances) },
    routes: Object.fromEntries(Object.entries(p.routes).filter(([key]) => !key.split('|').some((end) => ids.has(end.split('.')[0])))),
  }
}

export type InterfaceChange = { rename: [string, string] } | { remove: string } | { add: string }

export interface InterfacePlan {
  edit: SourceEdit
  /** Instances of the definition anywhere in the model. */
  instances: number
  /** The migration plan: every statement that changes, as written. */
  statements: { line: number; before: string; after: string }[]
  /** Statements that still read a removed port: kept, so Check names them. */
  kept: string[]
  blocked: string[]
}

/**
 * HIER-04: change a local definition's ports and carry every connection to
 * them along — inside the definition and at each instance — as one edit.
 */
export function editInterface(text: string, check: CheckResponse | null, type: string, change: InterfaceChange): InterfacePlan {
  const def = (check?.definitions ?? []).find((d) => d.name === type.toLowerCase())
  const users = (check?.instances ?? []).filter((i) => i.type.toLowerCase() === type.toLowerCase())
  const plan = (changes: SourceChange[], blocked: string[], kept: string[] = []): InterfacePlan => {
    const sorted = [...new Map(changes.map((c) => [`${c.from}:${c.to}`, c])).values()].sort((a, b) => a.from - b.from)
    return { edit: { label: `Edit ${type} interface`, changes: blocked.length ? [] : sorted }, instances: users.length, statements: blocked.length ? [] : linePlan(text, sorted), kept, blocked }
  }
  if (!def?.range) return plan([], [`${type} is not defined in this document; built-in components cannot be changed.`])
  const [from, to] = def.range
  const body = text.slice(from, to)
  const ports = def.ports ?? []
  const has = (p: string) => ports.some((q) => q.toLowerCase() === p.toLowerCase())
  const bare = (p: string) => new RegExp(`(?<![.\\w$])${escape(p)}(?![\\w$])`, 'gi')
  const header = /^[^\n]*?\[([^\]]*)\]/.exec(body)
  if (!header) return plan([], [`${type} has no port list to edit.`])
  const listAt = from + header[0].indexOf('[') + 1
  const list = header[1]
  // `INST.port` written after each reference to an instance of the definition.
  const memberUses = (p: string) =>
    users.flatMap((i) =>
      (i.refs ?? []).flatMap(([, end]) => {
        const m = new RegExp(`^\\s*\\.\\s*${escape(p)}(?![\\w$])`, 'i').exec(text.slice(end))
        return m ? [{ from: end, to: end + m[0].length }] : []
      }),
    )

  if ('rename' in change) {
    const [old, next] = change.rename
    if (!has(old)) return plan([], [`${type} has no port ${old}.`])
    if (!IDENT.test(next)) return plan([], [`"${next}" is not a valid port name.`])
    if (has(next) || (def.params ?? []).some((q) => q.toLowerCase() === next.toLowerCase())) return plan([], [`${type} already has a ${next}.`])
    const inside = [...stripComments(body).matchAll(bare(old))].map((m) => ({ from: from + m.index, to: from + m.index + old.length, insert: next }))
    return plan([...inside, ...memberUses(old).map((u) => ({ ...u, insert: `.${next}` }))], [])
  }
  if ('add' in change) {
    const p = change.add
    if (!IDENT.test(p)) return plan([], [`"${p}" is not a valid port name.`])
    if (has(p)) return plan([], [`${type} already has a port ${p}.`])
    const lastPort = [...body.matchAll(/^[ \t]*port\s*\([^)]*\)[^\n]*$/gim)].at(-1)
    const at = lastPort ? from + lastPort.index + lastPort[0].length : listAt + list.length + body.slice(header[0].length).indexOf('\n') + 1
    const indent = lastPort ? /^[ \t]*/.exec(lastPort[0])![0] : '  '
    return plan([{ from: listAt + list.length, to: listAt + list.length, insert: list.trim() ? `, ${p}` : p }, { from: at, to: at, insert: `\n${indent}port(${p})` }], [])
  }

  const p = change.remove
  if (!has(p)) return plan([], [`${type} has no port ${p}.`])
  const changes: SourceChange[] = []
  const kept: string[] = []
  // The port list and the port(...) declaration.
  const names = list.split(',').map((s) => s.trim())
  changes.push({ from: listAt, to: listAt + list.length, insert: names.filter((n) => n.toLowerCase() !== p.toLowerCase()).join(', ') })
  const decl = new RegExp(`^[ \\t]*port\\s*\\(\\s*${escape(p)}\\s*\\)[ \\t]*$`, 'im').exec(body)
  if (decl) changes.push(removeStatement(text, [from + decl.index, from + decl.index + decl[0].length]))
  // Connections lose the endpoint, inside the definition and at each instance.
  const instances = new Set(users.map((i) => i.name.toLowerCase()))
  for (const c of check?.connections ?? []) {
    if (!c.range) continue
    const written = text.slice(c.range[0], c.range[1])
    const ends = writtenEndpoints(written)
    const ownEnd = c.range[0] >= from && c.range[1] <= to
    const keep = ends.filter((e) => (ownEnd ? e.toLowerCase() !== p.toLowerCase() : !(instances.has(e.split('.')[0].trim().toLowerCase()) && e.split('.')[1]?.trim().toLowerCase() === p.toLowerCase())))
    if (keep.length === ends.length) continue
    changes.push(keep.length < 2 ? removeStatement(text, c.range) : { from: c.range[0], to: c.range[1], insert: `connect(${keep.join(', ')})` })
  }
  // Any other read of the port stays and is reported.
  const handled = (at: number) => changes.some((c) => c.from <= at && at < c.to)
  for (const m of stripComments(body).matchAll(bare(p))) if (!handled(from + m.index)) kept.push(`line ${text.slice(0, from + m.index).split('\n').length}: ${lineAt(text, from + m.index).trim()}`)
  for (const u of memberUses(p)) if (!handled(u.from)) kept.push(`line ${text.slice(0, u.from).split('\n').length}: ${lineAt(text, u.from).trim()}`)
  return plan(changes.sort((a, b) => a.from - b.from).filter((c, k, all) => k === 0 || c.from >= all[k - 1].to), [], [...new Set(kept)])
}

const lineAt = (text: string, at: number) => text.slice(text.lastIndexOf('\n', at - 1) + 1, text.indexOf('\n', at) < 0 ? text.length : text.indexOf('\n', at))

/** Each line `changes` touch, before and after ('' when it goes). */
function linePlan(text: string, changes: readonly SourceChange[]): { line: number; before: string; after: string }[] {
  const lines = text.split('\n')
  let offset = 0
  const starts = lines.map((l) => (offset += l.length + 1) - l.length - 1)
  const touched = new Set<number>()
  for (const c of changes) for (let k = 0; k < lines.length; k++) if (starts[k] <= Math.max(c.from, c.to - 1) && c.from < starts[k] + lines[k].length + 1) touched.add(k)
  // Each touched line through the changes that start on it.
  return [...touched].sort((a, b) => a - b).map((k) => {
    const [s, e] = [starts[k], starts[k] + lines[k].length + 1]
    const own = changes.filter((c) => c.from >= s && c.from < e).map((c) => ({ ...c, from: c.from - s, to: Math.min(c.to, e) - s }))
    const result = own.reduceRight((acc, c) => acc.slice(0, c.from) + c.insert + acc.slice(c.to), `${lines[k]}\n`)
    return { line: k + 1, before: lines[k].trim(), after: result.replace(/\n$/, '').trim() }
  })
}

/** HIER-05: a document definition and the local definitions it builds on, in document order. */
export function definitionClosure(text: string, check: CheckResponse | null, type: string): { name: string; text: string }[] {
  const need = new Set([type.toLowerCase()])
  for (let grew = true; grew; ) {
    grew = false
    for (const i of check?.instances ?? []) {
      const t = i.type.toLowerCase()
      if (i.definedIn && need.has(i.definedIn.toLowerCase()) && i.localType && !need.has(t)) grew = need.add(t).size > 0
    }
  }
  return (check?.definitions ?? []).filter((d) => need.has(d.name) && d.range).map((d) => ({ name: d.name, text: text.slice(d.range![0], d.range![1]) }))
}

/** A component file: a commented header a reader can scan, then the definitions as written. */
export function componentFile(text: string, check: CheckResponse | null, type: string, description: string): string {
  const defs = definitionClosure(text, check, type)
  // Names as written in each definition's header, not Check's lower case.
  const header = (t: string) => /\[([^\]]*)\]\s*=\s*(\w+)\s*\(([^)]*)\)/.exec(t)
  const own = header(defs.find((d) => d.name === type.toLowerCase())?.text ?? '')
  const list = (s: string | undefined) => (s ?? '').split(',').map((p) => p.replace(/\[[^\]]*\]/g, '').trim()).filter(Boolean).join(', ') || 'none'
  const builtIn = [...new Set((check?.instances ?? []).filter((i) => i.definedIn && !i.localType && defs.some((d) => d.name === i.definedIn!.toLowerCase())).map((i) => i.type.toLowerCase()))]
  const uses = [
    ...defs.filter((d) => d.name !== type.toLowerCase()).map((d) => header(d.text)?.[2] ?? d.name),
    ...builtIn.map((t) => `${COMPONENT_CATALOG.find((c) => c.type.toLowerCase() === t)?.type ?? t} (built-in)`),
  ]
  return [
    `// Component: ${own?.[2] ?? type}`,
    ...(description.trim() ? [`// Description: ${description.trim()}`] : []),
    `// Ports: ${list(own?.[1])}`,
    `// Parameters: ${list(own?.[3])}`,
    `// Uses: ${uses.join(', ') || 'nothing else'}`,
    ...defs.map((d) => d.text),
    '',
  ].join('\n')
}

export interface ImportPlan {
  edit: SourceEdit
  added: string[]
  /** Already here and identical, or here and different (kept unless replaced). */
  same: string[]
  differs: string[]
  replaced: string[]
}

/** Definitions from a component file into `text`: new ones appended, existing ones kept unless named in `replace`. */
export function importComponents(text: string, check: CheckResponse | null, incoming: readonly { name: string; text: string }[], replace: ReadonlySet<string>): ImportPlan {
  const plan: ImportPlan = { edit: { label: `Import ${incoming.map((d) => d.name).join(', ')}`, changes: [] }, added: [], same: [], differs: [], replaced: [] }
  const block: string[] = []
  for (const d of incoming) {
    const mine = (check?.definitions ?? []).find((m) => m.name === d.name.toLowerCase())
    if (!mine?.range) {
      plan.added.push(d.name)
      block.push(d.text)
    } else if (text.slice(mine.range[0], mine.range[1]).trim() === d.text.trim()) plan.same.push(d.name)
    else if (replace.has(d.name)) {
      plan.replaced.push(d.name)
      plan.edit.changes.push({ from: mine.range[0], to: mine.range[1], insert: d.text })
    } else plan.differs.push(d.name)
  }
  if (block.length) plan.edit.changes.push({ from: text.length, to: text.length, insert: `${text.endsWith('\n') || !text ? '' : '\n'}${block.join('\n')}\n` })
  plan.edit.changes.sort((a, b) => a.from - b.from)
  return plan
}
