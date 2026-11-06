import { useState } from 'react'
import { ActionIcon, Badge, Button, Group, NumberInput, Paper, ScrollArea, Select, Stack, Table, Text, TextInput, Tooltip } from '@mantine/core'
import { IconArrowBackUp, IconArrowForwardUp, IconX } from '@tabler/icons-react'
import type { VariableResult } from './api'
import { activeScenario, describeRun, DOCUMENT_INPUTS, type Baseline, type Comparison, type RunIdentity, type ScenarioState } from './runs'

interface Props {
  scenarios: ScenarioState
  onScenarios: (next: ScenarioState) => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  /** Solved variables the document assigns a literal value: what a scenario may set. */
  inputs: VariableResult[]
  run: RunIdentity | null
  /** The scenario changed since `run` solved. */
  stale: boolean
  baseline: Baseline | null
  onSetBaseline: () => void
  onClearBaseline: () => void
  rows: Comparison[] | null
}

const fmt = (x: number, digits = 6) => String(Number(x.toPrecision(digits)))

/**
 * RUN-07: the run on screen and where it came from, the named scenarios that
 * set its inputs, and a comparison with a pinned baseline run.
 */
export default function RunsPanel({ scenarios, onScenarios, canUndo, canRedo, onUndo, onRedo, inputs, run, stale, baseline, onSetBaseline, onClearBaseline, rows }: Readonly<Props>) {
  const [naming, setNaming] = useState<{ mode: 'new' | 'rename'; name: string } | null>(null)
  const active = activeScenario(scenarios)
  const names = scenarios.list.map((s) => s.name)
  const nameTaken = (n: string) => names.includes(n.trim()) && n.trim() !== (naming?.mode === 'rename' ? active?.name : undefined)
  const commitName = () => {
    if (!naming) return
    const name = naming.name.trim()
    if (!name || name.length > 60 || nameTaken(name)) return
    if (naming.mode === 'new') onScenarios({ list: [...scenarios.list, { name, inputs: [] }], active: name })
    else if (active) onScenarios({ list: scenarios.list.map((s) => (s === active ? { ...s, name } : s)), active: name })
    setNaming(null)
  }
  const setInputs = (next: NonNullable<typeof active>['inputs']) =>
    active && onScenarios({ ...scenarios, list: scenarios.list.map((s) => (s === active ? { ...s, inputs: next } : s)) })
  const free = inputs.filter((v) => !active?.inputs.some((i) => i.name.toLowerCase() === v.name.toLowerCase()))
  const usable = run && (run.status === 'solved' || run.status === 'solved with warnings')

  return (
    <Paper withBorder p="xs" data-testid="runs-panel">
      <Stack gap={6}>
        <Group gap={6} wrap="wrap">
          <Text size="xs" fw={600}>Run</Text>
          <Text size="xs" c="dimmed" data-testid="run-identity">{run ? describeRun(run) : 'not solved yet'}</Text>
          {stale && run && (
            <Badge size="xs" color="orange" variant="light" data-testid="run-stale">
              stale: the scenario changed since run {run.revision}; Solve to update
            </Badge>
          )}
        </Group>

        <Group gap={4} wrap="wrap">
          <Select
            size="xs"
            aria-label="Scenario"
            w={150}
            data={[DOCUMENT_INPUTS, ...names]}
            value={scenarios.active ?? DOCUMENT_INPUTS}
            onChange={(v) => v && onScenarios({ ...scenarios, active: v === DOCUMENT_INPUTS ? null : v })}
            allowDeselect={false}
            comboboxProps={{ withinPortal: false }}
          />
          <Button size="compact-xs" variant="light" onClick={() => setNaming({ mode: 'new', name: `Scenario ${scenarios.list.length + 1}` })}>New</Button>
          {active && <Button size="compact-xs" variant="subtle" onClick={() => setNaming({ mode: 'rename', name: active.name })}>Rename</Button>}
          {active && (
            <Button size="compact-xs" variant="subtle" color="red" onClick={() => onScenarios({ list: scenarios.list.filter((s) => s !== active), active: null })}>
              Delete
            </Button>
          )}
          <Tooltip label="Revert the last scenario change (undo)">
            <ActionIcon size="sm" variant="subtle" aria-label="Revert scenario change" disabled={!canUndo} onClick={onUndo}><IconArrowBackUp size={14} /></ActionIcon>
          </Tooltip>
          <Tooltip label="Reapply the reverted scenario change (redo)">
            <ActionIcon size="sm" variant="subtle" aria-label="Reapply scenario change" disabled={!canRedo} onClick={onRedo}><IconArrowForwardUp size={14} /></ActionIcon>
          </Tooltip>
        </Group>
        {naming && (
          <Group gap={4} wrap="nowrap">
            <TextInput
              size="xs"
              aria-label="Scenario name"
              value={naming.name}
              maxLength={60}
              autoFocus
              error={nameTaken(naming.name) ? 'Name in use' : undefined}
              onChange={(e) => setNaming({ ...naming, name: e.currentTarget.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitName()
                if (e.key === 'Escape') setNaming(null)
              }}
            />
            <Button size="compact-xs" onClick={commitName} disabled={!naming.name.trim() || nameTaken(naming.name)}>{naming.mode === 'new' ? 'Add' : 'Rename'}</Button>
            <Button size="compact-xs" variant="subtle" color="gray" onClick={() => setNaming(null)}>Cancel</Button>
          </Group>
        )}

        {active && (
          <Stack gap={4} data-testid="scenario-inputs">
            {active.inputs.length === 0 && <Text size="xs" c="dimmed">No inputs yet: add the parameters this scenario sets. The document is not edited.</Text>}
            {active.inputs.map((i) => (
              <Group key={i.name} gap={4} wrap="nowrap">
                <Text size="xs" w={90} truncate>{i.name}</Text>
                <NumberInput
                  // Committed on blur or Enter, so a typed number is one undo step.
                  key={`${i.name}:${i.value}`}
                  size="xs"
                  w={110}
                  aria-label={`Value of ${i.name}`}
                  defaultValue={i.value}
                  hideControls
                  onBlur={(e) => {
                    const value = Number(e.currentTarget.value)
                    if (Number.isFinite(value) && value !== i.value) setInputs(active.inputs.map((x) => (x === i ? { ...x, value } : x)))
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                />
                <Text size="xs" c="dimmed">{i.unit && i.unit !== '-' ? i.unit : ''}</Text>
                <ActionIcon size="sm" variant="subtle" color="gray" aria-label={`Remove ${i.name}`} onClick={() => setInputs(active.inputs.filter((x) => x !== i))}><IconX size={12} /></ActionIcon>
              </Group>
            ))}
            {free.length > 0 && (
              <Select
                size="xs"
                w={170}
                aria-label="Add input"
                placeholder="Add input…"
                searchable
                data={free.map((v) => v.name)}
                value={null}
                onChange={(name) => {
                  const v = free.find((x) => x.name === name)
                  if (v) setInputs([...active.inputs, { name: v.name, value: v.value, unit: v.units }])
                }}
                comboboxProps={{ withinPortal: false }}
              />
            )}
          </Stack>
        )}

        <Group gap={6} wrap="wrap">
          {baseline ? (
            <>
              <Text size="xs" data-testid="baseline-identity">Baseline: {describeRun(baseline.run)}</Text>
              <Button size="compact-xs" variant="subtle" color="gray" onClick={onClearBaseline}>Clear baseline</Button>
            </>
          ) : (
            <Button size="compact-xs" variant="light" disabled={!usable || stale} onClick={onSetBaseline}>Set as baseline</Button>
          )}
        </Group>
        {baseline && rows && (
          <ScrollArea.Autosize mah={260}>
            <Table fz="xs" verticalSpacing={2} data-testid="run-comparison">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Variable</Table.Th>
                  <Table.Th>Baseline</Table.Th>
                  <Table.Th>Current</Table.Th>
                  <Table.Th>Change</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rows.map((r) => {
                  const unit = r.unit && r.unit !== '-' ? ` ${r.unit}` : ''
                  return (
                    <Table.Tr key={r.name} data-variable={r.name}>
                      <Table.Td>{r.name}</Table.Td>
                      {r.unavailable ? (
                        <Table.Td colSpan={3} c="dimmed" data-unavailable>unavailable: {r.unavailable}</Table.Td>
                      ) : (
                        <>
                          <Table.Td>{fmt(r.baseline!)}{unit}</Table.Td>
                          <Table.Td>{fmt(r.current!)}{unit}</Table.Td>
                          <Table.Td data-change>
                            {r.current === r.baseline ? 'same' : `${r.current! > r.baseline! ? '+' : ''}${fmt(r.current! - r.baseline!)}${unit}${r.baseline ? ` (${r.current! > r.baseline! ? '+' : ''}${fmt((100 * (r.current! - r.baseline!)) / Math.abs(r.baseline!), 3)} %)` : ''}`}
                          </Table.Td>
                        </>
                      )}
                    </Table.Tr>
                  )
                })}
              </Table.Tbody>
            </Table>
          </ScrollArea.Autosize>
        )}
      </Stack>
    </Paper>
  )
}
