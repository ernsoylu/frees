// Phase L2: the canvas controls set live inputs from the pointer and the keyboard.

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import LiveControls, { type LiveControl } from './LiveControls'
import type { CanvasInput } from '../liveCanvas'

afterEach(cleanup)

const ink = { text: '#000', subtext: '#666', highlight: '#09f', block: '#fff', border: '#999' }
const input = (kind: CanvasInput['kind'], param: string, value: number, unit = ''): CanvasInput => ({ block: 'V1', param, kind, variable: `live_V1_${param}`, value, unit })

function mount(controls: LiveControl[]) {
  const onSet = vi.fn()
  const outer = vi.fn()
  render(
    <svg onKeyDown={outer} onPointerDown={outer} onClick={outer}>
      <LiveControls controls={controls} width={100} ink={ink} onSet={onSet} />
    </svg>,
  )
  return { onSet, outer }
}

it('a switch latches on click and Space, and Shift makes it momentary until release or blur', () => {
  const eng = input('toggle', 'eng', 0)
  const { onSet, outer } = mount([{ input: eng, value: 0 }])
  const sw = screen.getByRole('switch', { name: 'V1.eng' })
  expect(sw.getAttribute('aria-checked')).toBe('false')
  fireEvent.click(sw)
  fireEvent.keyDown(sw, { key: ' ' })
  expect(onSet.mock.calls).toEqual([[eng, 1], [eng, 1]])
  onSet.mockClear()
  fireEvent.keyDown(sw, { key: ' ', shiftKey: true })
  fireEvent.keyUp(sw, { key: ' ' })
  fireEvent.keyDown(sw, { key: 'Enter', shiftKey: true })
  fireEvent.blur(sw)
  fireEvent.blur(sw)
  expect(onSet.mock.calls).toEqual([[eng, 1], [eng, 0], [eng, 1], [eng, 0]])
  // Nothing reaches the block: no drag, select or nudge.
  expect(outer).not.toHaveBeenCalled()
})

it('an opening steps by the arrows, pages and ends, within 0 to 1', () => {
  const u = input('fraction', 'u', 0.5)
  const { onSet } = mount([{ input: u, value: 0.98 }])
  const slider = screen.getByRole('slider', { name: 'V1.u' })
  expect(slider.getAttribute('aria-valuenow')).toBe('0.98')
  for (const key of ['ArrowRight', 'ArrowLeft', 'PageDown', 'Home', 'End']) fireEvent.keyDown(slider, { key })
  expect(onSet.mock.calls.map((c) => c[1])).toEqual([1, 0.93, 0.73, 0, 1])
})

it('a setpoint steps by a tenth of its magnitude and keeps its unit', () => {
  const tref = input('setpoint', 'tref', 60, '[C]')
  const { onSet } = mount([{ input: tref, value: 61 }])
  const knob = screen.getByRole('spinbutton', { name: 'V1.tref' })
  expect(knob.getAttribute('aria-valuetext')).toBe('61 [C]')
  fireEvent.keyDown(knob, { key: 'ArrowUp' })
  fireEvent.keyDown(knob, { key: 'PageDown' })
  fireEvent.click(screen.getByText('+'))
  expect(onSet.mock.calls.map((c) => c[1])).toEqual([62, 51, 62])
})
