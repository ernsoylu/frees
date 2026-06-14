import { useState, useEffect } from 'react'
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
  Select,
  SegmentedControl,
} from '@mantine/core'
import { curveFit, CurveFitResponse } from './api'
import { formatValue } from './format'
import { TableSpec } from './tables'

const MONO_INPUT = {
  input: { fontFamily: 'var(--mantine-font-family-monospace)' },
}

interface FitTemplate {
  name: string
  equation: string
  yVariable: string
  xVariable: string
  parameters: string
}

const FIT_TEMPLATES: FitTemplate[] = [
  {
    name: 'Linear (y = a * x + b)',
    equation: 'y = a * x + b',
    yVariable: 'y',
    xVariable: 'x',
    parameters: 'a, b',
  },
  {
    name: 'Quadratic (y = a * x^2 + b * x + c)',
    equation: 'y = a * x^2 + b * x + c',
    yVariable: 'y',
    xVariable: 'x',
    parameters: 'a, b, c',
  },
  {
    name: 'Cubic (y = a * x^3 + b * x^2 + c * x + d)',
    equation: 'y = a * x^3 + b * x^2 + c * x + d',
    yVariable: 'y',
    xVariable: 'x',
    parameters: 'a, b, c, d',
  },
  {
    name: 'Exponential (y = a * exp(b * x))',
    equation: 'y = a * exp(b * x)',
    yVariable: 'y',
    xVariable: 'x',
    parameters: 'a, b',
  },
  {
    name: 'Exponential with offset (y = a * exp(b * x) + c)',
    equation: 'y = a * exp(b * x) + c',
    yVariable: 'y',
    xVariable: 'x',
    parameters: 'a, b, c',
  },
  {
    name: 'Logarithmic (y = a * ln(x) + b)',
    equation: 'y = a * ln(x) + b',
    yVariable: 'y',
    xVariable: 'x',
    parameters: 'a, b',
  },
  {
    name: 'Power (y = a * x^b)',
    equation: 'y = a * x^b',
    yVariable: 'y',
    xVariable: 'x',
    parameters: 'a, b',
  },
  {
    name: 'Power with offset (y = a * x^b + c)',
    equation: 'y = a * x^b + c',
    yVariable: 'y',
    xVariable: 'x',
    parameters: 'a, b, c',
  },
]

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
  tables?: TableSpec[]
  defaultTableId?: string | null
  onClose: () => void
}

/**
 * Calculate > Curve Fit: Levenberg-Marquardt least-squares fitting of a model
 * equation's parameters to observed (x, y) data (Story 9.7).
 */
