import { useState } from 'react'
import {
  Alert,
  Badge,
  Button,
  Group,
  Modal,
  Stack,
  Table,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core'
import { curveFit, CurveFitResponse } from './api'
import { formatValue } from './format'

const MONO_INPUT = {
  input: { fontFamily: 'var(--mantine-font-family-monospace)' },
}

function ResultView({ result }: Readonly<{ result: CurveFitResponse }>) {
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
          Fit converged
        </Badge>
        <Text size="xs" c="dimmed">
          {result.iterations} iterations · R² = {formatValue(result.rSquared)} · RMSE ={' '}
          {formatValue(result.rmse)}
        </Text>
      </Group>
      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Parameter</Table.Th>
            <Table.Th>Fitted value</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {result.parameterNames.map((name, i) => (
            <Table.Tr key={name}>
              <Table.Td ff="monospace">{name}</Table.Td>
              <Table.Td ff="monospace" c="green.4">
                {formatValue(result.fittedParameters[i])}
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Stack>
  )
}

interface Props {
  onClose: () => void
}

/**
 * Calculate > Curve Fit: Levenberg-Marquardt least-squares fitting of a model
 * equation's parameters to observed (x, y) data (Story 9.7).
 */
export default function CurveFitModal({ onClose }: Readonly<Props>) {
  const [model, setModel] = useState('y = a * exp(-b * x) + c')
  const [yVariable, setYVariable] = useState('y')
  const [xVariable, setXVariable] = useState('x')
  const [parameters, setParameters] = useState('a, b, c')
  const [data, setData] = useState('')
  const [guesses, setGuesses] = useState('')
  const [running, setRunning] = useState(false)
  const [validation, setValidation] = useState<string | null>(null)
  const [result, setResult] = useState<CurveFitResponse | null>(null)

  function parseData(): { x: number[]; y: number[] } | string {
    const x: number[] = []
    const y: number[] = []
    for (const rawLine of data.split('\n')) {
      const line = rawLine.trim()
      if (line === '') continue
      const parts = line.split(/[,;\s\t]+/).filter((p) => p !== '')
      if (parts.length !== 2) {
        return `Each data line needs exactly two numbers (x y), got: "${line}"`
      }
      const xi = Number(parts[0])
      const yi = Number(parts[1])
      if (!Number.isFinite(xi) || !Number.isFinite(yi)) {
        return `Not a numeric data pair: "${line}"`
      }
      x.push(xi)
      y.push(yi)
    }
    if (x.length < 2) return 'At least two data points are required.'
    return { x, y }
  }

  async function run() {
    setResult(null)
    const paramList = parameters
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p !== '')
    if (model.trim() === '' || yVariable.trim() === '' || xVariable.trim() === '') {
      setValidation('Model equation, dependent and independent variables are required.')
      return
    }
    if (paramList.length === 0) {
      setValidation('List at least one parameter to fit (comma-separated).')
      return
    }
    const parsed = parseData()
    if (typeof parsed === 'string') {
      setValidation(parsed)
      return
    }
    let initialGuess: number[] | undefined
    if (guesses.trim() !== '') {
      const values = guesses.split(',').map((g) => Number(g.trim()))
      if (values.some((v) => !Number.isFinite(v)) || values.length !== paramList.length) {
        setValidation('Initial guesses must be one number per parameter (comma-separated).')
        return
      }
      initialGuess = values
    }
    setValidation(null)
    if (running) return
    setRunning(true)
    try {
      const response = await curveFit({
        model,
        yVariable: yVariable.trim(),
        xVariable: xVariable.trim(),
        parameters: paramList,
        xData: parsed.x,
        yData: parsed.y,
        initialGuess,
      })
      setResult(response)
    } finally {
      setRunning(false)
    }
  }

  return (
    <Modal opened onClose={onClose} title="Curve Fit — Least Squares (Levenberg-Marquardt)" centered size="lg">
      <Text size="sm" c="dimmed" mb="md">
        Fits the model parameters to the observed data by minimizing the sum of
        squared residuals. Enter one data point per line as “x y” (spaces,
        commas, or tabs as separators).
      </Text>

      <Stack gap="sm">
        <TextInput
          label="Model equation"
          description="The dependent variable must appear alone on one side"
          value={model}
          onChange={(e) => setModel(e.currentTarget.value)}
          spellCheck={false}
          styles={MONO_INPUT}
        />
        <Group grow>
          <TextInput
            label="Dependent variable"
            value={yVariable}
            onChange={(e) => setYVariable(e.currentTarget.value)}
            spellCheck={false}
            styles={MONO_INPUT}
          />
          <TextInput
            label="Independent variable"
            value={xVariable}
            onChange={(e) => setXVariable(e.currentTarget.value)}
            spellCheck={false}
            styles={MONO_INPUT}
          />
          <TextInput
            label="Parameters to fit"
            value={parameters}
            onChange={(e) => setParameters(e.currentTarget.value)}
            spellCheck={false}
            styles={MONO_INPUT}
          />
        </Group>
        <Textarea
          label="Data points"
          placeholder={'0.0  5.1\n1.0  3.2\n2.0  2.1\n3.0  1.6'}
          value={data}
          onChange={(e) => setData(e.currentTarget.value)}
          autosize
          minRows={5}
          maxRows={12}
          spellCheck={false}
          styles={MONO_INPUT}
        />
        <TextInput
          label="Initial guesses (optional)"
          description="Comma-separated, one per parameter; defaults to 1"
          value={guesses}
          onChange={(e) => setGuesses(e.currentTarget.value)}
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
            Fit
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
