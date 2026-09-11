// Documentation coverage gate.
//
// Enforces the correctness invariants that must hold at all times:
//   1. Every authored reference page names a symbol that actually exists in the
//      backend (no orphan pages drifting from the implementation).
//   2. Every example id a page binds to (frontmatter `examples:` / inline
//      [Run: id]) exists in the verified examples library.
//   3. Every "See also" cross-link (frontmatter `related:`) resolves to a page
//      that actually exists (no dangling badges to deleted/renamed/absent pages).
//   4. Every function-call mention in the guide prose (src/docs/*.md inline code,
//      `name(`) names a real backend callable — so a guide can't teach a built-in
//      that doesn't exist (e.g. the cbrt/log2/Dipole class of drift).
//
// Also reports documented-vs-total coverage (informational until Phase 2 fills
// the reference set). Exits non-zero on any invariant violation.
//
// Run: node scripts/build-doc-manifest.mjs && node scripts/check-doc-coverage.mjs

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseLibrary } from './parse-library.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, '../src');
const REF_DIR = path.join(SRC, 'docs/reference');
const read = (p) => fs.readFileSync(p, 'utf-8');

// Known symbol slugs from the generated manifest (every documentable family).
const manifest = JSON.parse(read(path.join(REF_DIR, 'function-manifest.json')));
const symbols = new Set();
for (const f of manifest.functions) symbols.add(f.name.toLowerCase());
for (const f of manifest.matrixFunctions) symbols.add(f.name.toLowerCase());
for (const p of manifest.callProcedures) symbols.add(p.name.toLowerCase());
for (const p of manifest.propertyFunctions) symbols.add(p.name.toLowerCase());
for (const c of manifest.components) symbols.add(c.name.toLowerCase());
for (const f of manifest.materials.functions) symbols.add(f.toLowerCase());
for (const r of manifest.replCasOps) symbols.add(r.toLowerCase());

// Complete callable surface for the guide-prose linter: the manifest families
// above, plus the function aliases and dispatch-only arms the manifest records.
const callable = new Set(symbols);
for (const f of manifest.functions) for (const a of f.aliases || []) callable.add(a.toLowerCase());
for (const d of manifest.dispatchOnly || []) {
  callable.add(d.name.toLowerCase());
  for (const a of d.aliases || []) callable.add(a.toLowerCase());
}
// Real engine callables the manifest does not yet enumerate: unit helpers, the
// der() dynamic operator, and the property-output functions routed by
// props/propfun.rs rather than the function registry.
//
// This list was 25 names carrying a TODO to fold itself into the manifest. It
// is 12 because the builder now reads parser::expand::MATRIX_FUNCTIONS
// alongside eval::INTRINSICS and procedures::EXPANDED_CALL_TARGETS, which
// retired the matrix/BLAS half (scal, ger, copy, identity, gemv, gemm, axpy)
// and the two stagnation functions.
//
// Three entries — delta, movavg, delay — described a Java-era Data Analyzer
// evaluator. No Rust crate defines them and no guide mentions them; they were
// permitting names that do not exist.
//
// A fourth, isidealgas, was permitting `IsIdealGas(Fluid)` in
// fluids_materials.md. The engine answers `unknown function: isidealgas`. That
// is the exact drift this gate exists to catch, and the allowlist was the
// reason it never fired — the bullet has been removed from the guide.
//
// What is left is genuinely unenumerated. Shrinking it further means teaching
// the builder to read props/propfun.rs's output table the same way.
const EXTRA_CALLABLES = [
  'convert', 'converttemp', 'der',
  'p_sat', 't_sat', 'molarmass', 'heatingvalue', 'stoichafr', 'surfacetension',
  'phase$',
  // Scalar-valued matrix routings: aliases inside expand.rs's match arms, not
  // rows of the MATRIX_FUNCTIONS table the builder reads.
  'asum', 'nrm2',
];
for (const n of EXTRA_CALLABLES) callable.add(n);
// Bare math notation that reads like a call in inline code (`num(s)/den(s)`, a
// generic `Tname(...)` placeholder) — not references to a built-in. `name` is
// the same shape: `programming_logic.md` writes `[ … ] = name( … )` to show the
// destructuring FORM, and a metasyntactic placeholder is not a missing
// function. It is listed here rather than fixed in the prose because the prose
// is right.
const NOTATION = new Set(['num', 'den', 'tname', 'name']);

