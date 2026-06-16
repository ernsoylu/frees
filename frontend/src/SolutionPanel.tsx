import {
  Accordion,
  ActionIcon,
  Alert,
  Badge,
  Button,
  Code,
  Group,
  Kbd,
  List,
  Paper,
  SimpleGrid,
  Stack,
  Table,
  Text,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core'
import {
  IconChecks,
  IconLayoutGrid,
  IconLayoutSidebarRightCollapse,
  IconPencil,
  IconPlayerPlayFilled,
} from '@tabler/icons-react'
import { SolveResponse, SolveStats, TableStats } from './api'
import { formatValue, SolutionRow } from './format'
import Latex from './Latex'

function Stat({
  label,
  value,
}: Readonly<{ label: string; value: string | number }>) {
  return (
    <Paper withBorder p="xs">
      <Text size="sm" ff="monospace" c="blue.4" truncate>
        {value}
      </Text>
      <Text size="10px" tt="uppercase" c="dimmed" lts="0.05em">
        {label}
      </Text>
    </Paper>
  )
}

function TableSection({ stats }: Readonly<{ stats: TableStats | null }>) {
  if (stats === null) {
    return (
      <Text c="dimmed" size="sm">
        Check Table, then Solve Table. Statistics appear here.
      </Text>
    )
  }
  return (
    <Stack gap="sm">
      <SimpleGrid cols={{ base: 2, xs: 3 }} spacing="xs">
        <Stat label="runs" value={stats.runs} />
        <Stat label="solved" value={stats.solved} />
        <Stat label="failed" value={stats.failed} />
        <Stat label="equations" value={stats.equations} />
        <Stat label="unknowns" value={stats.unknowns} />
        <Stat label="iterations" value={stats.iterations} />
        <Stat label="solve time" value={`${stats.elapsedMillis} ms`} />
        <Stat label="max residual" value={formatValue(stats.maxResidual)} />
      </SimpleGrid>
      {stats.failed > 0 && (
        <Alert color="red" variant="light" p="xs">
          <Text size="xs">
            {stats.failed} run{stats.failed === 1 ? '' : 's'} failed — rows
            marked ✗ in the table; hover them for the reason.
          </Text>
        </Alert>
      )}
    </Stack>
  )
}

function SolveStatsGrid({
  stats,
  solutionCount,
}: Readonly<{ stats: SolveStats; solutionCount: number }>) {
  return (
    <SimpleGrid cols={{ base: 2, xs: 3 }} spacing="xs">
      <Stat label="equations" value={stats.equations} />
      <Stat label="unknowns" value={stats.unknowns} />
      <Stat label="blocks" value={stats.blocks} />
      <Stat label="iterations" value={stats.iterations} />
      <Stat label="solutions" value={solutionCount} />
      <Stat label="solve time" value={`${stats.elapsedMillis} ms`} />
      <Stat label="max residual" value={formatValue(stats.maxResidual)} />
    </SimpleGrid>
  )
}

// A compact pointer rather than a third full copy of the warning list: the
// in-context banner above the editor and the status badge popover already show
// the details. Avoids triple-reporting the same set.
function UnitWarningsAlert({ warnings }: Readonly<{ warnings: string[] }>) {
  const n = warnings.length
  return (
    <Alert color="yellow" variant="light" p="xs">
      <Text size="xs">
        ⚠ {n} unit consistency warning{n === 1 ? '' : 's'} — see the banner above
        the editor or the status badge for details.
      </Text>
    </Alert>
  )
}
interface ArrayMatrix {
  name: string
  is2D: boolean
  rows: number[]
  cols: number[]
  cells: Map<string, SolutionRow>
}

const ARRAY_ELEMENT_REGEX = /^([^[]+)\[([\d,\s-]+)\]$/

function addToGroup(group: ArrayMatrix, indices: number[], row: SolutionRow) {
  if (indices.length === 2) {
    group.is2D = true
    const [r, c] = indices
    if (!group.rows.includes(r)) group.rows.push(r)
    if (!group.cols.includes(c)) group.cols.push(c)
    group.cells.set(`${r},${c}`, row)
  } else {
    const [r] = indices
    if (!group.rows.includes(r)) group.rows.push(r)
    group.cells.set(`${r}`, row)
  }
}

/** Splits solution rows into scalars and vector/matrix groups by subscript shape. */
function groupSolutionRows(rows: SolutionRow[]): { scalars: SolutionRow[]; groupsList: ArrayMatrix[] } {
  const scalars: SolutionRow[] = []
  const arrayGroups = new Map<string, ArrayMatrix>()

  for (const row of rows) {
    const match = ARRAY_ELEMENT_REGEX.exec(row.name)
    const indices = match
      ? match[2].split(',').map((s) => Number.parseInt(s.trim(), 10))
      : []
    if (!match || indices.length > 2 || indices.some(Number.isNaN)) {
      scalars.push(row)
      continue
    }

    const baseName = match[1]
    let group = arrayGroups.get(baseName)
    if (!group) {
      group = {
        name: baseName,
        is2D: indices.length === 2,
        rows: [],
        cols: [],
        cells: new Map()
      }
      arrayGroups.set(baseName, group)
    }
    addToGroup(group, indices, row)
  }

  for (const group of arrayGroups.values()) {
    group.rows.sort((a, b) => a - b)
    group.cols.sort((a, b) => a - b)
  }

  const groupsList = Array.from(arrayGroups.values()).sort((a, b) => a.name.localeCompare(b.name))
  return { scalars, groupsList }
}

function matrixLatex(group: ArrayMatrix): string {
  const rowSeparator = String.raw` \\ `
  let bodyMath = ''
  if (group.is2D) {
    bodyMath = group.rows
      .map((r) => group.cols.map((c) => group.cells.get(`${r},${c}`)?.display ?? '0').join(' & '))
      .join(rowSeparator)
  } else {
    bodyMath = group.rows
      .map((r) => group.cells.get(`${r}`)?.display ?? '0')
      .join(rowSeparator)
  }
  const units = [...group.cells.values()][0]?.units || ''
  // Render the unit in math mode (\mathrm), not \text: a unit like "m^3/kg"
  // puts a '^' inside \text{} which is invalid LaTeX and crashes KaTeX.
  const unitsStr = units ? String.raw` \,\left[\mathrm{${units}}\right]` : ''
  return String.raw`${group.name} = \begin{pmatrix} ${bodyMath} \end{pmatrix}${unitsStr}`
}

function SuccessBody({
  result,
  rows,
}: Readonly<{ result: SolveResponse; rows: SolutionRow[] }>) {
  const solutionCount = result.solutions?.length ?? 0
  const { scalars, groupsList } = groupSolutionRows(rows)

  return (
    <>
      {solutionCount > 1 && (
        <Text size="xs" c="dimmed">
          {solutionCount} solutions found — multi-valued variables are shown
          as sets, in solution order.
        </Text>
      )}

      {scalars.length > 0 && (
        <Table striped highlightOnHover mb="md">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Variable</Table.Th>
              <Table.Th>Value</Table.Th>
              <Table.Th>Units</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {scalars.map((row) => (
              <Table.Tr key={row.name}>
                <Table.Td style={{ textTransform: 'none' }}>{row.name}</Table.Td>
                <Table.Td ff="monospace" c={row.isSet ? 'yellow.4' : 'green.4'}>
                  {row.display}
                </Table.Td>
                <Table.Td ff="monospace" c="dimmed">
                  {row.units ? (
                    row.units
                  ) : (
                    <span title="dimensionless">—</span>
                  )}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}

      {groupsList.length > 0 && (
        <Stack gap="xs" mb="md">
          <Text size="xs" fw={700} c="dimmed" tt="uppercase" lts="0.05em">Arrays & Matrices</Text>
          <Accordion variant="separated">
            {groupsList.map((group) => {
              const math = matrixLatex(group)

              return (
                <Accordion.Item key={group.name} value={group.name}>
                  <Accordion.Control>
                    <Group justify="space-between">
                      <Text size="sm" fw={600} style={{ textTransform: 'none' }}>{group.name}</Text>
                      <Badge variant="light" size="xs">
                        {group.is2D ? `${group.rows.length}x${group.cols.length} Matrix` : `${group.rows.length} Vector`}
                      </Badge>
                    </Group>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <Stack gap="sm">
                      <div style={{ display: 'flex', justifyContent: 'center', backgroundColor: 'light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-8))', padding: '8px', borderRadius: '4px', overflowX: 'auto' }}>
                        <Latex math={math} block />
                      </div>
                      
                      <div style={{ overflowX: 'auto' }}>
                        {group.is2D ? (
                          <Table striped highlightOnHover withTableBorder withColumnBorders>
                            <Table.Thead>
                              <Table.Tr>
                                <Table.Th style={{ width: 60, textAlign: 'center', backgroundColor: 'var(--mantine-color-default)' }}>Row\Col</Table.Th>
                                {group.cols.map(c => (
                                  <Table.Th key={c} style={{ textAlign: 'center', backgroundColor: 'var(--mantine-color-default)' }}>{c}</Table.Th>
                                ))}
                              </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                              {group.rows.map(r => (
                                <Table.Tr key={r}>
                                  <Table.Td style={{ fontWeight: 'bold', textAlign: 'center', backgroundColor: 'var(--mantine-color-default)' }}>{r}</Table.Td>
                                  {group.cols.map(c => {
                                    const cell = group.cells.get(`${r},${c}`)
                                    return (
                                      <Table.Td key={c} style={{ fontFamily: 'monospace', textAlign: 'right' }}>
                                        {cell ? cell.display : '—'}
                                      </Table.Td>
                                    )
                                  })}
                                </Table.Tr>
                              ))}
                            </Table.Tbody>
                          </Table>
                        ) : (
                          <Table striped highlightOnHover withTableBorder withColumnBorders>
                            <Table.Thead>
                              <Table.Tr>
                                <Table.Th style={{ width: 80, textAlign: 'center', backgroundColor: 'var(--mantine-color-default)' }}>Index</Table.Th>
                                <Table.Th style={{ textAlign: 'center', backgroundColor: 'var(--mantine-color-default)' }}>Value</Table.Th>
                              </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                              {group.rows.map(r => {
                                const cell = group.cells.get(`${r}`)
                                return (
                                  <Table.Tr key={r}>
                                    <Table.Td style={{ fontWeight: 'bold', textAlign: 'center', backgroundColor: 'var(--mantine-color-default)' }}>{r}</Table.Td>
                                    <Table.Td style={{ fontFamily: 'monospace', textAlign: 'right' }}>
                                      {cell ? cell.display : '—'}
                                    </Table.Td>
                                  </Table.Tr>
                                )
                              })}
                            </Table.Tbody>
                          </Table>
                        )}
                      </div>
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>
              )
            })}
          </Accordion>
        </Stack>
      )}

      <Accordion variant="contained">
        {result.stats && (
          <Accordion.Item value="stats">
            <Accordion.Control>
              <Text size="sm">Solver details</Text>
            </Accordion.Control>
            <Accordion.Panel>
              <SolveStatsGrid stats={result.stats} solutionCount={solutionCount || 1} />
            </Accordion.Panel>
          </Accordion.Item>
        )}
        <Accordion.Item value="order">
          <Accordion.Control>
            <Text size="sm">
              Calculation order ({result.blocks.length} block
              {result.blocks.length === 1 ? '' : 's'})
            </Text>
          </Accordion.Control>
          <Accordion.Panel>
            <List type="ordered" size="sm" spacing={4}>
              {result.blocks.map((b) => (
                <List.Item key={b.index}>
                  solves <strong>{b.variables.join(', ')}</strong> from{' '}
                  <Code>{b.equations.join(' ; ')}</Code>
                </List.Item>
              ))}
            </List>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </>
  )
}

// Step shown in the empty-state guide: a numbered icon, a label, and a hint.
function Step({
  index,
  icon,
  label,
  children,
}: Readonly<{
  index: number
  icon: React.ReactNode
  label: React.ReactNode
  children: React.ReactNode
}>) {
  return (
    <Group gap="sm" wrap="nowrap" align="flex-start">
      <ThemeIcon variant="light" radius="xl" size={28}>
        {icon}
      </ThemeIcon>
      <div>
        <Text size="sm" fw={600}>
          {index}. {label}
        </Text>
        <Text size="xs" c="dimmed">
          {children}
        </Text>
      </div>
    </Group>
  )
}

// Onboarding shown before the first solve: a 3-step "how to solve" guide plus a
// shortcut into the example gallery, so the wide Solution panel isn't dead space
// for new users.
function Onboarding({ onOpenExamples }: Readonly<{ onOpenExamples?: () => void }>) {
  return (
    <Stack gap="md">
      <Text c="dimmed" size="sm">
        Results appear here once you solve. Get started in three steps:
      </Text>
      <Stack gap="sm">
        <Step index={1} icon={<IconPencil size={16} />} label="Write equations">
          Type equations and notes on the left — in any order. Units go in
          brackets, e.g. <Code>P = 250 [kPa]</Code>.
        </Step>
        <Step index={2} icon={<IconChecks size={16} />} label={<>Check <Kbd>F4</Kbd></>}>
          Validates syntax and that the system is fully determined.
        </Step>
        <Step index={3} icon={<IconPlayerPlayFilled size={14} />} label={<>Solve <Kbd>F2</Kbd></>}>
          Solves the system (running Check first if needed).
        </Step>
      </Stack>
      {onOpenExamples && (
        <Button
          variant="light"
          leftSection={<IconLayoutGrid size={16} />}
          onClick={onOpenExamples}
          fullWidth
        >
          Open an example
        </Button>
      )}
    </Stack>
  )
}

function EquationSection({
  result,
  rows,
  onOpenExamples,
}: Readonly<{
  result: SolveResponse | null
  rows: SolutionRow[]
  onOpenExamples?: () => void
}>) {
  if (result === null) {
    return <Onboarding onOpenExamples={onOpenExamples} />
  }
  return (
    <Stack gap="sm">
      {!result.success && (
        <Alert color="red" variant="light">
          <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
            {result.error}
          </Text>
        </Alert>
      )}

      {result.success && result.unitWarnings.length > 0 && (
        <UnitWarningsAlert warnings={result.unitWarnings} />
      )}

      {result.success && <SuccessBody result={result} rows={rows} />}
    </Stack>
  )
}

interface Props {
  showTable: boolean
  solveCount: number
  tableStats: TableStats | null
  result: SolveResponse | null
  rows: SolutionRow[]
  onCollapse?: () => void
  onOpenExamples?: () => void
}

export default function SolutionPanel({
  showTable,
  solveCount,
  tableStats,
  result,
  rows,
  onCollapse,
  onOpenExamples,
}: Readonly<Props>) {
  return (
    <Paper
      withBorder
      p="md"
      w="100%"
      h="100%"
      style={{ overflowY: 'auto' }}
    >
      <Group justify="space-between" mb="sm">
        <Title order={4} c="blue.4">Solution</Title>
        <Group gap="xs">
          {!showTable && solveCount > 0 && (
            <Badge variant="light">run #{solveCount}</Badge>
          )}
          {showTable && tableStats && <Badge variant="light">parametric table</Badge>}
          {onCollapse && (
            <Tooltip label="Hide solution panel">
              <ActionIcon
                variant="subtle"
                color="gray"
                size="sm"
                onClick={onCollapse}
                aria-label="Hide solution panel"
              >
                <IconLayoutSidebarRightCollapse size={16} />
              </ActionIcon>
            </Tooltip>
          )}
        </Group>
      </Group>

      {showTable ? (
        <TableSection stats={tableStats} />
      ) : (
        <EquationSection result={result} rows={rows} onOpenExamples={onOpenExamples} />
      )}
    </Paper>
  )
}
