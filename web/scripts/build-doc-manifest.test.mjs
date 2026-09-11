// Both generator branches must reconcile against the Rust registries and write.
//
// This exists because they did not. The reference-present branch built its
// manifest, wrote it inline without ever calling `mergeRustRegistries()`, and
// then read `mergeReport` from a scope it was never declared in — so a checkout
// WITH the reference repo exited 1 on `ReferenceError: mergeReport is not
// defined`, after the unreconciled file was already on disk. Nothing caught it
// because nothing in CI ran the generator at all, and no developer machine has
// the reference repo.
//
// The invariant under test is the one the coverage gate depends on: **every
// name in `eval::INTRINSICS` reaches the manifest**, by either branch. That is
// what stops 73 live intrinsics from going undocumented while the gate reports
// full coverage.

import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const WEB = path.resolve(HERE, '..')
const REPO = path.resolve(WEB, '..')

/** The names `rustIntrinsics()` in the generator reads, read the same way. */
function intrinsicNames() {
  const src = fs.readFileSync(path.join(REPO, 'crates/frees-core/src/eval.rs'), 'utf-8')
  return [...src.matchAll(/(?:strict|lazy)!\(\s*"([^"]+)"/g)].map((m) => m[1].toLowerCase())
}

/**
 * Run the generator in a throwaway copy of the tree.
 *
 * `reference: true` plants the directory layout `findReferenceRepo()` probes
 * for, with EMPTY Java files. That is deliberate, and stronger than plausible
 * fakes: an empty registry parses to zero functions, so every function left in
 * the manifest must have arrived through the Rust merge. If the merge is
 * skipped — the original defect — the assertion below has nothing to find.
 */
function generate({ reference }) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'doc-manifest-'))
  try {
    const root = path.join(tmp, 'port')
    for (const rel of [
      'web/scripts',
      'web/src/docs/reference',
      'crates/frees-core/src/components/library-data',
    ]) {
      fs.cpSync(path.join(REPO, rel), path.join(root, rel), { recursive: true })
    }
    for (const rel of [
      'web/src/helpReference.ts',
      'crates/frees-core/src/eval.rs',
      'crates/frees-core/src/procedures.rs',
    ]) {
      fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true })
      fs.copyFileSync(path.join(REPO, rel), path.join(root, rel))
    }

    const home = path.join(tmp, 'reference')
    if (reference) {
      const files = [
        ['core', 'parser/FunctionRegistry.java'],
        ['core', 'ast/Evaluator.java'],
        ['core', 'props/PropertyFunctions.java'],
        ['core', 'props/SolidProperties.java'],
        ['web', 'api/ReplEvaluator.java'],
      ]
      for (const [layer, file] of files) {
        const p = path.join(home, `backend/${layer}/src/main/java/com/frees/backend`, file)
        fs.mkdirSync(path.dirname(p), { recursive: true })
        fs.writeFileSync(p, '// Minimal input exercising branch control flow.\n')
      }
    }

    const stdout = execFileSync('node', ['web/scripts/build-doc-manifest.mjs'], {
      cwd: root,
      // An absent FREES_HOME must not fall through to a real sibling checkout.
      env: { ...process.env, FREES_HOME: reference ? home : path.join(tmp, 'absent') },
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const manifest = JSON.parse(
      fs.readFileSync(path.join(root, 'web/src/docs/reference/function-manifest.json'), 'utf-8'),
    )
    return { stdout, manifest }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true })
  }
}

/** Names the manifest answers to: canonical names plus dispatch aliases. */
function manifestNames(manifest) {
  const names = new Set()
  for (const f of manifest.functions) {
    names.add(f.name.toLowerCase())
    for (const a of f.aliases || []) names.add(a.toLowerCase())
  }
  for (const d of manifest.dispatchOnly || []) names.add(String(d.name).toLowerCase())
  return names
}

describe('build-doc-manifest', () => {
  it('reconciles against eval::INTRINSICS without a reference repo', () => {
    const { manifest } = generate({ reference: false })
    const names = manifestNames(manifest)
    expect(intrinsicNames().filter((n) => !names.has(n))).toEqual([])
    expect(manifest.derivedFrom).toBe('rust')
  })

  // The branch that used to throw. It must exit 0 (execFileSync throws on a
  // non-zero exit, so reaching the assertions is itself the crash regression
  // test) and must reconcile, not just write.
  it('reconciles against eval::INTRINSICS with a reference repo present', () => {
    const { manifest } = generate({ reference: true })
    const names = manifestNames(manifest)
    expect(intrinsicNames().filter((n) => !names.has(n))).toEqual([])
    expect(manifest.derivedFrom).toBe('java+rust')
  })

  // Provenance names the branch taken. It used to be stamped 'java+rust'
  // unconditionally inside the writer, claiming a Java read that never happened.
  it('does not claim a Java read it did not perform', () => {
    expect(generate({ reference: false }).manifest.derivedFrom).not.toBe('java+rust')
  })

  // The reported family counts used to be whatever the pre-merge build set:
  // 276 functions and 44 CALL procedures against arrays holding 326 and 63.
  it('reports family counts that match the final arrays', () => {
    for (const reference of [false, true]) {
      const { manifest: m } = generate({ reference })
      expect(m.coverage.registeredFunctions).toBe(m.functions.length)
      expect(m.coverage.callProcedures).toBe(m.callProcedures.length)
      expect(m.coverage.matrixFunctions).toBe(m.matrixFunctions.length)
      expect(m.coverage.components).toBe(m.components.length)
      expect(m.coverage.propertyFunctions).toBe(m.propertyFunctions.length)
      expect(m.coverage.replCasOps).toBe(m.replCasOps.length)
      expect(m.coverage.materialFunctions).toBe(m.materials.functions.length)
    }
  })
})
