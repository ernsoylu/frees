// Scaffold baseline reference pages for every documentable symbol that does not
// yet have a hand-authored page. Each baseline is built ENTIRELY from authoritative
// data — the manifest signature/description, an argument table parsed from the
// signature, and example bindings discovered by scanning examples.ts — and is
// flagged `generated: true` so it is visibly a baseline pending enrichment.
//
// Hand-authored pages (no `generated:` flag) are NEVER overwritten.
//
// Run: node scripts/build-doc-manifest.mjs && node scripts/scaffold-reference-pages.mjs

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, '../src');
const REF = path.join(SRC, 'docs/reference');
const REPO = path.resolve(__dirname, '../..');
const read = (p) => fs.readFileSync(p, 'utf-8');
const manifest = JSON.parse(read(path.join(REF, 'function-manifest.json')));

// ── Existing authored slugs (any page already present) ───────────────────────
const existing = new Set();
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
  const p = path.join(d, e.name);
  if (e.isDirectory()) walk(p);
  else if (e.name.endsWith('.md') && !e.name.startsWith('_')) {
    const nm = read(p).match(/^---\n[\s\S]*?\bname:\s*(.+)$/m);
    if (nm) existing.add(nm[1].trim().toLowerCase());
  }
});
walk(REF);

// ── Example bindings: which example ids call a given name ────────────────────
const exSrc = read(path.join(SRC, 'examples.ts'));
const exBlocks = [];
{ const re = /id:\s*'([^']+)'([\s\S]*?)(?=\n  \},)/g; let m;
  while ((m = re.exec(exSrc)) !== null) exBlocks.push([m[1], m[2]]); }
