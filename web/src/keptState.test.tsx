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
})
