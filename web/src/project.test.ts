// Project-file round-trip + migration tests.
//
// v2 `analyzers` slice: written by the Data Analyzer in "template mode" —
// layout + signal assignments + file signatures, refs only, never samples.
// The FEATURE is removed (decision D11) and the slice is now **inert**: it is
// parsed, carried and re-serialized untouched so an old session survives a
// round-trip through a build that can no longer show it. That is what the
// first group asserts, and it is the compatibility policy in test form.
//
// v3 `schematic` slice: where the user had dragged each block, as offsets from
// the layout. v4 replaces it with the presentation (absolute positions, locks,
// areas, view settings); v3 offsets carry over for migration.

import { describe, expect, it, beforeEach } from 'vitest'
import { DEFAULT_STOP_CRITERIA } from './api'
import {
  buildProject,
  loadProjectLocal,
  projectOnlyNotes,
  readProjectFile,
  saveProjectLocal,
  type AnalyzerSpec,
  type ProjectSlices,
} from './project'
import { DEFAULT_DRAFT } from './VariableInfoModal'
import { EMPTY_PRESENTATION, type SchematicPresentation } from './schematic/presentation'

// A real Phase-2 analyzer session, in the shape the removed feature wrote it.
const analyzer: AnalyzerSpec = {
  id: 'a1',
  name: 'Analyzer 1',
  files: [
    { measurementId: 'm1', signature: { name: 'run1.csv', size: 12345, headerHash: 'ff00aa11' } },
  ],
  strips: [
    { id: 's1', signals: [{ measurementId: 'm1', channel: 'speed', color: '#4dabf7' }] },
    { id: 's2', signals: [{ measurementId: 'm1', channel: 'valve', color: '#ffa94d' }] },
  ],
}

const slices: ProjectSlices = {
  text: 'x = 1',
  varDrafts: {},
  stopCriteria: DEFAULT_STOP_CRITERIA,
  unitSystem: 'SI',
  fillMissing: false,
  stateUnitIds: {},
  tables: [],
  plots: [],
  spreadsheets: [],
  analyzers: [analyzer],
}

function asFile(payload: unknown): File {
  // jsdom's File lacks .text(); readProjectFile only needs that one method.
  return { text: async () => JSON.stringify(payload) } as unknown as File
}

beforeEach(() => localStorage.clear())

describe('project v2 analyzers slice (inert since D11)', () => {
  it('buildProject carries the analyzers slice at the current version', () => {
    const p = buildProject(slices)
    expect(p.version).toBe(4)
    expect(p.analyzers).toEqual([analyzer])
  })

  it('round-trips through the local autosave whole and unchanged', () => {
    saveProjectLocal(buildProject(slices))
    // Deep equality, not a spot check: nothing renders these any more, so the
    // only guarantee worth having is that every field comes back untouched.
    expect(loadProjectLocal()?.analyzers).toEqual([analyzer])
  })

  it('reads a v2 file and preserves analyzer refs (never bulk data)', async () => {
    const p = await readProjectFile(asFile(buildProject(slices)))
    expect(p.analyzers).toEqual([analyzer])
    expect(JSON.stringify(p.analyzers)).not.toContain('samples')
  })

  it('migrates a v1 file (no analyzers slice) to an empty array', async () => {
    const v1 = { ...buildProject({ ...slices, analyzers: [] }), version: 1 } as Record<string, unknown>
    delete v1.analyzers
    const p = await readProjectFile(asFile(v1))
    expect(p.version).toBe(4)
    expect(p.analyzers).toEqual([])
  })

  it('rejects files written by a newer version', async () => {
    const future = { ...buildProject(slices), version: 99 }
    await expect(readProjectFile(asFile(future))).rejects.toThrow(/newer version/)
  })
})

