// Parse every display formula with the same renderer used by Help.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import katex from 'katex';

const root = fileURLToPath(new URL('../src/docs/', import.meta.url));
let count = 0;
const errors = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) { walk(file); continue; }
    if (!entry.name.endsWith('.md') || entry.name.startsWith('_')) continue;
    const source = fs.readFileSync(file, 'utf8').replace(/```[^\n]*\n[\s\S]*?```/g, '');
    for (const match of source.matchAll(/\$\$([\s\S]*?)\$\$/g)) {
      count++;
      try { katex.renderToString(match[1], { displayMode: true, throwOnError: true, strict: 'ignore' }); }
      catch (error) { errors.push(`${path.relative(root, file)}: ${error.message}`); }
    }
    if ((source.match(/\$\$/g) || []).length % 2) errors.push(`${file}: unmatched display-math delimiter`);
  }
}
walk(root);
for (const error of errors) console.error(error);
console.log(`doc-math: ${count} display formulas checked; ${errors.length} errors.`);
if (errors.length) process.exitCode = 1;
