// Build the documentation manifest — the machine-readable inventory of every
// documentable symbol in frees, reconciled directly against the shipping Rust
// engine so the reference docs cannot silently drift from the implementation.
//
// Sources of truth, all inside THIS repository and all read live:
//   1. crates/frees-core/src/eval.rs           — eval::INTRINSICS
//   2. crates/frees-core/src/procedures.rs     — procedures::EXPANDED_CALL_TARGETS
//   3. crates/frees-core/src/parser/expand.rs  — parser::expand::MATRIX_FUNCTIONS
//   4. crates/frees-core/src/props/propfun.rs  — OUTPUTS / HA_OUTPUTS
//   5. crates/frees-core/src/props/solids.rs   — MATERIALS
//   6. crates/frees/src/repl.rs                — CAS_NAMES
//   7. components/library-data/*.frees         — the component library
//   8. src/helpReference.ts                    — CALL + matrix signatures/descriptions
//   9. src/docs/reference/**/*.md              — authored pages (frontmatter `name:`)
//
// This script used to read the Java reference repo (`../frees`) as its primary
// registry and fall back to a cached manifest when the sibling was absent —
// which it is on every normal checkout. That fallback is how 73 live intrinsics
// stayed undocumented while the gate reported 655/655. The Java dependency is
// now gone entirely: rustprop and the Rust registries are the implementation,
// so they are also the inventory.
//
// Authored prose (a function's signature, description and category) still comes
// from the committed manifest — it is hand-written documentation, not something
// any registry can regenerate. What the Rust tables decide is MEMBERSHIP: which
// symbols exist. A name in the engine and not in the manifest is added and
// reported; that is the drift this exists to surface.
//
// Output: src/docs/reference/function-manifest.json
//
// Run: node scripts/build-doc-manifest.mjs

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseLibrary } from './parse-library.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WASM_REPO = path.resolve(__dirname, '../..');

const REF_DIR = path.join(__dirname, '../src/docs/reference');
const OUT = path.join(REF_DIR, 'function-manifest.json');

const read = (p) => fs.readFileSync(p, 'utf-8');
// ── 1. Name-set-routed families (not scalar intrinsics) ─────────────────────

