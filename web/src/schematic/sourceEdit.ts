// Source transactions made from the schematic (CR-SCHEMATIC-01 SYNC-01/03/07).
// Every model edit the canvas makes is a set of range patches against the
// exact text Check reported its ranges for, never a re-serialised document:
// text outside the patched ranges is preserved byte for byte. Positions are
// UTF-16 offsets, the editor's (and the check DTO's `range`) units.

import type { ConnectionDto, InstanceIdentityDto } from '../api'
import { canonRef } from './wiring'

/** Replace `[from, to)` with `insert`. */
export interface SourceChange {
  from: number
  to: number
  insert: string
}

/** A named model edit: what the undo timeline shows and replays. */
export interface SourceEdit {
  label: string
  changes: SourceChange[]
}

const ordered = (changes: readonly SourceChange[]) => [...changes].sort((a, b) => a.from - b.from)

/** `text` with every change applied; changes index the original text and must not overlap. */
export function applyChanges(text: string, changes: readonly SourceChange[]): string {
  let out = ''
  let at = 0
  for (const c of ordered(changes)) {
    if (c.from < at || c.to < c.from || c.to > text.length) {
      throw new Error(`overlapping or out-of-range change at ${c.from}`)
    }
    out += text.slice(at, c.from) + c.insert
    at = c.to
  }
  return out + text.slice(at)
}

/** The changes that turn `applyChanges(text, changes)` back into `text`. */
export function invertChanges(text: string, changes: readonly SourceChange[]): SourceChange[] {
  let shift = 0
  return ordered(changes).map((c) => {
    const from = c.from + shift
    shift += c.insert.length - (c.to - c.from)
    return { from, to: from + c.insert.length, insert: text.slice(c.from, c.to) }
  })
}

/** Delete a statement; its whole line goes when nothing else is on it. */
export function removeStatement(text: string, [from, to]: readonly [number, number]): SourceChange {
  const lineStart = text.lastIndexOf('\n', from - 1) + 1
  const newline = text.indexOf('\n', to)
  const lineEnd = newline < 0 ? text.length : newline
  if (text.slice(lineStart, from).trim() === '' && text.slice(to, lineEnd).trim() === '') {
    return { from: lineStart, to: newline < 0 ? text.length : newline + 1, insert: '' }
  }
  return { from, to, insert: '' }
}

/** Append a statement on its own line at the end of the document. */
export function appendStatement(text: string, statement: string): SourceChange {
  const lead = text.length > 0 && !text.endsWith('\n') ? '\n' : ''
  return { from: text.length, to: text.length, insert: `${lead}${statement}\n` }
}

/** The endpoints of a `connect(...)` statement as written. */
export function writtenEndpoints(statement: string): string[] {
  const open = statement.indexOf('(')
  const close = statement.lastIndexOf(')')
  return open < 0 || close < open ? [] : statement.slice(open + 1, close).split(',').map((s) => s.trim())
}

/**
 * Take one endpoint out of an authored connection. With two endpoints left
 * there is nothing to join, so the statement goes; otherwise only that
 * statement is rewritten, keeping the other endpoints' spelling.
 */
export function disconnectEndpoint(text: string, conn: ConnectionDto, endpoint: string): SourceEdit | null {
  if (!conn.range) return null
  const [from, to] = conn.range
  const ends = writtenEndpoints(text.slice(from, to))
  const kept = ends.filter((e) => canonRef(e) !== canonRef(endpoint))
  if (kept.length === ends.length) return null
  if (kept.length < 2) {
    return { label: `Remove ${text.slice(from, to)}`, changes: [removeStatement(text, [from, to])] }
  }
  return { label: `Disconnect ${endpoint}`, changes: [{ from, to, insert: `connect(${kept.join(', ')})` }] }
}

export const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/

/** Why `next` cannot rename `inst`, or null when it can. */
export function renameProblem(inst: InstanceIdentityDto, next: string, all: readonly InstanceIdentityDto[]): string | null {
  if (!IDENTIFIER.test(next)) return 'A name starts with a letter or _ and has only letters, digits and _.'
  if (!inst.refs || inst.refs.length === 0) return 'Check again first: the source has changed since its references were found.'
  const local = (name: string) => name.split('.').pop()!.toLowerCase()
  const clash = all.find(
    (other) => other !== inst && (other.definedIn ?? null) === (inst.definedIn ?? null) && local(other.name) === next.toLowerCase(),
  )
  return clash ? `${clash.label} already uses that name here.` : null
}

