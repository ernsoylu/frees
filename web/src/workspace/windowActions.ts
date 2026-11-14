// Phase Q: what can be done to a dock window, and why not when it cannot. Pure
// functions of the dock's window list, so the registry commands, the tab
// context menu and the Window List all give the same answer.

/** A window currently open in the dock, as dockview holds it. */
export interface DockWindow {
  id: string
  kind: string
  title: string
  /** The dockview group it is a tab of. */
  group: string
  place: 'grid' | 'floating' | 'edge'
  maximized: boolean
}

export const WINDOW_ACTIONS = [
  'close', 'closeOthers', 'closeGroup', 'float', 'maximize',
  'moveEdge', 'moveCentre', 'moveLeft', 'moveRight', 'moveBelow',
] as const
export type WindowAction = (typeof WINDOW_ACTIONS)[number]

/** Why `action` cannot run on window `id` now; null when it can. */
export function windowActionReason(windows: readonly DockWindow[], id: string | undefined, action: WindowAction): string | null {
  const w = windows.find((x) => x.id === id)
  if (!w) return 'No window is focused.'
  const tabs = windows.filter((x) => x.group === w.group).length
  switch (action) {
    case 'close':
    case 'closeGroup':
    case 'float':
      return null
    case 'closeOthers':
      return tabs > 1 ? null : 'It is the only tab in its group.'
    case 'maximize':
      return w.place === 'grid' ? null : 'Only a window docked in the centre can be maximized: move it to the centre first.'
    case 'moveEdge':
      return w.place === 'edge' ? 'It is already in the edge panel.' : null
    case 'moveCentre':
      return w.place !== 'grid' ? null : 'It is already docked in the centre.'
    case 'moveLeft':
    case 'moveRight':
    case 'moveBelow':
      if (w.place !== 'grid') return 'Move it to the centre first.'
      return tabs > 1 ? null : 'It is the only tab in its group, so there is nothing to split it from.'
  }
}

const KIND_GROUPS: Record<string, string> = {
  equations: 'Editor', table: 'Tables', plot: 'Plots', plots: 'Plots', states: 'Fluid States',
  schematic: 'Schematic', digitizer: 'Digitizer', spreadsheet: 'Tables',
  workspace: 'Panels', inspector: 'Panels', terminal: 'Panels', solution: 'Panels',
}

/** The Window List's rows: windows matching `query`, grouped by kind in the dock's order. */
export function groupWindows(windows: readonly DockWindow[], query = ''): { label: string; windows: DockWindow[] }[] {
  const q = query.trim().toLowerCase()
  const out = new Map<string, DockWindow[]>()
  for (const w of windows) {
    const label = KIND_GROUPS[w.kind] ?? 'Other'
    if (q && !w.title.toLowerCase().includes(q) && !label.toLowerCase().includes(q)) continue
    out.set(label, [...(out.get(label) ?? []), w])
  }
  return [...out].map(([label, ws]) => ({ label, windows: ws }))
}
