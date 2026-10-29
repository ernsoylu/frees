// CFG-08/10: the canvas commands, listed once for the command palette and the
// shortcuts sheet. Keys act only while the drawing has focus.

export const CANVAS_COMMANDS = [
  { id: 'add', label: 'Add component', keys: ['A'] },
  { id: 'list', label: 'Component and connection list', keys: ['L'] },
  { id: 'search', label: 'Search the model', keys: ['/'] },
  { id: 'fit', label: 'Fit drawing', keys: ['Shift', '1'] },
  { id: 'fit-selection', label: 'Fit selection', keys: ['Shift', '2'] },
  { id: 'select-all', label: 'Select all components', keys: ['Ctrl', 'A'] },
  { id: 'duplicate', label: 'Duplicate selection', keys: ['Ctrl', 'D'] },
  { id: 'copy', label: 'Copy selection', keys: ['Ctrl', 'C'] },
  { id: 'cut', label: 'Cut selection', keys: ['Ctrl', 'X'] },
  { id: 'paste', label: 'Paste components', keys: ['Ctrl', 'V'] },
  { id: 'delete', label: 'Delete selection…', keys: ['Del'] },
  { id: 'undo', label: 'Undo schematic edit', keys: ['Ctrl', 'Z'] },
  { id: 'redo', label: 'Redo schematic edit', keys: ['Ctrl', 'Shift', 'Z'] },
  { id: 'arrange', label: 'Arrange all', keys: [] },
  { id: 'extract', label: 'Extract subsystem…', keys: [] },
  { id: 'tree', label: 'Model tree', keys: [] },
  { id: 'export', label: 'Export drawing…', keys: [] },
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