/** Rename an instance at every reference in its own scope. */
export function renameInstance(inst: InstanceIdentityDto, next: string): SourceEdit {
  return {
    label: `Rename ${inst.label} to ${next}`,
    changes: (inst.refs ?? []).map(([from, to]) => ({ from, to, insert: next })),
  }
}

/** The instance whose name the caret is on, or whose declaration holds it; lower-case. */
export function instanceAt(instances: readonly InstanceIdentityDto[] | undefined, at: number): string | null {
  const within = ([from, to]: readonly [number, number]) => from <= at && at <= to
  const hit =
    instances?.find((i) => i.refs?.some(within)) ??
    instances?.find((i) => !i.definedIn && i.range && within(i.range))
  return hit ? hit.name.toLowerCase() : null
}

/**
 * Presentation ids a rename moves, old → new, lower-case: the instance itself
 * and, for one written inside a definition, the same local name under every
 * instance of that definition. Descendants follow by prefix.
 */
export function renamedIds(inst: InstanceIdentityDto, next: string, all: readonly InstanceIdentityDto[]): Map<string, string> {
  const local = inst.name.split('.').pop()!.toLowerCase()
  const out = new Map<string, string>()
  for (const other of all) {
    const parts = other.name.toLowerCase().split('.')
    if ((other.definedIn ?? null) === (inst.definedIn ?? null) && parts.at(-1) === local) {
      out.set(parts.join('.'), [...parts.slice(0, -1), next.toLowerCase()].join('.'))
    }
  }
  return out
}

/** `id` under the renames, matching whole dotted segments. */
export function renameId(id: string, renames: ReadonlyMap<string, string>): string {
  for (const [from, to] of renames) {
    if (id === from) return to
    if (id.startsWith(`${from}.`)) return to + id.slice(from.length)
  }
  return id
}