const boundExamples = (name) => {
  const re = new RegExp('\\b' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\(', 'i');
  return exBlocks.filter(([, t]) => re.test(t)).map(([id]) => id);
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const folderFor = (cat) => cat.toLowerCase().replace(/[()]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const esc = (s) => String(s).replace(/`/g, "'");
const tagsFrom = (name, cat) => [...new Set(name.toLowerCase().split(/[_\s]+/).concat(folderFor(cat).split('-')))].filter((t) => t.length > 1);

// Parse "name(a, b$, c)" or "CALL name(in : out)" into {inputs, outputs}.
function parseSig(sig) {
  const inside = (sig.match(/\(([^)]*)\)/) || [, ''])[1];
  const [inPart, outPart] = inside.split(':');
  const toArgs = (s) => (s || '').split(',').map((a) => a.trim()).filter(Boolean);
  return { inputs: toArgs(inPart), outputs: toArgs(outPart) };
}
const argRow = (a) => {
  const isStr = a.endsWith('$');
  return `| \`${a}\` | ${isStr ? 'String' : 'Number'} | Yes | ${isStr ? 'String argument.' : 'Numeric argument.'} |`;
};

function pageBody({ name, category, summary, syntax, description, inputs, outputs, extra }) {
  const inRows = inputs.length
    ? ['## Input Arguments', '', '| Argument | Type | Required | Description |', '| --- | --- | --- | --- |', ...inputs.map(argRow), '']
    : [];
  const outRows = outputs && outputs.length
    ? ['## Output Arguments', '', '| Argument | Type | Description |', '| --- | --- | --- |', ...outputs.map((o) => `| \`${o}\` | Number/Array | Output value. |`), '']
    : [];
  return [
    `# ${name}`, '',
    summary, '',
    '> **Baseline page** — auto-generated from the function registry. Syntax, description, and arguments are authoritative; worked examples, the mathematical formulation, and literature references are being added incrementally.', '',
    '## Syntax', '', '```', syntax, '```', '',
    '## Description', '', description, '',
    ...(extra || []),
    ...inRows, ...outRows,
  ].join('\n');
}

// ── Frontmatter + write ──────────────────────────────────────────────────────
function emit(folder, { name, category, summary, related, examples, tags, body }) {
  const dir = path.join(REF, folder);
  fs.mkdirSync(dir, { recursive: true });
  const fm = [
    '---',
    `name: ${name}`,
    `category: ${category}`,
    `summary: ${summary.replace(/\n/g, ' ')}`,
    `related: [${(related || []).join(', ')}]`,
    `examples: [${(examples || []).join(', ')}]`,
    `tags: [${(tags || []).join(', ')}]`,
    'references: []',
    'generated: true',
    '---', '', body, '',
  ].join('\n');
  fs.writeFileSync(path.join(dir, name.replace(/[^A-Za-z0-9_]/g, '_') + '.md'), fm);
  generated.add(name.toLowerCase());
}

let made = 0;
const generated = new Set();
const done = (name) => existing.has(name.toLowerCase()) || generated.has(name.toLowerCase());

// 1. Functions + matrix functions (have signature + description)
for (const f of [...manifest.functions, ...manifest.matrixFunctions]) {
  if (done(f.name)) continue;
  const { inputs, outputs } = parseSig(f.signature || `${f.name}()`);
  emit(folderFor(f.category || 'Math'), {
    name: f.name, category: f.category || 'Math', summary: esc(f.description || f.name),
    examples: boundExamples(f.name), tags: tagsFrom(f.name, f.category || 'Math'),
    body: pageBody({ name: f.name, category: f.category, summary: esc(f.description || ''), syntax: f.signature, description: esc(f.description || ''), inputs, outputs }),
  });
  made++;
}

// 2. CALL procedures
for (const p of manifest.callProcedures) {
  if (done(p.name)) continue;
  const { inputs, outputs } = parseSig(p.signature);
  emit('control', {
    name: p.name, category: 'Control Systems', summary: esc(p.description),
    examples: boundExamples(p.name), tags: tagsFrom(p.name, 'control'),
    body: pageBody({ name: p.name, category: 'Control Systems', summary: esc(p.description), syntax: p.signature, description: esc(p.description) + ' Invoked as a `CALL` with the listed inputs and outputs.', inputs, outputs }),
  });
  made++;
}

// 3. Fluid / humid-air property functions
for (const p of manifest.propertyFunctions) {
  if (done(p.name)) continue;
  const ha = p.kind === 'humid-air';
  const syntax = ha ? `${p.name}(AirH2O, T=, P=, R=)` : `${p.name}(Fluid, P=, T=)`;
  emit('properties', {
    name: p.name, category: 'Fluid Properties',
    summary: `${ha ? 'Humid-air' : 'Fluid'} property: ${p.name} from a real-fluid (CoolProp) backend.`,
    examples: boundExamples(p.name), tags: [p.name.toLowerCase(), 'property', ha ? 'humid-air' : 'fluid', 'coolprop'],
    body: pageBody({ name: p.name, category: 'Fluid Properties',
      summary: `Returns the **${p.name}** of a ${ha ? 'humid-air (AirH2O)' : 'real fluid'} from any valid pair of independent state properties (CoolProp backend).`,
      syntax, description: `${ha ? 'A humid-air property; supply the dry-bulb T, total pressure P, and one humidity coordinate.' : 'Supply the fluid name and any two independent state properties (T, P, h, s, x, …).'} Property names are case-insensitive.`,
      inputs: [] }),
  });
  made++;
}

// 4. Solid-material functions
for (const f of manifest.materials.functions) {
  if (done(f)) continue;
  emit('materials', {
    name: f, category: 'Solid Materials', summary: `Solid-material property accessor ${f}(Material[, T]).`,
    examples: boundExamples(f), tags: [f.toLowerCase().replace('_', ''), 'material', 'solid', 'property'],
    body: pageBody({ name: f, category: 'Solid Materials',
      summary: `Returns a solid-material property via \`${f}(Material[, T])\` from the built-in material database.`,
      syntax: `${f}(Material[, T])`, description: 'Looks up a thermophysical/mechanical property of a named solid (e.g. Aluminum, Copper, Steel). Some properties accept an optional temperature.',
      inputs: [] }),
  });
  made++;
}

// 5. Components (parse PARAMs from the .frees std-lib)
const compDir = path.join(REPO, 'backend/src/main/resources/components');
const compParams = {}; const compDomain = {};
for (const file of fs.readdirSync(compDir).filter((f) => f.endsWith('.frees'))) {
  const domain = file.replace(/\.frees$/, '');
  const src = read(path.join(compDir, file));
  const re = /^[ \t]*COMPONENT[ \t]+(\w+)([\s\S]*?)^[ \t]*END/gm; let m;
  while ((m = re.exec(src)) !== null) {
    const params = [...m[2].matchAll(/^[ \t]*PARAM[ \t]+(\w+\$?)/gm)].map((x) => x[1]);
    compParams[m[1]] = params; compDomain[m[1]] = domain;
  }
}
for (const c of manifest.components) {
  if (done(c.name)) continue;
  const params = compParams[c.name] || [];
  const paramRows = params.length
    ? ['## Parameters', '', '| Parameter | Type |', '| --- | --- |', ...params.map((p) => `| \`${p}\` | ${p.endsWith('$') ? 'String' : 'Number'} |`), '']
    : [];
  emit(`components/${c.domain}`, {
    name: c.name, category: `Component (${c.domain})`,
    summary: `Acausal ${c.domain}-domain component ${c.name}.`,
    examples: boundExamples(c.name), tags: [c.name.toLowerCase(), 'component', c.domain, 'acausal'],
    body: [
      `# ${c.name}`, '',
      `Reusable acausal **${c.domain}-domain** component. Instantiate it and connect its ports; instantiation expands to scalar equations solved by the standard Newton/Tarjan pipeline.`, '',
      '> **Baseline page** — auto-generated from the component library. The parameter list is authoritative; port descriptions, the constitutive equations, and a worked example are being added incrementally.', '',
      '## Usage', '', '```', `${c.name} inst(param = value, ...)`, '```', '',
      ...paramRows,
    ].join('\n'),
  });
  made++;
}

// 6. REPL-only CAS (Symja) operations
for (const op of manifest.replCasOps) {
  if (done(op)) continue;
  emit('cas', {
    name: op, category: 'CAS (REPL)', summary: `Symbolic ${op} (REPL-only Symja CAS operation).`,
    examples: [], tags: [op.toLowerCase(), 'cas', 'symbolic', 'repl'],
    body: pageBody({ name: op, category: 'CAS (REPL)',
      summary: `Symbolic computer-algebra operation **${op}**, available in the REPL terminal (Symja backend).`,
      syntax: `${op}(expr)`,
      description: 'A REPL-only symbolic transform — it operates on an algebraic expression rather than a solved numeric value, so it is not available in the editor document body.',
      inputs: ['expr'] }),
  });
  made++;
}

console.log(`scaffold: generated ${made} baseline pages (skipped ${existing.size} authored).`);
