// preferredStepping.test.tsx — Phase L6: a wheel notch over a slider, and a
// wheel notch or arrow key in the card editor, step through a preferred series.

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { useState } from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import SliderStrip from './SliderStrip'
import { ParamValueInput } from './schematic/SchematicTab'

vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const notch = (el: Element, deltaY: number) => {
  const e = new WheelEvent('wheel', { deltaY, bubbles: true, cancelable: true })
  act(() => void el.dispatchEvent(e))
  return e.defaultPrevented
}

it('steps a slider through E24 by wheel, commits once the wheel stops, and stays in range', () => {
  vi.useFakeTimers()
  const onChange = vi.fn()
  const onCommit = vi.fn()
  const onSeries = vi.fn()
  const pin = { name: 'R1', value: 4.7, units: 'kohm', min: 1, max: 5.2 }
  const { container, rerender } = render(
    <MantineProvider><SliderStrip pins={[pin]} onChange={onChange} onCommit={onCommit} onSeries={onSeries} /></MantineProvider>,
  )
  const row = container.querySelector('[data-slider="R1"]')!
  expect(screen.getByLabelText('R1 wheel steps')).toHaveValue('e24')
  // A trackpad's small deltas add up to a notch; wheel up is up the series.
  expect(notch(row, -20)).toBe(true)
  expect(onChange).not.toHaveBeenCalled()
  notch(row, -20)
  expect(onChange).toHaveBeenLastCalledWith('R1', 5.1)
  // The next notch would pass the range's end, so nothing moves.
  notch(row, -100)
  expect(onChange).toHaveBeenCalledTimes(1)
  expect(onCommit).not.toHaveBeenCalled()
  act(() => void vi.advanceTimersByTime(300))
  expect(onCommit).toHaveBeenCalledExactlyOnceWith('R1', 5.1)
  fireEvent.change(screen.getByLabelText('R1 wheel steps'), { target: { value: 'linear' } })
  expect(onSeries).toHaveBeenCalledWith('R1', 'linear')
  // A linear slider leaves the wheel to the page.
  rerender(<MantineProvider><SliderStrip pins={[{ ...pin, series: 'linear' }]} onChange={onChange} onCommit={onCommit} onSeries={onSeries} /></MantineProvider>)
  expect(notch(row, -100)).toBe(false)
  expect(onChange).toHaveBeenCalledTimes(1)
})

function Card({ start, unit = 'm', name = 'D' }: Readonly<{ start: string; unit?: string; name?: string }>) {
  const [value, setValue] = useState(start)
  return <MantineProvider><ParamValueInput name={name} unit={unit} value={value} error={null} onChange={setValue} onEnter={() => {}} onEscape={() => {}} /></MantineProvider>
}

it('steps a card value through DN by wheel and arrows, keeping its written unit', () => {
  render(<Card start="0.05 [m]" />)
  const input = screen.getByLabelText('New D')
  expect(screen.getByLabelText('D wheel steps')).toHaveValue('dn')
  fireEvent.keyDown(input, { key: 'ArrowUp' })
  expect(input).toHaveValue('0.065 [m]')
  expect(notch(input, 100)).toBe(true)
  notch(input, 100)
  expect(input).toHaveValue('0.04 [m]')
  // Written in another unit, it steps in that unit.
  fireEvent.change(input, { target: { value: '50 [mm]' } })
  fireEvent.keyDown(input, { key: 'ArrowDown' })
  expect(input).toHaveValue('40 [mm]')
})

it('leaves a card value that is not a number alone, and the wheel to the page', () => {
  render(<Card start="D_main" />)
  const input = screen.getByLabelText('New D')
  expect(screen.queryByLabelText('D wheel steps')).toBeNull()
  fireEvent.keyDown(input, { key: 'ArrowUp' })
  expect(input).toHaveValue('D_main')
  expect(notch(input, -100)).toBe(false)
})
