// Phase R: the Inspector says what it is inspecting, and reads a schematic
// selection and a variable as well as a focused window.
import { Badge, Button, Group, Stack, Table, Text } from '@mantine/core'
import type { ComponentResult, InstanceIdentityDto, VariableResult } from './api'
import { VARIABLE_ROW_MENU, type Commands } from './commands'
import type { Problem } from './problems'

/** The first line of every Inspector view: the kind of thing and its name. */
export function InspectorTarget({ kind, name }: Readonly<{ kind: string; name?: string }>) {
  return (
    <Group gap={6} wrap="nowrap" data-testid="inspector-target" aria-label={`Inspecting ${kind}${name ? ` ${name}` : ''}`}>
      <Text size="sm" fw={600} c="teal.4" style={{ flexShrink: 0 }}>{kind}</Text>
      {name && <Text size="sm" fw={600} truncate title={name}>{name}</Text>}
    </Group>
  )
}

function ProblemLines({ problems }: Readonly<{ problems: readonly Problem[] }>) {
  return problems.map((p) => (
    <Text key={`${p.severity}:${p.text}`} size="xs" c={p.severity === 'error' ? 'red' : 'orange'}>{p.text}</Text>
  ))
}

/** The blocks selected on the schematic: one in full, several by name. The solve
 *  spells the type as written; Check lower-cases it. */
export function SchematicInspector({ selection, instances, components, problems, onGoToLine }: Readonly<{
  selection: readonly string[]
  instances: readonly InstanceIdentityDto[]
  components: readonly ComponentResult[] | undefined
  problems: readonly Problem[]
  onGoToLine: (line: number) => void
}>) {
  const identity = (id: string) => instances.find((i) => i.name.toLowerCase() === id.toLowerCase())
  if (selection.length !== 1) {
    return (
      <Stack gap="xs">
        <InspectorTarget kind="Schematic" name={selection.length ? `${selection.length} blocks selected` : undefined} />
        {selection.length === 0
          ? <Text size="xs" c="dimmed">Select a block on the schematic to inspect it here.</Text>
          : <Text size="xs">{selection.map((id) => identity(id)?.label ?? id).join(', ')}</Text>}
      </Stack>
    )
  }
  const id = selection[0]
  const inst = identity(id)
  const comp = components?.find((c) => c.name.toLowerCase() === id.toLowerCase())
  const own = problems.filter((p) => p.instance?.toLowerCase() === id.toLowerCase())
  return (
    <Stack gap="xs">
      <InspectorTarget kind="Block" name={inst?.label ?? comp?.name ?? id} />
      <Group gap="xs">
        {(inst ?? comp) && <Badge size="xs" variant="light" color="gray" style={{ textTransform: 'none' }}>{comp?.type ?? inst?.type}</Badge>}
        {inst && (
          <Button size="compact-xs" variant="subtle" onClick={() => onGoToLine(inst.line)}>
            Go to Source (line {inst.line})
          </Button>
        )}
      </Group>
      <ProblemLines problems={own} />
      {comp ? (
        comp.params.length > 0 && (
          <Table verticalSpacing={2} horizontalSpacing="xs" aria-label={`${comp.name} parameters`}>
            <Table.Tbody>
              {comp.params.map((p) => (
                <Table.Tr key={p.name}>
                  <Table.Td><Text size="xs" ff="monospace">{p.name}</Text></Table.Td>
                  <Table.Td><Text size="xs" ff="monospace">{p.ref}</Text></Table.Td>
                  <Table.Td>
                    <Text size="xs" ff="monospace">
                      {p.value === null || p.value === undefined ? '' : `${p.value}${p.units ? ` [${p.units}]` : ''}`}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )
      ) : (
        <Text size="xs" c="dimmed">Solve to see its parameter values.</Text>
      )}
    </Stack>
  )
}

/** A variable chosen in the Variable Explorer: its value, its row commands and where it is written. */
export function VariableInspector({ variable, name, cmds, lines, onGoToLine }: Readonly<{
  /** Undefined when the last solve no longer has it. */
  variable: VariableResult | undefined
  name: string
  cmds: Commands | null
  /** Editor lines that write the name, 1-based. */
  lines: readonly { line: number; text: string }[]
  onGoToLine: (line: number) => void
}>) {
  return (
    <Stack gap="xs">
      <InspectorTarget kind="Variable" name={variable?.name ?? name} />
      {variable ? (
        <Text size="xs" ff="monospace" style={{ overflowWrap: 'anywhere' }}>
          {String(variable.value)}{variable.units ? ` [${variable.units}]` : ''}
        </Text>
      ) : (
        <Text size="xs" c="dimmed">The last solve has no variable of this name.</Text>
      )}
      {cmds && (
        <Group gap={4}>
          {VARIABLE_ROW_MENU.filter((e) => typeof e === 'string' && e !== '-').map((e) => {
            const c = cmds[e as keyof Commands]
            return (
              <Button key={c.id} size="compact-xs" variant="default" disabled={c.unavailable !== null} title={c.unavailable ?? c.description} onClick={c.run}>
                {c.label}
              </Button>
            )
          })}
        </Group>
      )}
      {lines.length > 0 && <Text size="xs" c="dimmed">Written on</Text>}
      {lines.map((l) => (
        <Button key={l.line} size="compact-xs" variant="subtle" justify="flex-start" onClick={() => onGoToLine(l.line)} styles={{ label: { fontFamily: 'var(--mantine-font-family-monospace)' } }}>
          {l.line}: {l.text}
        </Button>
      ))}
    </Stack>
  )
}
