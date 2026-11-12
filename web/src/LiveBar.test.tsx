// LiveBar.test.tsx — Phase K3: the Live bar drives a live client by pulling,
// one advance at a time, and closes on any model edit.

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { afterEach, expect, it, vi } from 'vitest'
import { notifications } from '@mantine/notifications'
import LiveBar, { type LiveDriver } from './LiveBar'
import { ModelRevisionTracker } from './modelRevision'
import type { LiveChunk } from './wasm/liveClient'
import type { OdeTableDto } from './api'

vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
afterEach(cleanup)

const chunk = (times: number[], extra: Partial<LiveChunk> = {}): LiveChunk => ({
  seq: 0,
  rows: Float64Array.from(times.flatMap((t) => [t, 2 - t])),
  numRows: times.length,
  numCols: 2,
  events: [],
  stopped: false,
  finished: false,
  state: null,
  clock: { t: times.at(-1) ?? 0, h: 0.01 },
  error: null,
  ...extra,
})

/** A fake session over a grid of 0.1 s rows, ending at `end` on a stop event. */
function fakeDriver(end = 1) {
  let open = false
  let next = 0
  let inFlight = 0
  let maxInFlight = 0
  const release: Array<() => void> = []
  const log: { time: number; name: string; value: number }[] = []
  // Like the engine, a target before t0 still produces the t0 row.
  const rowsTo = (t: number) => {
    const times: number[] = []
    while (next <= Math.max(0, Math.round(t * 10)) && next <= end * 10) times.push(next++ / 10)
    const finished = next > end * 10
    return chunk(times, finished ? { finished: true, stopped: true, events: [{ name: 'low', time: end }] } : {})
  }
  const driver = {
    get isOpen() {
      return open
    },
    open: vi.fn(async (_source: string, _request: string, _block: number, _revision: number) => {
      open = true
      next = 0
      return { ok: true as const, session: 1, table: { name: 'tank', vars: ['t', 'L'], units: ['s', 'm'], method: 'ida' } }
    }),
    advance: vi.fn(async (t: number) => {
      inFlight += 1
      maxInFlight = Math.max(maxInFlight, inFlight)
      await new Promise((r) => setTimeout(r, 1))
      inFlight -= 1
      return rowsTo(t)
    }),
    step: vi.fn(async (kind: string) => (kind === 'sample' ? rowsTo(next === 0 ? 0.1 : next / 10) : rowsTo(end))),
    reset: vi.fn(async () => {
      next = 0
      return true
    }),
    // Phase L1: each change waits for `release` so a test sees what queues behind it.
    setInputs: vi.fn(
      (lines: string[]) =>
        new Promise<{ time: number; log: { time: number; name: string; value: number }[] } | { error: string }>((resolve) => {
          release.push(() => {
            if (lines.some((l) => l.startsWith('bad'))) return resolve({ error: '`bad` is not given a value' })
            for (const line of lines) log.push({ time: next / 10, name: line.split('=')[0].trim().toLowerCase(), value: Number(line.split('=')[1]) })
            resolve({ time: next / 10, log: [...log] })
          })
        }),
    ),
    dispose: vi.fn(() => {
      open = false
    }),
  }
  return { driver: driver as unknown as LiveDriver, spy: driver, maxInFlight: () => maxInFlight, release }
}

function mount(driver: LiveDriver, tracker = new ModelRevisionTracker(), buildOpen = () => ({ source: 'src', request: '{}' }), onTable?: (t: OdeTableDto) => void) {
  render(
    <MantineProvider>
      <LiveBar blocks={['tank']} tracker={tracker} buildOpen={buildOpen} driver={driver} onTable={onTable} />
    </MantineProvider>,
  )
  return tracker
}

it('runs live to the stop event, one advance in flight at a time', async () => {
  const { driver, spy, maxInFlight } = fakeDriver(0.5)
  mount(driver)
  fireEvent.click(screen.getByLabelText('Run live'))
  await waitFor(() => expect(screen.getByTestId('live-notice').textContent).toContain('A stop event ended the run at t = 0.5'), { timeout: 5000 })
  expect(spy.open).toHaveBeenCalledWith('src', '{}', 0, 1)
  expect(maxInFlight()).toBe(1)
  expect(screen.getByTestId('live-time').textContent).toBe('t = 0.5 s')
  expect(screen.getByTestId('live-event').textContent).toContain('low')
  expect(screen.getByLabelText('Run live')).toBeDisabled()
})

