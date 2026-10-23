// Request races at the App level: the real App, with the engine stubbed one
// layer below api.ts so the real request/response mapping runs.
//
// T3: a table edit made while that table's solve is in flight must discard
// the late result. Two guards decide it — the model revision, and the
// table's own inputs compared against the snapshot the solve was sent. The
// input comparison is what holds even when an edit path forgets to advance
// the revision, so it is pinned on its own below; the App-level test then
// drives a real workbook edit through the whole stack.
import { MantineProvider } from '@mantine/core'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { DEFAULT_STOP_CRITERIA } from './api'
import { newParamRow, newParamTable, sameParamInputs, type ParamTableSpec } from './tables'
import { wasmCheck, wasmSolve, wasmSolveTable } from './wasm/engineClient'

// dockview does not lay out in jsdom, so nothing ever becomes the active
// window. This stand-in reports `dock.active` instead; the top bar, which
// sits outside the dock, then behaves as it does in a browser.
const dock = vi.hoisted(() => ({ active: 'equations' }))
vi.mock('./workspace/WorkspaceDock', async () => {
  const { useEffect } = await import('react')
  const { TABLES_WORKBOOK_WINDOW_ID } = await import('./tablesGrid/tablesWorkbookBridge')
  return {
    WorkspaceDock: ({ onActiveChange, handleRef }: {
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
        const id = dock.active === 'table' ? TABLES_WORKBOOK_WINDOW_ID : dock.active
        onActiveChange?.({ id, kind: dock.active, title: dock.active })
        // Once, on mount, like dockview's first report: App passes a fresh
        // callback every render.
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [])
      return null
    },
  }
})

vi.mock('./wasm/engineClient', async (orig) => {
  const real = await orig<Record<string, unknown>>()
  const stubbed: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(real)) stubbed[k] = typeof v === 'function' ? vi.fn(async () => ({})) : v
  stubbed.wasmCheck = vi.fn(async () => ({
    solvable: true, equations: 2, unknowns: 2, variables: ['x', 'y'], unitWarnings: [], inferredUnits: {}, message: 'ok',
  }))
  return stubbed
})

beforeEach(() => {
  // The phone layout reaches the workbook and Solve table through plain
  // buttons; the desktop rail's menus need layout jsdom does not have.
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }))
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
  HTMLElement.prototype.scrollIntoView = () => {}
  // CodeMirror measures text ranges, which jsdom does not lay out.
  Range.prototype.getClientRects = () => [] as unknown as DOMRectList
  Range.prototype.getBoundingClientRect = () => new DOMRect()
  // jsdom throws resolving some of Mantine's CSS lengths; layout is not what
  // this test is about, so an unreadable style reads as an empty one.
  // Both the global and the element's own window, where floating-ui reads it.
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
  dock.active = 'equations'
  localStorage.clear()
  // A returning user: no first-run dialog over the workspace.
  localStorage.setItem('frees.firstRunDismissed', 'true')
  localStorage.setItem('frees.gettingStartedSeen', 'true')
})

// The style spy stays for the file: floating-ui can measure after a test's
// own cleanup has run.
afterEach(() => vi.unstubAllGlobals())

/** A saved workspace holding one parametric table, restored on mount. */
function seedProject(extra: Record<string, unknown> = {}): void {
  const row = (x: string) => ({ ...newParamRow(), values: { x, y: '' } })
  const table = {
    id: 'sweep', kind: 'parametric', name: 'Sweep', vars: ['x', 'y'], rows: [row('1'), row('2')],
    results: [], stats: null, checkResult: null, checkMessage: '', ...extra,
  }
  const project = {
    version: 3, savedAt: new Date().toISOString(), text: 'y = 2*x\n', varDrafts: {},
    stopCriteria: DEFAULT_STOP_CRITERIA, unitSystem: 'SI', fillMissing: false, stateUnitIds: {},
    tables: [table], plots: [], spreadsheets: [], analyzers: [], digitizer: null, dockLayout: null,
  }
  localStorage.setItem('frees.project', JSON.stringify(project))
}

type SolveTableDto = Awaited<ReturnType<typeof wasmSolveTable>>

const solvedRows = {
  results: [
    { success: true, status: 'completed', values: { x: 1, y: 2 }, error: null },
    { success: true, status: 'completed', values: { x: 2, y: 4 }, error: null },
  ],
  stats: { runs: 2, solved: 2, failed: 0, notRun: 0, passes: 1, converged: true, termination: 'completed' },
  variables: [],
} as unknown as SolveTableDto

