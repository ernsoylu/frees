import { useMemo, useState } from 'react'
import {
  Badge,
  Group,
  Paper,
  Stack,
  Table,
  Text,
  TextInput,
  ThemeIcon,
  ActionIcon,
} from '@mantine/core'
import {
  IconChevronRight,
  IconPencil,
  IconSearch,
  IconTable,
  IconVariable,
} from '@tabler/icons-react'
import { Button } from '@mantine/core'
import { VariableResult } from './api'
import { formatValue } from './format'

/**
 * The advanced Workspace (MATLAB-style variable window): a live, typed view of
 * the current solved state. Scalars list in a sortable table with value, type,
 * unit and uncertainty; vectors and matrices group under expandable rows that
 * reveal their grid. Updates whenever the document is re-solved (its source is
 * the same `result.variables` the rest of the app reads).
 */

const ARRAY_ELEMENT_REGEX = /^([^[]+)\[([\d,\s-]+)\]$/

interface ArrayGroup {
  name: string
  is2D: boolean
  rows: number[]
  cols: number[]
  cells: Map<string, VariableResult>
  units: string
}

interface Grouped {
  scalars: VariableResult[]
  groups: ArrayGroup[]
}

function group(vars: VariableResult[]): Grouped {
  const scalars: VariableResult[] = []
  const groups = new Map<string, ArrayGroup>()

  for (const v of vars) {
    const match = ARRAY_ELEMENT_REGEX.exec(v.name)
    const indices = match
      ? match[2].split(',').map((s) => Number.parseInt(s.trim(), 10))
      : []
    if (!match || indices.length > 2 || indices.some(Number.isNaN)) {
      scalars.push(v)
      continue
    }
    const base = match[1]
    let g = groups.get(base)
    if (!g) {
      g = { name: base, is2D: indices.length === 2, rows: [], cols: [], cells: new Map(), units: v.units }
      groups.set(base, g)
    }
    if (indices.length === 2) {
      g.is2D = true
      const [r, c] = indices
      if (!g.rows.includes(r)) g.rows.push(r)
      if (!g.cols.includes(c)) g.cols.push(c)
      g.cells.set(`${r},${c}`, v)
    } else {
      const [r] = indices
      if (!g.rows.includes(r)) g.rows.push(r)
      g.cells.set(`${r}`, v)
    }
  }

  for (const g of groups.values()) {
    g.rows.sort((a, b) => a - b)
    g.cols.sort((a, b) => a - b)
  }

  return {
    scalars: scalars.sort((a, b) => a.name.localeCompare(b.name)),
    groups: Array.from(groups.values()).sort((a, b) => a.name.localeCompare(b.name)),
  }
}

function typeLabel(g: ArrayGroup): string {
  return g.is2D ? `${g.rows.length}×${g.cols.length} Matrix` : `${g.rows.length}×1 Vector`
}

function uncertaintyText(v: VariableResult): string {
  return v.uncertainty != null && v.uncertainty !== 0 ? `± ${formatValue(v.uncertainty)}` : ''
}

function ScalarTable({ scalars, replNames }: Readonly<{ scalars: VariableResult[]; replNames: Set<string> }>) {
  return (
    <Table striped highlightOnHover stickyHeader>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Name</Table.Th>
          <Table.Th>Value</Table.Th>
          <Table.Th>Type</Table.Th>
          <Table.Th>Units</Table.Th>
          <Table.Th>Uncertainty</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {scalars.map((v) => (
          <Table.Tr key={v.name}>
            <Table.Td style={{ textTransform: 'none' }}>
              <Group gap={6} wrap="nowrap">
                {v.name}
                {replNames.has(v.name.toLowerCase()) && (
                  <Badge variant="light" color="teal" size="xs" title="Defined in the terminal">repl</Badge>
                )}
              </Group>
            </Table.Td>
            <Table.Td ff="monospace" c="green.4">{formatValue(v.value)}</Table.Td>
            <Table.Td><Text size="xs" c="dimmed">Scalar</Text></Table.Td>
            <Table.Td ff="monospace" c="dimmed">{v.units || <span title="dimensionless">—</span>}</Table.Td>
            <Table.Td ff="monospace" c="dimmed">{uncertaintyText(v) || '—'}</Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  )
}

function ArrayRow({ g }: Readonly<{ g: ArrayGroup }>) {
  const [open, setOpen] = useState(false)
  return (
    <Paper withBorder p={0} radius="sm" style={{ overflow: 'hidden' }}>
      <Group
        justify="space-between"
        wrap="nowrap"
        px="sm"
        py={6}
        style={{ cursor: 'pointer' }}
        onClick={() => setOpen((o) => !o)}
      >
        <Group gap="xs" wrap="nowrap">
          <ActionIcon variant="subtle" color="gray" size="sm" aria-label={open ? 'Collapse' : 'Expand'}>
            <IconChevronRight
              size={14}
              style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 120ms' }}
            />
          </ActionIcon>
          <Text size="sm" fw={600} style={{ textTransform: 'none' }}>{g.name}</Text>
          <Badge variant="light" size="xs">{typeLabel(g)}</Badge>
        </Group>
        {g.units && <Text size="xs" c="dimmed" ff="monospace">[{g.units}]</Text>}
      </Group>
      {open && (
        <div style={{ overflowX: 'auto', padding: 8 }}>
          {g.is2D ? (
            <Table withTableBorder withColumnBorders striped>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ textAlign: 'center' }}>r\c</Table.Th>
                  {g.cols.map((c) => <Table.Th key={c} style={{ textAlign: 'center' }}>{c}</Table.Th>)}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {g.rows.map((r) => (
                  <Table.Tr key={r}>
                    <Table.Td fw={700} style={{ textAlign: 'center' }}>{r}</Table.Td>
                    {g.cols.map((c) => (
                      <Table.Td key={c} ff="monospace" style={{ textAlign: 'right' }}>
                        {(() => { const cell = g.cells.get(`${r},${c}`); return cell ? formatValue(cell.value) : '—' })()}
                      </Table.Td>
                    ))}
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          ) : (
            <Table withTableBorder withColumnBorders striped>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ textAlign: 'center', width: 80 }}>Index</Table.Th>
                  <Table.Th style={{ textAlign: 'center' }}>Value</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {g.rows.map((r) => (
                  <Table.Tr key={r}>
                    <Table.Td fw={700} style={{ textAlign: 'center' }}>{r}</Table.Td>
                    <Table.Td ff="monospace" style={{ textAlign: 'right' }}>
                      {(() => { const cell = g.cells.get(`${r}`); return cell ? formatValue(cell.value) : '—' })()}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </div>
      )}
    </Paper>
  )
}

interface Props {
  variables: VariableResult[]
  /** Lowercased names of variables defined/changed in the REPL (badged in the table). */
  replNames?: Set<string>
  /** Opens the Variable Information modal (guesses, bounds, units, uncertainty). */
  onEdit?: () => void
}

export default function Workspace({ variables, replNames, onEdit }: Readonly<Props>) {
  const [query, setQuery] = useState('')
  const repl = replNames ?? new Set<string>()

  const { scalars, groups } = useMemo(() => {
    const filtered = query.trim()
      ? variables.filter((v) => v.name.toLowerCase().includes(query.trim().toLowerCase()))
      : variables
    return group(filtered)
  }, [variables, query])

  const empty = variables.length === 0

  return (
    <Paper withBorder p="md" h="100%" style={{ overflowY: 'auto' }}>
      <Group justify="space-between" mb="sm" wrap="nowrap">
        <Group gap="xs">
          <ThemeIcon variant="light" size="sm"><IconVariable size={14} /></ThemeIcon>
          <Text fw={600} c="teal.4">Variable Explorer</Text>
          {!empty && <Badge variant="light" size="sm">{variables.length} variables</Badge>}
        </Group>
        <Group gap="xs" wrap="nowrap">
          <TextInput
            size="xs"
            w={180}
            placeholder="Filter variables…"
            leftSection={<IconSearch size={13} />}
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            aria-label="Filter workspace variables"
          />
          {onEdit && (
            <Button
              size="xs"
              variant="light"
              leftSection={<IconPencil size={14} />}
              onClick={onEdit}
            >
              Edit
            </Button>
          )}
        </Group>
      </Group>

      {empty ? (
        <Text c="dimmed" size="sm">
          Solve the document to populate the workspace. Variables, arrays and
          matrices from the last solve appear here with their value, type, unit
          and uncertainty.
        </Text>
      ) : (
        <Stack gap="md">
          {scalars.length > 0 && <ScalarTable scalars={scalars} replNames={repl} />}
          {groups.length > 0 && (
            <Stack gap="xs">
              <Group gap={6}>
                <IconTable size={13} />
                <Text size="xs" fw={700} c="dimmed" tt="uppercase" lts="0.05em">Arrays & Matrices</Text>
              </Group>
              {groups.map((g) => <ArrayRow key={g.name} g={g} />)}
            </Stack>
          )}
          {scalars.length === 0 && groups.length === 0 && (
            <Text c="dimmed" size="sm">No variables match “{query}”.</Text>
          )}
        </Stack>
      )}
    </Paper>
  )
}