it('a model edit closes the session', async () => {
  const { driver, spy } = fakeDriver(1000)
  const tracker = mount(driver)
  fireEvent.click(screen.getByLabelText('Run live'))
  await waitFor(() => expect(spy.advance).toHaveBeenCalled())
  act(() => {
    tracker.bump()
  })
  expect(spy.dispose).toHaveBeenCalled()
  expect(screen.getByTestId('live-notice').textContent).toContain('The model changed')
  expect(screen.getByLabelText('Run live')).toBeEnabled()
  const calls = spy.advance.mock.calls.length
  await new Promise((r) => setTimeout(r, 100))
  expect(spy.advance.mock.calls.length).toBeLessThanOrEqual(calls + 1)
})

it('a step opens a closed session, and reset starts again', async () => {
  const { driver, spy } = fakeDriver(1)
  mount(driver)
  fireEvent.click(screen.getByText('Next sample'))
  await waitFor(() => expect(screen.getByTestId('live-time').textContent).toBe('t = 0.1 s'))
  expect(spy.open).toHaveBeenCalledTimes(1)
  expect(spy.step).toHaveBeenCalledWith('sample')
  fireEvent.click(screen.getByText('Reset'))
  await waitFor(() => expect(spy.reset).toHaveBeenCalled())
  expect(screen.queryByTestId('live-time')).toBeNull()
})

it('reports an open that fails, and a request that cannot be built', async () => {
  const { driver, spy } = fakeDriver()
  spy.open.mockResolvedValueOnce({ ok: false, error: 'Live mode: no block 1.' } as never)
  mount(driver)
  fireEvent.click(screen.getByLabelText('Run live'))
  await waitFor(() => expect(screen.getByTestId('live-notice').textContent).toBe('Live mode: no block 1.'))
  expect(spy.advance).not.toHaveBeenCalled()
  cleanup()
  mount(fakeDriver().driver, new ModelRevisionTracker(), () => {
    throw new Error('Table T: row 2 is not a number')
  })
  fireEvent.click(screen.getByLabelText('Run live'))
  await waitFor(() => expect(screen.getByTestId('live-notice').textContent).toBe('Table T: row 2 is not a number'))
})

it('a failed chunk stops the run and keeps its rows', async () => {
  const { driver, spy } = fakeDriver(1000)
  spy.advance.mockResolvedValueOnce(chunk([0, 0.1], { error: 'DYNAMIC tank: transient integration failed', finished: true }))
  mount(driver)
  fireEvent.click(screen.getByLabelText('Run live'))
  await waitFor(() => expect(screen.getByTestId('live-notice').textContent).toContain('integration failed'))
  expect(screen.getByTestId('live-time').textContent).toBe('t = 0.1 s')
  expect(spy.advance).toHaveBeenCalledTimes(1)
})

it('publishes the run so far as an ODE Table on a stop and on a pause', async () => {
  const { driver } = fakeDriver(0.3)
  const tables: OdeTableDto[] = []
  mount(driver, undefined, undefined, (t) => tables.push(t))
  fireEvent.click(screen.getByLabelText('Run live'))
  await waitFor(() => expect(tables).toHaveLength(1), { timeout: 5000 })
  expect(tables[0]).toMatchObject({ name: 'tank', vars: ['t', 'L'], units: ['s', 'm'], stopped: true, endTime: 0.3 })
  expect(tables[0].rows).toEqual([[0, 2], [0.1, 1.9], [0.2, 1.8], [0.3, 1.7]])
  expect(tables[0].events).toEqual([{ name: 'low', time: 0.3 }])

  cleanup()
  const long = fakeDriver(1000)
  const paused: OdeTableDto[] = []
  mount(long.driver, undefined, undefined, (t) => paused.push(t))
  fireEvent.click(screen.getByLabelText('Run live'))
  await waitFor(() => expect(long.spy.advance.mock.calls.length).toBeGreaterThan(2))
  fireEvent.click(screen.getByLabelText('Pause'))
  expect(paused).toHaveLength(1)
  expect(paused[0].stopped).toBe(false)
  expect(paused[0].rows[0]).toEqual([0, 2])
})

it('a failure keeps the accepted rows and offers a retry with a smaller max step', async () => {
  const { driver, spy } = fakeDriver(1000)
  spy.advance.mockResolvedValueOnce(chunk([0, 0.1], { error: 'DYNAMIC tank: transient integration failed', finished: true, clock: { t: 0.12, h: 0.02 } }))
  const tables: OdeTableDto[] = []
  mount(driver, undefined, () => ({ source: 'src', request: '{"stopCriteria":{}}' }), (t) => tables.push(t))
  fireEvent.click(screen.getByLabelText('Run live'))
  await waitFor(() => expect(tables).toHaveLength(1))
  expect(tables[0].rows).toEqual([[0, 2], [0.1, 1.9]])
  fireEvent.click(screen.getByText('Retry from the start with max step 0.005 s'))
  await waitFor(() => expect(spy.open).toHaveBeenCalledTimes(2))
  expect(JSON.parse(spy.open.mock.calls[1][1])).toEqual({ stopCriteria: {}, liveMaxStep: 0.005 })
  await waitFor(() => expect(screen.getByLabelText('Pause')).toBeInTheDocument())
})

