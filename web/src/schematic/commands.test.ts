import { beforeEach, describe, expect, it } from 'vitest'
import { CANVAS_COMMANDS, canvasKeys, keyProblem, keysOf, REMAPPABLE, saveCanvasKeys } from './commands'

describe('rebinding canvas keys (CFG-08)', () => {
  beforeEach(() => localStorage.clear())
  it('takes one free character, refuses clashes and ?, and shows the binding', () => {
    expect(keyProblem(REMAPPABLE, 'add', 'n')).toBeNull()
    expect(keyProblem(REMAPPABLE, 'add', 'L')).toBe('Already Component and connection list')
    expect(keyProblem(REMAPPABLE, 'add', '?')).toBe('? opens the shortcuts list')
    expect(keyProblem(REMAPPABLE, 'add', 'Enter')).toBe('One character')
    saveCanvasKeys({ ...REMAPPABLE, add: 'n' })
    expect(canvasKeys()).toEqual({ add: 'n', list: 'l', search: '/' })
    expect(keysOf(CANVAS_COMMANDS.find((c) => c.id === 'add')!)).toEqual(['N'])
    expect(keysOf(CANVAS_COMMANDS.find((c) => c.id === 'undo')!)).toEqual(['Ctrl', 'Z'])
    // A damaged or clashing entry falls back to the default.
    localStorage.setItem('frees.canvasKeys', JSON.stringify({ add: 'l', search: 'xy' }))
    expect(canvasKeys()).toEqual(REMAPPABLE)
  })
})