/** Edit distance, for "did you mean" fixes. */
function distance(a: string, b: string): number {
  let row = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const next = [i]
    for (let j = 1; j <= b.length; j++) {
      next[j] = Math.min(row[j] + 1, next[j - 1] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    row = next
  }
  return row[b.length]
}

/** The option nearest `word`, ignoring case, when it is near enough to be a typo. */
export function closest(word: string, options: readonly string[]): string | null {
  const w = word.toLowerCase()
  let best: string | null = null
  let score = Math.max(2, Math.floor(w.length / 3)) + 1
  for (const o of options) {
    const d = distance(w, o.toLowerCase())
    if (d > 0 && d < score) [best, score] = [o, d]
  }
  return best
}

const DEFINITION_KEYWORDS = new Set(['component', 'function', 'procedure', 'module'])

/** `Type NAME(` declarations as written, with the offsets of both words. */
function declarations(text: string) {
  return [...text.matchAll(/^([ \t]*)([A-Za-z_]\w*)([ \t]+)([A-Za-z_]\w*)[ \t]*\(/gm)]
    .filter((m) => !DEFINITION_KEYWORDS.has(m[2].toLowerCase()))
    .map((m) => {
      const typeFrom = m.index + m[1].length
      return { type: m[2], name: m[4], typeFrom, nameFrom: typeFrom + m[2].length + m[3].length }
    })
}

/**
 * RUN-09: a reversible patch for a diagnostic whose cure is unambiguous — a
 * duplicate instance name, or a component type or port one typo away from a
 * real one. Null when the message is anything else or no single fix exists.
 */
export function suggestFix(message: string, text: string, catalog: readonly { type: string; ports: readonly string[] }[]): SourceEdit | null {
  const decls = declarations(text)
  const declOf = (name: string) => decls.filter((d) => d.name.toLowerCase() === name.toLowerCase())
  const dup = /Component instance '(\w+)' is declared more than once/.exec(message)
  if (dup) {
    const last = declOf(dup[1]).at(-1)
    if (!last) return null
    const taken = new Set(decls.map((d) => d.name.toLowerCase()))
    let k = 2
    while (taken.has(`${last.name}${k}`.toLowerCase())) k++
    const next = `${last.name}${k}`
    return { label: `Rename the second ${last.name} to ${next}`, changes: [{ from: last.nameFrom, to: last.nameFrom + last.name.length, insert: next }] }
  }
  const type = /Unknown component type '(\w+)' for instance '(\w+)'/.exec(message)
  if (type) {
    const decl = declOf(type[2])[0]
    const local = [...text.matchAll(/^[ \t]*COMPONENT[ \t]+([A-Za-z_]\w*)/gim)].map((m) => m[1])
    const best = decl && closest(decl.type, [...catalog.map((c) => c.type), ...local])
    return best ? { label: `Change type ${decl.type} to ${best}`, changes: [{ from: decl.typeFrom, to: decl.typeFrom + decl.type.length, insert: best }] } : null
  }
  const port = /'(\w+)\.(\w+)' is not a port/.exec(message)
  if (port) {
    const decl = declOf(port[1])[0]
    const ports = decl ? (catalog.find((c) => c.type.toLowerCase() === decl.type.toLowerCase())?.ports ?? []) : []
    const best = closest(port[2], ports)
    const use = new RegExp(`^[ \\t]*connect[ \\t]*\\(.*?\\b${port[1]}[ \\t]*\\.[ \\t]*(${port[2]})\\b`, 'im').exec(text)
    if (!best || !use) return null
    const from = use.index + use[0].length - use[1].length
    return { label: `Change port ${decl.name}.${use[1]} to ${best}`, changes: [{ from, to: from + use[1].length, insert: best }] }
  }
  return null
}

/**
 * COMP-04: bind a parameter. A written value is replaced in place; an unbound
 * parameter is added before the instantiation's `)`. Nothing else is touched.
 */
export function setParameter(text: string, inst: InstanceIdentityDto, name: string, value: string): SourceEdit | null {
  const label = `Set ${inst.label}.${name} = ${value}`
  const bound = inst.params?.find((p) => p.name === name.toLowerCase())
  if (bound) return { label, changes: [{ from: bound.range[0], to: bound.range[1], insert: value }] }
  if (!inst.close) return null
  const at = inst.close[0]
  const lead = text.slice(0, at).trimEnd().endsWith('(') ? '' : ', '
  return { label, changes: [{ from: at, to: at, insert: `${lead}${name}=${value}` }] }
}

/**
 * WIRE-09: put a configured block into an authored connection. Its port
 * `toA` joins the rest of the connection and `toB` takes over the `branch`
 * endpoint (for two endpoints, the second). The statement is rewritten in
 * place, the declaration and the new connection appended; null when no
 * connect statement owns the wire or `branch` is not one of its endpoints.
 */
export function insertIntoConnection(
  text: string,
  conn: ConnectionDto,
  block: string,
  map: { toA: string; toB: string; branch?: string },
): SourceEdit | null {
  const decl = lastDeclaration(block)
  if (!conn.range || conn.alias || conn.inDefinition || !decl) return null
  const ends = writtenEndpoints(text.slice(conn.range[0], conn.range[1]))
  const branch = map.branch ?? ends.at(-1)!
  const rest = ends.filter((e) => canonRef(e) !== canonRef(branch))
  if (rest.length === ends.length || rest.length === 0) return null
  const name = decl[2]
  return {
    label: `Insert ${name} into ${ends.join(', ')}`,
    changes: [
      { from: conn.range[0], to: conn.range[1], insert: `connect(${[...rest, `${name}.${map.toA}`].join(', ')})` },
      appendStatement(text, `${block}\nconnect(${name}.${map.toB}, ${branch})`),
    ],
  }
}

/** The last `Type NAME(` declaration in `block`: `[match, Type, NAME]` with its index. */
export function lastDeclaration(block: string): RegExpMatchArray | undefined {
  return [...block.matchAll(/^[ \t]*([A-Za-z_]\w*)[ \t]+([A-Za-z_]\w*)[ \t]*\(/gm)].at(-1)
}

/** `s` with each `[unit]` replaced by `by`, in one pass. */
export function stripUnits(s: string, by = ' '): string {
  let out = ''
  let at = 0
  for (let open = s.indexOf('['); open >= 0; open = s.indexOf('[', at)) {
    const close = s.indexOf(']', open)
    if (close < 0) break
    out += s.slice(at, open) + by
    at = close + 1
  }
  return out + s.slice(at)
}

/** `name` without its trailing digits. */
export function trimDigits(name: string): string {
  let k = name.length
  while (k > 0 && name[k - 1] >= '0' && name[k - 1] <= '9') k--
  return name.slice(0, k)
}
