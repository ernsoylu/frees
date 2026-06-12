import { useState } from 'react'
import {
  Alert,
  Badge,
  Button,
  Group,
  Modal,
  MultiSelect,
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
  OptimizeMethod,
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

const METHOD_OPTIONS = [
  { value: 'brent', label: "Brent (1-D)" },
  { value: 'nelder-mead', label: 'Nelder-Mead Simplex' },
  { value: 'bobyqa', label: 'BOBYQA' },
]

interface Bounds {
  lower: string
  upper: string
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
      {result.decisions.map((d) => (
        <OptimumLine key={d.name} label="At" variable={d} />
      ))}
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

/**
 * Calculate > Min/Max: optimization of an objective variable over one or more
 * independent variables. Brent's method for 1-D, Nelder-Mead Simplex or BOBYQA
 * for multi-variable, with optional barrier/Lagrangian constraints.
 */
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
  const [decisions, setDecisions] = useState<string[]>([])
  const [bounds, setBounds] = useState<Record<string, Bounds>>({})
  const [method, setMethod] = useState<OptimizeMethod>('brent')
  const [constraints, setConstraints] = useState('')
  const [running, setRunning] = useState(false)
  const [validation, setValidation] = useState<string | null>(null)
  const [result, setResult] = useState<OptimizeResponse | null>(null)

  function onDecisionsChange(selected: string[]) {
    setDecisions(selected)
    setBounds((prev) => {
      const next: Record<string, Bounds> = {}
      for (const name of selected) {
        next[name] = prev[name] ?? { lower: '', upper: '' }
      }
      return next
    })
    // Brent is 1-D only; switch to Simplex when a second variable is added.
    if (selected.length > 1 && method === 'brent') {
      setMethod('nelder-mead')
    }
    if (selected.length === 1) {
      setMethod('brent')
    }
  }

  function setBound(name: string, key: keyof Bounds, value: string) {
    setBounds((prev) => ({ ...prev, [name]: { ...prev[name], [key]: value } }))
  }

  function constraintLines(): string[] {
    return constraints
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line !== '')
  }

  function validate(): string | null {
    if (objective === null) {
      return 'Choose an objective variable.'
    }
    if (decisions.length === 0) {
      return 'Choose at least one independent variable.'
    }
    if (decisions.includes(objective)) {
      return 'The objective cannot also be an independent variable.'
    }
    for (const name of decisions) {
      const b = bounds[name]
      const lo = Number(b?.lower)
      const hi = Number(b?.upper)
      if (
        !b ||
        b.lower.trim() === '' ||
        b.upper.trim() === '' ||
        !Number.isFinite(lo) ||
        !Number.isFinite(hi)
      ) {
        return `Both bounds of ${name} must be numbers.`
      }
      if (lo >= hi) {
        return `The lower bound of ${name} must be less than the upper bound.`
      }
    }
    if (method === 'brent' && decisions.length > 1) {
      return "Brent's method is 1-D only; pick Nelder-Mead or BOBYQA."
    }
    for (const line of constraintLines()) {
      if (!/(<=|>=|=)/.test(line)) {
        return `Constraint "${line}" needs <=, >= or = followed by a number.`
      }
    }
    return null
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
          decisions,
          lowers: decisions.map((name) => Number(bounds[name].lower)),
          uppers: decisions.map((name) => Number(bounds[name].upper)),
          method,
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
        decisions: [],
        evaluations: 0,
        variables: [],
      })
    } finally {
      setRunning(false)
    }
  }

  return (
    <Modal opened onClose={onClose} title="Min/Max — Optimization" centered size="md">
      <Text size="sm" c="dimmed" mb="md">
        Finds the values of the independent variables inside their bounds that
        minimize or maximize the objective. The system is solved for every
        candidate point, so it must have one degree of freedom per independent
        variable before they are fixed.
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
        <MultiSelect
          label="Independent (varied) variables"
          data={variables.filter((v) => v !== objective)}
          value={decisions}
          onChange={onDecisionsChange}
          placeholder={decisions.length === 0 ? 'variables to vary' : undefined}
          searchable
          clearable
        />

        {decisions.length > 0 && (
          <Table withRowBorders={false} verticalSpacing={4}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Variable</Table.Th>
                <Table.Th>Lower bound</Table.Th>
                <Table.Th>Upper bound</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {decisions.map((name) => (
                <Table.Tr key={name}>
                  <Table.Td ff="monospace">{name}</Table.Td>
                  <Table.Td>
                    <TextInput
                      value={bounds[name]?.lower ?? ''}
                      onChange={(e) => setBound(name, 'lower', e.currentTarget.value)}
                      spellCheck={false}
                      size="xs"
                      styles={MONO_INPUT}
                      aria-label={`Lower bound of ${name}`}
                    />
                  </Table.Td>
                  <Table.Td>
                    <TextInput
                      value={bounds[name]?.upper ?? ''}
                      onChange={(e) => setBound(name, 'upper', e.currentTarget.value)}
                      spellCheck={false}
                      size="xs"
                      styles={MONO_INPUT}
                      aria-label={`Upper bound of ${name}`}
                    />
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}

        <Select
          label="Method"
          description={
            decisions.length > 1
              ? "Brent's method only works with a single independent variable."
              : undefined
          }
          data={METHOD_OPTIONS.map((option) => ({
            ...option,
            disabled: option.value === 'brent' && decisions.length > 1,
          }))}
          value={method}
          onChange={(value) => setMethod((value as OptimizeMethod) ?? 'brent')}
          allowDeselect={false}
        />

        <Textarea
          label="Constraints (optional)"
          description="One per line: expr <= value, expr >= value, or expr = value. Inequalities use a log-barrier, equalities an augmented Lagrangian."
          placeholder={'r + h <= 20'}
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
