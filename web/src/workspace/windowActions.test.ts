// Phase Q: the reasons a window action is unavailable, and the Window List's grouping.
import { describe, expect, it } from 'vitest'
import { WINDOW_ACTIONS, groupWindows, windowActionReason, type DockWindow } from './windowActions'

const w = (id: string, over: Partial<DockWindow> = {}): DockWindow =>
  ({ id, kind: id.split(':')[0], title: id, group: 'g1', place: 'grid', maximized: false, ...over })

describe('window actions', () => {
  const windows = [w('equations'), w('plot:a', { title: 'Pump curve' }), w('plot:b', { group: 'g2' }), w('workspace', { group: 'edge-right', place: 'edge' }), w('table:t', { group: 'f', place: 'floating' })]

  it('names the missing window for every action', () => {
    for (const a of WINDOW_ACTIONS) expect(windowActionReason(windows, 'gone', a)).toBe('No window is focused.')
    expect(windowActionReason(windows, undefined, 'close')).toBe('No window is focused.')
  })

  it('always closes and floats, and closes others only among several tabs', () => {
    expect(windowActionReason(windows, 'equations', 'close')).toBeNull()
    expect(windowActionReason(windows, 'workspace', 'float')).toBeNull()
    expect(windowActionReason(windows, 'equations', 'closeOthers')).toBeNull()
    expect(windowActionReason(windows, 'plot:b', 'closeOthers')).toMatch(/only tab/)
  })

  it('splits and maximizes only a centre window, and moves only to where it is not', () => {
    expect(windowActionReason(windows, 'equations', 'moveRight')).toBeNull()
    expect(windowActionReason(windows, 'plot:b', 'moveLeft')).toMatch(/nothing to split/)
    expect(windowActionReason(windows, 'workspace', 'moveBelow')).toMatch(/centre first/)
    expect(windowActionReason(windows, 'table:t', 'maximize')).toMatch(/centre first/)
    expect(windowActionReason(windows, 'equations', 'maximize')).toBeNull()
    expect(windowActionReason(windows, 'workspace', 'moveEdge')).toMatch(/already/)
    expect(windowActionReason(windows, 'equations', 'moveEdge')).toBeNull()
    expect(windowActionReason(windows, 'equations', 'moveCentre')).toMatch(/already/)
    expect(windowActionReason(windows, 'table:t', 'moveCentre')).toBeNull()
  })

  it('groups the list by kind and searches titles and kinds', () => {
    expect(groupWindows(windows).map((g) => [g.label, g.windows.map((x) => x.id)])).toEqual([
      ['Editor', ['equations']], ['Plots', ['plot:a', 'plot:b']], ['Panels', ['workspace']], ['Tables', ['table:t']],
    ])
    expect(groupWindows(windows, 'pump').flatMap((g) => g.windows.map((x) => x.id))).toEqual(['plot:a'])
    expect(groupWindows(windows, 'plots').flatMap((g) => g.windows.map((x) => x.id))).toEqual(['plot:a', 'plot:b'])
    expect(groupWindows(windows, 'zzz')).toEqual([])
  })
})