it('takes slider values as live inputs, one change in flight, and a reset restores them', async () => {
  const { driver, spy, release } = fakeDriver(1000)
  const inputRef: { current: ((lines: string[]) => void) | null } = { current: null }
  const tables: OdeTableDto[] = []
  const onInputsReset = vi.fn()
  const onInputsSettled = vi.fn()
  render(
    <MantineProvider>
      <LiveBar blocks={['tank']} tracker={new ModelRevisionTracker()} buildOpen={() => ({ source: 'src', request: '{}' })} driver={driver} onTable={(t) => tables.push(t)} inputRef={inputRef} onInputsReset={onInputsReset} onInputsSettled={onInputsSettled} />
    </MantineProvider>,
  )
  expect(inputRef.current).toBeNull()
  fireEvent.click(screen.getByText('Next sample'))
  await waitFor(() => expect(inputRef.current).not.toBeNull())
  act(() => {
    inputRef.current?.(['Q = 50'])
    inputRef.current?.(['Q = 60'])
    inputRef.current?.(['R = 1'])
  })
  expect(spy.setInputs).toHaveBeenCalledTimes(1)
  await act(async () => release.shift()?.())
  // The changes that arrived meanwhile go together, the newest per name.
  await waitFor(() => expect(spy.setInputs).toHaveBeenCalledTimes(2))
  expect(spy.setInputs.mock.calls[1][0]).toEqual(['Q = 60', 'R = 1'])
  await act(async () => release.shift()?.())
  await waitFor(() => expect(screen.getByTestId('live-input').textContent).toBe('r = 1 from t = 0.2'))

  act(() => inputRef.current?.(['bad = 1']))
  await act(async () => release.shift()?.())
  await waitFor(() => expect(screen.getByTestId('live-notice').textContent).toContain('refused, and the run is unchanged'))
  expect(onInputsSettled.mock.calls).toEqual([[['Q = 50'], true], [['Q = 60', 'R = 1'], true], [['bad = 1'], false]])

  fireEvent.click(screen.getByText('Next sample'))
  await waitFor(() => expect(tables.length).toBeGreaterThan(1))
  expect(tables.at(-1)?.inputLog?.map((c) => [c.name, c.value])).toEqual([['q', 50], ['q', 60], ['r', 1]])

  fireEvent.click(screen.getByText('Reset'))
  await waitFor(() => expect(onInputsReset).toHaveBeenCalledTimes(1))
  expect(screen.queryByTestId('live-input')).toBeNull()
  fireEvent.click(screen.getByLabelText('Close live run'))
  await waitFor(() => expect(inputRef.current).toBeNull())
})

it('hands the open run’s rows to the canvas until it closes (L3b)', async () => {
  const { driver } = fakeDriver(1000)
  const onRows = vi.fn()
  const bar = (
    <MantineProvider>
      <LiveBar blocks={['tank']} tracker={new ModelRevisionTracker()} buildOpen={() => ({ source: 'src', request: '{}' })} driver={driver} onRows={onRows} />
    </MantineProvider>
  )
  render(bar)
  fireEvent.click(screen.getByText('Next sample'))
  await waitFor(() => expect(onRows.mock.lastCall?.[0]?.store.size).toBeGreaterThan(0))
  expect(onRows.mock.lastCall![0].header.vars.length).toBeGreaterThan(1)
  fireEvent.click(screen.getByLabelText('Close live run'))
  await waitFor(() => expect(onRows.mock.lastCall?.[0]).toBeNull())

  // Unmounting the bar (closing its panel) disposes the run and clears the canvas's rows.
  cleanup()
  onRows.mockClear()
  const again = render(bar)
  fireEvent.click(screen.getByText('Next sample'))
  await waitFor(() => expect(onRows.mock.lastCall?.[0]?.store.size).toBeGreaterThan(0))
  again.unmount()
  expect(onRows.mock.lastCall?.[0]).toBeNull()
})

