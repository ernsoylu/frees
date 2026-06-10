import { useEffect, useState } from 'react'
import {
  Accordion,
  Alert,
  Badge,
  Button,
  Checkbox,
  Code,
  Flex,
  Group,
  List,
  Paper,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  Textarea,
  Title,
  Tooltip,
} from '@mantine/core'
import {
  check,
  CheckResponse,
  DEFAULT_STOP_CRITERIA,
  solve,
  SolveResponse,
  StopCriteria,
  UnitSystem,
  VariableInfo,
} from './api'
import PreferencesModal from './PreferencesModal'
import VariableInfoModal, {
  DEFAULT_DRAFT,
  parseBound,
  VariableDraft,
} from './VariableInfoModal'

const STOP_CRITERIA_KEY = 'frees.stopCriteria'
const UNIT_SYSTEM_KEY = 'frees.unitSystem'

function loadUnitSystem(): UnitSystem {
  const raw = localStorage.getItem(UNIT_SYSTEM_KEY)
  return raw === 'ENG_SI' || raw === 'ENGLISH' ? raw : 'SI'
}

const EXAMPLE = `{ Milestone 1 example }
x + y = 3
y = z - 4
z = x^2 - 3`

function loadStopCriteria(): StopCriteria {
  try {
    const raw = localStorage.getItem(STOP_CRITERIA_KEY)
    if (raw) return { ...DEFAULT_STOP_CRITERIA, ...JSON.parse(raw) }
  } catch {
    // Corrupt storage falls back to defaults.
  }
  return DEFAULT_STOP_CRITERIA
}

function formatValue(value: number): string {
  if (value === 0) return '0'
  const abs = Math.abs(value)
  if (abs >= 1e7 || abs < 1e-4) return value.toExponential(6)
  return Number(value.toPrecision(8)).toString()
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Paper withBorder p="xs">
      <Text size="sm" ff="monospace" c="blue.4" truncate>
        {value}
      </Text>
      <Text size="10px" tt="uppercase" c="dimmed" lts="0.05em">
        {label}
      </Text>
    </Paper>
  )
}

