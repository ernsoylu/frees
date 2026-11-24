// FX0 (external review, 2026-11-23): ordinary project workflows that lost work.
// The real App, with the dock reduced to the one panel a test drives and the
// engine stubbed one layer below api.ts. IndexedDB is fake-indexeddb.
//
// U01: the boot autosave overwrote the newer IndexedDB copy the recovery prompt
//      was offering, 800 ms after mount and without any edit.
// U02: a scenario-only edit did not mark the project dirty, so New/Open
//      discarded it without the save check.
import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { IDBFactory } from 'fake-indexeddb'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { DEFAULT_STOP_CRITERIA } from './api'
import { buildProject, type FreesProject } from './project'
import { __resetProjectStoreForTests, readAutosaveMirror, writeAutosaveMirror } from './projectStore'
import { EMPTY_PRESENTATION } from './schematic/presentation'

// dockview does not lay out in jsdom; render only the Runs & Scenarios panel.
vi.mock('./workspace/WorkspaceDock', async () => {
  const { useEffect } = await import('react')
  return {
    WorkspaceDock: ({ content, onActiveChange, handleRef }: {
      content: Record<string, React.ReactNode>
      onActiveChange?: (w: { id: string; kind: string; title: string }) => void
      handleRef?: { current: unknown }
    }) => {
      useEffect(() => {
        if (handleRef) {
          handleRef.current = {
            open() {}, openInstance() {}, close() {}, setTitle() {}, isOpen: () => false,
            reset() {}, restore() {}, applyPerspective() {},
          }
        }
        onActiveChange?.({ id: 'equations', kind: 'equations', title: 'equations' })
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [])
      return <div>{content.runs}</div>
    },
  }
})

vi.mock('./wasm/engineClient', async (orig) => {
  const real = await orig<Record<string, unknown>>()
  const stubbed: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(real)) stubbed[k] = typeof v === 'function' ? vi.fn(async () => ({})) : v
  stubbed.wasmCheck = vi.fn(async () => ({
    solvable: true, equations: 1, unknowns: 1, variables: ['x'], unitWarnings: [], inferredUnits: {}, message: 'ok',
  }))
  return stubbed
})

function project(text: string, savedAt: string): FreesProject {
  const p = buildProject({
    text, varDrafts: {}, stopCriteria: DEFAULT_STOP_CRITERIA, unitSystem: 'SI', fillMissing: false,
    stateUnitIds: {}, tables: [], plots: [], spreadsheets: [], analyzers: [], sliders: [],
    schematic: EMPTY_PRESENTATION,
  })
  return { ...p, savedAt }
}

const localText = () => (JSON.parse(localStorage.getItem('frees.project') ?? 'null') as FreesProject | null)?.text

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
  HTMLElement.prototype.scrollIntoView = () => {}
  Range.prototype.getClientRects = () => [] as unknown as DOMRectList
  Range.prototype.getBoundingClientRect = () => new DOMRect()
  const view = document.defaultView!
  const computed = view.getComputedStyle.bind(view)
  const safe = (el: Element, pseudo?: string | null) => {
    try {
      return computed(el, pseudo)
    } catch {
      return document.createElement('div').style
    }
  }
  vi.stubGlobal('getComputedStyle', safe)
  vi.spyOn(view, 'getComputedStyle').mockImplementation(safe)
  localStorage.clear()
  localStorage.setItem('frees.firstRunDismissed', 'true')
  localStorage.setItem('frees.gettingStartedSeen', 'true')
  localStorage.setItem('frees.ribbon', '1') // the status bar, which reports unsaved changes
  globalThis.indexedDB = new IDBFactory()
  __resetProjectStoreForTests()
})

afterEach(() => vi.unstubAllGlobals())

async function mountApp() {
  const { default: App } = await import('./App')
  render(<MantineProvider env="test"><Notifications /><App /></MantineProvider>)
}

it('U01: keeps the newer autosave mirror while its recovery prompt is unanswered, then restores it', async () => {
  localStorage.setItem('frees.project', JSON.stringify(project('old = 1', '2026-11-20T10:00:00.000Z')))
  await writeAutosaveMirror(project('newer = 2', '2026-11-21T10:00:00.000Z'))
  await mountApp()
  await screen.findByText('A newer autosave exists in browser storage', {}, { timeout: 10_000 })

  // Past the 800 ms boot autosave, with no answer given: the mirror survives.
  await act(() => new Promise((r) => setTimeout(r, 1_500)))
  expect((await readAutosaveMirror())?.text).toBe('newer = 2')

  fireEvent.click(screen.getByText('Restore newer autosave'))
  await waitFor(() => expect(localText()).toBe('newer = 2'))
  expect((await readAutosaveMirror())?.text).toBe('newer = 2')
}, 30_000)

it('U02: a scenario-only edit marks a clean project unsaved', async () => {
  // A clean state the way a user reaches one: a load. Restore runs the same
  // applyProject as Open, which clears the dirty flag.
  localStorage.setItem('frees.project', JSON.stringify(project('old = 1', '2026-11-20T10:00:00.000Z')))
  await writeAutosaveMirror(project('x = 1', '2026-11-21T10:00:00.000Z'))
  await mountApp()
  fireEvent.click(await screen.findByText('Restore newer autosave', {}, { timeout: 10_000 }))
  const status = () => screen.getByText(/changes saved|Unsaved changes/).textContent ?? ''
  await waitFor(() => expect(status()).toMatch(/^All changes saved/))

  fireEvent.click(await screen.findByRole('button', { name: 'New' }))
  fireEvent.change(screen.getByLabelText('Scenario name'), { target: { value: 'Cold start' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))

  await waitFor(() => expect(status()).toMatch(/^Unsaved changes/))
}, 30_000)