// Example ids in the verified libraries. There are two catalogues — the
// picker's EXAMPLES and Help's CYCLE_EXAMPLES — and a page may legitimately
// bind into either, so both are indexed here. Checking only examples.ts made a
// binding into the Help catalogue indistinguishable from a typo.
//
// Ids must also be unique ACROSS both. Help resolves a binding with .find(),
// so a repeated id silently makes one of the two documents unreachable:
// 'rankine-cycle' named both the ideal cycle and the one with component
// efficiencies, and every page binding it got the first.
const exampleIds = new Set();
const duplicateIds = [];
for (const file of ['examples.ts', 'helpExamples.ts']) {
  for (const m of read(path.join(SRC, file)).matchAll(/^\s+id:\s*'([^']+)'/gm)) {
    if (exampleIds.has(m[1])) duplicateIds.push(`${m[1]} (second definition in ${file})`);
    exampleIds.add(m[1]);
  }
}

// Walk authored reference pages.
const pages = [];
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.md') && !e.name.startsWith('_')) {
      const raw = read(p);
      const fm = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
      if (!fm) continue;
      const name = fm[1].match(/^name:\s*(.+)$/m)?.[1].trim();
      if (!name) continue;
      const exFm = fm[1].match(/^examples:\s*\[([^\]]*)\]/m);
      const exFrontmatter = exFm ? exFm[1].split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean) : [];
      const exInline = [...fm[2].matchAll(/\[Run:\s*([a-zA-Z0-9_-]+)\s*\]/g)].map((m) => m[1]);
      const relFm = fm[1].match(/^related:\s*\[([^\]]*)\]/m);
      const related = relFm ? relFm[1].split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean) : [];
      const generated = /^generated:\s*true\s*$/m.test(fm[1]);
      // Cookbook/guide pages document a task, not a backend symbol — exempt from
      // the symbol-existence check (their example bindings are still validated).
      const guide = /^guide:\s*true\s*$/m.test(fm[1]);

      // Substance tier (non-guide pages). The Syntax block is always a fenced
      // code sample, so it is not a signal; a *worked* example is one in the
      // Examples section or a [Run:] binding.
      const body = fm[2];
      const exSection = body.split(/^##\s+Examples\s*$/m)[1];
      const hasWorkedExample = exInline.length > 0
        || (exSection && /```|\[Run:/.test(exSection.split(/^##\s/m)[0]));
      const refsNonEmpty = /^references:\s*\n\s*-\s+/m.test(fm[1]);
      const bodyLen = body.replace(/\s+/g, ' ').trim().length;
      const tier = hasWorkedExample ? 'rich'
        : (refsNonEmpty || bodyLen >= 500) ? 'reference'
        : 'stub';

      pages.push({ file: path.relative(SRC, p), name, generated, guide, related, tier, examples: [...new Set([...exFrontmatter, ...exInline])] });
    }
  }
};
if (fs.existsSync(REF_DIR)) walk(REF_DIR);

// Every page is addressable by its name (lower-cased) — the slug a `related:`
// cross-link must resolve to.
const pageSlugs = new Set(pages.map((p) => p.name.toLowerCase()));

const errors = [];
for (const id of duplicateIds) {
  errors.push(`duplicate example id "${id}" — bindings resolve to the first match only`);
}
for (const pg of pages) {
  if (!pg.guide && !symbols.has(pg.name.toLowerCase())) {
    errors.push(`${pg.file}: documents "${pg.name}" which is not a known backend symbol`);
  }
  for (const id of pg.examples) {
    if (!exampleIds.has(id)) {
      errors.push(`${pg.file}: binds example "${id}" which is in neither examples.ts nor helpExamples.ts`);
    }
  }
  for (const rel of pg.related) {
    if (!pageSlugs.has(rel.toLowerCase())) {
      errors.push(`${pg.file}: "See also" links to "${rel}" which has no reference page`);
    }
  }
}
// Invariant 4: guide-prose function mentions must name a real callable. Scan the
// inline-code spans of each guide markdown file for a `name(` shape; skip 1–2 char
// identifiers (loop/user variables) and known math notation.
const GUIDE_DIR = path.join(SRC, 'docs');
for (const file of fs.readdirSync(GUIDE_DIR).filter((f) => f.endsWith('.md'))) {
  const text = read(path.join(GUIDE_DIR, file));
  const flagged = new Set();
  for (const m of text.matchAll(/`([A-Za-z_][A-Za-z0-9_]*\$?)\s*\(/g)) {
    const name = m[1].toLowerCase();
    if (name.replace(/\$$/, '').length <= 2 || NOTATION.has(name) || callable.has(name) || flagged.has(name)) {
      continue;
    }
    flagged.add(name);
    errors.push(`docs/${file}: guide documents call "${m[1]}(…)" which is not a known backend function`);
  }
}

const guides = pages.filter((p) => p.guide).length;

// Coverage is presence (every symbol has a page); substance is depth. Report both
// so a 100% presence number doesn't hide signature-only stubs. Tiers (non-guide):
//   rich      — has a worked example (runnable [Run:] or an Examples-section sample)
//   reference — substantive (citations, or a non-trivial body) but no worked example
//   stub      — signature-only: no worked example, no references, short body
const symbolPages = pages.filter((p) => !p.guide);
const rich = symbolPages.filter((p) => p.tier === 'rich').length;
const reference = symbolPages.filter((p) => p.tier === 'reference').length;
const stubs = symbolPages.filter((p) => p.tier === 'stub');

const total = manifest.coverage.documentableSurfaceTotal;
console.log(
  `doc-coverage: ${symbolPages.length}/${total} symbols have a page (${(100 * symbolPages.length / total).toFixed(1)}%) — `
  + `${rich} rich (worked example), ${reference} reference, ${stubs.length} stub (signature-only); ${guides} cookbook guide(s).`,
);
if (stubs.length) {
  // Informational, not a failure: surface the thinnest pages as enrichment work.
  console.log(`\n  ${stubs.length} stub page(s) to enrich (no example, no references):`);
  console.log('    ' + stubs.map((p) => p.name).sort().join(', '));
}

// Exact engine ↔ catalog ↔ page name-set for components. Do not hard-code a count.
const library = parseLibrary();
const libNames = new Set(library.map((c) => c.name.toLowerCase()));
const componentPages = pages.filter((p) => p.file.includes(`${path.sep}components${path.sep}`) || p.file.includes('/components/'));
const pageCompNames = new Set(componentPages.map((p) => p.name.toLowerCase()));
const catalogPath = path.join(SRC, 'componentCatalog.ts');
if (fs.existsSync(catalogPath)) {
  const catalogSrc = read(catalogPath);
  const catalogNames = new Set([...catalogSrc.matchAll(/type:\s*`([^`]+)`/g)].map((m) => m[1].toLowerCase()));
  for (const name of libNames) {
    if (!catalogNames.has(name)) errors.push(`component catalog missing engine component "${name}" (run npm run compile-docs)`);
    if (!pageCompNames.has(name)) errors.push(`no reference page for engine component "${name}" (run node scripts/scaffold-reference-pages.mjs)`);
  }
  for (const name of catalogNames) {
    if (!libNames.has(name)) errors.push(`component catalog has "${name}" which is not in the engine library`);
  }
  for (const name of pageCompNames) {
    if (!libNames.has(name)) errors.push(`component page "${name}" is not in the engine library`);
  }
}

if (errors.length) {
  console.error(`\n✗ ${errors.length} coverage error(s):`);
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
console.log(
  `\n✓ all reference pages name real symbols, bind real examples, cross-link real pages, and guides cite real functions. ` +
    `Component inventory: ${library.length} engine = catalog = pages.`,
);
