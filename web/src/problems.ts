// Phase R: one list of what Check and Solve reported, shared by the Problems
// panel and the schematic's issue list. Only what the engine attributes is
// attributed: a whole-system message points nowhere.
import type { CheckResponse, SolveResponse } from './api'
import { diagnosisOwners } from './schematic/wiring'

export interface Problem {
  source: 'Check' | 'Solve' | 'Schematic' | 'Units'
  severity: 'error' | 'warning'
  text: string
  /** 1-based editor line. */
  line?: number
  /** The component instance it names. */
  instance?: string
}

/** What Check reported; `drawn` is the check whose ports the schematic shows. */
export function checkProblems(check: CheckResponse | null | undefined, drawn: CheckResponse | null | undefined = check): Problem[] {
  const out: Problem[] = []
  for (const e of check?.errors ?? []) out.push({ source: 'Check', severity: 'error', text: e.message, line: e.line })
  if (check && !check.solvable && !check.errors?.length && check.message) {
    out.push({ source: 'Check', severity: 'error', text: check.message, line: check.errorLine ?? undefined })
    for (const o of diagnosisOwners(check.diagnosis, check.instances ?? [])) {
      if (o.members.length) out.push({ source: 'Check', severity: 'error', text: `No defining relation for ${o.members.join(', ')}`, instance: o.instance })
    }
  }
  // A signal output left open is not a gap: its block computes it either
  // way, and a binding or an equation may read it (`E = PID.out.sig`).
  for (const p of drawn?.ports ?? []) {
    if (!p.connected && !(p.domain === 'signal' && p.port.toLowerCase() === 'out')) {
      out.push({ source: 'Schematic', severity: 'warning', text: `${p.instance}.${p.port} is not connected`, instance: p.instance })
    }
  }
  for (const w of check?.unitWarnings ?? []) out.push({ source: 'Units', severity: 'warning', text: w })
  return out
}

/** Check's problems, then what the last solve adds to them. */
export function allProblems(check: CheckResponse | null | undefined, solve: SolveResponse | null | undefined): Problem[] {
  const out = checkProblems(check)
  const seen = new Set(out.map((p) => `${p.severity}|${p.text}`))
  const add = (p: Problem) => {
    if (seen.has(`${p.severity}|${p.text}`)) return
    seen.add(`${p.severity}|${p.text}`)
    out.push(p)
  }
  if (solve && !solve.success && solve.error) {
    const block = solve.failedBlockIndex ?? null
    add({ source: 'Solve', severity: 'error', text: block === null ? solve.error : `Block ${block}: ${solve.error}`, line: solve.errorLine ?? undefined })
  }
  for (const w of solve?.unitWarnings ?? []) add({ source: 'Units', severity: 'warning', text: w })
  return out
}

/** The editor line Go to Source opens: the problem's own, else its instance's statement. */
export function problemLine(p: Problem, instances: readonly { name: string; line: number }[] = []): number | undefined {
  if (p.line !== undefined) return p.line
  const name = p.instance?.toLowerCase()
  return name === undefined ? undefined : instances.find((i) => i.name.toLowerCase() === name)?.line
}

export function problemSummary(problems: readonly Problem[]): string {
  const errors = problems.filter((p) => p.severity === 'error').length
  const warnings = problems.length - errors
  if (!problems.length) return 'No problems'
  const part = (n: number, word: string) => (n ? `${n} ${word}${n === 1 ? '' : 's'}` : '')
  return [part(errors, 'error'), part(warnings, 'warning')].filter(Boolean).join(', ')
}

const MAX_LINES = 8

/** The first lines of `text` that write `name` as a whole word, ignoring case. */
export function linesWriting(text: string, name: string): { line: number; text: string }[] {
  const word = new RegExp(String.raw`(^|[^\w$.])${name.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)}(?![\w$[])`, 'i')
  const out: { line: number; text: string }[] = []
  text.split('\n').forEach((l, i) => {
    if (out.length < MAX_LINES && word.test(l)) out.push({ line: i + 1, text: l.trim().slice(0, 80) })
  })
  return out
}
