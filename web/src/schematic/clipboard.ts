// COMP-05/06: copy, paste, duplicate and delete as source edits. Everything is
// cut from the text Check reported ranges for, so a pasted declaration keeps
// its spelling and comments outside it are never touched.

import type { CheckResponse } from '../api'
import { stripComments } from './declaration'
import type { SchematicPresentation } from './presentation'
import { removeStatement, stripUnits, trimDigits, writtenEndpoints, type SourceChange, type SourceEdit } from './sourceEdit'

type Pos = Record<string, { x: number; y: number }>

/** A copied piece of a network, independent of the document it came from. */
export interface Fragment {
  /** Local definitions the copied blocks need, as written. */
  definitions: { name: string; text: string }[]
  /** Declarations as written; `id` is lower-case, `name` as written. */
  instances: { id: string; name: string; text: string }[]
  /** Connections among the copied blocks, as written endpoints. */
  connects: string[][]
  /** Connections to blocks left behind: reported, never recreated. */
  external: string[]
  /** Names parameter values read from the document (`UA=UA_chl`). */
  uses: string[]
  positions: Pos
}

const head = (endpoint: string) => endpoint.split('.')[0].trim().toLowerCase()

/** The selected top-level blocks, their internal wiring and what they depend on. */
export function copyFragment(text: string, check: CheckResponse | null, ids: ReadonlySet<string>, positions: Pos): Fragment {
  const all = check?.instances ?? []
  const picked = all.filter((i) => !i.definedIn && i.range && ids.has(i.name.toLowerCase()))
  const connects: string[][] = []
  const external: string[] = []
  for (const c of check?.connections ?? []) {
    if (c.inDefinition) continue
    if (!c.range) {
      // ponytail: a shared stream name is copied with the declaration and
      // would join the copy to the original; reported, not rewritten.
      const mine = c.endpoints.filter((e) => ids.has(head(e)))
      if (mine.length > 0) external.push(`${mine.join(', ')} share stream ${c.alias ?? '?'} (rename it in the copy)`)
      continue
    }
    const ends = writtenEndpoints(text.slice(c.range[0], c.range[1]))
    const inside = ends.filter((e) => ids.has(head(e)))
    const outside = ends.filter((e) => !ids.has(head(e)))
    if (inside.length >= 2) connects.push(inside)
    if (inside.length > 0 && outside.length > 0) external.push(`${inside.join(', ')} — ${outside.join(', ')}`)
  }
  // Local types the blocks use, and the local types those definitions use.
  const need = new Set(picked.filter((i) => i.localType).map((i) => i.type.toLowerCase()))
  for (let grew = true; grew; ) {
    grew = false
    for (const i of all) {
      const t = i.type.toLowerCase()
      if (i.definedIn && need.has(i.definedIn.toLowerCase()) && i.localType && !need.has(t)) {
        need.add(t)
        grew = true
      }
    }
  }
  const definitions = (check?.definitions ?? [])
    .filter((d) => need.has(d.name.toLowerCase()) && d.range)
    .map((d) => ({ name: d.name.toLowerCase(), text: text.slice(d.range![0], d.range![1]) }))
  const uses = new Set<string>()
  for (const i of picked) {
    for (const p of i.params ?? []) {
      if (p.name.endsWith('$')) continue
      const value = stripUnits(text.slice(p.range[0], p.range[1]))
      for (const m of value.matchAll(/\b([A-Za-z_]\w*)\b(?!\s*\()/g)) uses.add(m[1])
    }
  }
  return {
    definitions,
    instances: picked.map((i) => {
      const decl = text.slice(i.range![0], i.range![1])
      return { id: i.name.toLowerCase(), name: /^\s*\w+\s+(\w+)/.exec(decl)?.[1] ?? i.label, text: decl }
    }),
    connects,
    external,
    uses: [...uses],
    positions: Object.fromEntries(picked.flatMap((i) => (positions[i.name.toLowerCase()] ? [[i.name.toLowerCase(), positions[i.name.toLowerCase()]]] : []))),
  }
}

export interface PasteResult {
  /** Definitions, declarations and connections, one statement a line. */
  block: string
  renames: [string, string][]
  added: string[]
  /** Definitions the target already has; its own is used. */
  reused: { name: string; differs: boolean }[]
  external: string[]
  /** Names the pasted parameters read that the target does not define. */
  missing: string[]
  /** The pasted blocks' ids, lower-case. */
  ids: string[]
  positions: Pos
}

/** `fragment` as statements for `text`, renamed clear of `taken` names. */
export function pasteFragment(
  text: string,
  fragment: Fragment,
  taken: Iterable<string>,
  targetDefinitions: readonly { name: string; text: string }[],
  offset: { dx: number; dy: number },
): PasteResult {
  const used = new Set([...taken].map((n) => n.toLowerCase()))
  const renames = new Map<string, string>()
  for (const inst of fragment.instances) {
    let name = inst.name
    if (used.has(name.toLowerCase())) {
      const base = trimDigits(name) || name
      let k = 2
      while (used.has(`${base}${k}`.toLowerCase())) k++
      name = `${base}${k}`
    }
    used.add(name.toLowerCase())
    renames.set(inst.id, name)
  }
  const rename = (endpoint: string) => {
    const [first, ...rest] = endpoint.split('.')
    const next = renames.get(first.trim().toLowerCase())
    return next ? [next, ...rest].join('.') : endpoint
  }
  const added: string[] = []
  const reused: PasteResult['reused'] = []
  for (const d of fragment.definitions) {
    const mine = targetDefinitions.find((t) => t.name.toLowerCase() === d.name)
    if (mine) reused.push({ name: d.name, differs: mine.text.trim() !== d.text.trim() })
    else added.push(d.text)
  }
  const code = stripComments(text)
  const defines = (name: string) => new RegExp(`^\\s*${name}\\s*=`, 'im').test(code)
  return {
    block: [
      ...added,
      ...fragment.instances.map((i) => i.text.replace(/^(\s*\w+\s+)\w+/, `$1${renames.get(i.id)}`)),
      ...fragment.connects.map((ends) => `connect(${ends.map(rename).join(', ')})`),
    ].join('\n'),
    renames: fragment.instances.filter((i) => renames.get(i.id) !== i.name).map((i) => [i.name, renames.get(i.id)!]),
    added: fragment.definitions.filter((d) => !reused.some((r) => r.name === d.name)).map((d) => d.name),
    reused,
    external: fragment.external,
    missing: fragment.uses.filter((u) => !defines(u)),
    ids: fragment.instances.map((i) => renames.get(i.id)!.toLowerCase()),
    positions: Object.fromEntries(
      Object.entries(fragment.positions).map(([id, p]) => [renames.get(id)!.toLowerCase(), { x: p.x + offset.dx, y: p.y + offset.dy }]),
    ),
  }
}

export interface DeleteImpact {
  edit: SourceEdit
  /** Connections that go, and connections that lose an endpoint. */
  removed: string[]
  rewritten: string[]
  /** Equations that read a deleted block: kept, so Check reports them. */
  equations: { line: number; text: string }[]
}

/** Remove blocks and the connections they own, as one edit; report the rest. */
export function deleteImpact(text: string, check: CheckResponse | null, ids: ReadonlySet<string>): DeleteImpact {
  const changes: SourceChange[] = []
  const removed: string[] = []
  const rewritten: string[] = []
  const names: string[] = []
  for (const i of check?.instances ?? []) {
    if (!i.definedIn && i.range && ids.has(i.name.toLowerCase())) {
      changes.push(removeStatement(text, i.range))
      names.push(i.label)
    }
  }
  for (const c of check?.connections ?? []) {
    if (c.inDefinition || !c.range) continue
    const written = text.slice(c.range[0], c.range[1])
    const ends = writtenEndpoints(written)
    const kept = ends.filter((e) => !ids.has(head(e)))
    if (kept.length === ends.length) continue
    if (kept.length < 2) {
      changes.push(removeStatement(text, c.range))
      removed.push(written)
    } else {
      changes.push({ from: c.range[0], to: c.range[1], insert: `connect(${kept.join(', ')})` })
      rewritten.push(`${written} → connect(${kept.join(', ')})`)
    }
  }
  // Statements on one line would overlap; the earlier whole-line removal wins.
  const sorted = changes.sort((a, b) => a.from - b.from).filter((c, k, list) => k === 0 || c.from >= list[k - 1].to)
  const inDefinition = (at: number) => (check?.definitions ?? []).some((d) => d.range && d.range[0] <= at && at < d.range[1])
  const code = stripComments(text).split('\n')
  const raw = text.split('\n')
  const uses = new RegExp(`\\b(${[...ids].map((id) => id.replace(/[^\w]/g, '')).join('|')})\\s*\\.`, 'i')
  const equations: DeleteImpact['equations'] = []
  let at = 0
  code.forEach((line, k) => {
    if (ids.size && uses.test(line) && !/^\s*connect\s*\(/i.test(line) && !/^\s*\w+\s+\w+\s*\(/.test(line) && !inDefinition(at)) {
      equations.push({ line: k + 1, text: raw[k].trim() })
    }
    at += raw[k].length + 1
  })
  return { edit: { label: `Delete ${names.join(', ')}`, changes: sorted }, removed, rewritten, equations }
}

const CLIPBOARD_KEY = 'frees.schematic.clipboard'
let held: Fragment | null = null

/** Hold `f` for a paste here or in another document; false when it could not be kept. */
export function storeFragment(f: Fragment): boolean {
  try {
    localStorage.setItem(CLIPBOARD_KEY, JSON.stringify(f))
  } catch {
    return false
  }
  held = f
  return true
}

export function loadFragment(): Fragment | null {
  try {
    const raw = localStorage.getItem(CLIPBOARD_KEY)
    return raw ? (JSON.parse(raw) as Fragment) : held
  } catch {
    return held
  }
}

/** The presentation without anything kept for `ids`. */
export function withoutBlocks(p: SchematicPresentation, ids: ReadonlySet<string>): SchematicPresentation {
  const keep = <T,>(o: Record<string, T>) => Object.fromEntries(Object.entries(o).filter(([id]) => !ids.has(id)))
  return {
    ...p,
    positions: keep(p.positions),
    locked: p.locked.filter((id) => !ids.has(id)),
    areas: p.areas.map((a) => ({ ...a, members: a.members.filter((m) => !ids.has(m)) })).filter((a) => a.members.length > 0),
    styles: { ...p.styles, instances: keep(p.styles.instances) },
  }
}
