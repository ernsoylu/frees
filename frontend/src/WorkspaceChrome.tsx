import {
  ActionIcon,
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
  IconChartGridDots,
  IconChartLine,
  IconChecks,
  IconChevronDown,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconCode,
  IconDeviceFloppy,
  IconFile,
  IconFilePlus,
  IconFolderOpen,
  IconHelp,
  IconInfoCircle,
  IconLayoutGrid,
  IconListDetails,
  IconMathFunction,
  IconPointFilled,
  IconX,
  IconMoon,
  IconSun,
  IconPencil,
  IconPlus,
  IconPlayerPlayFilled,
  IconSchema,
  IconSettings,
  IconTable,
  IconTargetArrow,
  IconSearch,
  IconTemperature,
  IconVariable,
} from '@tabler/icons-react'
import { spotlight } from '@mantine/spotlight'
import { useState } from 'react'
import { CheckResponse, SolveResponse, TableRowResult } from './api'
import { withStableKeys } from './format'
import { FUNCTION_CATEGORIES } from './functionCatalog'

// ---------------------------------------------------------------------------
// Left icon rail: views on top, tool windows at the bottom (VS Code style).
// ---------------------------------------------------------------------------

// Each view carries a short `label` (shown when the rail is expanded) and a
// longer `tip` (the hover tooltip when collapsed).
const VIEWS = [
  { value: 'equations', label: 'Editor', tip: 'Editor', icon: IconCode },
  { value: 'table', label: 'Tables', tip: 'Tables — parametric runs & curve functions', icon: IconTable },
  { value: 'plots', label: 'Plots', tip: 'Plots (X-Y)', icon: IconChartLine },
  {
    value: 'thermo',
    label: 'Thermo',
    tip: 'Thermodynamics — property & psychrometric plots, state points',
    icon: IconTemperature,
  },
  {
    value: 'digitizer',
    label: 'Digitizer',
    tip: 'Graph Digitizer — extract curves from chart images',
    icon: IconChartGridDots,
  },
  { value: 'diagram', label: 'Diagram', tip: 'Diagram — interactive schematic editor', icon: IconSchema },
  { value: 'solution', label: 'Solution', tip: 'Solution — solved variables & residuals', icon: IconListDetails },
]

const RAIL_EXPANDED_KEY = 'frees.railExpanded'

interface RailProps {
  active: string
  /** Window kinds currently open in the dock (drives the open-state dot). */
  openKinds?: string[]
  /** Specific window ids open (e.g. "diagram:<id>") for per-instance marks. */
  openIds?: string[]
  /** Diagrams available to open as individual windows. */
  diagrams?: { id: string; name: string }[]
  /** Number of diagram windows currently open (badge on the Diagram icon). */
  diagramCount?: number
  onSelect: (view: string) => void
  onClose?: (view: string) => void
  onResetLayout?: () => void
  onOpenDiagram?: (id: string) => void
  onNewDiagram?: () => void
  onVariableInfo: () => void
  onMinMax: () => void
  onCurveFit: () => void
  onPreferences: () => void
  onAbout: () => void
}

