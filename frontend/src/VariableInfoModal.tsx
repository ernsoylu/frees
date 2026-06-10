import { useState } from 'react'
import {
  Button,
  Code,
  Group,
  Modal,
  Table,
  Text,
  TextInput,
} from '@mantine/core'

export interface VariableDraft {
  guess: string
  lower: string
  upper: string
  units: string
  isUnitsUserSet?: boolean
}

export const DEFAULT_DRAFT: VariableDraft = {
  guess: '1',
  lower: '-infinity',
  upper: 'infinity',
  units: '',
  isUnitsUserSet: false,
}

export function parseBound(raw: string): number | null | undefined {
  const s = raw.trim().toLowerCase()
  if (s === '' || s === 'infinity' || s === '-infinity' || s === 'inf' || s === '-inf') {
    return null
  }
  const value = Number(s)
  return Number.isFinite(value) ? value : undefined
}

interface Props {
  variables: string[]
  drafts: Record<string, VariableDraft>
  onSave: (drafts: Record<string, VariableDraft>) => void
  onClose: () => void
}

/** Mirrors the EES Options > Variable Information window. */
export default function VariableInfoModal({ variables, drafts, onSave, onClose }: Props) {
  const [local, setLocal] = useState<Record<string, VariableDraft>>(() => {
    const initial: Record<string, VariableDraft> = {}
    for (const name of variables) {
      initial[name] = drafts[name] ?? { ...DEFAULT_DRAFT }
    }
    return initial
  })
  const [error, setError] = useState<string | null>(null)

  function setField(name: string, field: keyof VariableDraft, value: string) {
    setLocal((d) => ({ ...d, [name]: { ...d[name], [field]: value } }))
    setError(null)
  }

  function restoreDefaults() {
    const reset: Record<string, VariableDraft> = {}
    for (const name of variables) {
      reset[name] = { ...DEFAULT_DRAFT }
    }
    setLocal(reset)
    setError(null)
  }

  function save() {
    const saved: Record<string, VariableDraft> = {}
    for (const name of variables) {
      const draft = local[name]
      const guess = Number(draft.guess)
      if (draft.guess.trim() === '' || !Number.isFinite(guess)) {
        setError(`Guess value for ${name} must be a number.`)
        return
      }
      const lower = parseBound(draft.lower)
      const upper = parseBound(draft.upper)
      if (lower === undefined) {
        setError(`Lower bound for ${name} must be a number or -infinity.`)
        return
      }
      if (upper === undefined) {
        setError(`Upper bound for ${name} must be a number or infinity.`)
        return
      }
      const lo = lower ?? Number.NEGATIVE_INFINITY
      const hi = upper ?? Number.POSITIVE_INFINITY
      if (lo > hi) {
        setError(`Lower bound exceeds upper bound for ${name}.`)
        return
      }
      if (guess < lo || guess > hi) {
        setError(`Guess value for ${name} is outside its bounds.`)
        return
      }
      saved[name] = {
        ...draft,
        isUnitsUserSet: draft.units.trim() !== '',
      }
    }
    onSave(saved)
  }

  return (
    <Modal opened onClose={onClose} title="Variable Information" size="xl" centered>
      <Text size="sm" c="dimmed" mb="md">
        Guess values steer Newton&apos;s method toward a root; bounds constrain
        the search space (<Code>-infinity</Code> / <Code>infinity</Code> for
        unbounded). Units like <Code>kPa</Code> or <Code>kJ/kg-K</Code> enable
        dimensional checking; <Code>-</Code> means dimensionless.
      </Text>

      {variables.length === 0 ? (
        <Text c="dimmed" size="sm">
          No variables yet — run Check first to populate this table.
        </Text>
      ) : (
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Variable</Table.Th>
              <Table.Th>Guess</Table.Th>
              <Table.Th>Lower</Table.Th>
              <Table.Th>Upper</Table.Th>
              <Table.Th>Units</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {variables.map((name) => (
              <Table.Tr key={name}>
                <Table.Td ff="monospace" c="blue.4">
                  {name}
                </Table.Td>
                {(['guess', 'lower', 'upper', 'units'] as const).map((field) => (
                  <Table.Td key={field}>
                    <TextInput
                      size="xs"
                      value={local[name][field]}
                      onChange={(e) => setField(name, field, e.currentTarget.value)}
                      spellCheck={false}
                      styles={{
                        input: { fontFamily: 'var(--mantine-font-family-monospace)' },
                      }}
                    />
                  </Table.Td>
                ))}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}

      {error && (
        <Text c="red" size="sm" mt="sm">
          {error}
        </Text>
      )}

      <Group justify="space-between" mt="lg">
        <Button variant="subtle" onClick={restoreDefaults}>
          Restore Defaults
        </Button>
        <Group gap="xs">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={variables.length === 0}>
            OK
          </Button>
        </Group>
      </Group>
    </Modal>
  )
}
