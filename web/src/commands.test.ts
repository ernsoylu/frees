// Phase N acceptance: command parity. Every menu surface resolves to registry
// ids, the palette offers every menu command, no two commands share a label or
// a key, and the `?` sheet lists exactly the registry's bindings.
import { describe, expect, it, vi } from 'vitest'
import {
  COMMAND_SPECS,
  CONTEXT_TABS,
  FILE_MENU,
  MENU_SURFACES,
  MOBILE_MENU,
  RIBBON_TABS,
  PLOT_TAB_MENU,
  TABLE_ROW_MENU,
  TAB_MENU,
  VARIABLE_ROW_MENU,
  menuCommands,
  TOOLS_MENU,
  ribbonLocation,
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

import { WINDOW_ACTIONS } from './workspace/windowActions'

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

describe('ribbon (Phase O)', () => {
  const ribbonIds = new Set([...RIBBON_TABS, ...Object.values(CONTEXT_TABS)].flatMap((t) => t.groups.flatMap((g) => g.items)))
  const permanent = new Set(RIBBON_TABS.flatMap((t) => t.groups.flatMap((g) => g.items)))

  it('puts every File, Functions and Tools entry one click from a permanent tab (AC-02)', () => {
    const menus = [...FILE_MENU, ...TOOLS_MENU].filter((e): e is CommandId => typeof e === 'string' && e !== '-')
    for (const id of [...menus, 'insert.function' as const]) expect(permanent, id).toContain(id)
  })

  it('keeps every ribbon command in the palette, with its ribbon path when the ribbon is on', () => {
    const palette = commandPaletteGroups(resolveCommands(handlers()), true).flatMap((g) => g.actions)
    const byId = new Map(palette.map((a) => [a.id, a]))
    for (const id of ribbonIds) {
      if (spec(id).group === null) continue
      expect(byId.get(id), id).toBeDefined()
    }
    expect(byId.get('tool.minMax')?.description).toMatch(/^Analysis ▸ Optimize & Fit/)
    expect(ribbonLocation('table.addRow')).toBe('Table ▸ Structure')
  })

  it('keeps the old analysis names as search aliases', () => {
    expect(spec('tool.minMax').aliases).toContain('min / max')
    expect(spec('tool.variableInfo').aliases).toContain('variable information')
  })

  it('shows a toggle\'s state in the palette', () => {
    const cmds = resolveCommands(handlers({ 'run.findAll': { run: vi.fn(), checked: true } }))
    expect(commandPaletteGroups(cmds).flatMap((g) => g.actions).find((a) => a.id === 'run.findAll')?.label).toBe('Find All Solutions: on')
  })

  it('gives the mobile menu Insert and Analysis', () => {
    const labels = MOBILE_MENU.filter((e): e is { label: string } => typeof e === 'object').map((e) => e.label)
    expect(labels).toEqual(['Insert', 'Analysis'])
    expect(MOBILE_MENU).toContain('insert.function')
    expect(MOBILE_MENU).toContain('tool.pidTuner')
  })

  it('imports no Plotly and no analysis dialog (AC-13)', () => {
    const sources = import.meta.glob<string>('./*.{ts,tsx}', { query: '?raw', import: 'default', eager: true })
    const seen = new Set<string>()
    const visit = (file: string) => {
      if (seen.has(file)) return
      seen.add(file)
      for (const [, from] of sources[file].matchAll(/^import[^'"]*['"]([^'"]+)['"]/gm)) {
        expect(from, `${file} imports ${from}`).not.toMatch(/plotly|Modal/i)
        const local = ['.tsx', '.ts'].map((x) => from + x).find((f) => f in sources)
        if (local) visit(local)
      }
    }
    for (const f of ['./Ribbon.tsx', './StatusBar.tsx', './contextActions.ts', './ribbonPrefs.ts']) visit(f)
    expect([...seen]).toContain('./commands.tsx')
  })
})

describe('windows (Phase Q)', () => {
  it('builds the tab menu from registry commands that are also in the palette and on the View tab (AC-06)', () => {
    const palette = new Set(commandPaletteGroups(resolveCommands(handlers())).flatMap((g) => g.actions.map((a) => a.id)))
    const actions = new Set<string>()
    for (const e of TAB_MENU) {
      if (e === '-') continue
      expect(ids).toContain(e[0])
      expect(palette, e[0]).toContain(e[0])
      expect(ribbonLocation(e[0]), e[0]).toMatch(/^View ▸ (Windows|Move)$/)
      actions.add(e[1])
    }
    // Every window action has a command.
    expect([...actions].sort()).toEqual([...WINDOW_ACTIONS].sort())
    expect(ribbonLocation('window.list')).toBe('View ▸ Windows')
  })

  it('binds no window command to a key the browser owns', () => {
    for (const id of ids.filter((i) => i.startsWith('window.'))) expect(spec(id).shortcut, id).toBeUndefined()
  })
})

describe('list context menus (Phase Q)', () => {
  it('builds every row and tab menu from registry commands', () => {
    for (const menu of [TABLE_ROW_MENU, PLOT_TAB_MENU, VARIABLE_ROW_MENU]) {
      for (const e of menu) if (typeof e === 'string' && e !== '-') expect(ids, e).toContain(e)
    }
    // The commands the spec names, by the labels a user reads.
    const labels = (menu: readonly unknown[]) => menu.filter((e): e is CommandId => typeof e === 'string' && e !== '-').map((e) => spec(e).label)
    expect(labels(TABLE_ROW_MENU)).toEqual(['Rename Table…', 'Configure Columns…', 'Plot Selected Columns', 'Data Export — full precision', 'Report Export — formatted', 'Retry Failed Runs', 'Delete Table…'])
    expect(labels(PLOT_TAB_MENU)).toEqual(['Rename Plot…', 'Configure Plot…', 'Export Plot…'])
    expect(labels(VARIABLE_ROW_MENU)).toEqual(['Pin to Slider', 'Copy Value', 'Copy Name', 'Variable Settings…'])
  })

  it('gives a menu the handlers for its target, and a reason where there is none', () => {
    const run = vi.fn()
    const cmds = menuCommands({ 'variable.pin': { run, unavailable: 'Already pinned.' }, 'variable.copyName': { run }, 'table.rename': undefined })
    expect(cmds['variable.pin'].unavailable).toBe('Already pinned.')
    expect(cmds['variable.copyName'].unavailable).toBeNull()
    expect(cmds['variable.copyName'].label).toBe('Copy Name')
    expect(cmds['table.rename'].unavailable).toBe('Not available here.')
    cmds['variable.copyName'].run()
    expect(run).toHaveBeenCalledOnce()
  })

  it('keeps a row-only command out of the palette', () => {
    const palette = commandPaletteGroups(resolveCommands(handlers())).flatMap((g) => g.actions.map((a) => a.id))
    for (const id of ['variable.pin', 'variable.copyValue', 'variable.copyName']) expect(palette).not.toContain(id)
  })
})