describe('project v4 schematic presentation', () => {
  const placed: SchematicPresentation = {
    ...EMPTY_PRESENTATION,
    positions: { bcp: { x: 60, y: 240 }, batt: { x: -12.5, y: 0 } },
    locked: ['bcp'],
    areas: [{ id: 'a1', label: 'Battery loop', members: ['bcp', 'batt'] }],
    view: { ...EMPTY_PRESENTATION.view, orientation: 'vertical', snap: true },
  }

  it('round-trips positions, locks, areas and view settings through the autosave', () => {
    saveProjectLocal(buildProject({ ...slices, schematic: placed }))
    expect(loadProjectLocal()?.schematic).toEqual(placed)
  })

  it('round-trips through a saved file', async () => {
    const p = await readProjectFile(asFile(buildProject({ ...slices, schematic: placed })))
    expect(p.schematic).toEqual(placed)
    expect(p.schematicRepaired).toBeUndefined()
  })

  it('carries v3 offsets over for migration against the legacy layout', async () => {
    const v3 = { ...buildProject(slices), version: 3, schematic: { bcp: { dx: 60, dy: 240 } } }
    const p = await readProjectFile(asFile(v3))
    expect(p.version).toBe(4)
    expect(p.schematic).toEqual({ ...EMPTY_PRESENTATION, legacyOffsets: { bcp: { dx: 60, dy: 240 } } })
  })

  it('validates v3 offsets as v3 did: finite pairs only, absurd ones clamped', async () => {
    const p = await readProjectFile(
      asFile({
        ...buildProject(slices),
        version: 3,
        schematic: { good: { dx: 1, dy: 2 }, nan: { dx: Number.NaN, dy: 2 }, text: { dx: '10', dy: 2 }, nul: null, far: { dx: 1e12, dy: -1e12 } },
      }),
    )
    expect(p.schematic?.legacyOffsets).toEqual({ good: { dx: 1, dy: 2 }, far: { dx: 100_000, dy: -100_000 } })
    expect(p.schematicRepaired).toBe(3)
  })

  it('migrates a pre-v3 file to an empty presentation', async () => {
    const v2 = { ...buildProject(slices), version: 2 } as Record<string, unknown>
    delete v2.schematic
    const p = await readProjectFile(asFile(v2))
    expect(p.schematic).toEqual(EMPTY_PRESENTATION)
  })

  it('drops and counts malformed v4 entries, keeping the valid ones and the document', async () => {
    const p = await readProjectFile(
      asFile({
        ...buildProject(slices),
        schematic: {
          positions: { good: { x: 1, y: 2 }, inf: { x: Infinity, y: 0 }, far: { x: 1e9, y: 0 }, text: { x: '1', y: 2 } },
          locked: ['good', 7],
          areas: [{ id: 'a', label: 'ok', members: ['good'] }, { id: 'b', label: 'bad', members: [1] }],
          view: { orientation: 'diagonal', grid: 16, snap: 'yes' },
        },
      }),
    )
    expect(p.text).toBe(slices.text)
    expect(p.schematic).toEqual({
      ...EMPTY_PRESENTATION,
      positions: { good: { x: 1, y: 2 } },
      locked: ['good'],
      areas: [{ id: 'a', label: 'ok', members: ['good'] }],
    })
    expect(p.schematicRepaired).toBe(3 + 1 + 1 + 2)
  })

  it('never saves the repair count', () => {
    saveProjectLocal({ ...buildProject(slices), schematicRepaired: 4 })
    expect(loadProjectLocal()?.schematicRepaired).toBeUndefined()
  })

  it('ignores a non-object schematic slice', async () => {
    for (const bad of [[], 'nope', 42]) {
      const p = await readProjectFile(asFile({ ...buildProject(slices), schematic: bad }))
      expect(p.schematic).toEqual(EMPTY_PRESENTATION)
    }
  })
})

describe('projectOnlyNotes', () => {
  it('is empty when only equation text would travel', () => {
    expect(projectOnlyNotes({ ...slices, analyzers: [] })).toEqual([])
  })

  it('names GUI tables, guesses, and layout that Export equation text drops', () => {
    const notes = projectOnlyNotes({
      ...slices,
      varDrafts: { x: { ...DEFAULT_DRAFT, guess: '2' } },
      tables: [{ id: 't1', name: 'map', kind: 'function', columns: [], rows: [] } as never],
      schematic: { ...EMPTY_PRESENTATION, positions: { p1: { x: 1, y: 0 } } },
    })
    expect(notes.join(' ')).toMatch(/Variable Information/)
    expect(notes.join(' ')).toMatch(/GUI table/)
    expect(notes.join(' ')).toMatch(/schematic layout/)
    expect(notes.join(' ')).toMatch(/legacy analyzer/)
  })
})

describe('import validation (CFG-07)', () => {
  it('refuses a file larger than any project before reading it', async () => {
    let read = false
    const huge = { size: 65 * 1024 * 1024, text: async () => ((read = true), '{}') } as unknown as File
    await expect(readProjectFile(huge)).rejects.toThrow(/at most 64 MB/)
    expect(read).toBe(false)
  })
})
