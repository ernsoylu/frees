// Phase N1: one command registry. Every app-level command is declared here
// once — its id, label, aliases, icon, location and shortcut — and the TopBar
// menus, the rail's create and layout menus, the mobile menu, the command
// palette and the `?` sheet are all built from it. App supplies one handler
// per id (`CommandHandlers` makes a missing one a type error) and, where a
// command cannot run now, the visible reason why.
//
// Function-catalogue and documentation palette entries stay data-driven, and
// schematic canvas commands keep `schematic/commands.ts`.
//
// Phase O: the ribbon (`Ribbon.tsx`, behind the Preferences flag) is built from
// `RIBBON_TABS` and `CONTEXT_TABS` below. A contextual command (a table's Add
// Row, a plot's Export) is handled by whichever window is focused; the window
// publishes it through `contextActions.ts`, and App reports "Focus a table
// first" when none has.
import type { SpotlightActionData, SpotlightActionGroupData } from '@mantine/spotlight'
import { Kbd } from '@mantine/core'
import {
  IconAdjustments,
  IconArrowBackUp,
  IconArrowBarDown,
  IconArrowBarLeft,
  IconArrowBarRight,
  IconFocusCentered,
  IconLayoutSidebarRight,
  IconListSearch,
  IconMaximize,
  IconPictureInPicture,
  IconSquareX,
  IconStack2,
  IconX,
  IconArrowForwardUp,
  IconBook,
  IconChartGridDots,
  IconChartHistogram,
  IconChartLine,
  IconChecks,
  IconCode,
  IconColumnInsertRight,
  IconColumns,
  IconCrosshair,
  IconDownload,
  IconFileSpreadsheet,
  IconFilter,
  IconFocus2,
  IconLayoutNavbarCollapse,
  IconListCheck,
  IconMoon,
  IconPhotoUp,
  IconRefresh,
  IconRowInsertBottom,
  IconRowRemove,
  IconRuler,
  IconSquareRoot2,
  IconTrash,
  IconWand,
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
import type { WindowAction } from './workspace/windowActions'

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
  /** An on/off setting: the ribbon draws it as a pressed toggle. */
  toggle?: boolean
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
  'tool.variableInfo': { label: 'Variable Settings…', location: 'Tools ▸ Equation tools', group: 'Tools', icon: IconVariable, aliases: ['variable information', 'guesses', 'bounds'], description: 'Guess values, bounds and units of every variable' },
  'tool.minMax': { label: 'Optimization…', location: 'Tools ▸ Analysis', group: 'Tools', icon: IconTargetArrow, aliases: ['min / max', 'optimize', 'minimize', 'maximize'] },
  'tool.curveFit': { label: 'Curve Fit…', location: 'Tools ▸ Analysis', group: 'Tools', icon: IconMathFunction, aliases: ['regression'] },
  'tool.monteCarlo': { label: 'Monte Carlo…', location: 'Tools ▸ Analysis', group: 'Tools', icon: IconChartHistogram, aliases: ['uncertainty', 'monte carlo uncertainty'] },
  'tool.sensitivity': { label: 'Global Sensitivity…', location: 'Tools ▸ Analysis', group: 'Tools', icon: IconChartGridDots, aliases: ['sobol', 'morris'] },
  'tool.pidTuner': { label: 'PID Tuner…', location: 'Tools ▸ Analysis', group: 'Tools', icon: IconAdjustments },
  'tool.parameterFit': { label: 'Parameter Estimation…', location: 'Tools ▸ Analysis', group: 'Tools', icon: IconCrosshair, aliases: ['calibration'] },
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
  'help.docs': { label: 'Documentation', location: 'Rail', group: 'Help', icon: IconBook, aliases: ['help', 'manual'] },

  // Phase O: the ribbon's own commands.
  'run.findAll': { label: 'Find All Solutions', location: 'Toolbar ▸ Solve options', group: 'Run', icon: IconListCheck, toggle: true, description: 'Bounded multiple-solution search (max 32 solutions)' },
  'run.complex': { label: 'Complex Mode', location: 'Toolbar ▸ Solve options', group: 'Run', icon: IconSquareRoot2, toggle: true, description: 'Solve over the complex numbers' },
  'app.stopCriteria': { label: 'Stop Criteria…', location: 'Rail ▸ Preferences', group: 'Run', icon: IconAdjustments, aliases: ['tolerance', 'iterations', 'residuals'], description: 'Iteration, residual and time limits, in Preferences' },
  'edit.undo': { label: 'Undo', location: 'Quick Access', group: 'Edit', icon: IconArrowBackUp, description: 'Undo the last edit in the focused document' },
  'edit.redo': { label: 'Redo', location: 'Quick Access', group: 'Edit', icon: IconArrowForwardUp, description: 'Redo the last undone edit in the focused document' },
  'insert.function': { label: 'Insert Function…', location: 'Functions', group: 'Create', icon: IconMathFunction, aliases: ['functions', 'function browser', 'catalogue'], description: 'Search every built-in function and insert it at the caret' },
  'view.theme': { label: 'Toggle Light/Dark Theme', location: 'Rail', group: 'Views', icon: IconMoon, aliases: ['theme', 'dark mode', 'light mode'] },
  'view.ribbon': { label: 'Collapse or Expand Ribbon', location: 'Ribbon', group: 'Views', icon: IconLayoutNavbarCollapse, shortcut: ['Mod', 'F1'], description: 'Also: double-click a ribbon tab' },
  'data.tableOps': { label: 'Table Operations…', location: 'Tables ▸ toolbar', group: 'Data', icon: IconFilter, aliases: ['wrangle', 'filter', 'join', 'group'], description: 'Filter rows, transform columns, group, roll and join tables' },
  'data.functionFromColumns': { label: 'Create Function from Columns…', location: 'Tables ▸ toolbar', group: 'Data', icon: IconMathFunction, description: 'Turn two columns of the active table into a Function Table' },
  'table.configure': { label: 'Configure Columns…', location: 'Inspector', group: 'Table', icon: IconColumns },
  'table.addRow': { label: 'Add Row', location: 'Inspector', group: 'Table', icon: IconRowInsertBottom },
  'table.removeLastRow': { label: 'Remove Last Row', location: 'Inspector', group: 'Table', icon: IconRowRemove },
  'table.fillColumn': { label: 'Fill Column…', location: 'Tables ▸ column header', group: 'Table', icon: IconColumnInsertRight, aliases: ['alter values'], description: 'Fill an input column from a first to a last value' },
  'table.plotSelected': { label: 'Plot Selected Columns', location: 'Tables ▸ selection', group: 'Table', icon: IconChartLine, description: 'The first selected column is X, the rest are Y' },
  'table.retryFailed': { label: 'Retry Failed Runs', location: 'Tables ▸ status', group: 'Table', icon: IconRefresh },
  'table.exportData': { label: 'Data Export — full precision', location: 'Tables ▸ Export', group: 'Table', icon: IconDownload, description: 'CSV with exact values (round-trip)' },
  'table.exportReport': { label: 'Report Export — formatted', location: 'Tables ▸ Export', group: 'Table', icon: IconFileSpreadsheet, description: 'CSV with 6 significant digits' },
  'table.goToDefinition': { label: 'Go to Definition', location: 'Tables', group: 'Table', icon: IconCode, description: 'Show the TABLE block in the Editor' },
  'table.delete': { label: 'Delete Table…', location: 'Inspector', group: 'Table', icon: IconTrash },
  'plot.configure': { label: 'Configure Plot…', location: 'Plot ▸ toolbar', group: 'Plot', icon: IconAdjustments },
  'plot.export': { label: 'Export Plot…', location: 'Plot ▸ toolbar', group: 'Plot', icon: IconDownload, description: 'Image or data; the view scope is chosen in the menu' },
  'plot.inspect': { label: 'Inspect Plot', location: 'Plot ▸ measurement bar', group: 'Plot', icon: IconFocus2, description: 'Move to the cursor and measurement bar (arrow keys step samples)' },
  'plot.delete': { label: 'Delete Plot…', location: 'Inspector', group: 'Plot', icon: IconTrash },
  'digitizer.image': { label: 'Load Image…', location: 'Digitizer', group: 'Digitizer', icon: IconPhotoUp },
  'digitizer.calibrate': { label: 'Calibrate Axes', location: 'Digitizer', group: 'Digitizer', icon: IconRuler, description: 'Click X1, X2, Y1 and Y2 on the image' },
  'digitizer.extract': { label: 'Extract Points', location: 'Digitizer', group: 'Digitizer', icon: IconWand, description: 'Pick a curve colour and auto-extract its points' },
  'digitizer.review': { label: 'Review Points', location: 'Digitizer', group: 'Digitizer', icon: IconListCheck, description: 'Select and drag points to correct them' },
  'digitizer.useData': { label: 'Use Data as Function Table', location: 'Digitizer', group: 'Digitizer', icon: IconTable },
  // Phase Q: window commands. Each acts on the active window; a tab's context
  // menu runs the same actions on the tab it was opened on. No default keys:
  // Ctrl+W, Ctrl+Tab and Ctrl+1–9 belong to the browser.
  'window.list': { label: 'Window List…', location: 'Palette', group: 'Windows', icon: IconListSearch, aliases: ['windows', 'switch window', 'open views'], description: 'Search the open windows and go to one' },
  'window.close': { label: 'Close View', location: 'Tab menu', group: 'Windows', icon: IconX, aliases: ['close window', 'close tab'], description: 'Close the active window; its data stays in the project' },
  'window.closeOthers': { label: 'Close Others', location: 'Tab menu', group: 'Windows', icon: IconSquareX, description: 'Close the other tabs of the active window\'s group' },
  'window.closeGroup': { label: 'Close All in Group', location: 'Tab menu', group: 'Windows', icon: IconStack2, description: 'Close every tab of the active window\'s group' },
  'window.float': { label: 'Float or Dock Back', location: 'Tab menu', group: 'Windows', icon: IconPictureInPicture, aliases: ['float', 'dock', 'detach'], description: 'Lift the active window out of the grid, or dock a floating one in the centre' },
  'window.maximize': { label: 'Maximize or Restore', location: 'Tab menu', group: 'Windows', icon: IconMaximize, aliases: ['maximize', 'restore', 'full size'], description: 'Give the active window the whole workspace, or bring the others back' },
  'window.moveEdge': { label: 'Move to Edge', location: 'Tab menu', group: 'Windows', icon: IconLayoutSidebarRight, description: 'Move the active window into the collapsible right edge panel' },
  'window.moveCentre': { label: 'Move to Centre', location: 'Tab menu', group: 'Windows', icon: IconFocusCentered, aliases: ['move to center'], description: 'Dock the active window as a tab in the centre' },
  'window.moveLeft': { label: 'Move Left', location: 'Tab menu', group: 'Windows', icon: IconArrowBarLeft, aliases: ['split left'], description: 'Split the active window out to the left of its group' },
  'window.moveRight': { label: 'Move Right', location: 'Tab menu', group: 'Windows', icon: IconArrowBarRight, aliases: ['split right'], description: 'Split the active window out to the right of its group' },
  'window.moveBelow': { label: 'Move Below', location: 'Tab menu', group: 'Windows', icon: IconArrowBarDown, aliases: ['split below', 'split down'], description: 'Split the active window out below its group' },
  'app.palette': { label: 'Command Palette', location: 'Toolbar', group: null, icon: IconSearch, shortcut: ['Mod', 'K'], ownedElsewhere: true },
  'editor.complete': { label: 'Autocomplete functions & variables', location: 'Editor', group: null, icon: IconCode, shortcut: ['Mod', 'Space'], ownedElsewhere: true },
} as const satisfies Record<string, CommandSpec>

