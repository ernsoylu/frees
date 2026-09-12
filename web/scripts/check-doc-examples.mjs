// Runnable-documentation gate: every teaching example must execute, and every
// number a page states must be asserted against what the engine returns.
//
// This replaces check-doc-snippets.mjs, which posted to http://localhost:8080.
// That backend was removed when the engine moved into WebAssembly; the script
// was in no npm script and no workflow, so every ```run fence in the guides had
// been ungraded for as long as the port has existed. It ran against a server
// that cannot be started from this repository.
//
// The engine here is the SAME compiled module the browser loads —
// web/src/wasm/pkg — not a native build. A guide example that solves natively
// but traps in the browser is a broken guide example.
//
// What it grades:
//
//   1. ```run fences in src/docs/*.md — the blocks Help renders with a Run
//      button. Each must Check (structurally solvable) and Solve (converge).
//      A fence carrying `vary=` is a PARAMETRIC document, deliberately
//      underspecified by its swept column and run from the Tables tab; those
//      are checked for structure and not solved standalone.
//
//   2. `{ CHECK name expected tolerance }` markers, in any ```frees or ```run
//      fence anywhere under src/docs. The marker is an ordinary comment to the
//      solver and a numerical assertion here, so a page cannot state a result
//      the engine does not produce. This is the convention the audit's worked
//      examples use.
//
//   3. ```json analysis blocks of the shape
//      {operation, text, request, checks:[{path, value, tolerance}]} where
//      operation is monte_carlo | parameter_fit | sensitivity — the paths that
//      have no equation-document form.
//
// Run: node scripts/check-doc-examples.mjs     (needs web/src/wasm/pkg built)

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const DOCS = path.join(HERE, '../src/docs')
const PKG = path.join(HERE, '../src/wasm/pkg')
const WASM = path.join(PKG, 'frees_bg.wasm')

if (!fs.existsSync(WASM)) {
  console.error(
    `✗ compiled engine not found at ${path.relative(process.cwd(), WASM)}.\n` +
      `  Build it first:\n` +
      `    wasm-pack build crates/frees --release --target web --out-dir ../../web/src/wasm/pkg`,
  )
  process.exit(1)
}

const engine = await import(path.join(PKG, 'frees.js'))
engine.initSync({ module: fs.readFileSync(WASM) })

// ── Collect ──────────────────────────────────────────────────────────────────

/** Every .md under src/docs, recursively — guides and reference pages alike. */
function markdownFiles(dir) {
  const out = []
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...markdownFiles(p))
    else if (e.name.endsWith('.md') && !e.name.startsWith('_')) out.push(p)
  }
  return out
}

const ANALYSIS = new Set(['monte_carlo', 'parameter_fit', 'sensitivity', 'solve_table', 'repl_evaluate'])

const CHECK_MARKER = /\{\s*CHECK\s+(\S+)\s+(\S+)\s+(\S+)\s*\}/g

/**
 * Fenced blocks, with the line they start on and the `[Topic: id]` heading in
 * force. Guides use ```run for Help's Run button; reference pages and worked
 * examples use ```frees.
 */
function fences(file) {
  const lines = fs.readFileSync(file, 'utf-8').split('\n')
  const out = []
  let topic = ''
  let open = null
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim()
    const topicMatch = t.match(/^\[Topic:\s*([a-zA-Z0-9_-]+)\]/)
    if (topicMatch) topic = topicMatch[1]
    if (!open) {
      const m = t.match(/^```(run|frees|json)\b(.*)$/)
      if (m) open = { lang: m[1], opts: m[2].trim(), line: i + 1, buf: [] }
      continue
    }
    if (t.startsWith('```')) {
      out.push({ ...open, topic, code: open.buf.join('\n') })
      open = null
      continue
    }
    open.buf.push(lines[i])
  }
  if (open) throw new Error(`${file}: unterminated \`\`\`${open.lang} fence at line ${open.line}`)
  return out
}

const cases = []
for (const file of markdownFiles(DOCS)) {
  const before = cases.length
  const rel = path.relative(path.join(HERE, '..'), file)
  for (const f of fences(file)) {
    const checks = [...f.code.matchAll(CHECK_MARKER)].map((m) => ({
      name: m[1],
      expected: Number(m[2]),
      tolerance: Number(m[3]),
    }))
    const label = `${rel}${f.topic ? `[${f.topic}]` : ''}:${f.line}`
    if (f.lang === 'json') {
      // Only analysis-request blocks; a page may fence ordinary JSON for other
      // reasons, so the operation key is what opts a block in.
      let parsed
      try {
        parsed = JSON.parse(f.code)
      } catch {
        continue
      }
      if (parsed && ANALYSIS.has(parsed.operation)) cases.push({ kind: 'analysis', label, ...parsed })
      continue
    }
    // A ```frees fence with no assertions is an illustrative excerpt, not a
    // complete document — grading it would fail on deliberate fragments.
    const expectedError = f.opts.startsWith('error=') ? JSON.parse(f.opts.slice(6)) : null
    const request = f.opts.startsWith('request=') ? JSON.parse(f.opts.slice(8)) : {}
    if (f.lang === 'frees' && !checks.length && !expectedError) continue
    cases.push({
      kind: 'document',
      label,
      code: f.code,
      checks,
      expectedError,
      request,
      // `vary=` marks the swept column of a parametric study: the document is
      // underspecified on purpose and is solved from the Tables tab.
      parametric: /\bvary=/.test(f.opts),
    })
  }
  if (file.startsWith(path.join(DOCS, 'reference') + path.sep) && /^name:/m.test(fs.readFileSync(file, 'utf8')) && cases.length === before) {
    throw new Error(`${rel}: every reference page must include an executable, asserted example`)
  }
}

