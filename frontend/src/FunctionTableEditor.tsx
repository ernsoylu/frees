import {
  ActionIcon,
  Button,
  Checkbox,
  Code,
  Group,
  ScrollArea,
  Stack,
  Table,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core'
import {
  IconArrowsSort,
  IconColumnInsertRight,
  IconRowInsertBottom,
  IconSparkles,
  IconTrash,
} from '@tabler/icons-react'
import { FunctionTableSpec, fillMissingCells, sortFunctionRows } from './tables'

// ---------------------------------------------------------------------------
// Function Table editor (Story 8.7): the table name is the function name, the
// first column is the lookup argument, and every further column is one curve
// with the family parameter value in its header. "Fill missing" interpolates
// blank cells from the column's known points so curves digitized on
// different x samples line up on a common grid.
// ---------------------------------------------------------------------------

interface Props {
  table: FunctionTableSpec
  onChange: (table: FunctionTableSpec) => void
}

export default function FunctionTableEditor({ table, onChange }: Readonly<Props>) {
  const update = (patch: Partial<FunctionTableSpec>) => onChange({ ...table, ...patch })

  const setCell = (rowIdx: number, colIdx: number | null, value: string) => {
    const rows = table.rows.map((row, i) => {
      if (i !== rowIdx) return row
      if (colIdx === null) return { ...row, x: value }
      const ys = [...row.ys]
      ys[colIdx] = value
      return { ...row, ys }
    })
    update({ rows })
  }

  const addRow = () => {
    update({ rows: [...table.rows, { x: '', ys: table.columns.map(() => '') }] })
  }

  const removeRow = (rowIdx: number) => {
    update({ rows: table.rows.filter((_, i) => i !== rowIdx) })
  }

  const addColumn = () => {
    if (table.is1D) return
    update({
      columns: [...table.columns, ''],
      rows: table.rows.map((row) => ({ ...row, ys: [...row.ys, ''] })),
    })
  }

  const removeColumn = (colIdx: number) => {
    if (table.columns.length <= 1) return
    update({
      columns: table.columns.filter((_, i) => i !== colIdx),
      rows: table.rows.map((row) => ({ ...row, ys: row.ys.filter((_, i) => i !== colIdx) })),
    })
  }

  const setColumnParam = (colIdx: number, value: string) => {
    const columns = [...table.columns]
    columns[colIdx] = value
    update({ columns })
  }

  const multiCurve = table.columns.length > 1
  const callSignature = multiCurve
    ? `${table.name || 'name'}(${table.argName || 'x'}, ${table.paramName || 'param'})`
    : `${table.name || 'name'}(${table.argName || 'x'})`

  return (
    <Stack gap="xs" style={{ flex: 1, minHeight: 0 }}>
      <Group gap="xs" align="flex-end" wrap="wrap">
        <TextInput
          size="xs"
          label="Function name"
          description="Call it in equations"
          value={table.name}
          onChange={(e) => update({ name: e.currentTarget.value })}
          w={140}
        />
        <TextInput
          size="xs"
          label="Argument (X column)"
          value={table.argName}
          onChange={(e) => update({ argName: e.currentTarget.value })}
          w={140}
        />
        {!table.is1D && (
          <TextInput
            size="xs"
            label="Curve parameter"
            placeholder="e.g. T"
            value={table.paramName}
            onChange={(e) => update({ paramName: e.currentTarget.value })}
            w={140}
            disabled={!multiCurve}
          />
        )}
        <Checkbox
          size="xs"
          label="log X"
          checked={table.xLog}
          onChange={(e) => {
            const xLog = e.currentTarget.checked
            update({ xLog })
          }}
          mb={6}
        />
        <Checkbox
          size="xs"
          label="log Y"
          checked={table.yLog}
          onChange={(e) => {
            const yLog = e.currentTarget.checked
            update({ yLog })
          }}
          mb={6}
        />
      </Group>

      <Group gap="xs">
        <Button size="compact-xs" variant="default" leftSection={<IconRowInsertBottom size={13} />} onClick={addRow}>
          Add row
        </Button>
        {!table.is1D && (
          <Button size="compact-xs" variant="default" leftSection={<IconColumnInsertRight size={13} />} onClick={addColumn}>
            Add curve
          </Button>
        )}
        <Button size="compact-xs" variant="default" leftSection={<IconArrowsSort size={13} />} onClick={() => onChange(sortFunctionRows(table))}>
          Sort by {table.argName || 'x'}
        </Button>
        <Tooltip label="Interpolate blank cells from each curve's known points (log-aware)">
          <Button size="compact-xs" leftSection={<IconSparkles size={13} />} onClick={() => onChange(fillMissingCells(table))}>
            Fill missing
          </Button>
        </Tooltip>
        <Text size="xs" c="dimmed">
          Use in equations: <Code>U = {callSignature}</Code>
        </Text>
      </Group>

      <ScrollArea style={{ flex: 1, minHeight: 0 }}>
        <Table withTableBorder withColumnBorders stickyHeader>
          <Table.Thead>
            <Table.Tr>
              <Table.Th miw={110}>
                <Text size="xs" fw={700}>
                  {table.argName || 'x'}
                </Text>
              </Table.Th>
              {table.columns.map((param, j) => (
                // eslint-disable-next-line react/no-array-index-key
                <Table.Th key={`col-${j}`} miw={110}>
                  <Group gap={4} wrap="nowrap">
                    {multiCurve ? (
                      <TextInput
                        size="xs"
                        variant="filled"
                        placeholder="param"
                        leftSection={
                          table.paramName ? (
                            <Text size="10px" c="dimmed">
                              {table.paramName}=
                            </Text>
                          ) : undefined
                        }
                        leftSectionWidth={table.paramName ? 26 : undefined}
                        value={param}
                        onChange={(e) => setColumnParam(j, e.currentTarget.value)}
                      />
                    ) : (
                      <Text size="xs" fw={700} style={{ flex: 1 }}>
                        y
                      </Text>
                    )}
                    {multiCurve && (
                      <ActionIcon
                        size="xs"
                        variant="subtle"
                        color="red"
                        aria-label="Remove curve"
                        onClick={() => removeColumn(j)}
                      >
                        <IconTrash size={11} />
                      </ActionIcon>
                    )}
                  </Group>
                </Table.Th>
              ))}
              <Table.Th w={32} />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {table.rows.map((row, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <Table.Tr key={`row-${i}`}>
                <Table.Td p={2}>
                  <TextInput
                    size="xs"
                    variant="unstyled"
                    px={6}
                    value={row.x}
                    onChange={(e) => setCell(i, null, e.currentTarget.value)}
                  />
                </Table.Td>
                {table.columns.map((_, j) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <Table.Td key={`cell-${i}-${j}`} p={2}>
                    <TextInput
                      size="xs"
                      variant="unstyled"
                      px={6}
                      value={row.ys[j] ?? ''}
                      onChange={(e) => setCell(i, j, e.currentTarget.value)}
                    />
                  </Table.Td>
                ))}
                <Table.Td p={2}>
                  <ActionIcon
                    size="xs"
                    variant="subtle"
                    color="red"
                    aria-label="Remove row"
                    onClick={() => removeRow(i)}
                  >
                    <IconTrash size={11} />
                  </ActionIcon>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </Stack>
  )
}