export default function App() {
  const [text, setText] = useState(EXAMPLE)
  const [checkResult, setCheckResult] = useState<CheckResponse | null>(null)
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<SolveResponse | null>(null)
  const [solving, setSolving] = useState(false)
  const [solveCount, setSolveCount] = useState(0)
  const [findAll, setFindAll] = useState(false)
  const [stopCriteria, setStopCriteria] = useState<StopCriteria>(loadStopCriteria)
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(loadUnitSystem)
  const [showPreferences, setShowPreferences] = useState(false)
  const [variables, setVariables] = useState<string[]>([])
  const [varDrafts, setVarDrafts] = useState<Record<string, VariableDraft>>({})
  const [showVariableInfo, setShowVariableInfo] = useState(false)

  const checked = checkResult !== null
  const solvable = checkResult?.solvable === true

  function savePreferences(criteria: StopCriteria, system: UnitSystem) {
    setStopCriteria(criteria)
    setUnitSystem(system)
    localStorage.setItem(STOP_CRITERIA_KEY, JSON.stringify(criteria))
    localStorage.setItem(UNIT_SYSTEM_KEY, system)
    setShowPreferences(false)
  }

  function buildVariableInfo(): VariableInfo[] {
    return variables.map((name) => {
      const draft = varDrafts[name] ?? DEFAULT_DRAFT
      return {
        name,
        guess: Number.isFinite(Number(draft.guess)) ? Number(draft.guess) : null,
        lower: parseBound(draft.lower) ?? null,
        upper: parseBound(draft.upper) ?? null,
        units: draft.units.trim() || null,
      }
    })
  }

  function onTextChange(value: string) {
    setText(value)
    // Like EES, any edit invalidates the previous Check; Solve is gated
    // until the system is re-checked.
    setCheckResult(null)
    setResult(null)
  }

  async function onCheck() {
    if (checking) return
    setChecking(true)
    setResult(null)
    try {
      const response = await check(text, buildVariableInfo())
      setCheckResult(response)
      // Sync the Variable Information table: keep edited rows for variables
      // that still exist, add defaults for new ones.
      setVariables(response.variables)
      setVarDrafts((drafts) => {
        const next: Record<string, VariableDraft> = {}
        for (const name of response.variables) {
          next[name] = drafts[name] ?? { ...DEFAULT_DRAFT }
          // EES assigns units to a variable set from an annotated constant
          // (P = 100 [bar]); explicit Variable Info entries win.
          if (!next[name].units.trim() && response.inferredUnits[name]) {
            next[name] = { ...next[name], units: response.inferredUnits[name] }
          }
        }
        return next
      })
    } catch (e) {
      setCheckResult({
        solvable: false,
        equations: 0,
        unknowns: 0,
        variables: [],
        unitWarnings: [],
        inferredUnits: {},
        message: `Could not reach the solver backend: ${String(e)}`,
      })
    } finally {
      setChecking(false)
    }
  }

  async function onSolve() {
    if (solving || !solvable) return
    setSolving(true)
    try {
      const response = await solve(
        text,
        stopCriteria,
        buildVariableInfo(),
        findAll,
        unitSystem,
      )
      setResult(response)
    } catch (e) {
      setResult({
        success: false,
        variables: [],
        blocks: [],
        residuals: [],
        stats: null,
        solutions: [],
        unitWarnings: [],
        error: `Could not reach the solver backend: ${String(e)}`,
      })
    } finally {
      setSolveCount((n) => n + 1)
      setSolving(false)
    }
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'F2') {
        e.preventDefault()
        void onSolve()
      }
      if (e.key === 'F4') {
        e.preventDefault()
        void onCheck()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  const stats = result?.stats ?? null
  const solutions = result?.solutions ?? []

  // One row per variable. With multiple solutions, the value cell shows the
  // set of values across solutions: {2.7016, -3.7016}.
  const baseVariables =
    solutions.length > 0 ? solutions[0].variables : result?.variables ?? []
  const tableRows = baseVariables.map((v) => {
    const values =
      solutions.length > 1
        ? solutions.map(
            (s) => s.variables.find((x) => x.name === v.name)?.value ?? NaN,
          )
        : [v.value]
    const formatted = values.map(formatValue)
    const isSet = new Set(formatted).size > 1
    return {
      name: v.name,
      units: v.units,
      display: isSet ? `{${formatted.join(', ')}}` : formatted[0],
      isSet,
    }
  })

  return (
    <Flex direction="column" p="md" gap="md" style={{ minHeight: '100vh' }}>
      <Group justify="space-between">
        <Group gap="sm" align="baseline">
          <Title order={2} c="blue.4">
            frEES
          </Title>
          <Text c="dimmed" size="sm">
            free Engineering Equation Solver
          </Text>
        </Group>
        <Group gap="xs">
          <Button variant="default" size="xs" onClick={() => setShowVariableInfo(true)}>
            Variable Info
          </Button>
          <Button variant="default" size="xs" onClick={() => setShowPreferences(true)}>
            Preferences
          </Button>
        </Group>
      </Group>

      {showPreferences && (
        <PreferencesModal
          criteria={stopCriteria}
          unitSystem={unitSystem}
          onSave={savePreferences}
          onClose={() => setShowPreferences(false)}
        />
      )}

      {showVariableInfo && (
        <VariableInfoModal
          variables={variables}
          drafts={varDrafts}
          onSave={(drafts) => {
            setVarDrafts(drafts)
            setShowVariableInfo(false)
          }}
          onClose={() => setShowVariableInfo(false)}
        />
      )}

      <Flex
        flex={1}
        gap="md"
        align="stretch"
        direction={{ base: 'column', md: 'row' }}
        style={{ minHeight: 0 }}
      >
        <Flex direction="column" flex={1} miw={0}>
          <Tabs value="equations">
            <Tabs.List>
              <Tabs.Tab value="equations">Equations</Tabs.Tab>
              <Tooltip label="Epic 3 — coming soon">
                <Tabs.Tab value="formatted" disabled>
                  Formatted Equations
                </Tabs.Tab>
              </Tooltip>
              <Tooltip label="Epic 4 — coming soon">
                <Tabs.Tab value="plots" disabled>
                  Plots
                </Tabs.Tab>
              </Tooltip>
              <Tooltip label="Epic 6 — coming soon">
                <Tabs.Tab value="diagram" disabled>
                  Diagram
                </Tabs.Tab>
              </Tooltip>
            </Tabs.List>
          </Tabs>

          <Paper
            withBorder
            p="md"
            mt="xs"
            flex={1}
            display="flex"
            style={{ flexDirection: 'column', minHeight: 0 }}
          >
            <Textarea
              value={text}
              onChange={(e) => onTextChange(e.currentTarget.value)}
              spellCheck={false}
              placeholder={'Enter equations, e.g.\nx + y = 3\ny = z - 4'}
              styles={{
                root: { flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 },
                wrapper: { flex: 1, display: 'flex', minHeight: 0 },
                input: {
                  flex: 1,
                  minHeight: 260,
                  fontFamily: 'var(--mantine-font-family-monospace)',
                  fontSize: 'var(--mantine-font-size-sm)',
                  lineHeight: 1.6,
                },
              }}
            />
          </Paper>

          <Group mt="sm" gap="sm">
            <Button variant="default" onClick={onCheck} loading={checking}>
              Check (F4)
            </Button>
            <Tooltip label={solvable ? 'Solve the system' : 'Run Check first'}>
              <Button onClick={onSolve} loading={solving} disabled={!solvable}>
                Solve (F2)
              </Button>
            </Tooltip>
            <Checkbox
              label="Find all solutions"
              checked={findAll}
              onChange={(e) => setFindAll(e.currentTarget.checked)}
            />

            {checked && (
              <Group gap="xs" style={{ display: 'inline-flex', alignItems: 'center' }}>
                {!result && (
                  <>
                    <Tooltip
                      label={
                        checkResult.unitWarnings.length > 0 ? (
                          <Stack gap={2}>
                            {checkResult.unitWarnings.map((w, i) => (
                              <Text size="xs" key={i}>
                                ⚠ {w}
                              </Text>
                            ))}
                          </Stack>
                        ) : null
                      }
                      disabled={checkResult.unitWarnings.length === 0}
                    >
                      <Badge
                        color={solvable ? (checkResult.unitWarnings.length > 0 ? 'yellow' : 'green') : 'red'}
                        variant="light"
                        leftSection={solvable ? (checkResult.unitWarnings.length > 0 ? '⚠' : '✓') : '✗'}
                        style={{ cursor: checkResult.unitWarnings.length > 0 ? 'help' : 'default' }}
                      >
                        {solvable 
                          ? (checkResult.unitWarnings.length > 0 ? 'Check: Warnings' : 'Check: OK')
                          : 'Check: Errors'}
                      </Badge>
                    </Tooltip>
                    <Text size="xs" c={solvable ? (checkResult.unitWarnings.length > 0 ? 'yellow' : 'green') : 'red'} style={{ fontWeight: 500 }}>
                      {checkResult.message}
                    </Text>
                  </>
                )}

                {result && (
                  <>
                    <Badge
                      color={result.success ? (result.unitWarnings.length > 0 ? 'yellow' : 'green') : 'red'}
                      variant="light"
                      leftSection={result.success ? (result.unitWarnings.length > 0 ? '⚠' : '✓') : '✗'}
                    >
                      {result.success 
                        ? (result.unitWarnings.length > 0 ? 'Solve: Warnings' : 'Solve: OK')
                        : 'Solve: Failed'}
                    </Badge>
                    <Text size="xs" c={result.success ? (result.unitWarnings.length > 0 ? 'yellow' : 'green') : 'red'} style={{ fontWeight: 500 }}>
                      {result.success 
                        ? (result.unitWarnings.length > 0 
                            ? `Solve successful with ${result.unitWarnings.length} unit consistency warning(s)` 
                            : 'Solve successful') 
                        : (result.error || 'Solve failed')}
                    </Text>
                  </>
                )}
              </Group>
            )}
          </Group>
        </Flex>

        <Paper
          withBorder
          p="md"
          w={{ base: '100%', md: 420 }}
          style={{ overflowY: 'auto' }}
        >
          <Group justify="space-between" mb="sm">
            <Title order={4}>Solution</Title>
            {solveCount > 0 && <Badge variant="light">run #{solveCount}</Badge>}
          </Group>

          {result === null && (
            <Text c="dimmed" size="sm">
              Check, then Solve. Results appear here.
            </Text>
          )}

          {result && (
            <Stack gap="sm">
              {stats && (
                <SimpleGrid cols={{ base: 2, xs: 3 }} spacing="xs">
                  <Stat label="equations" value={stats.equations} />
                  <Stat label="unknowns" value={stats.unknowns} />
                  <Stat label="blocks" value={stats.blocks} />
                  <Stat label="iterations" value={stats.iterations} />
                  <Stat label="solutions" value={solutions.length || 1} />
                  <Stat label="solve time" value={`${stats.elapsedMillis} ms`} />
                  <Stat label="max residual" value={formatValue(stats.maxResidual)} />
                </SimpleGrid>
              )}

              {!result.success && (
                <Alert color="red" variant="light">
                  <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                    {result.error}
                  </Text>
                </Alert>
              )}

              {result.success && result.unitWarnings.length > 0 && (
                <Alert
                  color="red"
                  variant="light"
                  p="xs"
                  title="Unit consistency warnings (EES Check Units)"
                >
                  <Stack gap={2}>
                    {result.unitWarnings.map((w, i) => (
                      <Text size="xs" key={i}>
                        {w}
                      </Text>
                    ))}
                  </Stack>
                </Alert>
              )}

              {result.success && (
                <>
                  {solutions.length > 1 && (
                    <Text size="xs" c="dimmed">
                      {solutions.length} solutions found — multi-valued
                      variables are shown as sets, in solution order.
                    </Text>
                  )}

                  <Table striped highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Variable</Table.Th>
                        <Table.Th>Value</Table.Th>
                        <Table.Th>Units</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {tableRows.map((row) => (
                        <Table.Tr key={row.name}>
                          <Table.Td>{row.name}</Table.Td>
                          <Table.Td ff="monospace" c={row.isSet ? 'yellow.4' : 'green.4'}>
                            {row.display}
                          </Table.Td>
                          <Table.Td ff="monospace" c="dimmed">
                            {row.units || '-'}
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>

                  <Accordion variant="contained">
                    <Accordion.Item value="order">
                      <Accordion.Control>
                        <Text size="sm">
                          Calculation order ({result.blocks.length} block
                          {result.blocks.length === 1 ? '' : 's'})
                        </Text>
                      </Accordion.Control>
                      <Accordion.Panel>
                        <List type="ordered" size="sm" spacing={4}>
                          {result.blocks.map((b) => (
                            <List.Item key={b.index}>
                              solves <strong>{b.variables.join(', ')}</strong> from{' '}
                              <Code>{b.equations.join(' ; ')}</Code>
                            </List.Item>
                          ))}
                        </List>
                      </Accordion.Panel>
                    </Accordion.Item>
                  </Accordion>
                </>
              )}
            </Stack>
          )}
        </Paper>
      </Flex>
    </Flex>
  )
}
