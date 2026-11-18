import { useState } from 'react'
import { Badge, Button, Group, SegmentedControl, Stack, Table, Text } from '@mantine/core'
import type { Problem } from './problems'
import { problemSummary } from './problems'

/** Phase R: everything Check and Solve reported, with its source and severity.
 *  Go to Source opens the Editor at the line; a problem the engine gave no
 *  position has none. The inline marks in the Editor and on the canvas stay. */
export function ProblemsPanel({ problems, target, lineOf, onGoToLine }: Readonly<{
  problems: readonly Problem[]
  /** What was checked: the model, or the focused parametric table. */
  target: string
  lineOf: (p: Problem) => number | undefined
  onGoToLine: (line: number) => void
}>) {
  const [filter, setFilter] = useState<'all' | 'error' | 'warning'>('all')
  const shown = problems.filter((p) => filter === 'all' || p.severity === filter)
  return (
    <Stack gap="xs" p={10} style={{ height: '100%', minHeight: 0, overflow: 'auto' }} data-testid="problems-panel">
      <Group gap="xs" justify="space-between" wrap="nowrap">
        <Text size="xs" c="dimmed" truncate>
          {target}: {problemSummary(problems)}
        </Text>
        <SegmentedControl
          size="xs"
          aria-label="Severity"
          value={filter}
          onChange={(v) => setFilter(v as typeof filter)}
          data={[{ value: 'all', label: 'All' }, { value: 'error', label: 'Errors' }, { value: 'warning', label: 'Warnings' }]}
        />
      </Group>
      {shown.length === 0 ? (
        <Text size="xs" c="dimmed">
          {problems.length ? 'None of this severity.' : 'Nothing was reported by the last Check or Solve.'}
        </Text>
      ) : (
        <Table verticalSpacing={2} horizontalSpacing="xs" aria-label="Problems">
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ width: 76 }}>Severity</Table.Th>
              <Table.Th style={{ width: 84 }}>Source</Table.Th>
              <Table.Th>Message</Table.Th>
              <Table.Th style={{ width: 110 }} />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {shown.map((p) => {
              const line = lineOf(p)
              return (
                <Table.Tr key={`${p.source}:${p.line ?? ''}:${p.instance ?? ''}:${p.text}`}>
                  <Table.Td>
                    <Badge size="xs" variant="light" color={p.severity === 'error' ? 'red' : 'orange'}>{p.severity}</Badge>
                  </Table.Td>
                  <Table.Td><Text size="xs">{p.source}</Text></Table.Td>
                  <Table.Td><Text size="xs" style={{ overflowWrap: 'anywhere' }}>{p.text}</Text></Table.Td>
                  <Table.Td>
                    {line !== undefined && (
                      <Button size="compact-xs" variant="subtle" aria-label={`Go to source, line ${line}: ${p.text}`} onClick={() => onGoToLine(line)}>
                        Line {line}
                      </Button>
                    )}
                  </Table.Td>
                </Table.Tr>
              )
            })}
          </Table.Tbody>
        </Table>
      )}
    </Stack>
  )
}
