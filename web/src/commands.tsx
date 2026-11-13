// Phase N1: one command registry. Every app-level command is declared here
// once — its id, label, aliases, icon, location and shortcut — and the TopBar
// menus, the rail's create and layout menus, the mobile menu, the command
// palette and the `?` sheet are all built from it. App supplies one handler
// per id (`CommandHandlers` makes a missing one a type error) and, where a
// command cannot run now, the visible reason why.
//
// Function-catalogue and documentation palette entries stay data-driven, and
// schematic canvas commands keep `schematic/commands.ts`.
import type { SpotlightActionData, SpotlightActionGroupData } from '@mantine/spotlight'
import { Kbd } from '@mantine/core'
import {
  IconAdjustments,
  IconBook,
  IconChartGridDots,
  IconChartHistogram,
  IconChartLine,
  IconChecks,
  IconCode,
  IconCrosshair,
  IconDatabase,
  IconDeviceFloppy,
  IconFileExport,
  IconFilePlus,
  IconFileTypeCsv,
  IconFolderOpen,
  IconHelp,
  IconInfoCircle,
  IconKeyboard,
  IconLayoutColumns,
  IconLayoutGrid,
  IconLink,
  IconMathFunction,
  IconPlayerPlayFilled,
  IconPlayerStopFilled,
  IconPrinter,
  IconSearch,
  IconSettings,
  IconSitemap,
  IconTable,
  IconTargetArrow,
  IconTemperature,
  IconTerminal2,
  IconVariable,
  IconWorld,
  type Icon,
} from '@tabler/icons-react'

export interface CommandSpec {
  label: string
  /** Where the command lives in the shell, shown on its palette row. */
  location: string
  /** Its palette group; `null` keeps it off the palette (toolbar-only or owned elsewhere). */
  group: string | null
  icon: Icon
  aliases?: readonly string[]
  description?: string
  /** Keys as shown (`Mod` is Ctrl, or ⌘ on a Mac). */
  shortcut?: readonly string[]
  /** The key belongs to another surface (the palette, the editor): listed, never dispatched here. */
  ownedElsewhere?: boolean
  /** A short note under the item in a menu. */
  menuHint?: string
}

