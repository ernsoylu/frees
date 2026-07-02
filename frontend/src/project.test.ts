// Project-file round-trip + migration tests for the v2 `analyzers` slice
// (Data Analyzer template mode, todo.md Phase 2): the .frees file stores
// layout + signal assignments + file signatures — refs only, never samples.

import { describe, expect, it, beforeEach } from 'vitest'
import { DEFAULT_STOP_CRITERIA } from './api'
import type { AnalyzerSpec } from './analyzer/types'
import {
  buildProject,
  loadProjectLocal,
  readProjectFile,
  saveProjectLocal,
  type ProjectSlices,
} from './project'

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
  whiteboards: [],
  spreadsheets: [],
  analyzers: [analyzer],
}

function asFile(payload: unknown): File {
  // jsdom's File lacks .text(); readProjectFile only needs that one method.
  return { text: async () => JSON.stringify(payload) } as unknown as File
}

beforeEach(() => localStorage.clear())

describe('project v2 analyzers slice', () => {
  it('buildProject carries the analyzers slice at version 2', () => {
    const p = buildProject(slices)
    expect(p.version).toBe(2)
    expect(p.analyzers).toHaveLength(1)
    expect(p.analyzers[0].files[0].signature.headerHash).toBe('ff00aa11')
  })

  it('round-trips through the local autosave (sanitize path)', () => {
    saveProjectLocal(buildProject(slices))
    const back = loadProjectLocal()
    expect(back?.analyzers).toHaveLength(1)
    expect(back?.analyzers[0].strips[1].signals[0].channel).toBe('valve')
    expect(back?.analyzers[0].strips[0].signals[0].color).toBe('#4dabf7')
  })

  it('reads a v2 file and preserves analyzer refs (never bulk data)', async () => {
    const p = await readProjectFile(asFile(buildProject(slices)))
    expect(p.analyzers).toHaveLength(1)
    expect(p.analyzers[0].files[0].measurementId).toBe('m1')
    expect(JSON.stringify(p.analyzers)).not.toContain('samples')
  })

  it('migrates a v1 file (no analyzers slice) to an empty array', async () => {
    const v1 = { ...buildProject({ ...slices, analyzers: [] }), version: 1 } as Record<string, unknown>
    delete v1.analyzers
    const p = await readProjectFile(asFile(v1))
    expect(p.version).toBe(2)
    expect(p.analyzers).toEqual([])
  })

  it('rejects files written by a newer version', async () => {
    const future = { ...buildProject(slices), version: 99 }
    await expect(readProjectFile(asFile(future))).rejects.toThrow(/newer version/)
  })
})