// ── Run ──────────────────────────────────────────────────────────────────────

const failures = []
let assertions = 0

function near(actual, expected, tolerance, what) {
  if (!Number.isFinite(actual) || Math.abs(actual - expected) > tolerance) {
    throw new Error(`${what}: got ${actual}, expected ${expected} ± ${tolerance}`)
  }
  assertions++
}

function runDocument(c) {
  const payload = JSON.stringify(c.request)
  if (c.expectedError) {
    const result = JSON.parse(engine.solve(c.code, payload))
    if (result.success || !result.error?.includes(c.expectedError)) throw new Error(`Expected diagnostic: ${c.expectedError}; got ${result.error}`)
    assertions++
    return 'expected runtime diagnostic'
  }
  const chk = JSON.parse(engine.check(c.code, payload))
  if (chk.errors?.length) throw new Error(`check: ${chk.errors.join('; ')}`)
  if (c.parametric) {
    // Structure only. `solvable` is false by design here — the swept column is
    // the missing equation — so the assertion is that it PARSED, not that it
    // closed.
    if (chk.errorLine !== null) throw new Error(`check: parse error at line ${chk.errorLine}`)
    return `parametric, ${chk.equations} eq (structure only)`
  }
  if (!chk.solvable) throw new Error(`check: not solvable — ${chk.message}`)

  const sol = JSON.parse(engine.solve(c.code, payload))
  if (!sol.success) throw new Error(`solve: ${sol.error || 'did not succeed'}`)

  // Solver variables are case-insensitive by name; display casing is preserved,
  // so a CHECK marker must match either spelling.
  const values = new Map(sol.variables.map((v) => [v.name.toLowerCase(), v.value]))
  for (const a of c.checks) {
    const actual = values.get(a.name.toLowerCase())
    if (actual === undefined) throw new Error(`CHECK ${a.name}: no such variable in the solution`)
    near(actual, a.expected, a.tolerance, `CHECK ${a.name}`)
  }
  const suffix = c.checks.length ? `, ${c.checks.length} assertion(s)` : ''
  return `${chk.equations} eq, max residual ${sol.stats?.maxResidual ?? '?'}${suffix}`
}

function runAnalysis(c) {
  if (c.operation === 'repl_evaluate') {
    const setup = JSON.parse(engine.solve(c.text, '{}'))
    if (!setup.success) throw new Error(setup.error)
    const result = JSON.parse(engine.repl_evaluate(JSON.stringify({ expression: c.expression })))
    if (!result.success || result.text !== c.expectedText) throw new Error(`REPL: ${result.error || result.text}; expected ${c.expectedText}`)
    assertions++
    return 'REPL, exact output verified'
  }
  const payload = JSON.stringify(c.request)
  const raw = c.operation === 'parameter_fit'
    ? engine.parameter_fit(payload)
    : engine[c.operation](c.text, payload)
  const result = JSON.parse(raw)
  if (result.error) throw new Error(`${c.operation}: ${result.error}`)
  if (result.success === false) throw new Error(`${c.operation}: did not succeed`)
  if (c.operation === 'solve_table' && (!result.stats?.converged || !result.results?.every(row => row.success))) throw new Error('Table did not converge')
  // A truncated or incomplete design still returns numbers; asserting on them
  // would grade a partial run as a passing one.
  if (result.truncated === true) throw new Error(`${c.operation}: result truncated`)
  if (result.diagnostics?.complete === false) throw new Error(`${c.operation}: incomplete`)
  if (result.diagnostics?.designComplete === false) throw new Error(`${c.operation}: incomplete design`)

  for (const { path: p, value, tolerance } of c.checks || []) {
    const actual = p.split('.').reduce((o, k) => o?.[k], result)
    near(actual, value, tolerance, `${c.operation}.${p}`)
  }
  return `${c.operation}, ${(c.checks || []).length} assertion(s)`
}

if (!cases.length) {
  console.log('doc-examples: no runnable blocks found — nothing to verify.')
  process.exit(0)
}

for (const c of cases) {
  try {
    const note = c.kind === 'analysis' ? runAnalysis(c) : runDocument(c)
    console.log(`  ✓ ${c.label} (${note})`)
  } catch (e) {
    failures.push(c.label)
    console.error(`  ✗ ${c.label}\n      ${String(e.message || e).replace(/\n/g, '\n      ')}`)
  }
}

console.log(
  `\ndoc-examples: ${cases.length - failures.length}/${cases.length} blocks executed through the ` +
    `compiled module; ${assertions} assertion(s) passed.`,
)
if (failures.length) process.exit(1)
