// CFG-08/10: the canvas commands, listed once for the command palette and the
// shortcuts sheet. Keys act only while the drawing has focus. `group` is the
// command's group on the ribbon's Schematic tab (Phase P).

export const CANVAS_COMMANDS = [
  { id: 'add', label: 'Add component', keys: ['A'], group: 'Model' },
  { id: 'list', label: 'Component and connection list', keys: ['L'], group: 'Model' },
  { id: 'search', label: 'Search the model', keys: ['/'], group: 'Model' },
  { id: 'fit', label: 'Fit drawing', keys: ['Shift', '1'], group: 'Zoom' },
  { id: 'fit-selection', label: 'Fit selection', keys: ['Shift', '2'], group: 'Zoom' },
  { id: 'select-all', label: 'Select all components', keys: ['Ctrl', 'A'], group: 'Edit' },
  { id: 'duplicate', label: 'Duplicate selection', keys: ['Ctrl', 'D'], group: 'Edit' },
  { id: 'copy', label: 'Copy selection', keys: ['Ctrl', 'C'], group: 'Edit' },
  { id: 'cut', label: 'Cut selection', keys: ['Ctrl', 'X'], group: 'Edit' },
  { id: 'paste', label: 'Paste components', keys: ['Ctrl', 'V'], group: 'Edit' },
  { id: 'delete', label: 'Delete selection…', keys: ['Del'], group: 'Edit' },
  { id: 'undo', label: 'Undo schematic edit', keys: ['Ctrl', 'Z'], group: 'Edit' },
  { id: 'redo', label: 'Redo schematic edit', keys: ['Ctrl', 'Shift', 'Z'], group: 'Edit' },
  { id: 'arrange', label: 'Arrange all', keys: [], group: 'Arrange' },
  { id: 'extract', label: 'Extract subsystem…', keys: [], group: 'Edit' },
  { id: 'tree', label: 'Model tree', keys: [], group: 'Model' },
  { id: 'export', label: 'Export drawing…', keys: [], group: 'Drawing Views' },
] as const

export type CanvasCommand = (typeof CANVAS_COMMANDS)[number]['id']

/** The mounted canvas's handlers, which the palette runs. */
export const canvasHandlers: Partial<Record<CanvasCommand, () => void>> = {}

/** Run `id` once the canvas is mounted (opening its view can mount it a few frames later). */
export function runCanvasCommand(id: CanvasCommand, frames = 30): void {
  const run = canvasHandlers[id]
  if (run) run()
  else if (frames > 0) requestAnimationFrame(() => runCanvasCommand(id, frames - 1))
}

/**
 * CFG-08: the canvas's single-key commands a user can rebind, with their
 * defaults. Chords (Ctrl+…, Shift+digit), Delete and the arrows are platform
 * conventions and stay fixed. The choice is the user's, not the project's,
 * so it lives in this browser's storage.
 */
export const REMAPPABLE = { add: 'a', list: 'l', search: '/' } as const
export type Remappable = keyof typeof REMAPPABLE
export type CanvasKeys = Record<Remappable, string>
const KEYS_STORE = 'frees.canvasKeys'

/** Why `key` cannot take `id`, or null when it can. */
export function keyProblem(keys: CanvasKeys, id: Remappable, key: string): string | null {
  if ([...key].length !== 1 || !key.trim()) return 'One character'
  if (key === '?') return '? opens the shortcuts list'
  const other = (Object.keys(keys) as Remappable[]).find((k) => k !== id && keys[k].toLowerCase() === key.toLowerCase())
  return other ? `Already ${CANVAS_COMMANDS.find((c) => c.id === other)!.label}` : null
}

export function canvasKeys(): CanvasKeys {
  const keys: CanvasKeys = { ...REMAPPABLE }
  try {
    const saved = JSON.parse(localStorage.getItem(KEYS_STORE) ?? '{}') as Partial<CanvasKeys>
    for (const id of Object.keys(REMAPPABLE) as Remappable[]) {
      const key = saved[id]
      if (typeof key === 'string' && !keyProblem(keys, id, key)) keys[id] = key.toLowerCase()
    }
  } catch {
    // No storage, or a damaged entry: the defaults stand.
  }
  return keys
}

export function saveCanvasKeys(keys: CanvasKeys): void {
  try {
    localStorage.setItem(KEYS_STORE, JSON.stringify(keys))
  } catch {
    // Private mode: the keys last this session only.
  }
}

/** The keys a command is shown with, after any rebinding. */
export function keysOf(c: (typeof CANVAS_COMMANDS)[number], keys: CanvasKeys = canvasKeys()): readonly string[] {
  return c.id in keys ? [keys[c.id as Remappable].toUpperCase()] : c.keys
}
