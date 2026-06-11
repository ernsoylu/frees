import { Table, Text } from '@mantine/core'
import { VariableResult } from './api'
import { detectStates } from './plots/stateTable'
import { formatValue } from './format'

const PROPERTY_HEADERS: Record<string, string> = {
  T: 'T [K]',
  P: 'P [Pa]',
  v: 'v [m³/kg]',
  u: 'u [J/kg]',
  h: 'h [J/kg]',
  s: 's [J/kg·K]',
  x: 'x [-]',
  rho: 'ρ [kg/m³]',
  w: 'ω [kg/kg]',
}

/**
 * The State Points window: solved variables named h1, s[2], T_3, ... are
 * grouped into numbered thermodynamic states (rows) by property (columns).
 * These states can be overlaid on property diagrams in the Plots tab.
 */
export default function StatesTab({
  solvedVariables,
}: Readonly<{ solvedVariables: VariableResult[] }>) {
  const states = detectStates(solvedVariables)

  if (states.indices.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        No state points detected. Name variables with a property letter and a
        state number — h1, s1, T[2], P_3 — and solve; each numbered state
        becomes a row here and can be drawn on property diagrams.
      </Text>
    )
  }

  return (
    <Table striped highlightOnHover withTableBorder stickyHeader>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>State</Table.Th>
          {states.columns.map((p) => (
            <Table.Th key={p} style={{ textAlign: 'right' }}>
              {PROPERTY_HEADERS[p] ?? p}
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
              return (
                <Table.Td
                  key={p}
                  style={{
                    textAlign: 'right',
                    fontFamily: 'var(--mantine-font-family-monospace)',
                  }}
                >
                  {value === undefined ? '—' : formatValue(value)}
                </Table.Td>
              )
            })}
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  )
}
