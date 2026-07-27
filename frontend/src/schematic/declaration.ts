// Locating a component instance's declaration in the document text, so
// clicking a node in the schematic can reveal the line that created it.
// Text-scanning (the same approach the PID loop analysis uses) rather than a
// backend line number: the AST carries no source positions, and the text is
// right here.

/**
 * The 1-based line declaring `instance`, or null when it isn't found.
 * Component instantiation is `Type Instance(params…)`, so the instance name
 * is the second identifier on its line. Matching is case-insensitive (frees
 * names are), skips comment lines, and ignores a match inside a `connect(…)`
 * or an equation, where the name appears as a reference rather than a
 * declaration.
 */
export function declarationLine(text: string, instance: string): number | null {
  if (!text || !instance) {
    return null
  }
  const escaped = instance.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)
  const declaration = new RegExp(String.raw`^\s*[A-Za-z_][\w$]*\s+` + escaped + String.raw`\s*\(`, 'i')
  const lines = text.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trimStart()
    if (trimmed.startsWith('//') || trimmed.startsWith('{')) {
      continue
    }
    if (/^\s*connect\s*\(/i.test(line)) {
      continue
    }
    if (declaration.test(line)) {
      return i + 1
    }
  }
  return null
}

/**
 * Instance name → component type, read straight from the document.
 *
 * The solve response also carries this, but only after a network solves —
 * and a network being wired is exactly one that does not yet solve. The text
 * is the source of truth and is always available, so wiring reads from it.
 */
export function instanceTypes(text: string): Map<string, string> {
  const out = new Map<string, string>()
  if (!text) {
    return out
  }
  for (const rawLine of text.split('\n')) {
    const line = rawLine.replace(/\{[^}]*\}/g, '').trim()
    if (line.startsWith('//') || /^(connect|component|function|procedure|module|table|parametric|dynamic|linearize|plot|state)\b/i.test(line)) {
      continue
    }
    // `Type Name(...)` — two identifiers then an open paren.
    const m = /^([A-Za-z_]\w*)\s+([A-Za-z_]\w*)\s*\(/.exec(line)
    if (m) {
      out.set(m[2].toLowerCase(), m[1])
    }
  }
  return out
}
