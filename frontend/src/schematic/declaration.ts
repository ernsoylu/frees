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
