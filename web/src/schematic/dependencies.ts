// SYNC-10: how an equation-only model hangs together, taken from the solve's
// own block decomposition. A block uses an earlier block when one of its
// equations names a variable that block solved. Equations inside one block are
// solved together, so no order is drawn among them, and nothing here is a
// physical connection.

import type { BlockResult } from '../api'

export interface BlockLink {
  from: number
  to: number
  /** The variables, as the equation writes them, that carry the dependency. */
  via: string[]
}

const NAME = /[A-Za-z_][\w$]*(?:\.[A-Za-z_][\w$]*)*(?:\[[^\]]*\])?/g

// ponytail: names are scanned from the solver's equation text; switch to the
// engine's incidence once the solve reports it per block.
export function blockDependencies(blocks: readonly BlockResult[]): BlockLink[] {
  const solvedIn = new Map<string, number>()
  blocks.forEach((b, k) => b.variables.forEach((v) => solvedIn.set(v.toLowerCase(), k)))
  const links: BlockLink[] = []
  blocks.forEach((b, k) => {
    const via = new Map<number, Set<string>>()
    for (const eq of b.equations) {
      for (const [name] of eq.matchAll(NAME)) {
        const from = solvedIn.get(name.toLowerCase())
        if (from === undefined || from === k) continue
        if (!via.has(from)) via.set(from, new Set())
        via.get(from)!.add(name)
      }
    }
    for (const from of [...via.keys()].sort((a, c) => a - c)) links.push({ from, to: k, via: [...via.get(from)!] })
  })
  return links
}

/** The 1-based source line an equation was written on, ignoring spacing and line comments. */
export function lineOfEquation(text: string, equation: string): number | null {
  const norm = (s: string) => s.replace(/\/\/.*$/, '').replace(/\s+/g, '')
  const want = norm(equation)
  const k = text.split('\n').findIndex((line) => norm(line) === want)
  return k < 0 ? null : k + 1
}