export default function CurveFitModal({ tables = [], defaultTableId, onClose }: Readonly<Props>) {
  const [templateKey, setTemplateKey] = useState<string>('custom')
  const [model, setModel] = useState('y = a * exp(-b * x) + c')
  const [yVariable, setYVariable] = useState('y')
  const [xVariable, setXVariable] = useState('x')
  const [parameters, setParameters] = useState('a, b, c')
  const [guesses, setGuesses] = useState('')
  const [running, setRunning] = useState(false)
  const [validation, setValidation] = useState<string | null>(null)
  const [result, setResult] = useState<CurveFitResponse | null>(null)

  // Table selection states
  const [dataMode, setDataMode] = useState<'manual' | 'table'>('manual')
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null)
  const [xColumnName, setXColumnName] = useState<string>('')
  const [yColumnName, setYColumnName] = useState<string>('')
  const [data, setData] = useState('')

  useEffect(() => {
    if (defaultTableId && tables.length > 0) {
      const table = tables.find((t) => t.id === defaultTableId)
      if (table) {
        setSelectedTableId(defaultTableId)
        setDataMode('table')
        if (table.kind === 'parametric') {
          const vars = table.vars
          setXColumnName(vars[0] || '')
          setYColumnName(vars[1] || vars[0] || '')
        } else {
          setXColumnName(table.argName || 'x')
          setYColumnName('0')
        }
      }
    }
  }, [defaultTableId, tables])

  function handleTemplateChange(val: string | null) {
    const key = val || 'custom'
    setTemplateKey(key)
    if (key === 'custom') return
    const found = FIT_TEMPLATES.find((t) => t.name === key)
    if (found) {
      setModel(found.equation)
      setYVariable(found.yVariable)
      setXVariable(found.xVariable)
      setParameters(found.parameters)
    }
  }

  function handleTableChange(tableId: string | null) {
    setSelectedTableId(tableId)
    if (!tableId) return
    const table = tables.find((t) => t.id === tableId)
    if (!table) return
    if (table.kind === 'parametric') {
      const vars = table.vars
      setXColumnName(vars[0] || '')
      setYColumnName(vars[1] || vars[0] || '')
    } else {
      setXColumnName(table.argName || 'x')
      setYColumnName('0')
    }
  }

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

  function extractDataFromTable(): { x: number[]; y: number[] } | string {
    if (!selectedTableId) return 'No table selected.'
    const table = tables.find((t) => t.id === selectedTableId)
    if (!table) return 'Selected table not found.'

    const x: number[] = []
    const y: number[] = []

    if (table.kind === 'parametric') {
      if (!xColumnName || !yColumnName) {
        return 'Please select both X and Y columns.'
      }
      for (const row of table.rows) {
        const xValRaw = row.values[xColumnName]
        const yValRaw = row.values[yColumnName]
        if (xValRaw === undefined || yValRaw === undefined) continue
        const xi = Number(xValRaw.trim())
        const yi = Number(yValRaw.trim())
        if (xValRaw.trim() === '' || yValRaw.trim() === '' || !Number.isFinite(xi) || !Number.isFinite(yi)) {
          continue
        }
        x.push(xi)
        y.push(yi)
      }
    } else {
      const yColIndex = Number(yColumnName)
      if (isNaN(yColIndex) || yColIndex < 0 || yColIndex >= table.columns.length) {
        return 'Please select a valid Y column.'
      }

      for (const row of table.rows) {
        const xValRaw = row.x
        const yValRaw = row.ys[yColIndex]
        if (xValRaw === undefined || yValRaw === undefined) continue
        const xi = Number(xValRaw.trim())
        const yi = Number(yValRaw.trim())
        if (xValRaw.trim() === '' || yValRaw.trim() === '' || !Number.isFinite(xi) || !Number.isFinite(yi)) {
          continue
        }
        x.push(xi)
        y.push(yi)
      }
    }

    if (x.length < 2) {
      return 'Selected table columns must contain at least two numeric data points.'
    }
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
    const parsed = dataMode === 'manual' ? parseData() : extractDataFromTable()
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
    }  catch (err) {
      setResult({
        success: false,
        error: String(err),
        fittedParameters: [],
        parameterNames: [],
        rSquared: 0,
        rmse: 0,
        iterations: 0,
        residuals: [],
        fittedValues: [],
      })
    } finally {
      setRunning(false)
    }
  }

  return (
    <Modal opened onClose={onClose} title="Curve Fit — Least Squares (Levenberg-Marquardt)" centered size="xl">
      <Text size="sm" c="dimmed" mb="md">
        Fits the model parameters to the observed data by minimizing the sum of
        squared residuals. Choose an equation template (or write your own custom one)
        and select the data source.
      </Text>

      <Stack gap="sm">
        <Select
          label="Model equation template"
          placeholder="Select a template or write custom"
          data={[
            { value: 'custom', label: 'Custom equation' },
            ...FIT_TEMPLATES.map((t) => ({ value: t.name, label: t.name })),
          ]}
          value={templateKey}
          onChange={handleTemplateChange}
          allowDeselect={false}
        />

        <TextInput
          label="Model equation"
          description="The dependent variable must appear alone on one side"
          value={model}
          onChange={(e) => {
            setModel(e.currentTarget.value)
            setTemplateKey('custom')
          }}
          spellCheck={false}
          styles={MONO_INPUT}
        />
        <Group grow>
          <TextInput
            label="Dependent variable"
            value={yVariable}
            onChange={(e) => {
              setYVariable(e.currentTarget.value)
              setTemplateKey('custom')
            }}
            spellCheck={false}
            styles={MONO_INPUT}
          />
          <TextInput
            label="Independent variable"
            value={xVariable}
            onChange={(e) => {
              setXVariable(e.currentTarget.value)
              setTemplateKey('custom')
            }}
            spellCheck={false}
            styles={MONO_INPUT}
          />
          <TextInput
            label="Parameters to fit"
            value={parameters}
            onChange={(e) => {
              setParameters(e.currentTarget.value)
              setTemplateKey('custom')
            }}
            spellCheck={false}
            styles={MONO_INPUT}
          />
        </Group>

        {tables && tables.length > 0 && (
          <Group justify="space-between" align="center" mt="xs">
            <Text size="sm" fw={500}>Data points source</Text>
            <SegmentedControl
              value={dataMode}
              onChange={(v) => {
                setDataMode(v as 'manual' | 'table')
                setValidation(null)
              }}
              data={[
                { value: 'manual', label: 'Enter manually' },
                { value: 'table', label: 'Select from table' },
              ]}
            />
          </Group>
        )}

        {dataMode === 'manual' ? (
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
        ) : (
          <Stack gap="xs">
            <Select
              label="Select Table"
              placeholder="Choose a table..."
              data={tables.map((t) => ({
                value: t.id,
                label: t.name + (t.kind === 'parametric' ? ' (Parametric)' : ' (Function)'),
              }))}
              value={selectedTableId}
              onChange={handleTableChange}
              allowDeselect={false}
            />

            {selectedTableId && (() => {
              const table = tables.find((t) => t.id === selectedTableId)
              if (!table) return null

              if (table.kind === 'parametric') {
                return (
                  <Group grow>
                    <Select
                      label="X Column (Independent)"
                      data={table.vars.map((v) => ({ value: v, label: v }))}
                      value={xColumnName}
                      onChange={(v) => v && setXColumnName(v)}
                      allowDeselect={false}
                    />
                    <Select
                      label="Y Column (Dependent)"
                      data={table.vars.map((v) => ({ value: v, label: v }))}
                      value={yColumnName}
                      onChange={(v) => v && setYColumnName(v)}
                      allowDeselect={false}
                    />
                  </Group>
                )
              } else {
                const yCols = table.columns.map((col, idx) => ({
                  value: String(idx),
                  label: table.is1D ? 'y' : (table.paramName ? `${table.paramName} = ${col}` : `Col ${idx + 1} (${col})`),
                }))
                return (
                  <Group grow>
                    <TextInput
                      label="X Column (Independent)"
                      value={table.argName || 'x'}
                      readOnly
                      disabled
                    />
                    <Select
                      label="Y Column (Dependent)"
                      data={yCols}
                      value={yColumnName}
                      onChange={(v) => v && setYColumnName(v)}
                      allowDeselect={false}
                    />
                  </Group>
                )
              }
            })()}

            {selectedTableId && (() => {
              const parsed = extractDataFromTable()
              if (typeof parsed === 'string') {
                return (
                  <Text c="orange" size="xs">
                    {parsed}
                  </Text>
                )
              }
              return (
                <Group gap="xs">
                  <Badge color="blue" variant="light">
                    ✓ Extracted {parsed.x.length} data points
                  </Badge>
                  <Text size="xs" c="dimmed" style={{ maxWidth: '450px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Points: {parsed.x.map((xi, idx) => `(${xi}, ${parsed.y[idx]})`).join(', ')}
                  </Text>
                </Group>
              )
            })()}
          </Stack>
        )}

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
