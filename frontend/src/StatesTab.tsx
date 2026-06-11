import { useState } from 'react'
import { Group, Select, Table, Text } from '@mantine/core'
import { VariableResult } from './api'
import { detectStates } from './plots/stateTable'
import { PROPERTY_UNITS, resolveUnit, unitIdsFor } from './plots/units'
import { formatValue } from './format'

const PROPERTY_NAMES: Record<string, string> = {
  T: 'T',
  P: 'P',
  v: 'v',
  u: 'u',
  h: 'h',
  s: 's',
  x: 'x',
  rho: 'ρ',
  w: 'ω',
  Twb: 'T_wb',
  Tdp: 'T_dp',
  rh: 'φ',
}

function ColumnHeader({
  property,
  unitId,
  onUnitChange,
}: Readonly<{
  property: string
  unitId: string
  onUnitChange: (unitId: string) => void
}>) {
  const choices = unitIdsFor(property)
  return (
    <Group gap={6} justify="flex-end" wrap="nowrap">
      <Text size="sm" fw={700}>
        {PROPERTY_NAMES[property] ?? property}
      </Text>
      {choices.length > 1 ? (
        <Select
          size="xs"
          w={110}
          data={choices}
          value={unitId}
          onChange={(id) => id && onUnitChange(id)}
        />
      ) : (
        <Text size="xs" c="dimmed">
          [{choices[0] ?? '-'}]
        </Text>
      )}
    </Group>
  )
}

/**
 * The State Points window: solved variables named h1, s[2], T_3, T_wb1, ...
 * are grouped into numbered thermodynamic states (rows) by property
 * (columns), with a display unit selector per column. These states can be
 * overlaid on property diagrams and psychrometric charts in the Plots tab.
 */
export default function StatesTab({
  solvedVariables,
}: Readonly<{ solvedVariables: VariableResult[] }>) {
  const states = detectStates(solvedVariables)
  const [unitIds, setUnitIds] = useState<Record<string, string>>({})

  if (states.indices.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        No state points detected. Name variables with a property and a state
        number — h1, s1, T[2], P_3, T_wb1, w1 — and solve; each numbered
        state becomes a row here and can be drawn on the diagrams in the
        Plots tab.
      </Text>
    )
  }

  function unitIdOf(property: string): string {
    return unitIds[property] ?? PROPERTY_UNITS[property]?.[0]?.id ?? '-'
  }

  return (
    <Table striped highlightOnHover withTableBorder stickyHeader>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>State</Table.Th>
          {states.columns.map((p) => (
            <Table.Th key={p}>
              <ColumnHeader
                property={p}
                unitId={unitIdOf(p)}
                onUnitChange={(id) => setUnitIds((u) => ({ ...u, [p]: id }))}
              />
            </Table.Th>
          ))}
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {states.indices.map((index) => (
          <Table.Tr key={index}>
            <Table.Td>{index}</Table.Td>
            {states.columns.map((p) => {
              const value = states.values[index][p]
              const unit = resolveUnit(p, unitIdOf(p), false)
              return (
                <Table.Td
                  key={p}
                  style={{
                    textAlign: 'right',
                    fontFamily: 'var(--mantine-font-family-monospace)',
                  }}
                >
                  {value === undefined
                    ? '—'
                    : formatValue(value * unit.scale + unit.offset)}
                </Table.Td>
              )
            })}
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  )
}
