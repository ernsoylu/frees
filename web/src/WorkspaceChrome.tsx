import { CommandMenuItems } from './CommandMenuItems'
import { FILE_MENU, LAYOUT_MENU, RAIL_PLOTS_NEW, RAIL_TABLES_NEW, TOOLS_MENU, type CommandId, type Commands } from './commands'
import { helpUrl } from './helpUrl'
import {
  ActionIcon,
  Anchor,
  Badge,
  Button,
  Checkbox,
  Group,
  Menu,
  Popover,
  Stack,
  Text,
  Title,
  Tooltip,
  UnstyledButton,
  useComputedColorScheme,
  useMantineColorScheme,
} from '@mantine/core'
import {
  IconAdjustments,
  IconChartGridDots,
  IconSitemap,
  IconChartLine,
  IconChecks,
  IconChevronDown,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconCode,
  IconFile,
  IconHelp,
  IconInfoCircle,
  IconLayoutGrid,
  IconMathFunction,
  IconPointFilled,
  IconX,
  IconMoon,
  IconSun,
  IconPencil,
  IconPlus,
  IconPlayerPlayFilled,
  IconPlayerStopFilled,
  IconSettings,
  IconTable,
  IconTerminal2,
  IconSearch,
  IconVariable,
} from '@tabler/icons-react'
import { spotlight } from '@mantine/spotlight'
import { useMediaQuery } from '@mantine/hooks'
import { useState } from 'react'
import { CheckResponse, SolveResponse, TableRowResult, TableStats } from './api'
import { withStableKeys } from './format'
import { FUNCTION_CATEGORIES } from './functionCatalog'
import { Ribbon, RibbonButton, type RibbonContext } from './Ribbon'
import type { RibbonDensity } from './ribbonPrefs'

// ---------------------------------------------------------------------------
// Left icon rail: views on top, tool windows at the bottom (VS Code style).
// ---------------------------------------------------------------------------

// Each view carries a short `label` (shown when the rail is expanded) and a
// longer `tip` (the hover tooltip when collapsed).
const VIEWS = [
  { value: 'equations', label: 'Editor', tip: 'Editor', icon: IconCode },
  { value: 'workspace', label: 'Variables', tip: 'Variable Explorer', icon: IconVariable },
  { value: 'table', label: 'Tables', tip: 'Tables — parametric runs & curve functions', icon: IconTable },
  { value: 'plots', label: 'Plots', tip: 'Plots — X-Y, property & psychrometric', icon: IconChartLine },
  {
    value: 'digitizer',
    label: 'Digitizer',
    tip: 'Graph Digitizer — extract curves from chart images',
    icon: IconChartGridDots,
  },
  {
    value: 'schematic',
    label: 'Schematic',
    tip: 'Schematic — auto-rendered component network',
    icon: IconSitemap,
  },
  { value: 'terminal', label: 'Terminal', tip: 'Terminal — REPL evaluated against the workspace', icon: IconTerminal2 },
]

const RAIL_EXPANDED_KEY = 'frees.railExpanded'

interface RailProps {
  active: string
  /** Window kinds currently open in the dock (drives the open-state dot). */
  openKinds?: string[]
  /** Specific window ids open (e.g. "diagram:<id>") for per-instance marks. */
  openIds?: string[]
  /** Plots (X-Y, property, psychrometric) available to open as windows. */
  plots?: { id: string; name: string; tag?: string }[]
  /** Number of plot windows currently open (badge on the Plots icon). */
  plotCount?: number
  /** Tables available to open as individual windows. */
  workspaceTables?: { id: string; name: string; tag?: string }[]
  /** Number of table windows currently open (badge on the Tables icon). */
  tableCount?: number
  onSelect: (view: string) => void
  onClose?: (view: string) => void
  /** The command registry: the rail's create and Layout menus are built from it (N1). */
  commands?: Commands
  onOpenPlot?: (id: string) => void
  onOpenTable?: (id: string) => void
  /** Close every open window whose id starts with the prefix (Phase Q launchers). */
  onCloseWindows?: (idPrefix: string) => void
  onPreferences: () => void
  onAbout: () => void
}

