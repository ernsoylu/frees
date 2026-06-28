import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DOCS_DIR = path.join(__dirname, '../src/docs');
const OUTPUT_FILE = path.join(__dirname, '../src/docsCatalog.ts');

function compileDocs() {
  console.log('Compiling documentation markdown files...');
  if (!fs.existsSync(DOCS_DIR)) {
    console.error(`Docs directory not found: ${DOCS_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(DOCS_DIR).filter(file => file.endsWith('.md'));
  const catalog = {};

  for (const file of files) {
    const filepath = path.join(DOCS_DIR, file);
    const content = fs.readFileSync(filepath, 'utf-8');
    const lines = content.split('\n');

    let currentTopic = null;
    let currentContent = [];

    for (const line of lines) {
      const match = line.match(/^\[Topic:\s*([a-zA-Z0-9_-]+)\]/);
      if (match) {
        if (currentTopic) {
          catalog[currentTopic] = currentContent.join('\n').trim();
        }
        currentTopic = match[1];
        currentContent = [];
      } else {
        if (currentTopic) {
          currentContent.push(line);
        }
      }
    }
    if (currentTopic) {
      catalog[currentTopic] = currentContent.join('\n').trim();
    }
  }

  // Generate TypeScript code
  let tsCode = `// GENERATED FILE - DO NOT EDIT DIRECTLY.
// Edit the markdown files in src/docs/ and compile using npm run compile-docs.

export const DOCS_CATALOG: Record<string, string> = {
`;

  for (const [key, value] of Object.entries(catalog)) {
    // Escape backticks and backslashes for JS template literals
    const escapedValue = value
      .replace(/\\/g, '\\\\')
      .replace(/`/g, '\\`')
      .replace(/\${/g, '\\${');
    tsCode += `  "${key}": \`${escapedValue}\`,\n`;
  }

  tsCode += '};\n';

  fs.writeFileSync(OUTPUT_FILE, tsCode, 'utf-8');
  console.log(`Successfully compiled ${Object.keys(catalog).length} topics to ${OUTPUT_FILE}`);
}

// ── Reference pages: src/docs/reference/**/*.md → referenceCatalog.ts ─────────
const REF_DIR = path.join(DOCS_DIR, 'reference');
const REF_OUTPUT = path.join(__dirname, '../src/referenceCatalog.ts');

// Minimal YAML-subset frontmatter parser: scalars, inline [a, b] arrays, and
// block list values (lines beginning with "- "). Sufficient for our schema.
function parseFrontmatter(fm) {
  const out = {};
  const lines = fm.split('\n');
  let listKey = null;
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    const listItem = line.match(/^\s*-\s+(.*)$/);
    if (listKey && listItem) {
      out[listKey].push(stripQuotes(listItem[1]));
      continue;
    }
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (!kv) continue;
    const [, key, val] = kv;
    if (val === '') { listKey = key; out[key] = []; continue; }
    listKey = null;
    if (val.startsWith('[') && val.endsWith(']')) {
      out[key] = val.slice(1, -1).split(',').map((s) => stripQuotes(s.trim())).filter(Boolean);
    } else {
      out[key] = stripQuotes(val);
    }
  }
  return out;
}
const stripQuotes = (s) => s.replace(/^["']|["']$/g, '');

function compileReference() {
  if (!fs.existsSync(REF_DIR)) {
    fs.writeFileSync(REF_OUTPUT, referenceModule([]), 'utf-8');
    return;
  }
  const pages = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(p); continue; }
      if (!entry.name.endsWith('.md') || entry.name.startsWith('_')) continue;
      const raw = fs.readFileSync(p, 'utf-8');
      const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
      if (!m) continue; // skip files without frontmatter (README, etc.)
      const fm = parseFrontmatter(m[1]);
      if (!fm.name) continue;
      pages.push({
        name: fm.name,
        slug: fm.name.toLowerCase(),
        category: fm.category || 'Uncategorized',
        summary: fm.summary || '',
        related: fm.related || [],
        examples: fm.examples || [],
        tags: fm.tags || [],
        references: fm.references || [],
        body: m[2].trim(),
      });
    }
  };
  walk(REF_DIR);
  pages.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  fs.writeFileSync(REF_OUTPUT, referenceModule(pages), 'utf-8');
  console.log(`Successfully compiled ${pages.length} reference pages to ${REF_OUTPUT}`);
}

function referenceModule(pages) {
  const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
  const body = pages.map((p) => {
    const arr = (a) => '[' + a.map((x) => `\`${esc(x)}\``).join(', ') + ']';
    return `  {
    name: \`${esc(p.name)}\`,
    slug: \`${esc(p.slug)}\`,
    category: \`${esc(p.category)}\`,
    summary: \`${esc(p.summary)}\`,
    related: ${arr(p.related)},
    examples: ${arr(p.examples)},
    tags: ${arr(p.tags)},
    references: ${arr(p.references)},
    body: \`${esc(p.body)}\`,
  }`;
  }).join(',\n');
  return `// GENERATED FILE - DO NOT EDIT DIRECTLY.
// Compiled from src/docs/reference/**/*.md by scripts/compile-docs.js (npm run compile-docs).

export interface ReferencePage {
  name: string;
  slug: string;
  category: string;
  summary: string;
  related: string[];
  examples: string[];
  tags: string[];
  references: string[];
  body: string;
}

export const REFERENCE_PAGES: ReferencePage[] = [
${body}
];
`;
}

compileDocs();
compileReference();