it('sends the pause conditions with the open and pauses where one crosses (L4)', async () => {
  const { driver, spy } = fakeDriver(1000)
  let calls = 0
  const plain = spy.advance.getMockImplementation()!
  spy.advance.mockImplementation(async (t: number) => {
    const c = await plain(t)
    // The engine ends the chunk the condition crosses in, and names it.
    return ++calls === 2 ? { ...c, paused: 'L > 0.15 [m]', events: [{ name: 'L > 0.15 [m]', time: 0.15 }] } : c
  })
  const onTable = vi.fn()
  mount(driver, undefined, undefined, onTable)
  fireEvent.change(screen.getByLabelText('Pause when'), { target: { value: ' L > 0.15 [m] ;  ; t > 9 ' } })
  fireEvent.click(screen.getByLabelText('Run live'))
  await waitFor(() => expect(screen.getByTestId('live-notice').textContent).toBe('Paused: L > 0.15 [m] at t = 0.15 s.'))
  expect(JSON.parse(spy.open.mock.calls[0][1])).toEqual({ liveWatches: ['L > 0.15 [m]', 't > 9'] })
  expect(screen.getByLabelText('Run live')).toBeEnabled()
  expect(screen.getByLabelText('Pause when')).toBeDisabled()
  expect(onTable).toHaveBeenCalled()
  const advances = spy.advance.mock.calls.length
  await new Promise((r) => setTimeout(r, 50))
  expect(spy.advance.mock.calls.length).toBe(advances)
  // Resuming clears the pause notice.
  fireEvent.click(screen.getByLabelText('Run live'))
  await waitFor(() => expect(spy.advance.mock.calls.length).toBeGreaterThan(advances))
  expect(screen.queryByTestId('live-notice')).toBeNull()
})

/** Capture what an export saves (jsdom has no object URLs). */
function captureDownloads() {
  const saved: Blob[] = []
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: (b: Blob) => (saved.push(b), 'blob:x'), revokeObjectURL() {} }))
  return async () => JSON.parse(await saved.at(-1)!.text())
}

it('records a finite duration of the run with its settings and provenance, and exports it (L5)', async () => {
  const { driver, spy } = fakeDriver(1000)
  const settings = { method: 'ida', rtol: 1e-6, atol: 1e-9, t0: 0, tf: 10, points: 101, step: null, maxStep: null }
  const provenance = { backend: 'rustprop', fluids: ['Water'] }
  const plain = spy.open.getMockImplementation()!
  spy.open.mockImplementation(async (...a: [string, string, number, number]) => ({ ...(await plain(...a)), settings, provenance }))
  const last = captureDownloads()
  mount(driver)
  fireEvent.change(screen.getByLabelText('Record for'), { target: { value: '0.5' } })
  // Record opens a closed run, paused, so it records from the first row.
  fireEvent.click(screen.getByRole('button', { name: 'Record' }))
  await waitFor(() => expect(screen.getByTestId('live-recording').textContent).toBe('Recording: 0 rows'))
  fireEvent.click(screen.getByLabelText('Run live'))
  await waitFor(() => expect(screen.getByTestId('live-recording').textContent).toBe('Recording complete: 6 rows from t = 0 s to 0.5 s'))
  // The run goes on; the recording took no more.
  await waitFor(() => expect(Number(screen.getByTestId('live-time').textContent!.split(' ')[2])).toBeGreaterThan(0.5))
  fireEvent.click(screen.getByLabelText('Pause'))
  fireEvent.click(screen.getByRole('button', { name: 'Export recording' }))
  const file = await last()
  expect(file).toMatchObject({ format: 'frees-live-recording', block: 'tank', status: 'complete', reason: null, solver: settings, provenance, span: { from: 0, to: 0.5, requested: 0.5, unit: 's' } })
  expect(file.rows.map((r: number[]) => r[0])).toEqual([0, 0.1, 0.2, 0.3, 0.4, 0.5])
  expect(file.columns).toEqual([{ name: 't', unit: 's' }, { name: 'L', unit: 'm' }])
})

it('a reset ends a recording partial, and Stop and export ends one until export (L5)', async () => {
  const { driver } = fakeDriver(1000)
  const last = captureDownloads()
  mount(driver)
  fireEvent.click(screen.getByRole('button', { name: 'Record' }))
  await waitFor(() => expect(screen.getByTestId('live-recording')).toBeTruthy())
  fireEvent.click(screen.getByRole('button', { name: 'Next sample' }))
  await waitFor(() => expect(screen.getByTestId('live-recording').textContent).toBe('Recording: 2 rows from t = 0 s'))
  fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
  await waitFor(() => expect(screen.getByTestId('live-recording').textContent).toBe('Recording partial: 2 rows from t = 0 s to 0.1 s. The run was reset at t = 0.1 s.'))
  fireEvent.click(screen.getByRole('button', { name: 'Export recording' }))
  expect((await last()).status).toBe('partial')

  // Recording until exported: Stop and export ends it complete, at the export.
  fireEvent.click(screen.getByRole('button', { name: 'Record' }))
  fireEvent.click(screen.getByRole('button', { name: 'Next sample' }))
  await waitFor(() => expect(screen.getByTestId('live-recording').textContent).toBe('Recording: 2 rows from t = 0 s'))
  fireEvent.click(screen.getByRole('button', { name: 'Stop and export' }))
  expect(await last()).toMatchObject({ status: 'complete', reason: 'Exported at t = 0.1 s.', solver: null, provenance: null })
})

