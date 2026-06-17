import {
  Button,
  Group,
  Stack,
  Table,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core'
import { TableRowResult } from './api'
import { VariableDraft } from './VariableInfoModal'
import { formatValue } from './format'

/** One parametric-table run: a stable identity plus the cell drafts. */
export interface ParamRow {
  id: string
  values: Record<string, string>
}

export function newParamRow(): ParamRow {
  return { id: crypto.randomUUID(), values: {} }
}

const MONO_INPUT = {
  input: { fontFamily: 'var(--mantine-font-family-monospace)' },
}

interface ColumnHeaderProps {
  name: string
  units: string
  readOnly?: boolean
  /** Units field stays editable even when the column itself is read-only —
   * used for ODE tables, where the unit is a display label (the solver is SI). */
  unitsEditable?: boolean
  onAlter: () => void
  onUnitsChange: (units: string) => void
}

function ColumnHeader({
  name,
  units,
  readOnly,
  unitsEditable,
  onAlter,
  onUnitsChange,
}: Readonly<ColumnHeaderProps>) {
  const unitsReadOnly = readOnly && !unitsEditable
  return (
    <Stack gap={4}>
      <Tooltip label={readOnly ? 'Defined in code' : 'Click to fill values (linear / logarithmic)'}>
        <Text
          size="sm"
          fw={600}
          ff="monospace"
          c="teal.4"
          style={{ cursor: readOnly ? 'default' : 'pointer' }}
          onClick={readOnly ? undefined : onAlter}
        >
          {name}{readOnly ? '' : ' ⤓'}
        </Text>
      </Tooltip>
      <TextInput
        size="xs"
        w={110}
        placeholder="units"
        value={units}
        onChange={(e) => onUnitsChange(e.currentTarget.value)}
        readOnly={unitsReadOnly}
        spellCheck={false}
        styles={{
          input: {
            fontFamily: 'var(--mantine-font-family-monospace)',
            fontWeight: 400,
          },
        }}
      />
    </Stack>
  )
}

function RunCell({
  runNumber,
  result,
}: Readonly<{ runNumber: number; result?: TableRowResult }>) {
  if (result && !result.success) {
    return (
      <Tooltip label={result.error ?? 'failed'}>
        <Text c="red" size="sm">
          {runNumber} ✗
        </Text>
      </Tooltip>
    )
  }
  return <>{runNumber}</>
}

interface ValueCellProps {
  draft: string
  computed: number | undefined
  readOnly?: boolean
  onChange: (value: string) => void
}

function ValueCell({ draft, computed, readOnly, onChange }: Readonly<ValueCellProps>) {
  if (computed === undefined) {
    return (
      <TextInput
        size="xs"
        value={draft}
        placeholder="auto"
        spellCheck={false}
        readOnly={readOnly}
        onChange={(e) => onChange(e.currentTarget.value)}
        styles={MONO_INPUT}
      />
    )
  }
  return (
    <Text size="sm" ff="monospace" c="green.4">
      {formatValue(computed)}
    </Text>
  )
}

interface Props {
  tableVars: string[]
  rows: ParamRow[]
  results: TableRowResult[]
  varDrafts: Record<string, VariableDraft>
  readOnly?: boolean
  /** True when this read-only table is the output of a DYNAMIC/ODE block. */
  isOde?: boolean
  onConfigure: () => void
  onAddRow: () => void
  onRemoveRow: () => void
  onClearResults: () => void
  onAlterColumn: (name: string) => void
  onColumnUnitsChange: (name: string, units: string) => void
  onCellChange: (rowIndex: number, name: string, value: string) => void
}

export default function ParametricTableTab({
  tableVars,
  rows,
  results,
  varDrafts,
  readOnly,
  isOde,
  onConfigure,
  onAddRow,
  onRemoveRow,
  onClearResults,
  onAlterColumn,
  onColumnUnitsChange,
  onCellChange,
}: Readonly<Props>) {
  return (
    <Stack gap="sm" style={{ flex: 1, minHeight: 0 }}>
      <Group gap="xs">
        {readOnly ? (
          <Text size="xs" c="dimmed">
            {isOde
              ? 'Solved trajectory from a DYNAMIC (ODE) block — columns are populated by the transient solver (which runs in SI), so the values are display-only. You can edit each column’s units as a display label.'
              : 'Defined in code (PARAMETRIC … END) — its columns and rows come from the editor text. Run it with Solve Table.'}
          </Text>
        ) : (
          <>
            <Button size="xs" variant="default" onClick={onConfigure}>
              Configure Columns
            </Button>
            <Button size="xs" variant="default" onClick={onAddRow}>
              Add Row
            </Button>
            <Button
              size="xs"
              variant="default"
              disabled={rows.length <= 1}
              onClick={onRemoveRow}
            >
              Remove Row
            </Button>
          </>
        )}
        {results.length > 0 && (
          <Button size="xs" variant="subtle" onClick={onClearResults}>
            Clear Results
          </Button>
        )}
      </Group>

      {tableVars.length === 0 ? (
        <Text size="sm" c="dimmed">
          Run Check first, then Configure Columns to choose the table
          variables. Fill cells for independent variables; blank cells are
          solved for each run.
        </Text>
      ) : (
        <div style={{ overflow: 'auto', flex: 1 }}>
          <Table striped withColumnBorders stickyHeader>
            <Table.Thead>
              <Table.Tr>
                <Table.Th w={50}>Run</Table.Th>
                {tableVars.map((name) => (
                  <Table.Th key={name}>
                    <ColumnHeader
                      name={name}
                      units={varDrafts[name]?.units ?? ''}
                      readOnly={readOnly}
                      unitsEditable={isOde}
                      onAlter={() => onAlterColumn(name)}
                      onUnitsChange={(units) => onColumnUnitsChange(name, units)}
                    />
                  </Table.Th>
                ))}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.map((row, ri) => (
                <Table.Tr key={row.id}>
                  <Table.Td c="dimmed">
                    <RunCell runNumber={ri + 1} result={results[ri]} />
                  </Table.Td>
                  {tableVars.map((name) => {
                    const draft = row.values[name] ?? ''
                    const computed =
                      results[ri]?.success && draft.trim() === ''
                        ? results[ri].values[name]
                        : undefined
                    return (
                      <Table.Td key={name}>
                        <ValueCell
                          draft={draft}
                          computed={computed}
                          readOnly={readOnly}
                          onChange={(value) => onCellChange(ri, name, value)}
                        />
                      </Table.Td>
                    )
                  })}
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </div>
      )}
    </Stack>
  )
}
