// The generator must reconcile every family against the Rust registries.
//
// This exists because it did not. The builder read the Java reference repo as
// its primary registry and fell back to a cached manifest when the sibling was
// absent — which it is on every normal checkout. That fallback is how 73 live
// intrinsics stayed undocumented while the gate reported full coverage.
//
// The Java branch is gone. What replaces these tests' original subject is a
// stronger invariant: **every name the Rust tables carry reaches the manifest**,
// and no family is served from a cached list any more.

import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const WEB = path.resolve(HERE, '..')
const REPO = path.resolve(WEB, '..')

// Every Rust source the generator reads, and the component library.
const RUST_SOURCES = [
  'crates/frees-core/src/eval.rs',
  'crates/frees-core/src/procedures.rs',
  'crates/frees-core/src/parser/expand.rs',
  'crates/frees-core/src/props/propfun.rs',
  'crates/frees-core/src/props/solids.rs',
  'crates/frees/src/repl.rs',
]

/** The names `rustIntrinsics()` in the generator reads, read the same way. */
function intrinsicNames() {
  const src = fs.readFileSync(path.join(REPO, 'crates/frees-core/src/eval.rs'), 'utf-8')
  return [...src.matchAll(/(?:strict|lazy)!\(\s*"([^"]+)"/g)].map((m) => m[1].toLowerCase())
}

/**
 * Run the generator in a throwaway copy of the tree.
 *
 * `edit` receives the temp root before the run, so a test can perturb a Rust
 * source and assert the change reaches the manifest — the drift the cached
 * families could not surface.
 */
function generate({ edit } = {}) {
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
    for (const rel of ['web/src/helpReference.ts', ...RUST_SOURCES]) {
      fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true })
      fs.copyFileSync(path.join(REPO, rel), path.join(root, rel))
    }

    edit?.(root)

    const stdout = execFileSync('node', ['web/scripts/build-doc-manifest.mjs'], {
      cwd: root,
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

it('publishes current multi-output syntax without legacy CALL signatures', () => {
  const { manifest } = generate()
  const entries = [...manifest.functions, ...manifest.callProcedures, ...manifest.matrixFunctions]
  for (const entry of entries) {
    expect(entry.signature || '').not.toMatch(/^CALL\s|\s:\s/)
  }
  expect(manifest.callProcedures.find(p => p.name === 'tf2ss').signature)
    .toBe('[A, B, C, D] = tf2ss(num, den)')
})

const patch = (root, rel, from, to) => {
  const p = path.join(root, rel)
  const src = fs.readFileSync(p, 'utf-8')
  if (!src.includes(from)) throw new Error(`fixture anchor missing in ${rel}: ${from}`)
  fs.writeFileSync(p, src.replace(from, to))
}

describe('build-doc-manifest', () => {
  it('reconciles against eval::INTRINSICS', () => {
    const { manifest } = generate()
    const names = manifestNames(manifest)
    expect(intrinsicNames().filter((n) => !names.has(n))).toEqual([])
    expect(manifest.derivedFrom).toBe('rust')
  })

  // The three families that used to be served from the last Java generation.
  // An empty `staleFamilies` is the claim; these assert it is earned.
  it('serves no family from a cached list', () => {
    expect(generate().manifest.staleFamilies).toEqual([])
  })

  it('takes property functions from props::propfun', () => {
    const { manifest } = generate({
      edit: (root) =>
        patch(
          root,
          'crates/frees-core/src/props/propfun.rs',
          '("gibbs", "Gmass"),\n];',
          '("gibbs", "Gmass"),\n    ("fictional", "Nope"),\n];',
        ),
    })
    expect(manifest.propertyFunctions.map((p) => p.name)).toContain('fictional')
  })

  it('takes solid materials from props::solids', () => {
    const { manifest } = generate({
      edit: (root) =>
        patch(
          root,
          'crates/frees-core/src/props/solids.rs',
          '("brass", m(110.0, 8530.0, 380.0, Some(100e9), Some(0.34))),',
          '("brass", m(110.0, 8530.0, 380.0, Some(100e9), Some(0.34))),\n    ("unobtainium", m(1.0, 1.0, 1.0, None, None)),',
        ),
    })
    expect(manifest.materials.materials).toContain('unobtainium')
  })

  it('takes CAS ops from repl::CAS_NAMES', () => {
    const { manifest } = generate({
      edit: (root) =>
        patch(root, 'crates/frees/src/repl.rs', '    "integrate",\n];', '    "integrate",\n    "residue",\n];'),
    })
    expect(manifest.replCasOps).toContain('residue')
  })

  // Membership is the engine's; the spelling a reader sees is the page's. The
  // Rust table says `e_`; `materials/E_.md` says `E_`, and that is what ships.
  it('keeps the authored casing of material accessors', () => {
    expect(generate().manifest.materials.functions).toContain('E_')
  })

  // Without the Rust registries there is nothing checking the manifest against
  // the engine, so a coverage number would be a claim with no basis.
  it('refuses to report coverage when eval::INTRINSICS cannot be read', () => {
    expect(() =>
      generate({ edit: (root) => fs.rmSync(path.join(root, 'crates/frees-core/src/eval.rs')) }),
    ).toThrow()
  })

  // The reported family counts used to be whatever the pre-merge build set:
  // 276 functions and 44 CALL procedures against arrays holding 326 and 63.
  it('reports family counts that match the final arrays', () => {
    const { manifest: m } = generate()
    expect(m.coverage.registeredFunctions).toBe(m.functions.length)
    expect(m.coverage.callProcedures).toBe(m.callProcedures.length)
    expect(m.coverage.matrixFunctions).toBe(m.matrixFunctions.length)
    expect(m.coverage.components).toBe(m.components.length)
    expect(m.coverage.propertyFunctions).toBe(m.propertyFunctions.length)
    expect(m.coverage.replCasOps).toBe(m.replCasOps.length)
    expect(m.coverage.materialFunctions).toBe(m.materials.functions.length)
  })
})
