import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Menu,
  Paper,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core'
import { IconChartGridDots, IconPlus, IconTable, IconTrash } from '@tabler/icons-react'
import { TableRowResult } from './api'
import CurveTableEditor from './CurveTableEditor'
import ParametricTableTab, { ParamRow } from './ParametricTableTab'
import {
  CurveTableSpec,
  newCurveTable,
  newParamTable,
  TableSpec,
} from './tables'
import { VariableDraft } from './VariableInfoModal'

// ---------------------------------------------------------------------------
// Tables window (Story 8.6): manages any number of Parametric Tables and
// Curve Tables, added like plots. The active parametric table is the one
// Check Table / Solve Table and the plots operate on.
// ---------------------------------------------------------------------------

interface Props {
  tables: TableSpec[]
  activeTableId: string | null
  onTablesChange: (tables: TableSpec[]) => void
  onActiveTableIdChange: (id: string | null) => void
  // Active parametric table pass-through (wired to solver state in App):
  tableVars: string[]
  rows: ParamRow[]
  results: TableRowResult[]
  varDrafts: Record<string, VariableDraft>
  onConfigure: () => void
  onAddRow: () => void
  onRemoveRow: () => void
  onClearResults: () => void
  onAlterColumn: (name: string) => void
  onColumnUnitsChange: (name: string, units: string) => void
  onCellChange: (rowIndex: number, name: string, value: string) => void
}

export default function TablesTab(props: Readonly<Props>) {
  const { tables, activeTableId, onTablesChange, onActiveTableIdChange } = props
  const active = tables.find((t) => t.id === activeTableId) ?? tables[0] ?? null

  const addTable = (kind: 'parametric' | 'curve') => {
    const table = kind === 'parametric' ? newParamTable(tables) : newCurveTable(tables)
    onTablesChange([...tables, table])
    onActiveTableIdChange(table.id)
  }

  const removeTable = (id: string) => {
    const remaining = tables.filter((t) => t.id !== id)
    onTablesChange(remaining)
    if (activeTableId === id) {
      onActiveTableIdChange(remaining[0]?.id ?? null)
    }
  }

  const renameTable = (id: string, name: string) => {
    onTablesChange(tables.map((t) => (t.id === id ? { ...t, name } : t)))
  }

  const updateCurveTable = (next: CurveTableSpec) => {
    onTablesChange(tables.map((t) => (t.id === next.id ? next : t)))
  }

  return (
    <Stack gap="xs" style={{ flex: 1, minHeight: 0 }}>
      <Group gap="xs" wrap="wrap">
        {tables.map((t) => (
          <Paper
            key={t.id}
            withBorder
            px={6}
            py={2}
            style={{
              cursor: 'pointer',
              borderColor:
                active?.id === t.id ? 'var(--mantine-color-blue-7)' : undefined,
            }}
            onClick={() => onActiveTableIdChange(t.id)}
          >
            <Group gap={6} wrap="nowrap">
              {t.kind === 'parametric' ? (
                <IconTable size={13} color="var(--mantine-color-blue-4)" />
              ) : (
                <IconChartGridDots size={13} color="var(--mantine-color-teal-4)" />
              )}
              {active?.id === t.id ? (
                <TextInput
                  size="xs"
                  variant="unstyled"
                  w={110}
                  value={t.name}
                  onChange={(e) => renameTable(t.id, e.currentTarget.value)}
                />
              ) : (
                <Text size="xs">{t.name}</Text>
              )}
              <ActionIcon
                size="xs"
                variant="subtle"
                color="red"
                aria-label={`Delete ${t.name}`}
                onClick={(e) => {
                  e.stopPropagation()
                  removeTable(t.id)
                }}
              >
                <IconTrash size={11} />
              </ActionIcon>
            </Group>
          </Paper>
        ))}
        <Menu position="bottom-start" shadow="md">
          <Menu.Target>
            <Button size="compact-xs" leftSection={<IconPlus size={13} />}>
              Add Table
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item leftSection={<IconTable size={14} />} onClick={() => addTable('parametric')}>
              Parametric Table — solve the system once per row
            </Menu.Item>
            <Menu.Item
              leftSection={<IconChartGridDots size={14} />}
              onClick={() => addTable('curve')}
            >
              Curve Table — tabulated function callable in equations
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
        {active?.kind === 'curve' && (
          <Tooltip label="The table name is the function name; the first column is its argument.">
            <Badge size="xs" variant="light" color="teal">
              curve function
            </Badge>
          </Tooltip>
        )}
      </Group>

      {active === null && (
        <Text size="sm" c="dimmed" mt="md">
          No tables yet. Add a Parametric Table to run the system over value sets, or a Curve
          Table to turn digitized graph data into a function you can call from the equations.
        </Text>
      )}

      {active?.kind === 'parametric' && (
        <ParametricTableTab
          tableVars={props.tableVars}
          rows={props.rows}
          results={props.results}
          varDrafts={props.varDrafts}
          onConfigure={props.onConfigure}
          onAddRow={props.onAddRow}
          onRemoveRow={props.onRemoveRow}
          onClearResults={props.onClearResults}
          onAlterColumn={props.onAlterColumn}
          onColumnUnitsChange={props.onColumnUnitsChange}
          onCellChange={props.onCellChange}
        />
      )}

      {active?.kind === 'curve' && (
        <CurveTableEditor table={active} onChange={updateCurveTable} />
      )}
    </Stack>
  )
}