export const COMMAND_SPECS = {
  'run.check': { label: 'Check', location: 'Toolbar', group: null, icon: IconChecks, shortcut: ['F4'], description: 'Check the run target: the focused parametric table, else the model' },
  'run.solve': { label: 'Solve', location: 'Toolbar', group: null, icon: IconPlayerPlayFilled, shortcut: ['F2'], description: 'Check & solve the run target: the focused parametric table, else the model' },
  'run.stop': { label: 'Stop', location: 'Toolbar', group: null, icon: IconPlayerStopFilled, shortcut: ['Esc'], description: 'Stop the running solve or table run' },
  'model.check': { label: 'Check Model', location: 'Toolbar ▸ Check', group: 'Run', icon: IconChecks, aliases: ['check', 'validate'], description: 'Validate the model; a code-defined parametric table is checked when the model alone is not solvable' },
  'model.solve': { label: 'Solve Model', location: 'Toolbar ▸ Solve', group: 'Run', icon: IconPlayerPlayFilled, aliases: ['solve', 'run'], description: 'Check & solve the model' },

  'view.editor': { label: 'Editor', location: 'Rail', group: 'Views', icon: IconCode },
  'view.tables': { label: 'Tables', location: 'Rail', group: 'Views', icon: IconTable, description: 'Open the latest table (or create one)' },
  'view.plots': { label: 'Plots', location: 'Rail', group: 'Views', icon: IconChartLine, description: 'Open the latest plot (or create one)' },
  'view.states': { label: 'Open Fluid States', location: 'Rail ▸ Tables', group: 'Views', icon: IconTemperature, aliases: ['fluid states'] },
  'view.digitizer': { label: 'Graph Digitizer', location: 'Rail', group: 'Views', icon: IconChartGridDots },
  'view.schematic': { label: 'Schematic', location: 'Rail', group: 'Views', icon: IconSitemap, description: 'Auto-rendered component network' },
  'view.variables': { label: 'Variable Explorer', location: 'Tools', group: 'Views', icon: IconVariable },
  'view.terminal': { label: 'Terminal', location: 'Tools', group: 'Views', icon: IconTerminal2, aliases: ['repl'] },
  'view.inspector': { label: 'Inspector', location: 'Tools', group: 'Views', icon: IconAdjustments },

  'layout.default': { label: 'Default View', location: 'Rail ▸ Layout', group: 'Views', icon: IconLayoutGrid, aliases: ['reset layout'] },
  'layout.results': { label: 'Results Focused', location: 'Rail ▸ Layout', group: 'Views', icon: IconChartLine },
  'layout.split': { label: 'Split View', location: 'Rail ▸ Layout', group: 'Views', icon: IconLayoutColumns },

  'table.newParametric': { label: 'New Parametric Table', location: 'Rail ▸ Tables', group: 'Create', icon: IconTable, aliases: ['add parametric table', 'sweep'] },
  'table.newFunction1': { label: 'New Function Table (one input)', location: 'Rail ▸ Tables', group: 'Create', icon: IconChartGridDots, aliases: ['lookup', '1-D', '1-arg'] },
  'table.newFunction2': { label: 'New Function Table (curve family)', location: 'Rail ▸ Tables', group: 'Create', icon: IconChartGridDots, aliases: ['lookup', '2-D', 'curve'] },
  'table.importCsv': { label: 'Import CSV as Function Table', location: 'Tables ▸ +', group: 'Create', icon: IconFileTypeCsv, description: 'Two columns of a .csv become a function callable in the equations' },
  'state.newTable': { label: 'New Fluid State Table', location: 'Palette', group: 'Create', icon: IconTemperature, aliases: ['add fluid state table', 'state table'], description: 'Open the Editor and insert a STATE TABLE block at the caret' },
  'plot.newXY': { label: 'New X-Y Plot', location: 'Rail ▸ Plots', group: 'Create', icon: IconChartLine, aliases: ['add graph', 'x-y'] },
  'plot.newProperty': { label: 'New Property Diagram', location: 'Rail ▸ Plots', group: 'Create', icon: IconTemperature, aliases: ['add property graph', 'T-s', 'P-h'] },
  'plot.newPsychro': { label: 'New Psychrometric Chart', location: 'Rail ▸ Plots', group: 'Create', icon: IconTemperature, aliases: ['add psychrometric graph'] },

  'tool.componentWizard': { label: 'Component Wizard', location: 'Tools ▸ Modeling', group: 'Tools', icon: IconLayoutGrid, description: 'Browse the component library and insert a configured component' },
  'tool.variableInfo': { label: 'Variable Information', location: 'Tools ▸ Equation tools', group: 'Tools', icon: IconVariable },
  'tool.minMax': { label: 'Min / Max (optimize)', location: 'Tools ▸ Analysis', group: 'Tools', icon: IconTargetArrow, aliases: ['optimize', 'minimize', 'maximize'] },
  'tool.curveFit': { label: 'Curve Fit', location: 'Tools ▸ Analysis', group: 'Tools', icon: IconMathFunction, aliases: ['regression'] },
  'tool.monteCarlo': { label: 'Monte Carlo Uncertainty', location: 'Tools ▸ Analysis', group: 'Tools', icon: IconChartHistogram, aliases: ['uncertainty'] },
  'tool.sensitivity': { label: 'Global Sensitivity', location: 'Tools ▸ Analysis', group: 'Tools', icon: IconChartGridDots, aliases: ['sobol', 'morris'] },
  'tool.pidTuner': { label: 'PID Tuner', location: 'Tools ▸ Analysis', group: 'Tools', icon: IconAdjustments },
  'tool.parameterFit': { label: 'Parameter Estimation', location: 'Tools ▸ Analysis', group: 'Tools', icon: IconCrosshair, aliases: ['calibration'] },
  'app.preferences': { label: 'Preferences', location: 'Rail', group: 'Tools', icon: IconSettings, aliases: ['settings', 'units'] },
  'app.about': { label: 'About', location: 'Rail', group: 'Tools', icon: IconInfoCircle },

  'file.new': { label: 'New Project', location: 'File', group: 'Project', icon: IconFilePlus },
  'file.open': { label: 'Open Project…', location: 'File', group: 'Project', icon: IconFolderOpen, shortcut: ['Mod', 'O'] },
  'file.library': { label: 'Browser Projects…', location: 'File', group: 'Project', icon: IconDatabase, description: 'Projects saved in this browser — no server, no files' },
  'file.example': { label: 'Open Example…', location: 'File', group: 'Project', icon: IconLayoutGrid, aliases: ['examples', 'gallery'], description: 'Load a ready-to-solve worked example' },
  'file.url': { label: 'Open URL…', location: 'File', group: 'Project', icon: IconWorld, description: 'Load an equation document from a raw text URL' },
  'file.share': { label: 'Copy Share Link', location: 'File', group: 'Project', icon: IconLink, description: 'Self-contained URL carrying this document' },
  'file.print': { label: 'Print Report…', location: 'File', group: 'Project', icon: IconPrinter, shortcut: ['Mod', 'P'], description: 'Printable calculation report of the last solve (print to PDF)' },
  'file.save': { label: 'Save Project', location: 'File', group: 'Project', icon: IconDeviceFloppy, shortcut: ['Mod', 'S'], menuHint: '.frees file: equations, tables, maps, plots, layout, guesses' },
  'file.saveAs': { label: 'Save Project As…', location: 'File', group: 'Project', icon: IconDeviceFloppy, shortcut: ['Mod', 'Shift', 'S'] },
  'file.exportText': { label: 'Export Equation Text…', location: 'File', group: 'Project', icon: IconFileExport, menuHint: 'Editor document only — GUI tables, maps, and layout stay in the project' },
  'file.saveBrowser': { label: 'Save to Browser', location: 'Palette', group: 'Project', icon: IconDatabase, description: 'Keep this project in the browser under its current name' },

  'help.gettingStarted': { label: 'Getting Started…', location: 'Help', group: 'Help', icon: IconHelp, description: 'What frees is, and four one-click ways in' },
  'help.shortcuts': { label: 'Keyboard Shortcuts', location: 'Help', group: 'Help', icon: IconKeyboard, shortcut: ['?'], description: 'Show the hotkey reference' },
  'help.docs': { label: 'Help', location: 'Rail', group: 'Help', icon: IconBook, aliases: ['documentation'] },
  'app.palette': { label: 'Command Palette', location: 'Toolbar', group: null, icon: IconSearch, shortcut: ['Mod', 'K'], ownedElsewhere: true },
  'editor.complete': { label: 'Autocomplete functions & variables', location: 'Editor', group: null, icon: IconCode, shortcut: ['Mod', 'Space'], ownedElsewhere: true },
} as const satisfies Record<string, CommandSpec>

