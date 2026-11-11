// LiveScope.test.tsx — Phase L3: the rolling scope reads raw rows for its
// measurements, windows them, detrends them and asks for their spectrum.

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { afterEach, expect, it, vi } from 'vitest'
import LiveScope from './LiveScope'
import { LiveStore } from './liveStore'
import type { LiveTable } from './wasm/liveClient'

vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
afterEach(cleanup)
// jsdom throws resolving some of Mantine's CSS lengths, which floating-ui reads
// for the trace picker; an unreadable style reads as an empty one.
const view = document.defaultView!
const computed = view.getComputedStyle.bind(view)
vi.spyOn(view, 'getComputedStyle').mockImplementation((el: Element, pseudo?: string | null) => {
  try {
    return computed(el, pseudo)
  } catch {
    return document.createElement('div').style
  }
})

const header: LiveTable = { name: 'b', vars: ['time', 'v', 'ramp'], units: ['s', 'V', 'V'], method: 'ode45' }

/** 2 s of a 5 Hz, 3 V sine about 2 V, and a ramp, at 1 ms rows. */
function sineStore() {
  const store = new LiveStore(3)
  const rows = Array.from({ length: 2001 }, (_, i) => {
    const t = i / 1000
    return [t, 2 + 3 * Math.sin(2 * Math.PI * 5 * t), 4 * t]
  })
  store.push(Float64Array.from(rows.flat()), rows.length)
  return store
}

it('measures the window’s rows in their units, detrends them, and draws one lane per trace', () => {
  const store = sineStore()
  const spectrum = vi.fn()
  render(<MantineProvider><LiveScope store={store} header={header} version={store.size} spectrum={spectrum} /></MantineProvider>)
  const strip = screen.getByTestId('scope-measure').textContent!
  expect(strip).toContain('2 s window')
  expect(strip).toContain('mean 2 V')
  expect(strip).toContain('p-p 6 V')
  expect(strip).toContain('f 5 Hz')
  expect(strip).toContain('duty 50 %')
  expect(screen.getByRole('img', { name: 'Live scope' }).querySelectorAll('path')).toHaveLength(1)

  // A 0.5 s window: the strip reads only its rows.
  fireEvent.change(screen.getByLabelText('Scope window'), { target: { value: '0.5' } })
  expect(screen.getByTestId('scope-measure').textContent).toContain('0.5 s window')
  // A window the rows do not fill names what was measured.
  fireEvent.change(screen.getByLabelText('Scope window'), { target: { value: '5' } })
  expect(screen.getByTestId('scope-measure').textContent).toContain('2 s of a 5 s window')

  // Detrended, the sine's mean is zero.
  fireEvent.change(screen.getByLabelText('Scope window'), { target: { value: '' } })
  fireEvent.click(screen.getByLabelText('Detrend'))
  const detrended = screen.getByTestId('scope-measure').textContent!
  expect(detrended).toContain('(detrended)')
  expect(detrended).toMatch(/mean -?\d(\.\d+)?e-\d+ V|mean -?0 V/)
  expect(spectrum).not.toHaveBeenCalled()
})

it('takes the spectrum of uniformly resampled rows and names its peak', async () => {
  const store = sineStore()
  const spectrum = vi.fn(async (values: ArrayLike<number>, fs: number) => {
    // Every row kept, at their own 1 kHz: nothing they resolve is folded down.
    expect(values.length).toBe(2001)
    expect(fs).toBeCloseTo(1000, 6)
    return { freq: [0, 2.5, 5, 7.5], power: [9, 1, 7, 0.5] }
  })
  render(<MantineProvider><LiveScope store={store} header={header} version={store.size} spectrum={spectrum} /></MantineProvider>)
  fireEvent.click(screen.getByLabelText('Spectrum'))
  await waitFor(() => expect(screen.getByTestId('scope-measure').textContent).toBe('v: spectral peak at 5 Hz'))
  expect(spectrum).toHaveBeenCalledTimes(1)
  expect(screen.getByRole('img', { name: 'Live spectrum' })).toBeTruthy()
})

it('names no peak for a constant window', async () => {
  const store = sineStore()
  const spectrum = vi.fn(async () => ({ freq: [0, 1, 2], power: [0, 0, 0] }))
  render(<MantineProvider><LiveScope store={store} header={header} version={store.size} spectrum={spectrum} /></MantineProvider>)
  fireEvent.click(screen.getByLabelText('Spectrum'))
  await waitFor(() => expect(screen.getByTestId('scope-measure').textContent).toBe('v: The window is constant, so it has no spectrum.'))
})