it('a lab opens with its timeline on each new autorun value, and the applied lines reach the sliders (M1)', async () => {
  const { driver, spy } = fakeDriver(1000)
  const plain = spy.advance.getMockImplementation()!
  let calls = 0
  spy.advance.mockImplementation(async (t: number) => {
    const c = await plain(t)
    // The engine applied the timeline at this chunk's end.
    return ++calls === 2 ? { ...c, inputs: [{ time: 0.3, name: 'q', value: 300 }] } : c
  })
  const onApplied = vi.fn()
  const lab = { timeline: [{ at: 0.3, set: ['Q = 300 [W]'] }, { at: 0.8, set: ['Q = 0 [W]'] }], watches: ['L < 1 [m]'], speed: 10 }
  const bar = (autorun: number) => (
    <MantineProvider>
      <LiveBar blocks={['tank']} tracker={new ModelRevisionTracker()} buildOpen={() => ({ source: 'src', request: '{}' })} driver={driver} lab={lab} autorun={autorun} onTimelineApplied={onApplied} />
    </MantineProvider>
  )
  const { rerender } = render(bar(1))
  await waitFor(() => expect(onApplied).toHaveBeenCalledWith(['Q = 300 [W]']))
  expect(JSON.parse(spy.open.mock.calls[0][1])).toEqual({ liveWatches: ['L < 1 [m]'], liveTimeline: lab.timeline })
  expect(screen.getByTestId('live-input').textContent).toBe('q = 300 from t = 0.3')
  // The lab plays at its own speed.
  expect(screen.getByTestId('live-speed').textContent).toBe('10 s/s')
  // The same value does not open again; a new one does, from the start.
  rerender(bar(1))
  expect(spy.open).toHaveBeenCalledTimes(1)
  rerender(bar(2))
  await waitFor(() => expect(spy.open).toHaveBeenCalledTimes(2))
  expect(spy.dispose).toHaveBeenCalled()
})

it('under reduced motion a lab autorun opens paused at its start, and stepping moves it (M acceptance)', async () => {
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('reduce'), addEventListener() {}, removeEventListener() {} }))
  try {
    const { driver, spy } = fakeDriver(1000)
    render(
      <MantineProvider>
        <LiveBar blocks={['tank']} tracker={new ModelRevisionTracker()} buildOpen={() => ({ source: 'src', request: '{}' })} driver={driver} lab={{ timeline: [] }} autorun={1} />
      </MantineProvider>,
    )
    await waitFor(() => expect(spy.open).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(screen.getByLabelText('Run live')).toBeTruthy())
    expect(spy.advance).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Next sample' }))
    await waitFor(() => expect(spy.step).toHaveBeenCalledWith('sample'))
  } finally {
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
  }
})

it('a failed request ends a recording failed, and an unsaved recording outlives the bar (L5)', async () => {
  const { driver, spy } = fakeDriver(1000)
  mount(driver)
  fireEvent.click(screen.getByRole('button', { name: 'Record' }))
  await waitFor(() => expect(screen.getByTestId('live-recording')).toBeTruthy())
  fireEvent.click(screen.getByRole('button', { name: 'Next sample' }))
  await waitFor(() => expect(screen.getByTestId('live-recording').textContent).toBe('Recording: 2 rows from t = 0 s'))
  spy.advance.mockRejectedValueOnce(new Error('The live worker failed'))
  fireEvent.click(screen.getByLabelText('Run live'))
  await waitFor(() => expect(screen.getByTestId('live-recording').textContent).toMatch(/^Recording failed: .*The live worker failed$/))
  expect(screen.getByTestId('live-notice').textContent).toBe('The live worker failed')
  // Unmounting (the model's run went) keeps it on offer.
  const show = vi.spyOn(notifications, 'show')
  cleanup()
  expect(show).toHaveBeenCalledWith(expect.objectContaining({ id: 'live-recording-kept', autoClose: false }))
  show.mockRestore()
})
