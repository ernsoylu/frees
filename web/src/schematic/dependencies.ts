// SYNC-10: how an equation-only model hangs together, taken from the solve's
// own block decomposition. A block uses an earlier block when its equations
// read a variable that block solved; the engine reports those reads per block.
// Equations inside one block are solved together, so no order is drawn among
// them, and nothing here is a physical connection.

import type { BlockResult } from '../api'

export interface BlockLink {
  from: number
  to: number
  /** The variables that carry the dependency, in the solve's display spelling. */
  via: string[]
}

export function blockDependencies(blocks: readonly BlockResult[]): BlockLink[] {
  const solvedIn = new Map<string, number>()
  blocks.forEach((b, k) => b.variables.forEach((v) => solvedIn.set(v.toLowerCase(), k)))
  return blocks.flatMap((b, k) => {
    const via = new Map<number, string[]>()
    for (const name of b.reads ?? []) {
      const from = solvedIn.get(name.toLowerCase())
      if (from !== undefined) via.set(from, [...(via.get(from) ?? []), name])
    }
    return [...via.keys()].sort((a, c) => a - c).map((from) => ({ from, to: k, via: via.get(from)! }))
  })
}

/** The 1-based source line an equation was written on, ignoring spacing and line comments. */
export function lineOfEquation(text: string, equation: string): number | null {
  const norm = (s: string) => s.replace(/\/\/.*$/, '').replace(/\s+/g, '')
  const want = norm(equation)
  const k = text.split('\n').findIndex((line) => norm(line) === want)
  return k < 0 ? null : k + 1
}