export type CommandId = keyof typeof COMMAND_SPECS

/** What App supplies per command: the handler, and the reason it cannot run now (null when it can). */
export type CommandHandlers = Record<CommandId, { run: () => void; unavailable?: string | null }>

export interface Command extends CommandSpec {
  id: CommandId
  run: () => void
  unavailable: string | null
}

export type Commands = Record<CommandId, Command>

export function resolveCommands(handlers: CommandHandlers): Commands {
  const out = {} as Commands
  for (const id of Object.keys(COMMAND_SPECS) as CommandId[]) {
    const h = handlers[id]
    out[id] = { ...(COMMAND_SPECS[id] as CommandSpec), id, run: h.run, unavailable: h.unavailable ?? null }
  }
  return out
}

// --- Menu layouts: each surface lists ids; `'-'` is a divider, `{ label }` a section label. ---

export type MenuEntry = CommandId | '-' | { label: string }

export const FILE_MENU: readonly MenuEntry[] = [
  'file.new', 'file.open', 'file.library', 'file.example', 'file.url', 'file.share', 'file.print', '-',
  'file.save', 'file.saveAs', 'file.exportText',
]
export const TOOLS_MENU: readonly MenuEntry[] = [
  { label: 'Modeling' }, 'tool.componentWizard', '-',
  { label: 'Equation tools' }, 'tool.variableInfo', '-',
  { label: 'Analysis' }, 'tool.minMax', 'tool.curveFit', 'tool.monteCarlo', 'tool.sensitivity', 'tool.pidTuner', 'tool.parameterFit', '-',
  { label: 'Auxiliary panels' }, 'view.variables', 'view.terminal', 'view.inspector',
]
export const RAIL_TABLES_NEW: readonly CommandId[] = ['table.newParametric', 'table.newFunction1', 'table.newFunction2', 'view.states']
export const RAIL_PLOTS_NEW: readonly CommandId[] = ['plot.newXY', 'plot.newProperty', 'plot.newPsychro']
export const LAYOUT_MENU: readonly CommandId[] = ['layout.default', 'layout.results', 'layout.split']
export const MOBILE_MENU: readonly MenuEntry[] = [
  'file.new', 'file.open', 'file.library', 'file.url', 'file.save', 'file.saveAs', '-', 'app.preferences', '-', 'file.example', 'help.docs',
]