it('discards a table solve that finishes after a workbook edit', async () => {
  let finish!: (value: SolveTableDto) => void
  vi.mocked(wasmSolveTable).mockImplementation(() => new Promise((resolve) => { finish = resolve }))
  seedProject()
  const { default: App } = await import('./App')
  render(<MantineProvider env="test"><App /></MantineProvider>)
  fireEvent.click(await screen.findByText('Tables', {}, { timeout: 10_000 }))
  const runStatus = () => screen.getByText(/^Run status:/).textContent

  // Control: an undisturbed solve writes its rows, so the check below can see a write.
  fireEvent.click(await screen.findByText('Solve table'))
  await waitFor(() => expect(wasmSolveTable).toHaveBeenCalledTimes(1))
  await act(async () => finish(solvedRows))
  await waitFor(() => expect(runStatus()).toBe('Run status: completed'))

  // The same solve, with a row added through the workbook while it runs.
  fireEvent.click(screen.getByText('Solve table'))
  await waitFor(() => expect(wasmSolveTable).toHaveBeenCalledTimes(2))
  fireEvent.click(screen.getByText('Add Row'))
  await act(async () => finish(solvedRows))
  await act(async () => new Promise((resolve) => setTimeout(resolve, 50)))
  expect(runStatus()).not.toBe('Run status: completed')
  expect(screen.queryByText(/runs solved/)).toBeNull()
}, 30_000)

it('treats any change to the solved inputs as a different table', () => {
  const base: ParamTableSpec = {
    ...newParamTable([]), vars: ['x', 'y'],
    rows: [{ ...newParamRow(), values: { x: '1', y: '' } }, { ...newParamRow(), values: { x: '2', y: '' } }],
  }
  const edit = (patch: (t: ParamTableSpec) => ParamTableSpec) => sameParamInputs(base, patch(structuredClone(base)))
  expect(edit((t) => t)).toBe(true)
  expect(edit((t) => ({ ...t, results: [], runStatus: 'running' }))).toBe(true)
  // A value edit keeps every row id and count — only the comparison sees it.
  expect(edit((t) => { t.rows[1].values.x = '3'; return t })).toBe(false)
  expect(edit((t) => { t.rows[0].values.y = '5'; return t })).toBe(false)
  expect(edit((t) => ({ ...t, rows: [...t.rows, newParamRow()] }))).toBe(false)
  expect(edit((t) => ({ ...t, rows: [t.rows[1], t.rows[0]] }))).toBe(false)
  expect(edit((t) => ({ ...t, vars: ['x'] }))).toBe(false)
  expect(sameParamInputs(base, undefined)).toBe(false)
})

it('runs a Solve pressed while a check is still in flight', async () => {
  // Desktop: its Solve stays enabled while a check runs (the phone layout
  // disables it), so the click reaches checkThenSolve mid-check.
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
  let land!: () => void
  const real = vi.mocked(wasmCheck).getMockImplementation()!
  vi.mocked(wasmCheck).mockImplementationOnce((...args) => new Promise((resolve) => { land = () => resolve(real(...args)) }))
  localStorage.setItem('frees.project', JSON.stringify({
    version: 3, savedAt: new Date().toISOString(), text: 'x = 2\n', varDrafts: {}, stopCriteria: DEFAULT_STOP_CRITERIA,
    unitSystem: 'SI', fillMissing: false, stateUnitIds: {}, tables: [], plots: [], spreadsheets: [], analyzers: [],
    digitizer: null, dockLayout: null,
  }))
  const { default: App } = await import('./App')
  render(<MantineProvider env="test"><App /></MantineProvider>)
  fireEvent.click(await screen.findByRole('button', { name: 'Check' }, { timeout: 10_000 }))
  await waitFor(() => expect(wasmCheck).toHaveBeenCalled())
  fireEvent.click(screen.getByRole('button', { name: 'Solve' }))
  expect(wasmSolve).not.toHaveBeenCalled()
  await act(async () => land())
  await waitFor(() => expect(wasmSolve).toHaveBeenCalledTimes(1))
}, 30_000)

it('runs an F2 pressed while the table is still being checked', async () => {
  // Desktop, with the Tables window active, F2 is check-then-solve for the
  // table. (The top bar's table Solve skips the check gate by design and so
  // never waited on it; the phone layout disables Solve during a check.)
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
  dock.active = 'table'
  // Hold every check from here on (the idle lint may run one too), then
  // release them together.
  const held: (() => void)[] = []
  const real = vi.mocked(wasmCheck).getMockImplementation()!
  const land = () => {
    vi.mocked(wasmCheck).mockImplementation(real)
    held.splice(0).forEach((release) => release())
  }
  seedProject()
  vi.mocked(wasmSolveTable).mockReset().mockResolvedValue(solvedRows)
  const { default: App } = await import('./App')
  render(<MantineProvider env="test"><App /></MantineProvider>)
  const check = await screen.findByRole('button', { name: 'Check' }, { timeout: 10_000 })
  vi.mocked(wasmCheck).mockImplementation((...args) => new Promise((resolve) => { held.push(() => resolve(real(...args))) }))
  fireEvent.click(check)
  await waitFor(() => expect(held.length).toBeGreaterThan(0))
  fireEvent.keyDown(window, { key: 'F2' })
  expect(wasmSolveTable).not.toHaveBeenCalled()
  await act(async () => land())
  await waitFor(() => expect(wasmSolveTable).toHaveBeenCalledTimes(1))
}, 30_000)
