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

compileDocs();