/** Every id a menu surface shows, for the parity test. */
export const MENU_SURFACES: Record<string, readonly MenuEntry[]> = {
  File: FILE_MENU, Tools: TOOLS_MENU, 'Rail ▸ Tables': RAIL_TABLES_NEW, 'Rail ▸ Plots': RAIL_PLOTS_NEW, 'Rail ▸ Layout': LAYOUT_MENU, Mobile: MOBILE_MENU,
}

// --- Keys ---

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
export const keyLabel = (k: string) => (k === 'Mod' ? (isMac ? '⌘' : 'Ctrl') : k)

/** Whether `e` presses `keys` exactly (modifiers included). */
export function matchesShortcut(e: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'>, keys: readonly string[]): boolean {
  const main = keys[keys.length - 1]
  const mod = keys.includes('Mod')
  const shift = keys.includes('Shift')
  if (mod !== (e.ctrlKey || e.metaKey) || e.altKey) return false
  // `?` is itself a shifted key, so only a letter or a named key checks Shift.
  if (main.length === 1 && !/[a-z]/i.test(main)) return e.key === main
  if (shift !== e.shiftKey) return false
  const key = main === 'Esc' ? 'Escape' : main
  return e.key.toLowerCase() === key.toLowerCase()
}

/** The command a key event runs, if any; keys owned by another surface never match. */
export function commandForKey(cmds: Commands, e: KeyboardEvent): Command | null {
  for (const c of Object.values(cmds)) {
    if (c.shortcut && !c.ownedElsewhere && matchesShortcut(e, c.shortcut)) return c
  }
  return null
}

// --- Renderers ---

/** The palette groups for the registry's commands, each row naming its location and shortcut. */
export function commandPaletteGroups(cmds: Commands): SpotlightActionGroupData[] {
  const groups = new Map<string, SpotlightActionData[]>()
  for (const c of Object.values(cmds)) {
    if (c.group === null) continue
    const Ico = c.icon
    const detail = c.unavailable ?? c.description
    const action: SpotlightActionData = {
      id: c.id,
      label: c.label,
      description: detail ? `${c.location} · ${detail}` : c.location,
      keywords: c.aliases ? [...c.aliases] : undefined,
      leftSection: <Ico size={18} />,
      rightSection: c.shortcut ? <Kbd size="xs">{c.shortcut.map(keyLabel).join('+')}</Kbd> : undefined,
      disabled: c.unavailable !== null,
      onClick: c.run,
    }
    groups.set(c.group, [...(groups.get(c.group) ?? []), action])
  }
  return [...groups].map(([group, actions]) => ({ group, actions }))
}

/** The `?` sheet's rows: every registry command with a key. */
export const shortcutRows = (cmds: Commands) =>
  Object.values(cmds)
    .filter((c) => c.shortcut)
    .map((c) => ({ keys: c.shortcut!.map(keyLabel), action: c.description ? `${c.label} — ${c.description}` : c.label }))
