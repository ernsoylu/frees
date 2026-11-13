// Phase N acceptance: command parity. Every menu surface resolves to registry
// ids, the palette offers every menu command, no two commands share a label or
// a key, and the `?` sheet lists exactly the registry's bindings.
import { describe, expect, it, vi } from 'vitest'
import {
  COMMAND_SPECS,
  MENU_SURFACES,
  commandForKey,
  commandPaletteGroups,
  matchesShortcut,
  resolveCommands,
  shortcutRows,
  type CommandHandlers,
  type CommandId,
  type CommandSpec,
} from './commands'

const ids = Object.keys(COMMAND_SPECS) as CommandId[]
const spec = (id: CommandId) => COMMAND_SPECS[id] as CommandSpec
const handlers = (over: Partial<CommandHandlers> = {}) =>
  ({ ...Object.fromEntries(ids.map((id) => [id, { run: vi.fn() }])), ...over }) as unknown as CommandHandlers
const key = (k: string, mods: Partial<Record<'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey', boolean>> = {}) =>
  ({ key: k, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, ...mods }) as KeyboardEvent

describe('command parity', () => {
  const menuIds = Object.values(MENU_SURFACES).flat().filter((e): e is CommandId => typeof e === 'string' && e !== '-')

  it('resolves every menu entry to a registry command', () => {
    for (const id of menuIds) expect(ids).toContain(id)
  })

  it('offers every menu command in the palette', () => {
    const palette = new Set(commandPaletteGroups(resolveCommands(handlers())).flatMap((g) => g.actions.map((a) => a.id)))
    for (const id of menuIds) expect(palette, id).toContain(id)
  })

  it('gives no two commands the same label or key', () => {
    const labels = ids.map((id) => spec(id).label.toLowerCase())
    expect(new Set(labels).size).toBe(labels.length)
    const keys = ids.filter((id) => spec(id).shortcut).map((id) => spec(id).shortcut!.join('+'))
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('lists exactly the registry bindings on the ? sheet', () => {
    const rows = shortcutRows(resolveCommands(handlers()))
    expect(rows.map((r) => r.keys.join('+'))).toEqual(ids.filter((id) => spec(id).shortcut).map((id) => spec(id).shortcut!.map((k) => (k === 'Mod' ? 'Ctrl' : k)).join('+')))
  })

  it('keeps an unavailable command listed, greyed, with its reason', () => {
    const cmds = resolveCommands(handlers({ 'file.print': { run: vi.fn(), unavailable: 'Solve first.' } }))
    const row = commandPaletteGroups(cmds).flatMap((g) => g.actions).find((a) => a.id === 'file.print')!
    expect(row.disabled).toBe(true)
    expect(row.description).toBe('File · Solve first.')
  })
})

describe('keys', () => {
  const cmds = resolveCommands(handlers())
  it('tells Save from Save As, and Ctrl from ⌘', () => {
    expect(commandForKey(cmds, key('s', { ctrlKey: true }))?.id).toBe('file.save')
    expect(commandForKey(cmds, key('S', { ctrlKey: true, shiftKey: true }))?.id).toBe('file.saveAs')
    expect(commandForKey(cmds, key('o', { metaKey: true }))?.id).toBe('file.open')
    expect(commandForKey(cmds, key('s', { ctrlKey: true, altKey: true }))).toBeNull()
  })
  it('runs the target keys and ? but leaves keys owned elsewhere alone', () => {
    expect(commandForKey(cmds, key('F2'))?.id).toBe('run.solve')
    expect(commandForKey(cmds, key('F4'))?.id).toBe('run.check')
    expect(commandForKey(cmds, key('Escape'))?.id).toBe('run.stop')
    expect(commandForKey(cmds, key('?', { shiftKey: true }))?.id).toBe('help.shortcuts')
    expect(commandForKey(cmds, key('k', { ctrlKey: true }))).toBeNull()
    expect(commandForKey(cmds, key(' ', { ctrlKey: true }))).toBeNull()
    expect(matchesShortcut(key('F2', { ctrlKey: true }), ['F2'])).toBe(false)
  })
})
