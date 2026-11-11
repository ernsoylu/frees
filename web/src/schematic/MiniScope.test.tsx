// MiniScope.test.tsx — Phase L3b: a block's mini-scope follows the live store
// on its own, finds its variable's column, and says when the run lacks it.

import { act, cleanup, render } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import MiniScope, { MINI_ROWS } from './MiniScope'
import { columnOf, liveColumnsOf } from '../scopeMath'
import { LiveStore } from '../liveStore'
import type { LiveTable } from '../wasm/liveClient'

afterEach(cleanup)

const header: LiveTable = { name: 'heat', vars: ['time', 'body$port$T', 'x'], units: ['s', 'K', ''], method: 'ida' }
const ink = { text: '#000', subtext: '#666', block: '#fff', border: '#ccc', badge: '#06c' }
const push = (store: LiveStore, from: number, n: number) =>
  store.push(Float64Array.from(Array.from({ length: n }, (_, i) => [from + i, 300 + from + i, 0]).flat()), n)

it('maps a card variable to its live column, never the time column', () => {
  expect(columnOf(header, 'body.port.t')).toBe(1)
  expect(columnOf(header, 'x')).toBe(2)
  expect(columnOf(header, 'time')).toBe(-1)
  expect(columnOf(header, 'pump.w')).toBe(-1)
  // The card offers a block its own columns only.
  expect(liveColumnsOf({ ...header, vars: [...header.vars, 'bodyx$T'] }, 'Body')).toEqual(['body.port.t'])
})

it('redraws on each push with the newest value, over the newest rows only', () => {
  const store = new LiveStore(3)
  const { container } = render(<svg><MiniScope store={store} header={header} variable="body.port.t" width={100} y={50} ink={ink} /></svg>)
  const scope = container.querySelector('[data-mini-scope]')!
  expect(scope.textContent).toBe('body.port.t')
  expect(scope.querySelector('path')).toBeNull()

  act(() => push(store, 0, 10))
  expect(scope.textContent).toBe('body.port.t 309 K')
  expect(scope.querySelector('path')!.getAttribute('d')).toMatch(/^M/)

  // Past MINI_ROWS rows the label still reads the newest row.
  act(() => push(store, 10, MINI_ROWS))
  expect(scope.textContent).toBe(`body.port.t ${300 + 9 + MINI_ROWS} K`)
  act(() => store.clear())
  expect(scope.querySelector('path')).toBeNull()
})

it('names a variable the live block does not carry', () => {
  const store = new LiveStore(3)
  push(store, 0, 3)
  const { container } = render(<svg><MiniScope store={store} header={header} variable="pump.w" width={100} y={0} ink={ink} /></svg>)
  expect(container.textContent).toBe("pump.w: not in heat's table")
})