export type CommandId = keyof typeof COMMAND_SPECS

/** What App supplies per command: the handler, the reason it cannot run now
 *  (null when it can), a toggle's state, and a description naming the target. */
export interface CommandHandler {
  run: () => void
  unavailable?: string | null
  checked?: boolean
  description?: string
}
export type CommandHandlers = Record<CommandId, CommandHandler>

export interface Command extends CommandSpec {
  id: CommandId
  run: () => void
  unavailable: string | null
  checked?: boolean
}

export type Commands = Record<CommandId, Command>

export function resolveCommands(handlers: CommandHandlers): Commands {
  const out = {} as Commands
  for (const id of Object.keys(COMMAND_SPECS) as CommandId[]) {
    const h = handlers[id]
    const spec = COMMAND_SPECS[id] as CommandSpec
    out[id] = { ...spec, id, run: h.run, unavailable: h.unavailable ?? null, checked: h.checked, description: h.description ?? spec.description }
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
  'file.new', 'file.open', 'file.library', 'file.url', 'file.save', 'file.saveAs', '-',
  { label: 'Insert' }, 'table.newParametric', 'table.newFunction1', 'table.newFunction2', 'state.newTable', 'plot.newXY', 'plot.newProperty', 'plot.newPsychro', 'tool.componentWizard', 'insert.function', '-',
  { label: 'Analysis' }, 'tool.minMax', 'tool.curveFit', 'tool.parameterFit', 'tool.monteCarlo', 'tool.sensitivity', 'tool.pidTuner', 'tool.variableInfo', '-',
  'app.preferences', '-', 'file.example', 'help.docs',
]

// --- The ribbon (Phase O): permanent tabs, then the contextual ones. ---

export interface RibbonGroup { label: string; items: readonly CommandId[] }
/** `slot` names a place after the groups where a window portals its own (Phase P, `ribbonSlots.ts`). */
export interface RibbonTab { id: string; label: string; groups: readonly RibbonGroup[]; slot?: string }

export const RIBBON_TABS: readonly RibbonTab[] = [
  { id: 'home', label: 'Home', groups: [
    { label: 'Project', items: ['file.new', 'file.open', 'file.save', 'file.saveAs', 'file.library', 'file.share', 'file.print'] },
    { label: 'Run', items: ['model.check', 'model.solve', 'run.stop'] },
    { label: 'Solve Setup', items: ['run.findAll', 'run.complex', 'app.stopCriteria'] },
    { label: 'Panels', items: ['view.editor', 'view.variables', 'view.inspector', 'view.terminal'] },
    { label: 'Layout', items: ['layout.default', 'layout.results', 'layout.split'] },
  ] },
  { id: 'insert', label: 'Insert', groups: [
    { label: 'Tables', items: ['table.newParametric', 'table.newFunction1', 'table.newFunction2', 'table.importCsv', 'state.newTable'] },
    { label: 'Plots', items: ['plot.newXY', 'plot.newProperty', 'plot.newPsychro'] },
    { label: 'Model', items: ['tool.componentWizard', 'insert.function'] },
    { label: 'Digitizer', items: ['view.digitizer'] },
  ] },
  { id: 'data', label: 'Data', groups: [
    { label: 'Import / Export', items: ['table.importCsv', 'table.exportData', 'table.exportReport', 'file.exportText', 'file.url'] },
    { label: 'Transform', items: ['data.tableOps', 'data.functionFromColumns'] },
  ] },
  { id: 'analysis', label: 'Analysis', groups: [
    { label: 'Optimize & Fit', items: ['tool.minMax', 'tool.curveFit', 'tool.parameterFit'] },
    { label: 'Uncertainty', items: ['tool.monteCarlo', 'tool.sensitivity'] },
    { label: 'Control', items: ['tool.pidTuner'] },
    { label: 'Variables', items: ['tool.variableInfo'] },
  ] },
  { id: 'view', label: 'View', groups: [
    { label: 'Documents', items: ['view.editor', 'view.tables', 'view.plots', 'view.states', 'view.schematic', 'view.digitizer'] },
    { label: 'Panels', items: ['view.variables', 'view.inspector', 'view.terminal'] },
    { label: 'Windows', items: ['window.list', 'window.float', 'window.maximize', 'window.close', 'window.closeOthers', 'window.closeGroup'] },
    { label: 'Move', items: ['window.moveEdge', 'window.moveCentre', 'window.moveLeft', 'window.moveRight', 'window.moveBelow'] },
    { label: 'Layouts', items: ['layout.default', 'layout.results', 'layout.split'] },
    { label: 'Appearance', items: ['view.theme', 'view.ribbon', 'app.preferences'] },
  ], slot: 'view-schematic' },
  { id: 'help', label: 'Help', groups: [
    { label: 'Learn', items: ['help.gettingStarted', 'file.example', 'help.docs'] },
    { label: 'Reference', items: ['help.shortcuts', 'app.palette', 'app.about'] },
  ] },
]

/** Contextual tabs: shown only while a window of their kind is focused. */
export const CONTEXT_TABS: Record<'table' | 'plot' | 'schematic' | 'digitizer', RibbonTab> = {
  table: { id: 'ctx-table', label: 'Table', groups: [
    { label: 'Structure', items: ['table.configure', 'table.addRow', 'table.removeLastRow', 'table.fillColumn'] },
    { label: 'Edit', items: ['edit.undo', 'edit.redo'] },
    { label: 'Results', items: ['table.plotSelected', 'table.retryFailed'] },
    { label: 'Export', items: ['table.exportData', 'table.exportReport'] },
    { label: 'Table', items: ['table.goToDefinition', 'table.delete'] },
  ] },
  plot: { id: 'ctx-plot', label: 'Plot', groups: [
    { label: 'Plot', items: ['plot.configure', 'plot.export', 'plot.inspect', 'plot.delete'] },
  ] },
  // The canvas portals its own controls here: Sheets, Model, Edit, Arrange,
  // Overlay, Annotate, Drawing Views, Zoom (schematic/SchematicTab.tsx).
  schematic: { id: 'ctx-schematic', label: 'Schematic', groups: [], slot: 'schematic' },
  digitizer: { id: 'ctx-digitizer', label: 'Digitizer', groups: [
    { label: 'Steps', items: ['digitizer.image', 'digitizer.calibrate', 'digitizer.extract', 'digitizer.review', 'digitizer.useData'] },
  ] },
}

/** A dock tab's context menu (Phase Q): the command and the window action it runs on that tab. */
export const TAB_MENU: readonly (readonly [CommandId, WindowAction] | '-')[] = [
  ['window.close', 'close'], ['window.closeOthers', 'closeOthers'], ['window.closeGroup', 'closeGroup'], '-',
  ['window.float', 'float'], ['window.maximize', 'maximize'], '-',
  ['window.moveEdge', 'moveEdge'], ['window.moveCentre', 'moveCentre'], ['window.moveLeft', 'moveLeft'], ['window.moveRight', 'moveRight'], ['window.moveBelow', 'moveBelow'],
]

/** Where a command sits on the ribbon, e.g. "Analysis ▸ Optimize & Fit" (its first home). */
export function ribbonLocation(id: CommandId): string | null {
  for (const tab of [...RIBBON_TABS, ...Object.values(CONTEXT_TABS)]) {
    for (const g of tab.groups) if (g.items.includes(id)) return `${tab.label} ▸ ${g.label}`
  }
  return null
}

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

/** The palette groups for the registry's commands, each row naming its location
 *  (its ribbon path when the ribbon is on) and shortcut. */
export function commandPaletteGroups(cmds: Commands, ribbon = false): SpotlightActionGroupData[] {
  const groups = new Map<string, SpotlightActionData[]>()
  for (const c of Object.values(cmds)) {
    if (c.group === null) continue
    const Ico = c.icon
    const detail = c.unavailable ?? c.description
    const location = (ribbon && ribbonLocation(c.id)) || c.location
    const action: SpotlightActionData = {
      id: c.id,
      label: c.toggle ? `${c.label}: ${c.checked ? 'on' : 'off'}` : c.label,
      description: detail ? `${location} · ${detail}` : location,
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
