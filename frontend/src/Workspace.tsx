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
  IconComponents,
  IconFileExport,
  IconPencil,
  IconSearch,
  IconTable,
  IconVariable,
} from '@tabler/icons-react'
import { Button } from '@mantine/core'
import { ComponentParamResult, ComponentResult, VariableResult } from './api'
import { formatValue } from './format'

/**
 * The advanced Workspace (array-language-style variable window): a live, typed view of
 * the current solved state. Scalars list in a sortable table with value, type,
 * unit and uncertainty; vectors and matrices group under expandable rows that
 * reveal their grid. Updates whenever the document is re-solved (its source is
 * the same `result.variables` the rest of the app reads).
 */

const ARRAY_ELEMENT_REGEX = /^([^[]+)\[([\d,\s-]+)\]$/

export interface ArrayGroup {
  name: string
  is2D: boolean
  rows: number[]
  cols: number[]
  cells: Map<string, VariableResult>
  units: string
}

export interface Grouped {
  scalars: VariableResult[]
  groups: ArrayGroup[]
}

export function group(vars: VariableResult[]): Grouped {
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

/**
 * A solved COMPONENT instance presented as a datasheet: its given inputs (the
 * parameter bindings it was built with) alongside its computed outputs (the
 * solver variables, which flatten to dotted port-member names like `chlr.out.h`
 * / `cmp.in.mdot`). The workspace would otherwise scatter the members across the
 * scalar list and hide the parameters entirely — here they regroup under the
 * instance name with the component type as a pill, the same affordance
 * arrays/matrices already get.
 */
export interface ComponentGroup {
  name: string
  /** Component type (e.g. `TwoPhaseEvaporatorUA`), from the backend metadata. */
  type?: string
  /** Input parameter bindings (`UA=UA_chl_r`, `SH=5`, `fluid$=R1234yf`). */
  params: ComponentParamResult[]
  /** Computed port/output members, with the instance prefix stripped from the label. */
  members: { v: VariableResult; label: string }[]
}

/**
 * Splits scalars into plain scalars and component instances. The instance list
 * (`instances`, from the backend) is authoritative — it carries every
 * component's type and parameters, so even an instance with no output variables
 * still shows its inputs. Dotted scalar names (`inst.member`) attach their
 * member to the matching instance; in frees only COMPONENT port/output members
 * display with a dot, so an unrecognized prefix still forms its own group rather
 * than leaking into the scalar list. Fully empty instances (no params, no
 * members) are dropped.
 */
export function groupComponents(
  scalars: VariableResult[],
  instances: ComponentResult[],
): { plain: VariableResult[]; components: ComponentGroup[] } {
  const plain: VariableResult[] = []
  const comps = new Map<string, ComponentGroup>()
  // Seed from the authoritative instance list (keyed lowercase: frees names are
  // case-insensitive and members display lowercased).
  for (const c of instances) {
    comps.set(c.name.toLowerCase(), { name: c.name, type: c.type, params: c.params ?? [], members: [] })
  }
  for (const v of scalars) {
    const dot = v.name.indexOf('.')
    if (dot <= 0) {
      plain.push(v)
      continue
    }
    const inst = v.name.slice(0, dot)
    const key = inst.toLowerCase()
    let c = comps.get(key)
    if (!c) {
      c = { name: inst, params: [], members: [] }
      comps.set(key, c)
    }
    c.members.push({ v, label: v.name.slice(dot + 1) })
  }
  for (const c of comps.values()) {
    c.members.sort((a, b) => a.label.localeCompare(b.label))
  }
  return {
    plain,
    components: Array.from(comps.values())
      .filter((c) => c.members.length > 0 || c.params.length > 0)
      .sort((a, b) => a.name.localeCompare(b.name)),
  }
}

function uncertaintyText(v: VariableResult): string {
  return v.uncertainty != null && v.uncertainty !== 0 ? `± ${formatValue(v.uncertainty)}` : ''
}

function ScalarTable({ scalars, replNames }: Readonly<{ scalars: VariableResult[]; replNames: Set<string> }>) {
  return (
    // The variable names + 5 columns have an intrinsic min-width that exceeds a
    // narrow dock/edge panel; scroll horizontally inside the panel rather than
    // letting the table overflow and get clipped. `type="native"` is a plain
    // overflow-x:auto block whose min-content collapses to 0 — so the table's
    // min-width can't push the (row-reverse) edge group wider than its slot and
    // clip the panel on the left.
    <Table.ScrollContainer type="native" minWidth={380}>
    <Table striped highlightOnHover>
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
    </Table.ScrollContainer>
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

function ComponentRow({ c, replNames }: Readonly<{ c: ComponentGroup; replNames: Set<string> }>) {
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
        <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
          <ActionIcon variant="subtle" color="gray" size="sm" aria-label={open ? 'Collapse' : 'Expand'}>
            <IconChevronRight
              size={14}
              style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 120ms' }}
            />
          </ActionIcon>
          <Text size="sm" fw={600} style={{ textTransform: 'none' }} truncate>{c.name}</Text>
          {c.type && (
            <Badge variant="light" color="grape" size="xs" style={{ flexShrink: 0, textTransform: 'none' }}>
              {c.type}
            </Badge>
          )}
        </Group>
        <Text size="xs" c="dimmed" ff="monospace" style={{ flexShrink: 0 }}>
          {c.params.length > 0 && `${c.params.length} par`}
          {c.params.length > 0 && c.members.length > 0 && ' · '}
          {c.members.length > 0 && `${c.members.length} var`}
        </Text>
      </Group>
      {open && (
        <Stack gap={8} p={8}>
          {c.params.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <Text size="xs" fw={700} c="dimmed" tt="uppercase" lts="0.05em" mb={4}>Parameters</Text>
              <Table withTableBorder striped>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Parameter</Table.Th>
                    <Table.Th>Binding</Table.Th>
                    <Table.Th>Value</Table.Th>
                    <Table.Th>Units</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {c.params.map((p) => (
                    <Table.Tr key={p.name}>
                      <Table.Td style={{ textTransform: 'none' }}>{p.name}</Table.Td>
                      <Table.Td ff="monospace" c="grape.3" style={{ textTransform: 'none' }}>{p.ref}</Table.Td>
                      <Table.Td ff="monospace" c={p.value != null ? 'green.4' : 'dimmed'}>
                        {p.value != null ? formatValue(p.value) : '—'}
                      </Table.Td>
                      <Table.Td ff="monospace" c="dimmed">{p.units || '—'}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </div>
          )}
          {c.members.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <Text size="xs" fw={700} c="dimmed" tt="uppercase" lts="0.05em" mb={4}>Results</Text>
              <Table withTableBorder striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Variable</Table.Th>
                    <Table.Th>Value</Table.Th>
                    <Table.Th>Units</Table.Th>
                    <Table.Th>Uncertainty</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {c.members.map(({ v, label }) => (
                    <Table.Tr key={v.name}>
                      <Table.Td style={{ textTransform: 'none' }}>
                        <Group gap={6} wrap="nowrap">
                          {label}
                          {replNames.has(v.name.toLowerCase()) && (
                            <Badge variant="light" color="teal" size="xs" title="Defined in the terminal">repl</Badge>
                          )}
                        </Group>
                      </Table.Td>
                      <Table.Td ff="monospace" c="green.4">{formatValue(v.value)}</Table.Td>
                      <Table.Td ff="monospace" c="dimmed">{v.units || <span title="dimensionless">—</span>}</Table.Td>
                      <Table.Td ff="monospace" c="dimmed">{uncertaintyText(v) || '—'}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </div>
          )}
        </Stack>
      )}
    </Paper>
  )
}

interface Props {
  variables: VariableResult[]
  /** Lowercased names of variables defined/changed in the REPL (badged in the table). */
  replNames?: Set<string>
  /** Backend component metadata — supplies each instance's type pill and parameter datasheet. */
  components?: ComponentResult[]
  /** Opens the Variable Information modal (guesses, bounds, units, uncertainty). */
  onEdit?: () => void
  onExportSpreadsheet?: (vars: VariableResult[]) => void
}

export default function Workspace({ variables, replNames, components: instances, onEdit, onExportSpreadsheet }: Readonly<Props>) {
  const [query, setQuery] = useState('')
  const repl = replNames ?? new Set<string>()

  const { plain, components, groups } = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = q ? variables.filter((v) => v.name.toLowerCase().includes(q)) : variables
    const grouped = group(filtered)
    // A component matches the filter by its name, type, or any parameter; its
    // members are whatever survived the variable filter above.
    const inst = (instances ?? []).filter(
      (c) =>
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.type.toLowerCase().includes(q) ||
        c.params.some((p) => p.name.toLowerCase().includes(q) || p.ref.toLowerCase().includes(q)),
    )
    const { plain, components } = groupComponents(grouped.scalars, inst)
    return { plain, components, groups: grouped.groups }
  }, [variables, query, instances])

  const empty = variables.length === 0

  return (
    <Paper withBorder p="md" h="100%" style={{ overflowY: 'auto' }}>
      {/* Wrap (not nowrap) so in a narrow dock/edge panel the filter + Edit drop
          below the title instead of squeezing it into a clipped two-line wrap. */}
      <Group justify="space-between" mb="sm" gap="xs" wrap="wrap">
        <Group gap="xs" wrap="nowrap" style={{ flex: '1 1 auto', minWidth: 0 }}>
          <ThemeIcon variant="light" size="sm"><IconVariable size={14} /></ThemeIcon>
          <Text fw={600} c="teal.4" truncate>Variable Explorer</Text>
          {!empty && <Badge variant="light" size="sm" style={{ flexShrink: 0 }}>{variables.length}</Badge>}
        </Group>
        <Group gap="xs" wrap="nowrap" style={{ flex: '1 1 auto' }}>
          <TextInput
            size="xs"
            style={{ flex: 1, minWidth: 0 }}
            placeholder="Filter variables…"
            leftSection={<IconSearch size={13} />}
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            aria-label="Filter workspace variables"
          />
          {onExportSpreadsheet && !empty && (
            <Button
              size="xs"
              variant="default"
              leftSection={<IconFileExport size={14} />}
              onClick={() => onExportSpreadsheet(variables)}
            >
              Export to Spreadsheet
            </Button>
          )}
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
          {plain.length > 0 && <ScalarTable scalars={plain} replNames={repl} />}
          {components.length > 0 && (
            <Stack gap="xs">
              <Group gap={6}>
                <IconComponents size={13} />
                <Text size="xs" fw={700} c="dimmed" tt="uppercase" lts="0.05em">Components</Text>
              </Group>
              {components.map((c) => <ComponentRow key={c.name} c={c} replNames={repl} />)}
            </Stack>
          )}
          {groups.length > 0 && (
            <Stack gap="xs">
              <Group gap={6}>
                <IconTable size={13} />
                <Text size="xs" fw={700} c="dimmed" tt="uppercase" lts="0.05em">Arrays & Matrices</Text>
              </Group>
              {groups.map((g) => <ArrayRow key={g.name} g={g} />)}
            </Stack>
          )}
          {plain.length === 0 && components.length === 0 && groups.length === 0 && (
            <Text c="dimmed" size="sm">No variables match “{query}”.</Text>
          )}
        </Stack>
      )}
    </Paper>
  )
}
