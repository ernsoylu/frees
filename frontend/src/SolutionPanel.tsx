import {
  Accordion,
  ActionIcon,
  Alert,
  Badge,
  Code,
  Group,
  List,
  Paper,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
  Tooltip,
} from '@mantine/core'
import { IconLayoutSidebarRightCollapse } from '@tabler/icons-react'
import { SolveResponse, SolveStats, TableStats } from './api'
import { formatValue, SolutionRow, withStableKeys } from './format'

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

function UnitWarningsAlert({ warnings }: Readonly<{ warnings: string[] }>) {
  return (
    <Alert
      color="red"
      variant="light"
      p="xs"
      title="Unit consistency warnings (EES Check Units)"
    >
      <Stack gap={2}>
        {withStableKeys(warnings).map((w) => (
          <Text size="xs" key={w.key}>
            {w.value}
          </Text>
        ))}
      </Stack>
    </Alert>
  )
}

function SuccessBody({
  result,
  rows,
}: Readonly<{ result: SolveResponse; rows: SolutionRow[] }>) {
  const solutionCount = result.solutions?.length ?? 0
  return (
    <>
      {solutionCount > 1 && (
        <Text size="xs" c="dimmed">
          {solutionCount} solutions found — multi-valued variables are shown
          as sets, in solution order.
        </Text>
      )}

      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Variable</Table.Th>
            <Table.Th>Value</Table.Th>
            <Table.Th>Units</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((row) => (
            <Table.Tr key={row.name}>
              <Table.Td>{row.name}</Table.Td>
              <Table.Td ff="monospace" c={row.isSet ? 'yellow.4' : 'green.4'}>
                {row.display}
              </Table.Td>
              <Table.Td ff="monospace" c="dimmed">
                {row.units || '-'}
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      <Accordion variant="contained">
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

function EquationSection({
  result,
  rows,
}: Readonly<{ result: SolveResponse | null; rows: SolutionRow[] }>) {
  if (result === null) {
    return (
      <Text c="dimmed" size="sm">
        Check, then Solve. Results appear here.
      </Text>
    )
  }
  return (
    <Stack gap="sm">
      {result.stats && (
        <SolveStatsGrid
          stats={result.stats}
          solutionCount={result.solutions?.length || 1}
        />
      )}

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
}

export default function SolutionPanel({
  showTable,
  solveCount,
  tableStats,
  result,
  rows,
  onCollapse,
}: Readonly<Props>) {
  return (
    <Paper
      withBorder
      p="md"
      w={{ base: '100%', md: 420 }}
      style={{ overflowY: 'auto' }}
    >
      <Group justify="space-between" mb="sm">
        <Title order={4}>Solution</Title>
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
        <EquationSection result={result} rows={rows} />
      )}
    </Paper>
  )
}
