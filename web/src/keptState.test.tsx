// Phase Q (AC-11): a kept value survives its component, and a project switch clears it.
import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { clearKeptState, useKeptState } from './keptState'

describe('useKeptState', () => {
  it('gives a remounted component the value it was left with', () => {
    const first = renderHook(() => useKeptState('t.draft', 'a'))
    expect(first.result.current[0]).toBe('a')
    act(() => first.result.current[1]('b'))
    act(() => first.result.current[1]((v) => v + 'c'))
    expect(first.result.current[0]).toBe('bc')
    first.unmount()
    expect(renderHook(() => useKeptState('t.draft', 'a')).result.current[0]).toBe('bc')
    // Another key is another value.
    expect(renderHook(() => useKeptState('t.other', () => 7)).result.current[0]).toBe(7)
  })

  it('starts over after a project switch', () => {
    const h = renderHook(() => useKeptState('t.cleared', 1))
    act(() => h.result.current[1](2))
    h.unmount()
    clearKeptState()
    expect(renderHook(() => useKeptState('t.cleared', 1)).result.current[0]).toBe(1)
  })

  it('keeps a value set after its view closed, tells the view open now, and drops one from before a switch', () => {
    const closed = renderHook(() => useKeptState<string | null>('t.result', null))
    const lateSet = closed.result.current[1]
    closed.unmount()
    const open = renderHook(() => useKeptState<string | null>('t.result', null))
    act(() => lateSet('done'))
    expect(open.result.current[0]).toBe('done')
    open.unmount()
    clearKeptState()
    act(() => lateSet('from the old project'))
    expect(renderHook(() => useKeptState<string | null>('t.result', null)).result.current[0]).toBeNull()
  })

  it('leaves a view that stays mounted across a switch working', () => {
    const h = renderHook(() => useKeptState('t.mounted', 1))
    clearKeptState()
    act(() => h.result.current[1]((v) => v + 1))
    expect(h.result.current[0]).toBe(2)
  })
})
