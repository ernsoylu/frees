import { useState } from 'react'
import {
  Alert,
  Badge,
  Button,
  Group,
  Modal,
  SegmentedControl,
  Select,
  Stack,
  Table,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core'
import {
  optimize,
  OptimizeResponse,
  StopCriteria,
  UnitSystem,
  VariableInfo,
  VariableResult,
} from './api'
import { formatValue } from './format'

const MONO_INPUT = {
  input: { fontFamily: 'var(--mantine-font-family-monospace)' },
}

function OptimumLine({
  label,
  variable,
}: Readonly<{ label: string; variable: VariableResult | null }>) {
  if (variable === null) return null
  return (
    <Group gap="xs">
      <Text size="sm" c="dimmed" w={90}>
        {label}
      </Text>
      <Text size="sm" ff="monospace" c="green.4">
        {variable.name} = {formatValue(variable.value)}
      </Text>
      <Text size="sm" ff="monospace" c="dimmed">
        {variable.units || ''}
      </Text>
    </Group>
  )
}

function ResultView({ result }: Readonly<{ result: OptimizeResponse }>) {
  if (!result.success) {
    return (
      <Alert color="red" variant="light" p="xs">
        <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
          {result.error}
        </Text>
      </Alert>
    )
  }
  return (
    <Stack gap="xs">
      <Group gap="xs">
        <Badge color="green" variant="light" leftSection="✓">
          Optimum found
        </Badge>
        <Text size="xs" c="dimmed">
          {result.evaluations} objective evaluations
        </Text>
      </Group>
      <OptimumLine label="Objective" variable={result.objective} />
      <OptimumLine label="At" variable={result.decision} />
      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Variable</Table.Th>
            <Table.Th>Value</Table.Th>
            <Table.Th>Units</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {result.variables.map((v) => (
            <Table.Tr key={v.name}>
              <Table.Td>{v.name}</Table.Td>
              <Table.Td ff="monospace" c="green.4">
                {formatValue(v.value)}
              </Table.Td>
              <Table.Td ff="monospace" c="dimmed">
                {v.units || '-'}
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Stack>
  )
}

interface Props {
  variables: string[]
  text: string
  stopCriteria: StopCriteria
  complexMode: boolean
  variableInfo: VariableInfo[]
  unitSystem: UnitSystem
  onClose: () => void
}

/** Calculate > Min/Max: 1-D optimization over one independent variable. */
export default function MinMaxModal({
  variables,
  text,
  stopCriteria,
  complexMode,
  variableInfo,
  unitSystem,
  onClose,
}: Readonly<Props>) {
  const [goal, setGoal] = useState<'minimize' | 'maximize'>('minimize')
  const [objective, setObjective] = useState<string | null>(null)
  const [decision, setDecision] = useState<string | null>(null)
  const [lower, setLower] = useState('')
  const [upper, setUpper] = useState('')
  const [constraints, setConstraints] = useState('')
  const [running, setRunning] = useState(false)
  const [validation, setValidation] = useState<string | null>(null)
  const [result, setResult] = useState<OptimizeResponse | null>(null)

  function validate(): string | null {
    if (objective === null || decision === null) {
      return 'Choose both an objective and an independent variable.'
    }
    if (objective === decision) {
      return 'The objective and the independent variable must differ.'
    }
    const lo = Number(lower)
    const hi = Number(upper)
    if (lower.trim() === '' || upper.trim() === '' || !Number.isFinite(lo) || !Number.isFinite(hi)) {
      return 'Both bounds must be numbers.'
    }
    if (lo >= hi) {
      return 'The lower bound must be less than the upper bound.'
    }
    for (const line of constraintLines()) {
      if (!/(<=|>=|=)/.test(line)) {
        return `Constraint "${line}" needs <=, >= or = followed by a number.`
      }
    }
    return null
  }

  function constraintLines(): string[] {
    return constraints
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line !== '')
  }

  async function run() {
    const problem = validate()
    setValidation(problem)
    setResult(null)
    if (problem !== null || running) return
    setRunning(true)
    try {
      const response = await optimize(
        text,
        { ...stopCriteria, complexMode },
        variableInfo,
        unitSystem,
        {
          objective: objective ?? '',
          decision: decision ?? '',
          lower: Number(lower),
          upper: Number(upper),
          maximize: goal === 'maximize',
          constraints: constraintLines(),
        },
      )
      setResult(response)
    } catch (e) {
      setResult({
        success: false,
        error: `Could not reach the solver backend: ${String(e)}`,
        objective: null,
        decision: null,
        evaluations: 0,
        variables: [],
      })
    } finally {
      setRunning(false)
    }
  }

  return (
    <Modal opened onClose={onClose} title="Min/Max — 1-D Optimization" centered size="md">
      <Text size="sm" c="dimmed" mb="md">
        Finds the value of the independent variable inside the bounds that
        minimizes or maximizes the objective (Brent's method). The system is
        solved for every candidate value, so it must have one degree of
        freedom before fixing the independent variable.
      </Text>

      <Stack gap="sm">
        <SegmentedControl
          value={goal}
          onChange={(value) => setGoal(value as 'minimize' | 'maximize')}
          data={[
            { label: 'Minimize', value: 'minimize' },
            { label: 'Maximize', value: 'maximize' },
          ]}
        />
        <Select
          label="Objective variable"
          data={variables}
          value={objective}
          onChange={setObjective}
          placeholder="variable to optimize"
          searchable
        />
        <Select
          label="Independent (varied) variable"
          data={variables}
          value={decision}
          onChange={setDecision}
          placeholder="variable to vary"
          searchable
        />
        <Group grow>
          <TextInput
            label="Lower bound"
            value={lower}
            onChange={(e) => setLower(e.currentTarget.value)}
            spellCheck={false}
            styles={MONO_INPUT}
          />
          <TextInput
            label="Upper bound"
            value={upper}
            onChange={(e) => setUpper(e.currentTarget.value)}
            spellCheck={false}
            styles={MONO_INPUT}
          />
        </Group>
        <Textarea
          label="Constraints (optional)"
          description="One per line: expr <= value, expr >= value, or expr = value. Inequalities use a log-barrier, equalities an augmented Lagrangian."
          placeholder={'x + y <= 10\nx * y = 4'}
          value={constraints}
          onChange={(e) => setConstraints(e.currentTarget.value)}
          autosize
          minRows={2}
          maxRows={6}
          spellCheck={false}
          styles={MONO_INPUT}
        />

        {validation && (
          <Text c="red" size="sm">
            {validation}
          </Text>
        )}

        {result && <ResultView result={result} />}

        <Group justify="flex-end" mt="xs">
          <Button variant="default" onClick={onClose}>
            Close
          </Button>
          <Button onClick={run} loading={running}>
            {goal === 'maximize' ? 'Maximize' : 'Minimize'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