// Sidebar launcher for the multi-instance Diagram kind: a menu listing every
// diagram (open each as its own dock window) plus "New diagram". A badge shows
// how many diagram windows are currently open.
function DiagramLauncher({
  expanded,
  active,
  count,
  diagrams,
  openIds,
  onOpen,
  onNew,
  iconSize,
}: Readonly<{
  expanded: boolean
  active: boolean
  count: number
  diagrams: { id: string; name: string }[]
  openIds: Set<string>
  onOpen?: (id: string) => void
  onNew?: () => void
  iconSize: number
}>) {
  const variant = active ? 'light' : 'subtle'
  const color = active ? 'blue' : 'gray'
  const badge =
    count > 0 ? (
      <Badge size="xs" variant="filled" circle>
        {count}
      </Badge>
    ) : null
  const target = expanded ? (
    <Button
      variant={variant}
      color={color}
      justify="flex-start"
      fullWidth
      size="sm"
      radius="md"
      leftSection={<IconSchema size={iconSize} stroke={1.6} />}
      rightSection={badge}
      aria-label="Diagram windows"
    >
      Diagram
    </Button>
  ) : (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      <ActionIcon variant={variant} color={color} size={40} radius="md" aria-label="Diagram windows">
        <IconSchema size={iconSize} stroke={1.6} />
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
        <Menu.Label>Diagram windows</Menu.Label>
        {diagrams.length === 0 && (
          <Menu.Item disabled>No diagrams yet</Menu.Item>
        )}
        {diagrams.map((d) => (
          <Menu.Item
            key={d.id}
            onClick={() => onOpen?.(d.id)}
            leftSection={
              openIds.has(`diagram:${d.id}`) ? (
                <IconPointFilled size={10} style={{ color: 'var(--mantine-color-blue-5)' }} />
              ) : (
                <span style={{ display: 'inline-block', width: 10 }} />
              )
            }
          >
            {d.name}
          </Menu.Item>
        ))}
        <Menu.Divider />
        <Menu.Item leftSection={<IconPlus size={14} />} onClick={onNew}>
          New diagram
        </Menu.Item>
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
  const color = active ? 'blue' : 'gray'
  // A small dot marks windows that are open in the dock (so the rail doubles
  // as a window list); the focused window also gets the blue "active" styling.
  const dot = open ? (
    <IconPointFilled
      size={10}
      style={{ color: 'var(--mantine-color-blue-5)', flexShrink: 0 }}
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
            color: 'var(--mantine-color-blue-5)',
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
  diagrams,
  diagramCount = 0,
  onSelect,
  onClose,
  onResetLayout,
  onOpenDiagram,
  onNewDiagram,
  onVariableInfo,
  onMinMax,
  onCurveFit,
  onPreferences,
  onAbout,
}: Readonly<RailProps>) {
  const openSet = new Set(openKinds)
  const openIdSet = new Set(openIds)
  const [expanded, setExpanded] = useState(
    () => localStorage.getItem(RAIL_EXPANDED_KEY) === 'true',
  )
  const toggle = () => {
    setExpanded((e) => {
      const next = !e
      localStorage.setItem(RAIL_EXPANDED_KEY, String(next))
      return next
    })
  }

  // Light/dark toggle. Mantine persists the choice to localStorage via its
  // default color-scheme manager.
  const { setColorScheme } = useMantineColorScheme()
  const computedScheme = useComputedColorScheme('dark')
  const toggleScheme = () =>
    setColorScheme(computedScheme === 'dark' ? 'light' : 'dark')

  const iconSize = 22
  const tools = [
    { label: 'Variables', tip: 'Variable Information', icon: IconVariable, onClick: onVariableInfo },
    { label: 'Min/Max', tip: 'Min/Max (optimization)', icon: IconTargetArrow, onClick: onMinMax },
    { label: 'Curve Fit', tip: 'Curve Fit (least squares)', icon: IconMathFunction, onClick: onCurveFit },
    { label: 'Preferences', tip: 'Preferences', icon: IconSettings, onClick: onPreferences },
    { label: 'About', tip: 'About', icon: IconInfoCircle, onClick: onAbout },
  ]

  return (
    <Stack
      justify="space-between"
      p={6}
      w={expanded ? 200 : undefined}
      style={{ borderRight: '1px solid var(--mantine-color-default-border)', flexShrink: 0 }}
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
          view.value === 'diagram' && diagrams ? (
            <DiagramLauncher
              key={view.value}
              expanded={expanded}
              active={active === 'diagram'}
              count={diagramCount}
              diagrams={diagrams}
              openIds={openIdSet}
              onOpen={onOpenDiagram}
              onNew={onNewDiagram}
              iconSize={iconSize}
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
        {onResetLayout && (
          <RailEntry
            icon={<IconLayoutGrid size={iconSize} stroke={1.6} />}
            label="Reset layout"
            tip="Reset window layout"
            expanded={expanded}
            onClick={onResetLayout}
          />
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
          href="/help"
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
}

function solvePill(result: SolveResponse): PillContent {
  if (!result.success) {
    return {
      color: 'red',
      label: 'Solve failed',
      message: result.error || 'Solve failed',
      warnings: [],
    }
  }
  const warnings = result.unitWarnings
  return {
    color: warnings.length > 0 ? 'yellow' : 'green',
    label: warnings.length > 0 ? `Solved · ${warnings.length} warnings` : 'Solved',
    message: 'Solve successful',
    warnings,
  }
}

function checkPill(checkResult: CheckResponse): PillContent {
  if (!checkResult.solvable) {
    return {
      color: 'red',
      label: 'Check errors',
      message: checkResult.message,
      warnings: checkResult.unitWarnings,
    }
  }
  const warnings = checkResult.unitWarnings
  return {
    color: warnings.length > 0 ? 'yellow' : 'green',
    label: warnings.length > 0 ? `Check OK · ${warnings.length} warnings` : 'Check OK',
    message: checkResult.message,
    warnings,
  }
}

function tablePill(
  results: TableRowResult[],
  checkResult: CheckResponse | null,
  checkMessage: string,
): PillContent | null {
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
  checking: boolean
  solving: boolean
  solvable: boolean
  findAll: boolean
  complexMode: boolean
  checkResult: CheckResponse | null
  result: SolveResponse | null
  tableChecking: boolean
  tableSolving: boolean
  tableCheckResult: CheckResponse | null
  tableCheckMessage: string
  tableResults: TableRowResult[]
  onCheck: () => void
  onSolve: () => void
  onCheckTable: () => void
  onSolveTable: () => void
  onFindAllChange: (checked: boolean) => void
  onComplexModeChange: (checked: boolean) => void
  projectName: string
  onRenameProject: () => void
  onNewProject: () => void
  onOpenProject: () => void
  onSaveProject: () => void
  onSaveProjectAs: () => void
  onInsertFunction: (snippet: string) => void
  onOpenExamples: () => void
}

function solveTooltipFor(canSolve: boolean, isTable: boolean): string {
  if (!canSolve) return 'Check & Solve (F2)'
  return isTable ? 'Solve every table run (F2)' : 'Solve the system (F2)'
}

function statusPillFor(props: Readonly<TopBarProps>) {
  if (props.isTable) {
    return tablePill(props.tableResults, props.tableCheckResult, props.tableCheckMessage)
  }
  if (props.result) return solvePill(props.result)
  if (props.checkResult) return checkPill(props.checkResult)
  return null
}

export function TopBar(props: Readonly<TopBarProps>) {
  const { isTable } = props
  const canSolve = isTable ? props.tableCheckResult?.solvable === true : props.solvable
  const solveTooltip = solveTooltipFor(canSolve, isTable)
  const pill = statusPillFor(props)
  const hint = isTable
    ? 'Configure columns, fill values, then Check (F4) · Solve (F2)'
    : 'Check (F4) · Solve (F2)'

  return (
    // Wrap (not nowrap) so the Check/Solve action group drops to a second row
    // on narrow viewports instead of overflowing off-screen — the solver
    // trigger must always stay reachable.
    <Group justify="space-between" wrap="wrap" gap="sm">
      <Group gap="sm" wrap="nowrap" align="center">
        <Title order={3} c="blue.4">
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
            <Menu.Item leftSection={<IconFilePlus size={14} />} onClick={props.onNewProject}>
              New Project
            </Menu.Item>
            <Menu.Item leftSection={<IconFolderOpen size={14} />} onClick={props.onOpenProject}>
              Open Project…
            </Menu.Item>
            <Menu.Item leftSection={<IconLayoutGrid size={14} />} onClick={props.onOpenExamples}>
              Open Example…
            </Menu.Item>
            <Menu.Divider />
            <Menu.Item leftSection={<IconDeviceFloppy size={14} />} onClick={props.onSaveProject}>
              Save Project
            </Menu.Item>
            <Menu.Item leftSection={<IconDeviceFloppy size={14} />} onClick={props.onSaveProjectAs}>
              Save Project As…
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>

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
            <Text size="xs" c="dimmed" style={{ fontFamily: 'monospace' }}>
              {props.projectName}.frees
            </Text>
            {/* Edit affordance: signals the pill opens the rename dialog rather
                than being an inline text field. */}
            <IconPencil size={12} color="var(--mantine-color-dimmed)" />
          </UnstyledButton>
        </Tooltip>
        <Text c="dimmed" size="xs" visibleFrom="lg">
          free solver
        </Text>
      </Group>

      <Group gap="xs" wrap="nowrap">
        <StatusPill pill={pill} hint={hint} />
        <Tooltip label={`${isTable ? 'Check every table run' : 'Compile and check'} (F4)`}>
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
        <Tooltip label={solveTooltip}>
          <Button.Group>
            <Button
              size="xs"
              leftSection={<IconPlayerPlayFilled size={13} />}
              onClick={isTable ? props.onSolveTable : props.onSolve}
              loading={isTable ? props.tableSolving : props.solving}
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
      </Group>
    </Group>
  )
}
