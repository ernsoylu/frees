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
} from '@mantine/core'
import {
  IconChartGridDots,
  IconChartLine,
  IconChecks,
  IconChevronDown,
  IconCode,
  IconHelp,
  IconMathFunction,
  IconPlayerPlayFilled,
  IconSchema,
  IconSettings,
  IconTable,
  IconTargetArrow,
  IconTemperature,
  IconVariable,
} from '@tabler/icons-react'
import { CheckResponse, SolveResponse, TableRowResult } from './api'
import { withStableKeys } from './format'

// ---------------------------------------------------------------------------
// Left icon rail: views on top, tool windows at the bottom (VS Code style).
// ---------------------------------------------------------------------------

const VIEWS = [
  { value: 'equations', label: 'Editor', icon: IconCode },
  { value: 'table', label: 'Tables — parametric runs & curve functions', icon: IconTable },
  { value: 'plots', label: 'Plots (X-Y)', icon: IconChartLine },
  {
    value: 'thermo',
    label: 'Thermodynamics — property & psychrometric plots, state points',
    icon: IconTemperature,
  },
  {
    value: 'digitizer',
    label: 'Graph Digitizer — extract curves from chart images',
    icon: IconChartGridDots,
  },
  { value: 'diagram', label: 'Diagram — interactive schematic editor', icon: IconSchema },
]

interface RailProps {
  active: string
  onSelect: (view: string) => void
  onVariableInfo: () => void
  onMinMax: () => void
  onCurveFit: () => void
  onPreferences: () => void
}

function RailIcon({
  label,
  active,
  disabled,
  onClick,
  children,
}: Readonly<{
  label: string
  active?: boolean
  disabled?: boolean
  onClick?: () => void
  children: React.ReactNode
}>) {
  return (
    <Tooltip label={label} position="right" openDelay={300}>
      <ActionIcon
        size={40}
        radius="md"
        variant={active ? 'light' : 'subtle'}
        color={active ? 'blue' : 'gray'}
        disabled={disabled}
        onClick={onClick}
        aria-label={label}
      >
        {children}
      </ActionIcon>
    </Tooltip>
  )
}

export function Rail({
  active,
  onSelect,
  onVariableInfo,
  onMinMax,
  onCurveFit,
  onPreferences,
}: Readonly<RailProps>) {
  return (
    <Stack
      justify="space-between"
      p={6}
      style={{ borderRight: '1px solid var(--mantine-color-dark-5)' }}
    >
      <Stack gap={4}>
        {VIEWS.map((view) => (
          <RailIcon
            key={view.value}
            label={view.label}
            active={active === view.value}
            onClick={() => onSelect(view.value)}
          >
            <view.icon size={22} stroke={1.6} />
          </RailIcon>
        ))}
      </Stack>
      <Stack gap={4}>
        <RailIcon label="Variable Information" onClick={onVariableInfo}>
          <IconVariable size={22} stroke={1.6} />
        </RailIcon>
        <RailIcon label="Min/Max (optimization)" onClick={onMinMax}>
          <IconTargetArrow size={22} stroke={1.6} />
        </RailIcon>
        <RailIcon label="Curve Fit (least squares)" onClick={onCurveFit}>
          <IconMathFunction size={22} stroke={1.6} />
        </RailIcon>
        <RailIcon label="Preferences" onClick={onPreferences}>
          <IconSettings size={22} stroke={1.6} />
        </RailIcon>
        <Tooltip label="Help" position="right" openDelay={300}>
          <ActionIcon
            size={40}
            radius="md"
            variant="subtle"
            color="gray"
            component="a"
            href="/help"
            target="_blank"
            aria-label="Help"
          >
            <IconHelp size={22} stroke={1.6} />
          </ActionIcon>
        </Tooltip>
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
}

function solveTooltipFor(canSolve: boolean, isTable: boolean): string {
  if (!canSolve) return 'Run Check first (F4)'
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
    <Group justify="space-between" wrap="nowrap" gap="sm">
      <Group gap="sm" wrap="nowrap" align="baseline">
        <Title order={3} c="blue.4">
          frees
        </Title>
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
              disabled={!canSolve}
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