// Components: every `COMPONENT <Name>` in THIS port's embedded library.
function parseComponents() {
  return parseLibrary()
    .map((c) => ({ name: c.name, domain: c.domain }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// CALL procedures: no clean backend name-set; sourced from the curated frontend
// inventory helpReference.CALL_PROCEDURES (name, signature, desc, category).
// Pull a quoted field (', ", or `) from one object-literal body.
function field(body, key) {
  const m = body.match(new RegExp(key + '\\s*:\\s*(["\'`])((?:(?!\\1).|\\\\.)*)\\1'));
  return m ? m[2].replace(/\\(['"`])/g, '$1') : '';
}

function parseCallProcedures() {
  const src = read(path.join(__dirname, '../src/helpReference.ts'));
  const i = src.indexOf('CALL_PROCEDURES');
  const seg = src.slice(i, src.indexOf('];', i));
  return [...seg.matchAll(/\{([^{}]*)\}/g)].map((m) => ({
    name: field(m[1], 'name'),
    category: field(m[1], 'category'),
    description: field(m[1], 'desc'),
    signature: field(m[1], 'signature'),
  })).filter((p) => p.name);
}

// Matrix / vector functions (matrix-routed, not in the scalar Evaluator switch);
// sourced from the curated helpReference.MATRIX_FUNCTIONS.
function parseMatrixFunctions() {
  const src = read(path.join(__dirname, '../src/helpReference.ts'));
  const i = src.indexOf('MATRIX_FUNCTIONS: FuncEntry[]');
  const seg = src.slice(i, src.indexOf('];', i));
  const re = /\{\s*name:\s*'([^']+)',\s*desc:\s*'((?:[^'\\]|\\.)*)'/g;
  const out = [];
  let m;
  while ((m = re.exec(seg)) !== null) {
    // name field embeds the signature, e.g. "SolveLinear(A, b)" — take the head as the name.
    const sig = m[1];
    const name = sig.replace(/\(.*$/, '').split(/\s*\/\s*/)[0].trim();
    out.push({ name, signature: sig, description: m[2].replace(/\\'/g, "'") });
  }
  return out;
}

// ── 2. Authored reference pages (frontmatter name:) ──────────────────────────
//
// A Map of lowercase slug -> the page's own casing, not a Set: `.has()` reads
// the same at every call site, and `.get()` recovers the spelling a reader
// sees. The Rust tables are lowercase (`e_`), but the accessor is documented
// and written `E_` — membership comes from the engine, casing from the page.
function authoredPages() {
  const names = new Map();
  if (!fs.existsSync(REF_DIR)) return names;
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.md') && !e.name.startsWith('_')) {
        const fm = read(p).match(/^---\n([\s\S]*?)\n---/);
        const nm = fm && fm[1].match(/^name:\s*(.+)$/m);
        if (nm) names.set(nm[1].trim().toLowerCase(), nm[1].trim());
      }
    }
  };
  walk(REF_DIR);
  return names;
}

// ── 3. The Rust registries (the engine's own truth) ─────────────────────────
//
// Every static name table the engine dispatches through, read straight out of
// the Rust source. Not out of a compiled binary: a build step that needed the
// engine built would not run in the same place this one does.
//
// These decide MEMBERSHIP. Whatever prose the committed manifest carries for a
// symbol is kept; whatever the engine has and the manifest does not is added
// and reported.

const EVAL_RS = path.join(WASM_REPO, 'crates/frees-core/src/eval.rs');
const PROCEDURES_RS = path.join(WASM_REPO, 'crates/frees-core/src/procedures.rs');
const EXPAND_RS = path.join(WASM_REPO, 'crates/frees-core/src/parser/expand.rs');
const PROPFUN_RS = path.join(WASM_REPO, 'crates/frees-core/src/props/propfun.rs');
const SOLIDS_RS = path.join(WASM_REPO, 'crates/frees-core/src/props/solids.rs');
const REPL_RS = path.join(WASM_REPO, 'crates/frees/src/repl.rs');

/** The `("name", …)` heads of a `const NAME: &[(&str, &str)] = &[ … ];` table. */
function rustPairTable(src, name) {
  const block = src.match(new RegExp(`const ${name}: &\\[\\(&str, &str\\)\\] = &\\[([\\s\\S]*?)\\n\\];`));
  if (!block) return [];
  const out = new Set();
  for (const m of block[1].matchAll(/\(\s*(?:"([^"]+)"|([A-Z_][A-Z0-9_]*))\s*,/g)) {
    // A bare constant as the key: `(VOLUME, "V")`. Resolve it from its own
    // `const VOLUME: &str = "volume";` declaration rather than assuming.
    if (m[1]) { out.add(m[1].toLowerCase()); continue; }
    const lit = src.match(new RegExp(`const ${m[2]}: &str = "([^"]+)";`));
    if (lit) out.add(lit[1].toLowerCase());
  }
  return [...out].sort();
}

/** Every name in `eval::INTRINSICS`, lowercase, sorted. */
function rustIntrinsics() {
  if (!fs.existsSync(EVAL_RS)) return [];
  const src = read(EVAL_RS);
  const names = new Set();
  for (const m of src.matchAll(/(?:strict|lazy)!\(\s*"([^"]+)"/g)) {
    names.add(m[1].toLowerCase());
  }
  return [...names].sort();
}

/** Every name in `procedures::EXPANDED_CALL_TARGETS`, lowercase, sorted. */
function rustCallTargets() {
  if (!fs.existsSync(PROCEDURES_RS)) return [];
  const src = read(PROCEDURES_RS);
  const block = src.match(/const EXPANDED_CALL_TARGETS: &\[&str\] = &\[([\s\S]*?)\n\];/);
  if (!block) return [];
  const names = new Set();
  for (const m of block[1].matchAll(/"([^"]+)"/g)) names.add(m[1].toLowerCase());
  return [...names].sort();
}

/**
 * Every name in `parser::expand::MATRIX_FUNCTIONS`, lowercase, sorted.
 *
 * Matrix-routed names never reach the scalar `eval::INTRINSICS` switch, so the
 * merge above cannot see them and the family was sourced entirely from the
 * curated `helpReference.MATRIX_FUNCTIONS` — i.e. cached, and listed in
 * `staleFamilies`. Four of them (`scal`, `ger`, `copy`, `identity`) were
 * instead hand-carried in `check-doc-coverage.mjs`'s EXTRA_CALLABLES so the
 * guide linter would accept them. Reading the Rust list is the same mechanism
 * as the other two registries and retires that half of the allowlist.
 */
function rustMatrixFunctions() {
  if (!fs.existsSync(EXPAND_RS)) return [];
  const block = read(EXPAND_RS).match(/const MATRIX_FUNCTIONS: \[&str; \d+\] = \[([\s\S]*?)\n\];/);
  if (!block) return [];
  return [...new Set([...block[1].matchAll(/"([^"]+)"/g)].map((m) => m[1].toLowerCase()))].sort();
}

/**
 * Fluid and humid-air property functions: the `OUTPUTS` / `HA_OUTPUTS` keys.
 *
 * Was parsed from the Java `props/PropertyFunctions.java`. rustprop carries the
 * same two tables, so this is the same list from the implementation that now
 * actually answers the call.
 */
function rustPropertyFunctions() {
  if (!fs.existsSync(PROPFUN_RS)) return { fluid: [], humidAir: [] };
  const src = read(PROPFUN_RS);
  return {
    fluid: rustPairTable(src, 'OUTPUTS'),
    humidAir: rustPairTable(src, 'HA_OUTPUTS'),
  };
}

/** Solid-material accessors and the material database keys, from `solids.rs`. */
function rustMaterials() {
  if (!fs.existsSync(SOLIDS_RS)) return { functions: [], materials: [] };
  const src = read(SOLIDS_RS);
  const block = src.match(/const MATERIALS: &\[\(&str, Material\)\] = &\[([\s\S]*?)\n\];/);
  const materials = block
    ? [...new Set([...block[1].matchAll(/\(\s*\n?\s*"([^"]+)"/g)].map((m) => m[1]))].sort()
    : [];
  // The accessor suffixes `lookup()` matches, in its own declared order.
  const accessors = src.match(/\[((?:\s*"[a-z_]+",?)+)\]/);
  const functions = accessors
    ? [...accessors[1].matchAll(/"([^"]+)"/g)].map((m) => m[1])
    : [];
  return { functions, materials };
}

/** The REPL-only CAS spellings, from `repl.rs::CAS_NAMES`. */
function rustReplCasOps() {
  if (!fs.existsSync(REPL_RS)) return [];
  const block = read(REPL_RS).match(/const CAS_NAMES: \[&str; \d+\] = \[([\s\S]*?)\n\];/);
  if (!block) return [];
  return [...new Set([...block[1].matchAll(/"([^"]+)"/g)].map((m) => m[1].toLowerCase()))].sort();
}

/**
 * Fold the Rust registries into the committed manifest and report what only
 * one of them knows about.
 *
 * A **union**, deliberately, not a replacement. Dropping a name the manifest
 * carries would orphan its authored page and fail the coverage gate for a
 * reason that has nothing to do with the engine; adding a name the Rust table
 * has is exactly the drift this exists to surface. Entries the registries
 * introduced carry `source: "rust"` so a reader can see where they came from.
 */
function mergeRustRegistries(manifest) {
  const pages = authoredPages();
  const report = { functionsAdded: [], callsAdded: [] };

  const known = new Set((manifest.functions || []).map((f) => f.name.toLowerCase()));
  for (const f of manifest.functions || []) {
    for (const a of f.aliases || []) known.add(a.toLowerCase());
  }
  for (const d of manifest.dispatchOnly || []) known.add(String(d.name || d).toLowerCase());

  const intrinsics = rustIntrinsics();
  for (const name of intrinsics) {
    if (known.has(name)) continue;
    report.functionsAdded.push(name);
    manifest.functions.push({
      name,
      signature: `${name}(…)`,
      description: '',
      category: 'Built-in',
      aliases: [],
      source: 'rust',
      documented: pages.has(name),
    });
  }
  // The reverse check — "a documented function the engine no longer dispatches"
  // — is deliberately NOT made here. `eval::INTRINSICS` is only one of the
  // port's dispatch paths: the dense linear algebra goes through
  // `linalg::eval_intrinsic`, the control suite through `control::eval`, and
  // both are reached by synthetic `$` names this regex cannot see. Comparing
  // against the intrinsic table alone reported 45 live functions as dead.

  const callNames = new Set((manifest.callProcedures || []).map((p) => p.name.toLowerCase()));
  for (const name of rustCallTargets()) {
    if (callNames.has(name)) continue;
    report.callsAdded.push(name);
    manifest.callProcedures.push({
      name,
      signature: `CALL ${name}(…)`,
      description: '',
      source: 'rust',
      documented: pages.has(name),
    });
  }

  // Dedupe against EVERY family, not just the matrix one: `transpose` and `inv`
  // are carried as registry functions as well as matrix-routed names, and
  // adding a second entry for them would double-count a symbol the coverage
  // map already resolves by slug.
  manifest.matrixFunctions = manifest.matrixFunctions || [];
  const matrixNames = new Set([
    ...manifest.matrixFunctions.map((f) => f.name.toLowerCase()),
    ...manifest.functions.map((f) => f.name.toLowerCase()),
    ...manifest.functions.flatMap((f) => (f.aliases || []).map((a) => a.toLowerCase())),
  ]);
  report.matrixAdded = [];
  for (const name of rustMatrixFunctions()) {
    if (matrixNames.has(name)) continue;
    report.matrixAdded.push(name);
    manifest.matrixFunctions.push({
      name,
      signature: `${name}(…)`,
      description: '',
      source: 'rust',
      documented: pages.has(name),
    });
  }

  manifest.functions.sort((a, b) => a.name.localeCompare(b.name));
  manifest.callProcedures.sort((a, b) => a.name.localeCompare(b.name));
  manifest.matrixFunctions.sort((a, b) => a.name.localeCompare(b.name));
  return report;
}

function reportMerge(report) {
  if (report.functionsAdded.length) {
    console.warn(
      `build-doc-manifest: ${report.functionsAdded.length} intrinsic(s) live in ` +
        `eval::INTRINSICS but not in the committed manifest: ` +
        report.functionsAdded.join(', '),
    );
  }
  if (report.callsAdded.length) {
    console.warn(
      `build-doc-manifest: ${report.callsAdded.length} CALL target(s) added from ` +
        `procedures::EXPANDED_CALL_TARGETS: ${report.callsAdded.join(', ')}`,
    );
  }
  if (report.matrixAdded?.length) {
    console.warn(
      `build-doc-manifest: ${report.matrixAdded.length} matrix function(s) added from ` +
        `parser::expand::MATRIX_FUNCTIONS: ${report.matrixAdded.join(', ')}`,
    );
  }
}

/** Reconcile against the Rust registries, stamp provenance, recount. */
function finalize(manifest) {
  const report = mergeRustRegistries(manifest);
  manifest.derivedFrom = 'rust';
  recountCoverage(manifest);
  return report;
}

// Write only when something OTHER than the date changed. `npm run check-docs`
// regenerates this file every time it runs, and `generatedAt` alone would dirty
// a committed 106 KB artifact on every run — noise that trains people to
// `git checkout` the manifest, which is how a real drift would get discarded
// with it. A date bump is not news; a registry change is.
function writeManifest(manifest) {
  fs.mkdirSync(REF_DIR, { recursive: true });
  const rendered = JSON.stringify(manifest, null, 2) + '\n';
  const stripDate = (s) => s.replace(/^\s*"generatedAt":.*$/m, '');
  const previous = fs.existsSync(OUT) ? read(OUT) : null;
  if (previous !== null && stripDate(previous) === stripDate(rendered)) {
    console.log('doc-manifest: unchanged against the backend registries — not rewritten.');
  } else {
    fs.writeFileSync(OUT, rendered);
  }
}

function recountCoverage(manifest) {
  const pages = authoredPages();
  const all = new Map();
  const note = (name, documented) => {
    const k = String(name).toLowerCase();
    all.set(k, (all.get(k) || false) || documented);
  };
  for (const f of manifest.functions || []) note(f.name, pages.has(f.name.toLowerCase()));
  for (const f of manifest.matrixFunctions || []) note(f.name, pages.has(f.name.toLowerCase()));
  for (const p of manifest.callProcedures || []) note(p.name, pages.has(p.name.toLowerCase()));
  for (const p of manifest.propertyFunctions || []) note(p.name, pages.has(String(p.name).toLowerCase()));
  for (const c of manifest.components || []) note(c.name, pages.has(c.name.toLowerCase()));
  for (const f of manifest.materials?.functions || []) note(f, pages.has(String(f).toLowerCase()));
  for (const r of manifest.replCasOps || []) note(r, pages.has(String(r).toLowerCase()));
  // Every count comes off the FINAL arrays. `registeredFunctions` and
  // `callProcedures` used to be left at whatever the pre-merge build set, so a
  // manifest holding 326 functions and 63 CALL targets reported 276 and 44.
  const cov = manifest.coverage;
  cov.documentableSurfaceTotal = all.size;
  cov.registeredFunctions = (manifest.functions || []).length;
  cov.matrixFunctions = (manifest.matrixFunctions || []).length;
  cov.components = (manifest.components || []).length;
  cov.propertyFunctions = (manifest.propertyFunctions || []).length;
  cov.callProcedures = (manifest.callProcedures || []).length;
  cov.materialFunctions = (manifest.materials?.functions || []).length;
  cov.replCasOps = (manifest.replCasOps || []).length;
  cov.dispatchOnlyNeedingRegistry = (manifest.dispatchOnly || []).length;
  cov.documented = [...all.values()].filter(Boolean).length;
}

// ── 4. Build ────────────────────────────────────────────────────────────────
//
// One path. The committed manifest supplies authored prose for the symbols it
// already knows; every family's membership is re-derived here.

if (!fs.existsSync(OUT)) {
  console.error(`build-doc-manifest: no committed manifest at ${path.relative(WASM_REPO, OUT)}.`);
  process.exit(1);
}

// The Rust registries are the only source of truth for the function surface. If
// they cannot be read there is nothing reconciling the manifest against the
// shipping engine, and a coverage number computed from a cached list is a claim
// this script has no basis for — so it fails rather than printing one.
if (!rustIntrinsics().length) {
  console.error(
    `build-doc-manifest: eval::INTRINSICS could not be read from ` +
      `${path.relative(WASM_REPO, EVAL_RS)}. Refusing to report coverage from a cached ` +
      `list — there would be nothing checking it against the engine.`,
  );
  process.exit(1);
}

const manifest = JSON.parse(read(OUT));
const pages = authoredPages();

manifest.components = parseComponents().map((c) => ({
  ...c,
  documented: pages.has(c.name.toLowerCase()),
}));

const props = rustPropertyFunctions();
manifest.propertyFunctions = [
  ...props.fluid.map((n) => ({ name: n, kind: 'fluid', documented: pages.has(n) })),
  ...props.humidAir.map((n) => ({ name: n, kind: 'humid-air', documented: pages.has(n) })),
];
manifest.materials = rustMaterials();
// Membership from `solids.rs`, spelling from the authored page (`E_`, not `e_`).
manifest.materials.functions = manifest.materials.functions.map((f) => pages.get(f) || f);
manifest.replCasOps = rustReplCasOps();

manifest.note =
  'GENERATED by scripts/build-doc-manifest.mjs. Every family is reconciled against ' +
  'the Rust registries (eval::INTRINSICS, procedures::EXPANDED_CALL_TARGETS, ' +
  'parser::expand::MATRIX_FUNCTIONS, props::propfun, props::solids, repl::CAS_NAMES) ' +
  'and this repo\'s component library. Signatures and descriptions are authored ' +
  'prose, kept as committed. Do not edit by hand.';
// Nothing is cached-membership any more. The field stays, empty, because
// `check-doc-coverage.mjs` and the manifest's readers both look for it.
manifest.staleFamilies = [];

const mergeReport = finalize(manifest);
writeManifest(manifest);
reportMerge(mergeReport);

const cov = manifest.coverage;
console.log(
  `doc-manifest: ${cov.documentableSurfaceTotal} documentable symbols ` +
    `(${cov.documented} documented) — ${cov.registeredFunctions} functions, ` +
    `${cov.matrixFunctions} matrix fns, ${cov.components} components, ` +
    `${cov.propertyFunctions} property fns, ${cov.callProcedures} CALL procs, ` +
    `${cov.materialFunctions} material fns, ${cov.replCasOps} CAS ops → ` +
    `${path.relative(WASM_REPO, OUT)}`,
);
