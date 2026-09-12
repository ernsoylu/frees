// Convert formulation listings to LaTeX using the engine, without changing examples.
// Run from any directory: node web/scripts/format-doc-equations.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import katex from 'katex';

const repo = fileURLToPath(new URL('../../', import.meta.url));
const docs = path.join(repo, 'web/src/docs');
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (entry.name.endsWith('.md') && !entry.name.startsWith('_')) files.push(file);
  }
}
walk(docs);
const originals = new Map(files.map(file => [file, fs.readFileSync(file, 'utf8')]));
const sections = /^## (?:Constitutive Equations|Mathematical Formulation|Model Variants)\n[\s\S]*?(?=^## |$(?![\s\S]))/gm;
const fences = /```[^\n]*\n([\s\S]*?)```/g;
const candidates = new Map();
for (const text of originals.values()) {
  for (const section of text.matchAll(sections)) {
    for (const fence of section[0].matchAll(fences)) {
      for (const line of fence[1].split('\n')) {
        // Declarations and connect statements describe topology, not equations.
        if (!line.trim() || /^\s*(?:connect\s*\(|\w+\s+\w+\s*\()/i.test(line)) continue;
        const at = line.indexOf('=');
        if (at < 0) continue;
        candidates.set(line, [line.slice(0, at).trim(), line.slice(at + 1).trim()]);
      }
    }
  }
}
const expressions = [...new Set([...candidates.values()].flat())];
const rendered = expressions.length ? JSON.parse(execFileSync('cargo', [
  'run', '--quiet', '-p', 'frees-core', '--example', 'doc_latex',
], { cwd: repo, input: JSON.stringify(expressions), encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })) : [];
const latex = new Map(expressions.map((source, i) => {
  if (rendered[i].error) throw new Error(`${source}: ${rendered[i].error}`);
  // Escape literal identifiers in the engine's text macros for strict KaTeX.
  const math = rendered[i].latex.replace(/\\text\{([^{}]*)\}/g, (_, text) =>
    `\\text{${text.replace(/(?<!\\)([_$#%&])/g, '\\$1')}}`).replace(/(?<!\\)([$#%])/g, '\\$1');
  return [source, math];
}));
const changes = new Map();
let equations = 0;
for (const [file, text] of originals) {
  const result = text.replace(sections, section => section.replace(fences, (fence, code) => {
    const rows = [], source = [];
    for (const line of code.split('\n')) {
      const pair = candidates.get(line);
      if (!pair) { if (line.trim()) source.push(line); continue; }
      rows.push(`${latex.get(pair[0])} &= ${latex.get(pair[1])}`);
      equations++;
    }
    if (!rows.length) return fence;
    const math = `\\begin{aligned}\n${rows.join(' \\\\\n')}\n\\end{aligned}`;
    katex.renderToString(math, { displayMode: true, throwOnError: true, strict: 'error' });
    return `$$\n${math}\n$$` + (source.length ? `\n\nComponent assembly (source syntax):\n\n\`\`\`frees\n${source.join('\n')}\n\`\`\`` : '');
  }));
  if (result !== text) changes.set(file, result);
}
// Validate everything before this mechanical formatting pass writes any file.
for (const [file, text] of changes) fs.writeFileSync(file, text);
console.log(`Converted ${equations} equations in ${changes.size} pages to validated LaTeX.`);
