// Phase Q: named layouts. A layout is the dock's own serialised state plus the
// ribbon tab and density, saved under a name on this device. The live layout
// stays where it was (`frees-dock-layout-v3`, written by the dock on every
// change), so nobody's arrangement is reset by this store appearing.
//
// Desktop and compact arrangements are kept apart: a layout saved on a wide
// screen is not offered on a narrow one, where its widths would not fit.
import type { RibbonDensity } from '../ribbonPrefs'

export const LAYOUTS_KEY = 'frees-layouts-v1'

export type LayoutForm = 'desktop' | 'compact'
export interface SavedLayout {
  name: string
  /** dockview's `toJSON()`: groups, sizes, floating and edge groups, the active panel. */
  dock: unknown
  ribbonTab?: string
  density?: RibbonDensity
}
export interface LayoutStore {
  version: 1
  desktop: SavedLayout[]
  compact: SavedLayout[]
}

export const EMPTY_LAYOUTS: LayoutStore = { version: 1, desktop: [], compact: [] }

export const layoutForm = (width = globalThis.innerWidth ?? 1440): LayoutForm => (width < 1024 ? 'compact' : 'desktop')

const DENSITIES = new Set(['expanded', 'compact', 'collapsed'])
function entries(v: unknown): SavedLayout[] {
  if (!Array.isArray(v)) return []
  const out: SavedLayout[] = []
  for (const e of v as Record<string, unknown>[]) {
    const name = e && typeof e === 'object' && typeof e.name === 'string' ? e.name.trim() : ''
    if (!name || !e.dock || typeof e.dock !== 'object') continue
    if (out.some((x) => x.name.toLowerCase() === name.toLowerCase())) continue
    out.push({
      name,
      dock: e.dock,
      ribbonTab: typeof e.ribbonTab === 'string' ? e.ribbonTab : undefined,
      density: DENSITIES.has(e.density as string) ? (e.density as RibbonDensity) : undefined,
    })
  }
  return out
}

/** The stored layouts. Corrupt storage, or a store from a newer version, reads
 *  as empty; a malformed entry is dropped and the rest are kept. */
export function parseLayouts(raw: string | null): LayoutStore {
  if (!raw) return EMPTY_LAYOUTS
  try {
    const v = JSON.parse(raw) as Record<string, unknown>
    if (!v || typeof v !== 'object' || v.version !== 1) return EMPTY_LAYOUTS
    return { version: 1, desktop: entries(v.desktop), compact: entries(v.compact) }
  } catch {
    return EMPTY_LAYOUTS
  }
}

export function readLayouts(): LayoutStore {
  try {
    return parseLayouts(localStorage.getItem(LAYOUTS_KEY))
  } catch {
    return EMPTY_LAYOUTS
  }
}

/** False when the device would not keep it (quota, or storage unavailable). */
export function writeLayouts(store: LayoutStore): boolean {
  try {
    localStorage.setItem(LAYOUTS_KEY, JSON.stringify(store))
    return true
  } catch {
    return false
  }
}

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

/** Saves `layout`, replacing one of the same name (case ignored). */
export function saveLayout(store: LayoutStore, form: LayoutForm, layout: SavedLayout): LayoutStore {
  const named = { ...layout, name: layout.name.trim() }
  const list = store[form]
  const next = list.some((l) => same(l.name, named.name)) ? list.map((l) => (same(l.name, named.name) ? named : l)) : [...list, named]
  return { ...store, [form]: next }
}

export function deleteLayout(store: LayoutStore, form: LayoutForm, name: string): LayoutStore {
  return { ...store, [form]: store[form].filter((l) => !same(l.name, name)) }
}

/** Renames a layout; null when the new name is empty or already taken. */
export function renameLayout(store: LayoutStore, form: LayoutForm, from: string, to: string): LayoutStore | null {
  const name = to.trim()
  if (!name || store[form].some((l) => same(l.name, name) && !same(l.name, from))) return null
  return { ...store, [form]: store[form].map((l) => (same(l.name, from) ? { ...l, name } : l)) }
}
