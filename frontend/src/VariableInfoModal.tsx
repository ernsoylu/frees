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
  uncertainty: string
  relativeUncertainty: string
  uncertaintyType: 'absolute' | 'relative'
}

export const DEFAULT_DRAFT: VariableDraft = {
  // Empty guess means automatic: the solver picks per-variable defaults
  // (1.0, and 0.0 for imaginary components in complex mode) and explores
  // alternative starts itself when a block fails to converge.
  guess: '',
  lower: '-infinity',
  upper: 'infinity',
  units: '',
  isUnitsUserSet: false,
  uncertainty: '',
  relativeUncertainty: '',
  uncertaintyType: 'absolute',
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
  solvedValues: Record<string, number>
  onSave: (drafts: Record<string, VariableDraft>) => void
  onClose: () => void
}

/** Mirrors the Options > Variable Information window. */
/** Relative (%) uncertainty derived from an absolute value, or '' when not derivable. */
function relUncFromAbs(value: string, val: number | undefined): string {
  if (val === undefined || val === 0 || value.trim() === '') return ''
  const numVal = Number(value)
  return Number.isFinite(numVal) ? String(Number(((numVal / Math.abs(val)) * 100).toPrecision(6))) : ''
}

/** Absolute uncertainty derived from a relative (%) value, or '' when not derivable. */
function absUncFromRel(value: string, val: number | undefined): string {
  if (val === undefined || value.trim() === '') return ''
  const numVal = Number(value)
  return Number.isFinite(numVal) ? String(Number(((numVal / 100) * Math.abs(val)).toPrecision(6))) : ''
}

/** Applies one edited field to a draft, keeping the absolute/relative uncertainty pair in sync. */
function applyFieldUpdate(draft: VariableDraft, field: keyof VariableDraft, value: string, val: number | undefined): VariableDraft {
  const updated = { ...draft, [field]: value }
  if (field === 'uncertainty') {
    updated.uncertaintyType = 'absolute'
    updated.relativeUncertainty = relUncFromAbs(value, val)
  } else if (field === 'relativeUncertainty') {
    updated.uncertaintyType = 'relative'
    updated.uncertainty = absUncFromRel(value, val)
  }
  return updated
}

/** Validates and normalizes one variable draft; returns the saved draft or an error message. */
function processDraft(name: string, draft: VariableDraft): { error: string } | { saved: VariableDraft } {
  const guessText = draft.guess.trim()
  const guess = guessText === '' ? null : Number(draft.guess)
  if (guess !== null && !Number.isFinite(guess)) {
    return { error: `Guess value for ${name} must be a number (or empty for automatic).` }
  }
  const lower = parseBound(draft.lower)
  const upper = parseBound(draft.upper)
  if (lower === undefined) return { error: `Lower bound for ${name} must be a number or -infinity.` }
  if (upper === undefined) return { error: `Upper bound for ${name} must be a number or infinity.` }
  const lo = lower ?? Number.NEGATIVE_INFINITY
  const hi = upper ?? Number.POSITIVE_INFINITY
  if (lo > hi) return { error: `Lower bound exceeds upper bound for ${name}.` }
  if (guess !== null && (guess < lo || guess > hi)) {
    return { error: `Guess value for ${name} is outside its bounds.` }
  }
  const uncertaintyText = draft.uncertainty?.trim() ?? ''
  const uncertainty = uncertaintyText === '' ? 0 : Number(uncertaintyText)
  if (uncertaintyText !== '' && (!Number.isFinite(uncertainty) || uncertainty < 0)) {
    return { error: `Uncertainty for ${name} must be a non-negative number.` }
  }
  return {
    saved: {
      ...draft,
      uncertainty: uncertaintyText,
      relativeUncertainty: draft.relativeUncertainty?.trim() ?? '',
      uncertaintyType: draft.uncertaintyType ?? 'absolute',
      isUnitsUserSet: draft.units.trim() !== '',
    },
  }
}

export default function VariableInfoModal({ variables, drafts, solvedValues, onSave, onClose }: Readonly<Props>) {
  const [local, setLocal] = useState<Record<string, VariableDraft>>(() => {
    const initial: Record<string, VariableDraft> = {}
    for (const name of variables) {
      initial[name] = drafts[name] ?? { ...DEFAULT_DRAFT }
    }
    return initial
  })
  const [error, setError] = useState<string | null>(null)

  function setField(name: string, field: keyof VariableDraft, value: string) {
    setLocal((d) => {
      const draft = d[name] ?? { ...DEFAULT_DRAFT }
      const val = solvedValues[name.toLowerCase()]
      return { ...d, [name]: applyFieldUpdate(draft, field, value, val) }
    })
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
      const result = processDraft(name, local[name])
      if ('error' in result) {
        setError(result.error)
        return
      }
      saved[name] = result.saved
    }
    onSave(saved)
  }

  return (
    <Modal opened onClose={onClose} title="Variable Information" size="xl" centered>
      <Text size="sm" c="dimmed" mb="md">
        Guess values steer Newton&apos;s method toward a root; leave a guess
        empty to let the solver choose and explore starts automatically.
        Bounds constrain the search space (<Code>-infinity</Code> /{' '}
        <Code>infinity</Code> for unbounded). Units like <Code>kPa</Code> or{' '}
        <Code>kJ/kg-K</Code> enable dimensional checking; <Code>-</Code> means
        dimensionless.
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
              <Table.Th>Uncertainty (Abs)</Table.Th>
              <Table.Th>Uncertainty (Rel %)</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {variables.map((name) => (
              <Table.Tr key={name}>
                <Table.Td ff="monospace" c="teal.4">
                  {name}
                </Table.Td>
                {(['guess', 'lower', 'upper', 'units', 'uncertainty', 'relativeUncertainty'] as const).map((field) => (
                  <Table.Td key={field}>
                    <TextInput
                      size="xs"
                      value={local[name][field] ?? ''}
                      placeholder={field === 'guess' ? 'auto' : undefined}
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
