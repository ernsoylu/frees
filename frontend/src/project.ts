// Story 10.10: Unified project file (`.frees` JSON).
//
// A single document capturing the entire workspace — equation text, Variable
// Information, parametric/function tables, plots, digitizer state, and all
// diagrams — so a model can be saved to and opened from one file, and
// autosaved/restored across reloads. This supersedes the scattered per-feature
// localStorage keys: on save everything is collected into one object written to
// `frees.project`; the legacy keys remain only as a one-time migration source.

import type { StopCriteria, UnitSystem } from './api'
import type { VariableDraft } from './VariableInfoModal'
import type { TableSpec } from './tables'
import type { PlotSpec } from './plots/types'
import type { DiagramSpec } from './diagram/types'

export const PROJECT_VERSION = 1
export const PROJECT_KEY = 'frees.project'

// Child-owned localStorage keys bridged into the project file. These mirror the
// literals used inside DiagramTab.tsx and DigitizerTab.tsx; the project file is
// the source of truth, those keys act as the components' local cache.
const CUSTOM_COMPONENTS_KEY = 'frees-custom-components'
const DIGITIZER_KEY = 'frees-digitizer'

/** The in-memory workspace slices owned by App.tsx that make up a project. */
export interface ProjectSlices {
  text: string
  varDrafts: Record<string, VariableDraft>
  stopCriteria: StopCriteria
  unitSystem: UnitSystem
  fillMissing: boolean
  stateUnitIds: Record<string, string>
  tables: TableSpec[]
  plots: PlotSpec[]
  diagrams: DiagramSpec[]
}

export interface FreesProject extends ProjectSlices {
  version: number
  savedAt: string
  // Bridged from child-owned localStorage; opaque to App.
  customComponents: unknown
  digitizer: unknown
}

function readJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/** Assemble a complete project from App's slices plus the bridged child state. */
export function buildProject(slices: ProjectSlices): FreesProject {
  return {
    version: PROJECT_VERSION,
    savedAt: new Date().toISOString(),
    ...slices,
    customComponents: readJson(CUSTOM_COMPONENTS_KEY),
    digitizer: readJson(DIGITIZER_KEY),
  }
}

/**
 * Write the child-owned slices back to their localStorage caches so that
 * remounting DigitizerTab / DiagramTab restores them from an opened project.
 */
export function writeBridgedKeys(project: FreesProject) {
  try {
    if (project.customComponents != null) {
      localStorage.setItem(CUSTOM_COMPONENTS_KEY, JSON.stringify(project.customComponents))
    } else {
      localStorage.removeItem(CUSTOM_COMPONENTS_KEY)
    }
    if (project.digitizer != null) {
      localStorage.setItem(DIGITIZER_KEY, JSON.stringify(project.digitizer))
    } else {
      localStorage.removeItem(DIGITIZER_KEY)
    }
  } catch {
    // Quota or serialization failures are non-fatal; the in-memory state still loads.
  }
}

export function saveProjectLocal(project: FreesProject) {
  try {
    localStorage.setItem(PROJECT_KEY, JSON.stringify(project))
  } catch {
    // Autosave is best-effort; ignore quota errors.
  }
}

export function loadProjectLocal(): FreesProject | null {
  const raw = readJson(PROJECT_KEY)
  return raw ? migrate(raw as FreesProject) : null
}

export function clearProjectLocal() {
  try {
    localStorage.removeItem(PROJECT_KEY)
  } catch {
    // ignore
  }
}

/** Normalize a parsed project to the current version, filling missing slices. */
function migrate(p: FreesProject): FreesProject {
  return {
    version: PROJECT_VERSION,
    savedAt: p.savedAt ?? new Date().toISOString(),
    text: p.text ?? '',
    varDrafts: p.varDrafts ?? {},
    stopCriteria: p.stopCriteria,
    unitSystem: p.unitSystem ?? 'SI',
    fillMissing: Boolean(p.fillMissing),
    stateUnitIds: p.stateUnitIds ?? {},
    tables: p.tables ?? [],
    plots: p.plots ?? [],
    diagrams: p.diagrams ?? [],
    customComponents: p.customComponents ?? null,
    digitizer: p.digitizer ?? null,
  }
}

function sanitizeFilename(name: string): string {
  const base = name.trim().replace(/\.frees$/i, '').replace(/[^\w.-]+/g, '_')
  return `${base || 'untitled'}.frees`
}

/** Trigger a browser download of the project as a `.frees` JSON file. */
export function downloadProject(project: FreesProject, filename: string) {
  const blob = new Blob([JSON.stringify(project, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = sanitizeFilename(filename)
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/** Read and validate an opened `.frees` file. */
export async function readProjectFile(file: File): Promise<FreesProject> {
  const raw = await file.text()
  const parsed = JSON.parse(raw)
  if (!parsed || typeof parsed !== 'object' || !('version' in parsed)) {
    throw new Error('Not a valid .frees project file.')
  }
  if ((parsed as FreesProject).version > PROJECT_VERSION) {
    throw new Error(
      `This project was saved by a newer version of frees (v${(parsed as FreesProject).version}).`,
    )
  }
  return migrate(parsed as FreesProject)
}
