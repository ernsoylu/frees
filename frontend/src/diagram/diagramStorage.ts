import { DEFAULT_DIAGRAM_STATE, DiagramSpec } from './types'

// Diagram persistence helpers, split out of the (large) DiagramTab component
// module so the editor shell can load/save diagrams eagerly while the heavy
// DiagramTab UI is code-split and only fetched when its tab is opened.

const DIAGRAMS_STORAGE_KEY = 'frees-diagrams'

export function loadDiagrams(): DiagramSpec[] {
  try {
    const raw = localStorage.getItem(DIAGRAMS_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {}

  // Fallback to legacy single diagram:
  try {
    const rawLegacy = localStorage.getItem('frees-diagram-v1')
    if (rawLegacy) {
      const parsed = JSON.parse(rawLegacy)
      if (Array.isArray(parsed.elements)) {
        const legacySpec: DiagramSpec = {
          id: crypto.randomUUID(),
          name: 'Main Diagram',
          state: parsed,
        }
        const initial = [legacySpec]
        localStorage.setItem(DIAGRAMS_STORAGE_KEY, JSON.stringify(initial))
        return initial
      }
    }
  } catch {}

  const initial: DiagramSpec[] = [
    {
      id: 'default',
      name: 'Main Diagram',
      state: DEFAULT_DIAGRAM_STATE,
    },
  ]
  return initial
}

/** Broadcast name for save failures so the diagram window can warn the user. */
export const DIAGRAM_SAVE_ERROR_EVENT = 'frees-diagram-save-error'

/**
 * Persist all diagrams. Returns false on failure (most commonly a
 * localStorage quota overflow from large embedded images) and broadcasts an
 * event so the UI can surface it — previously failures were swallowed
 * silently, so the user could lose work without any warning.
 */
export function saveDiagrams(diagrams: DiagramSpec[]): boolean {
  try {
    localStorage.setItem(DIAGRAMS_STORAGE_KEY, JSON.stringify(diagrams))
    return true
  } catch (err) {
    const message =
      err instanceof DOMException && /quota/i.test(err.name + err.message)
        ? 'Storage is full — the diagram could not be saved. Large embedded images are the usual cause; remove or shrink them, or export the diagram as JSON to keep a copy.'
        : 'The diagram could not be saved to local storage.'
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(DIAGRAM_SAVE_ERROR_EVENT, { detail: message }))
    }
    return false
  }
}