// Sidebar launcher for a multi-instance kind (Diagram, Plots): a menu listing
// every instance (open each as its own dock window) plus a "New …" action. A
// badge shows how many windows of that kind are currently open.
function InstanceLauncher({
  expanded,
  active,
  count,
  idPrefix,
  label,
  newActions,
  emptyLabel,
  icon,
  items,
  openIds,
  onOpen,
  onCloseAll,
}: Readonly<{
  expanded: boolean
  active: boolean
  count: number
  idPrefix: string
  label: string
  newActions: { label: string; onClick: () => void }[]
  emptyLabel: string
  icon: React.ReactNode
  items: { id: string; name: string; tag?: string }[]
  openIds: Set<string>
  onOpen?: (id: string) => void
  onCloseAll?: () => void
}>) {
  const anyOpen = [...openIds].some((id) => id.startsWith(idPrefix))
  const variant = active ? 'light' : 'subtle'
  const color = active ? 'teal' : 'gray'
  const target = expanded ? (
    <Button
      variant={variant}
      color={color}
      justify="flex-start"
      fullWidth
      size="sm"
      radius="md"
      leftSection={icon}
      rightSection={
        count > 0 ? (
          <Badge size="xs" variant="filled" circle>
            {count}
          </Badge>
        ) : null
      }
      aria-label={`${label} windows`}
    >
      {label}
    </Button>
  ) : (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      <ActionIcon variant={variant} color={color} size={40} radius="md" aria-label={`${label} windows`}>
        {icon}
      </ActionIcon>
      {count > 0 && (
        <Badge
          size="xs"
          variant="filled"
          circle
          style={{ position: 'absolute', top: -3, right: -3, pointerEvents: 'none' }}
        >
          {count}
        </Badge>
      )}
    </div>
  )
  return (
    <Menu position="right-start" shadow="md" width={230} withinPortal>
      <Menu.Target>{target}</Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>{label} windows</Menu.Label>
        {items.length === 0 && <Menu.Item disabled>{emptyLabel}</Menu.Item>}
        {items.map((it) => (
          <Menu.Item
            key={it.id}
            onClick={() => onOpen?.(it.id)}
            leftSection={
              openIds.has(`${idPrefix}${it.id}`) ? (
                <IconPointFilled size={10} style={{ color: 'var(--mantine-color-teal-5)' }} />
              ) : (
                <span style={{ display: 'inline-block', width: 10 }} />
              )
            }
            // Opening is the row's only action: Delete lives in the Inspector,
            // with a confirmation, so a slip never costs a table (N3).
            rightSection={
              it.tag && (
                <Text size="9px" c="dimmed">
                  {it.tag}
                </Text>
              )
            }
          >
            {it.name}
          </Menu.Item>
        ))}
        {items.length > 0 && (
          <>
            <Menu.Divider />
            <Menu.Item onClick={() => items.forEach((it) => onOpen?.(it.id))}>Focus All</Menu.Item>
            {/* Closes the views only: the tables and plots stay in the project. */}
            <Menu.Item disabled={!anyOpen} onClick={onCloseAll}>Close All</Menu.Item>
            {!anyOpen && <Text size="xs" c="dimmed" px="sm" pb={4}>No {label.toLowerCase()} window is open.</Text>}
          </>
        )}
        <Menu.Divider />
        {newActions.map((a) => (
          <Menu.Item key={a.label} leftSection={<IconPlus size={14} />} onClick={a.onClick}>
            {a.label}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  )
}

// One rail entry. Collapsed → an icon button with a hover tooltip; expanded →
// a full-width button with the icon and a text label. `href` turns it into a
// link (used by Help); otherwise it is a click action.
function RailEntry({
  icon,
  label,
  tip,
  active,
  open,
  expanded,
  onClick,
  onClose,
  href,
}: Readonly<{
  icon: React.ReactNode
  label: string
  tip: string
  active?: boolean
  /** Whether the corresponding dock window is currently open. */
  open?: boolean
  expanded: boolean
  onClick?: () => void
  /** When provided and the window is open, shows a close affordance. */
  onClose?: () => void
  href?: string
}>) {
  const variant = active ? 'light' : 'subtle'
  const color = active ? 'teal' : 'gray'
  // A small dot marks windows that are open in the dock (so the rail doubles
  // as a window list); the focused window also gets the blue "active" styling.
  const dot = open ? (
    <IconPointFilled
      size={10}
      style={{ color: 'var(--mantine-color-teal-5)', flexShrink: 0 }}
    />
  ) : null

  if (expanded) {
    const shared = {
      variant,
      color,
      justify: 'flex-start' as const,
      fullWidth: true,
      size: 'sm' as const,
      radius: 'md' as const,
      leftSection: icon,
      rightSection: open && onClose ? (
        <UnstyledButton
          component="span"
          aria-label={`Close ${label}`}
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          style={{ display: 'inline-flex', color: 'var(--mantine-color-dimmed)' }}
        >
          <IconX size={14} />
        </UnstyledButton>
      ) : dot,
      'aria-label': tip,
    }
    return href ? (
      <Button component="a" href={href} target="_blank" {...shared}>
        {label}
      </Button>
    ) : (
      <Button onClick={onClick} {...shared}>
        {label}
      </Button>
    )
  }

  const shared = { variant, color, size: 40, radius: 'md' as const, 'aria-label': tip }
  const inner = href ? (
    <ActionIcon component="a" href={href} target="_blank" {...shared}>
      {icon}
    </ActionIcon>
  ) : (
    <ActionIcon onClick={onClick} {...shared}>
      {icon}
    </ActionIcon>
  )
  // Collapsed: overlay a tiny dot in the corner for open windows.
  const button = (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      {inner}
      {open && (
        <IconPointFilled
          size={9}
          style={{
            position: 'absolute',
            top: 1,
            right: 1,
            color: 'var(--mantine-color-teal-5)',
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  )
  return (
    <Tooltip label={tip} position="right" openDelay={300}>
      {button}
    </Tooltip>
  )
}

export function Rail({
  active,
  openKinds = [],
  openIds = [],
  plots,
  plotCount = 0,
  workspaceTables,
  tableCount = 0,
  onSelect,
  onClose,
  commands,
  onOpenPlot,
  onOpenTable,
  onCloseWindows,
  onPreferences,
  onAbout,
}: Readonly<RailProps>) {
  const openSet = new Set(openKinds)
  const openIdSet = new Set(openIds)
  const newActions = (ids: readonly CommandId[]) => (commands ? ids.map((id) => ({ label: commands[id].label, onClick: commands[id].run })) : [])
  const wideScreen = useMediaQuery('(min-width: 1100px)', false, { getInitialValueInEffect: false })
  const [expandedPreference, setExpandedPreference] = useState(() => localStorage.getItem(RAIL_EXPANDED_KEY))
  const expanded = expandedPreference === null ? wideScreen : expandedPreference === 'true'
  const toggle = () => {
    const next = String(!expanded)
    localStorage.setItem(RAIL_EXPANDED_KEY, next)
    setExpandedPreference(next)
  }

  // Light/dark toggle. Mantine persists the choice to localStorage via its
  // default color-scheme manager.
  const { setColorScheme } = useMantineColorScheme()
  const computedScheme = useComputedColorScheme('dark')
  const toggleScheme = () =>
    setColorScheme(computedScheme === 'dark' ? 'light' : 'dark')

  const iconSize = 22
  const tools = [
    { label: 'Preferences', tip: 'Preferences', icon: IconSettings, onClick: onPreferences },
    { label: 'About', tip: 'About', icon: IconInfoCircle, onClick: onAbout },
  ]

  return (
    <Stack
      component="nav"
      aria-label="Workspace navigation"
      justify="space-between"
      p={6}
      w={expanded ? 200 : undefined}
      style={{ borderRight: '1px solid var(--mantine-color-default-border)', flexShrink: 0, overflowY: 'auto' }}
    >
      <Stack gap={4}>
        <RailEntry
          icon={
            expanded ? (
              <IconLayoutSidebarLeftCollapse size={iconSize} stroke={1.6} />
            ) : (
              <IconLayoutSidebarLeftExpand size={iconSize} stroke={1.6} />
            )
          }
          label="Collapse"
          tip={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
          expanded={expanded}
          onClick={toggle}
        />
        {VIEWS.map((view) =>
          view.value === 'plots' && plots ? (
            <InstanceLauncher
              key={view.value}
              expanded={expanded}
              active={active === 'plot'}
              count={plotCount}
              idPrefix="plot:"
              label="Plots"
              newActions={newActions(RAIL_PLOTS_NEW)}
              emptyLabel="No plots yet"
              icon={<IconChartLine size={iconSize} stroke={1.6} />}
              items={plots}
              openIds={openIdSet}
              onOpen={onOpenPlot}
              onCloseAll={() => onCloseWindows?.('plot:')}
            />
          ) : view.value === 'table' && workspaceTables ? (
            <InstanceLauncher
              key={view.value}
              expanded={expanded}
              active={active === 'table'}
              count={tableCount}
              idPrefix="table:"
              label="Tables"
              newActions={newActions(RAIL_TABLES_NEW)}
              emptyLabel="No tables yet"
              icon={<IconTable size={iconSize} stroke={1.6} />}
              items={workspaceTables}
              openIds={openIdSet}
              onOpen={onOpenTable}
              onCloseAll={() => onCloseWindows?.('table:')}
            />
          ) : (
            <RailEntry
              key={view.value}
              icon={<view.icon size={iconSize} stroke={1.6} />}
              label={view.label}
              tip={view.tip}
              active={active === view.value}
              open={openSet.has(view.value)}
              expanded={expanded}
              onClick={() => onSelect(view.value)}
              onClose={onClose ? () => onClose(view.value) : undefined}
            />
          ),
        )}
      </Stack>
      <Stack gap={4}>
        {commands && (
          <Menu position="right-start" shadow="md" width={220} withinPortal>
            <Menu.Target>
              {expanded ? (
                <Button
                  variant="subtle"
                  color="gray"
                  justify="flex-start"
                  fullWidth
                  size="sm"
                  radius="md"
                  leftSection={<IconLayoutGrid size={iconSize} stroke={1.6} />}
                  aria-label="Window layout presets"
                >
                  Layout
                </Button>
              ) : (
                <ActionIcon variant="subtle" color="gray" size={40} radius="md" aria-label="Window layout presets">
                  <IconLayoutGrid size={iconSize} stroke={1.6} />
                </ActionIcon>
              )}
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>Window layout</Menu.Label>
              <CommandMenuItems cmds={commands} entries={LAYOUT_MENU} />
            </Menu.Dropdown>
          </Menu>
        )}
        {tools.map((tool) => (
          <RailEntry
            key={tool.label}
            icon={<tool.icon size={iconSize} stroke={1.6} />}
            label={tool.label}
            tip={tool.tip}
            expanded={expanded}
            onClick={tool.onClick}
          />
        ))}
        <RailEntry
          icon={
            computedScheme === 'dark' ? (
              <IconSun size={iconSize} stroke={1.6} />
            ) : (
              <IconMoon size={iconSize} stroke={1.6} />
            )
          }
          label={computedScheme === 'dark' ? 'Light mode' : 'Dark mode'}
          tip={computedScheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          expanded={expanded}
          onClick={toggleScheme}
        />
        <RailEntry
          icon={<IconHelp size={iconSize} stroke={1.6} />}
          label="Help"
          tip="Help"
          expanded={expanded}
          href={helpUrl()}
        />
      </Stack>
    </Stack>
  )
}

// ---------------------------------------------------------------------------
// Status pill: one compact badge summarizing the latest Check/Solve/Table
// outcome; the full message and unit warnings live in its popover.
// ---------------------------------------------------------------------------

interface PillContent {
  color: string
  label: string
  message: string
  warnings: string[]
  /** Deep link into the /help portal for this failure, when we recognize it. */
  helpHref?: string
}

// Map a diagnostic message to the documentation page that explains it. The
// portal pages are hash-addressable (/help#topic), so a failure is one click
// from its cause-and-fix entry in the Errors & Diagnostics index.
function helpHrefForMessage(msg: string): string {
  const m = msg.toLowerCase()
  if (/component|connect|port|domain|stream|fluid family/.test(m)) return helpUrl('#comp-troubleshooting')
  return helpUrl('#errors')
}

function solvePill(result: SolveResponse): PillContent {
  if (!result.success) {
    const message = result.error || 'Solve failed'
    const engine = /in-browser solver failed/i.test(message)
    return {
      color: 'red',
      label: engine ? 'Engine failed' : 'Did not converge',
      message,
      warnings: [],
      helpHref: helpHrefForMessage(message),
    }
  }
  const warnings = result.unitWarnings
  const unknown = warnings.some((w) => /unknown unit/i.test(w))
  return {
    color: warnings.length > 0 ? 'yellow' : 'green',
    label: unknown
      ? 'Solved · unconverted units'
      : warnings.length > 0
        ? `Solved · ${warnings.length} warnings`
        : 'Solved',
    message: unknown
      ? 'The solve converged. Some literals used unknown units and were left unconverted — those values are not verified SI.'
      : 'Solve converged.',
    warnings,
  }
}

export function checkPill(checkResult: CheckResponse): PillContent {
  const warnings = checkResult.unitWarnings
  const syntax =
    (checkResult.errors && checkResult.errors.length > 0) ||
    (!checkResult.solvable && /^syntax error\b/i.test(checkResult.message.trim()))
  if (syntax) {
    return {
      color: 'red',
      label: 'Syntax error',
      message: checkResult.message,
      warnings,
      helpHref: helpHrefForMessage(checkResult.message),
    }
  }
  if (!checkResult.solvable) {
    const under = /underspecified/i.test(checkResult.message)
    const over = /overspecified/i.test(checkResult.message)
    return {
      color: 'red',
      label: under ? 'Underspecified' : over ? 'Overspecified' : 'Not solvable',
      message: checkResult.message,
      warnings,
      helpHref: helpHrefForMessage(checkResult.message),
    }
  }
  const unknown = warnings.some((w) => /unknown unit/i.test(w))
  return {
    color: warnings.length > 0 ? 'yellow' : 'green',
    label: unknown
      ? 'Structurally solvable · unconverted units'
      : warnings.length > 0
        ? `Structurally solvable · ${warnings.length} warnings`
        : 'Structurally solvable',
    message: unknown
      ? `${checkResult.message} Unknown units were left unconverted and are not verified SI.`
      : checkResult.message,
    warnings,
  }
}

export function tablePill(
  results: TableRowResult[],
  checkResult: CheckResponse | null,
  checkMessage: string,
  stats?: TableStats | null,
): PillContent | null {
  if (results.some((r) => r.status === 'cancelled')) return { color: 'orange', label: 'Table stopped', message: 'Worker stopped. Undelivered rows have unknown completion; rerun the table.', warnings: [] }
  if (stats?.converged === false) return {
    color: 'orange', label: 'Table not converged',
    message: `${stats.passes} passes; ${stats.termination}. Last-pass values are provisional.`, warnings: [],
  }
  if (results.length > 0) {
    const solved = results.filter((r) => r.success).length
    const allSolved = solved === results.length
    return {
      color: allSolved ? 'green' : 'red',
      label: `${solved}/${results.length} runs solved`,
      message: allSolved
        ? 'Every table run solved.'
        : 'Failed runs are marked in the table — hover a ✗ cell for the reason.',
      warnings: [],
    }
  }
  if (checkResult || checkMessage) {
    const ok = checkResult?.solvable === true
    return {
      color: ok ? 'green' : 'red',
      label: ok ? 'Table check OK' : 'Table check errors',
      message: checkMessage || (ok ? 'Ready to solve.' : 'The table cannot be solved.'),
      warnings: checkResult?.unitWarnings ?? [],
    }
  }
  return null
}

function StatusPill({ pill, hint }: Readonly<{ pill: PillContent | null; hint: string }>) {
  if (!pill) {
    return (
      <Text size="xs" c="dimmed" visibleFrom="sm">
        {hint}
      </Text>
    )
  }
  return (
    <Popover width={420} position="bottom-end" withArrow shadow="md">
      <Popover.Target>
        <UnstyledButton aria-label="Status details">
          <Badge color={pill.color} variant="light" size="lg" radius="sm" style={{ cursor: 'pointer', textTransform: 'none' }}>
            {pill.label}
          </Badge>
        </UnstyledButton>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap={6}>
          <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
            {pill.message}
          </Text>
          {pill.warnings.length > 0 && (
            <Stack gap={2}>
              {withStableKeys(pill.warnings).map((w) => (
                <Text size="xs" c="yellow.5" key={w.key}>
                  ⚠ {w.value}
                </Text>
              ))}
            </Stack>
          )}
          {pill.helpHref && (
            <Anchor href={pill.helpHref} target="_blank" size="xs">
              Help with this error →
            </Anchor>
          )}
        </Stack>
      </Popover.Dropdown>
    </Popover>
  )
}

// ---------------------------------------------------------------------------
// Top bar: brand, Check / Solve (context-aware for the parametric table),
// solve options menu, and the status pill. Replaces the old header row and
// both bottom action bars.
// ---------------------------------------------------------------------------

interface TopBarProps {
  isTable: boolean
  /** What Check and Solve act on: "Model" or "Table: ‹name›" (N2). */
  targetLabel?: string
  /** Any solve, check or table run is in flight, whatever is focused — Stop follows the job. */
  runBusy?: boolean
  checking: boolean
  solving: boolean
  /** Engine completion, 0…1, while a solve or a table run is in flight; `null`
   *  when nothing is running. Painted as the Solve button's own background. */
  solveProgress: number | null
  solvable: boolean
  findAll: boolean
  complexMode: boolean
  checkResult: CheckResponse | null
  result: SolveResponse | null
  /** The last solve or check was stopped before it reported (RUN-01). */
  stopped?: boolean
  tableChecking: boolean
  tableSolving: boolean
  tableCheckResult: CheckResponse | null
  tableCheckMessage: string
  tableStats?: TableStats | null
  tableResults: TableRowResult[]
  onCheck: () => void
  onSolve: () => void
  onStop?: () => void
  onCheckTable: () => void
  onSolveTable: () => void
  onFindAllChange: (checked: boolean) => void
  onComplexModeChange: (checked: boolean) => void
  projectName: string
  onRenameProject: () => void
  onInsertFunction: (snippet: string) => void
  /** The command registry: the File and Tools menus are built from it (N1). */
  commands: Commands
  /** Phase O: the ribbon replaces the Functions and Tools menus (behind the Preferences flag). */
  ribbon?: {
    density: RibbonDensity
    onDensityChange: (d: RibbonDensity) => void
    context: RibbonContext | null
    contextNote?: string | null
  }
}

function solveTooltipFor(canSolve: boolean, isTable: boolean, target: string): string {
  if (!canSolve) return `Check & Solve ${target} (F2)`
  return isTable ? `Solve every run of ${target} (F2)` : 'Solve the model (F2)'
}

function statusPillFor(props: Readonly<TopBarProps>) {
  if (props.isTable) {
    return tablePill(props.tableResults, props.tableCheckResult, props.tableCheckMessage, props.tableStats)
  }
  if (props.stopped) {
    return {
      color: 'orange',
      label: 'Stopped',
      message: props.result
        ? 'Stopped before finishing. The values shown are from the last completed run.'
        : 'Stopped before a result. Your edits are kept; Solve again to run.',
      warnings: [],
    }
  }
  if (props.result) return solvePill(props.result)
  if (props.checkResult) return checkPill(props.checkResult)
  return null
}

export function TopBar(props: Readonly<TopBarProps>) {
  const { isTable } = props
  const canSolve = isTable ? props.tableCheckResult?.solvable === true : props.solvable
  const target = props.targetLabel ?? (isTable ? 'the table' : 'Model')
  const solveTooltip = solveTooltipFor(canSolve, isTable, target)
  const pill = statusPillFor(props)
  const solveBusy = isTable ? props.tableSolving : props.solving
  // `null` is "running, nothing reported yet" — an empty bar, not a missing
  // one, so the button does not jump from full gradient to 0 % on the first
  // report. Clamped because the width is going straight into CSS.
  const solvePercent = Math.min(100, Math.max(0, (props.solveProgress ?? 0) * 100))
  // While it runs, the tooltip carries the number the bar shows — the only
  // place the percentage is available as text.
  const solveTooltipText = solveBusy
    ? `Solving… ${Math.round(solvePercent)}%`
    : solveTooltip
  const hint = isTable
    ? 'Configure columns, fill values, then Check (F4) · Solve (F2)'
    : 'Check (F4) · Solve (F2)'

  const header = (
    // Wrap (not nowrap) so the Check/Solve action group drops to a second row
    // on narrow viewports instead of overflowing off-screen — the solver
    // trigger must always stay reachable.
    <Group justify="space-between" wrap="wrap" gap="sm">
      <Group gap="sm" wrap="nowrap" align="center">
        <Title order={3} c="teal.4">
          frees
        </Title>
        <Menu position="bottom-start" shadow="md" width={220}>
          <Menu.Target>
            <Button
              variant="subtle"
              color="gray"
              size="xs"
              leftSection={<IconFile size={14} />}
              rightSection={<IconChevronDown size={12} />}
            >
              File
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>{props.projectName}.frees</Menu.Label>
            <CommandMenuItems cmds={props.commands} entries={FILE_MENU} />
          </Menu.Dropdown>
        </Menu>

        {props.ribbon ? (
          <>
            {/* Quick Access: Save, then Undo and Redo of the focused document's history. */}
            <Group gap={2} wrap="nowrap" role="toolbar" aria-label="Quick Access">
              <RibbonButton cmd={props.commands['file.save']} density="icon" />
              <RibbonButton cmd={props.commands['edit.undo']} density="icon" />
              <RibbonButton cmd={props.commands['edit.redo']} density="icon" />
            </Group>
            <UnstyledButton
              onClick={spotlight.open}
              aria-label="Search commands"
              aria-keyshortcuts="Control+K"
              visibleFrom="sm"
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '2px 8px', minWidth: 180,
                borderRadius: 'var(--mantine-radius-sm)', border: '1px solid var(--mantine-color-default-border)',
              }}
            >
              <IconSearch size={14} color="var(--mantine-color-dimmed)" />
              <Text size="xs" c="dimmed" style={{ flex: 1 }}>Search commands…</Text>
              <Text size="xs" c="dimmed" aria-hidden>Ctrl+K</Text>
            </UnstyledButton>
          </>
        ) : (
          <>
        <Menu position="bottom-start" shadow="md" width={250}>
          <Menu.Target>
            <Button
              variant="subtle"
              color="gray"
              size="xs"
              leftSection={<IconMathFunction size={14} />}
              rightSection={<IconChevronDown size={12} />}
            >
              Functions
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            <CommandMenuItems cmds={props.commands} entries={['insert.function', '-']} />
            {FUNCTION_CATEGORIES.map((cat) => (
              <Menu.Sub key={cat.category}>
                <Menu.Sub.Target>
                  <Menu.Sub.Item>{cat.category}</Menu.Sub.Item>
                </Menu.Sub.Target>
                <Menu.Sub.Dropdown>
                  {cat.items.map((item) => {
                    const tip = [
                      item.description,
                      item.usage ? `e.g. ${item.usage}` : null,
                    ]
                      .filter(Boolean)
                      .join('\n')
                    const menuItem = (
                      <Menu.Item onClick={() => props.onInsertFunction(item.snippet)}>
                        {item.label}
                      </Menu.Item>
                    )
                    return tip ? (
                      <Tooltip
                        key={item.label}
                        label={<div style={{ whiteSpace: 'pre-line' }}>{tip}</div>}
                        position="right"
                        multiline
                        w={260}
                        withArrow
                        openDelay={400}
                      >
                        {menuItem}
                      </Tooltip>
                    ) : (
                      <div key={item.label}>{menuItem}</div>
                    )
                  })}
                </Menu.Sub.Dropdown>
              </Menu.Sub>
            ))}
          </Menu.Dropdown>
        </Menu>

        <Menu position="bottom-start" shadow="md" width={200}>
          <Menu.Target>
            <Button
              variant="subtle"
              color="gray"
              size="xs"
              leftSection={<IconAdjustments size={14} />}
              rightSection={<IconChevronDown size={12} />}
            >
              Tools
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            <CommandMenuItems cmds={props.commands} entries={TOOLS_MENU} />
          </Menu.Dropdown>
        </Menu>

        <Tooltip label="Command palette (Ctrl+K)">
          <ActionIcon
            variant="subtle"
            color="gray"
            onClick={spotlight.open}
            aria-label="Open command palette"
          >
            <IconSearch size={16} />
          </ActionIcon>
        </Tooltip>

          </>
        )}

        <Tooltip label="Rename project">
          <UnstyledButton
            onClick={props.onRenameProject}
            visibleFrom="sm"
            aria-label={`Rename project (currently ${props.projectName}.frees)`}
            style={{
              padding: '2px 8px',
              borderRadius: '4px',
              cursor: 'pointer',
              border: '1px solid var(--mantine-color-default-border)',
              backgroundColor: 'light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-6))',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Text size="xs" c="gray.5" style={{ fontFamily: 'monospace' }}>
              {props.projectName}.frees
            </Text>
            {/* Edit affordance: signals the pill opens the rename dialog rather
                than being an inline text field. */}
            <IconPencil size={12} color="var(--mantine-color-dimmed)" />
          </UnstyledButton>
        </Tooltip>
        {!props.ribbon && (
          <Text c="dimmed" size="xs" visibleFrom="lg">
            free solver
          </Text>
        )}
      </Group>

      <Group gap="xs" wrap="nowrap">
        {/* With the ribbon, the hint's keys are on the buttons' tooltips and the state is on the status bar. */}
        {(pill || !props.ribbon) && <StatusPill pill={pill} hint={hint} />}
        {props.targetLabel && (
          <Text size="xs" c="dimmed" maw={180} truncate="end" data-testid="run-target" title={props.targetLabel}>
            {props.targetLabel}
          </Text>
        )}
        <Tooltip label={`${isTable ? `Check every run of ${target}` : 'Compile and check the model'} (F4)`}>
          <Button
            variant="default"
            size="xs"
            leftSection={<IconChecks size={14} />}
            onClick={isTable ? props.onCheckTable : props.onCheck}
            loading={isTable ? props.tableChecking : props.checking}
          >
            Check
          </Button>
        </Tooltip>
        <Tooltip label={solveTooltipText}>
          <Button.Group>
            {/* The primary action of the whole app — a gradient sets it apart
                from the neutral Check and the rest of the toolbar.

                While it spins, that gradient doubles as the progress bar: the
                done fraction keeps the full-strength gradient and the rest is
                dimmed by an overlay layer. Painted with `background-size`
                rather than a colour stop because size is animatable and
                gradient stops are not — that is what makes the bar glide
                between the engine's ~60 ms reports instead of stepping.
                Mantine's loading state only adds a 15 %-opacity blurred veil
                (`Button.css` `::before`), so the bar stays legible under it. */}
            <Button
              size="xs"
              variant="gradient"
              gradient={{ from: 'teal.7', to: 'cyan.6', deg: 90 }}
              leftSection={<IconPlayerPlayFilled size={13} />}
              onClick={isTable ? props.onSolveTable : props.onSolve}
              loading={solveBusy}
              style={
                solveBusy
                  ? {
                      backgroundImage:
                        'linear-gradient(rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.45)), ' +
                        'linear-gradient(90deg, var(--mantine-color-teal-7), var(--mantine-color-cyan-6))',
                      backgroundRepeat: 'no-repeat, no-repeat',
                      backgroundPosition: 'right center, left center',
                      backgroundSize: `${100 - solvePercent}% 100%, 100% 100%`,
                      transition: 'background-size 150ms linear',
                    }
                  : undefined
              }
              // `aria-busy` and nothing else: `aria-valuenow` needs
              // `role="progressbar"`, and taking the button's role away to get
              // it would cost more than the number is worth. The percentage
              // reaches assistive tech through the tooltip below instead.
              aria-busy={solveBusy}
            >
              Solve
            </Button>
            <Menu position="bottom-end" shadow="md">
              <Menu.Target>
                <Button size="xs" px={6} variant="light" aria-label="Solve options">
                  <IconChevronDown size={14} />
                </Button>
              </Menu.Target>
              <Menu.Dropdown p="sm">
                <Stack gap="xs">
                  <Checkbox
                    size="xs"
                    label="Find all solutions"
                    description="Bounded multiple-solution search (max 32 solutions)"
                    disabled={false}
                    checked={props.findAll}
                    onChange={(e) => props.onFindAllChange(e.currentTarget.checked)}
                  />
                  <Checkbox
                    size="xs"
                    label="Complex mode"
                    checked={props.complexMode}
                    onChange={(e) => props.onComplexModeChange(e.currentTarget.checked)}
                  />
                </Stack>
              </Menu.Dropdown>
            </Menu>
          </Button.Group>
        </Tooltip>
        {(props.runBusy ?? solveBusy) && props.onStop && (
          <Tooltip label="Stop computation (cancels solve and resets worker)">
            <Button
              size="xs"
              variant="filled"
              color="red"
              leftSection={<IconPlayerStopFilled size={13} />}
              onClick={props.onStop}
            >
              Stop
            </Button>
          </Tooltip>
        )}
      </Group>
    </Group>
  )
  if (!props.ribbon) return header
  return (
    <Stack gap={4}>
      {header}
      <Ribbon
        commands={props.commands}
        context={props.ribbon.context}
        contextNote={props.ribbon.contextNote}
        density={props.ribbon.density}
        onDensityChange={props.ribbon.onDensityChange}
      />
    </Stack>
  )
}
