import { useEffect, useState } from 'react'
import {
  Button,
  Flex,
  Group,
  Paper,
  Stack,
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
  solveTable,
  SolveResponse,
  StopCriteria,
  TableRowResult,
  TableStats,
  UnitSystem,
  VariableInfo,
} from './api'
import PreferencesModal from './PreferencesModal'
import VariableInfoModal, {
  DEFAULT_DRAFT,
  parseBound,
  VariableDraft,
} from './VariableInfoModal'
import Latex from './Latex'
import MinMaxModal from './MinMaxModal'
import ConfigureTableModal from './ConfigureTableModal'
import AlterValuesModal from './AlterValuesModal'
import ParametricTableTab, { newParamRow, ParamRow } from './ParametricTableTab'
import PlotTab from './PlotTab'
import StatesTab from './StatesTab'
import { PlotSpec } from './plots/types'
import SolutionPanel from './SolutionPanel'
import { EquationActionBar, TableActionBar } from './ActionBars'
import {
  buildComplexSolutionRows,
  buildRealSolutionRows,
  withStableKeys,
} from './format'

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
    if (raw) {
      const { complexMode: _ignored, ...rest } = JSON.parse(raw)
      return { ...DEFAULT_STOP_CRITERIA, ...rest }
    }
  } catch {
    // Corrupt storage falls back to defaults.
  }
  return DEFAULT_STOP_CRITERIA
}

function FormattedEquationsView({ equations }: Readonly<{ equations: string[] }>) {
  if (equations.length === 0) {
    return (
      <Stack gap="sm" style={{ overflowY: 'auto', flex: 1 }}>
        <Text size="sm" c="dimmed" style={{ fontStyle: 'italic' }}>
          No equations compiled. Click "Check" (F4) or "Solve" (F2) to compile.
        </Text>
      </Stack>
    )
  }
  return (
    <Stack gap="sm" style={{ overflowY: 'auto', flex: 1 }}>
      {withStableKeys(equations).map((eq) => (
        <Paper
          key={eq.key}
          withBorder
          p="sm"
          style={{ display: 'flex', justifyContent: 'center' }}
        >
          <Latex math={eq.value} block />
        </Paper>
      ))}
    </Stack>
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
  const [complexMode, setComplexMode] = useState(false)
  const [solvedComplexMode, setSolvedComplexMode] = useState(false)
  const [stopCriteria, setStopCriteria] = useState<StopCriteria>(loadStopCriteria)
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(loadUnitSystem)
  const [showPreferences, setShowPreferences] = useState(false)
  const [variables, setVariables] = useState<string[]>([])
  const [varDrafts, setVarDrafts] = useState<Record<string, VariableDraft>>({})
  const [showVariableInfo, setShowVariableInfo] = useState(false)
  const [showMinMax, setShowMinMax] = useState(false)
  const [activeTab, setActiveTab] = useState<string>('equations')
  const [tableVars, setTableVars] = useState<string[]>([])
  const [paramRows, setParamRows] = useState<ParamRow[]>(() => [
    newParamRow(),
    newParamRow(),
    newParamRow(),
  ])
  const [tableResults, setTableResults] = useState<TableRowResult[]>([])
  const [tableSolving, setTableSolving] = useState(false)
  const [showConfigureTable, setShowConfigureTable] = useState(false)
  const [alterColumn, setAlterColumn] = useState<string | null>(null)
  const [tableCheckResult, setTableCheckResult] = useState<CheckResponse | null>(null)
  const [tableCheckMessage, setTableCheckMessage] = useState('')
  const [tableChecking, setTableChecking] = useState(false)
  const [tableStats, setTableStats] = useState<TableStats | null>(null)
  const [plots, setPlots] = useState<PlotSpec[]>([])

  const solvable = checkResult?.solvable === true

  function savePreferences(criteria: StopCriteria, system: UnitSystem) {
    // Never persist complexMode inside stopCriteria — it is a separate toggle
    const { complexMode: _ignored, ...persistable } = criteria
    setStopCriteria(persistable)
    setUnitSystem(system)
    localStorage.setItem(STOP_CRITERIA_KEY, JSON.stringify(persistable))
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
    // until the system is re-checked. Table checks depend on the same text.
    setCheckResult(null)
    setResult(null)
    invalidateTable()
  }

  async function onCheck() {
    if (checking) return
    setChecking(true)
    setResult(null)
    try {
      const response = await check(text, buildVariableInfo(), complexMode)
      setCheckResult(response)
      // Sync the Variable Information table: keep edited rows for variables
      // that still exist, add defaults for new ones.
      setVariables(response.variables)
      setVarDrafts((drafts) => {
        const next: Record<string, VariableDraft> = {}
        for (const name of response.variables) {
          const existing = drafts[name] ?? { ...DEFAULT_DRAFT }
          next[name] = { ...existing }
          // Automatically inferred units are dynamic: if they are not explicitly
          // configured by the user, we update/sync them with the newly inferred ones.
          if (!existing.isUnitsUserSet) {
            next[name].units = response.inferredUnits[name] ?? ''
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
        formattedEquations: [],
      })
    } finally {
      setChecking(false)
    }
  }

  function invalidateTable() {
    setTableResults([])
    setTableStats(null)
    setTableCheckResult(null)
    setTableCheckMessage('')
  }

  function setTableCell(rowIndex: number, name: string, value: string) {
    setParamRows((rows) =>
      rows.map((row, i) =>
        i === rowIndex ? { ...row, values: { ...row.values, [name]: value } } : row,
      ),
    )
    invalidateTable()
  }

  function setColumnUnits(name: string, units: string) {
    setVarDrafts((drafts) => ({
      ...drafts,
      [name]: {
        ...(drafts[name] ?? { ...DEFAULT_DRAFT }),
        units,
        isUnitsUserSet: units.trim() !== '',
      },
    }))
    invalidateTable()
  }

  /** Table columns that have at least one usable numeric input value. */
  function filledTableColumns(): Map<string, number> {
    const filled = new Map<string, number>()
    for (const name of tableVars) {
      for (const row of paramRows) {
        const raw = (row.values[name] ?? '').trim()
        if (raw !== '' && Number.isFinite(Number(raw))) {
          filled.set(name, Number(raw))
          break
        }
      }
    }
    return filled
  }

  async function onCheckTable() {
    if (tableChecking) return
    setTableChecking(true)
    setTableResults([])
    try {
      // Check the augmented system: the equations plus one representative
      // fixed value per table input column (EES table semantics).
      const filled = filledTableColumns()
      let augmented = text
      for (const [name, value] of filled) {
        augmented += `\n${name} = ${value}`
      }
      const response = await check(augmented, buildVariableInfo(), complexMode)
      setTableCheckResult(response)

      // Sync variable list and units so the column headers show units for
      // calculated variables too (inferred + dimensionally derived).
      if (response.variables.length > 0) {
        setVariables(response.variables)
        setVarDrafts((drafts) => {
          const next: Record<string, VariableDraft> = { ...drafts }
          for (const name of response.variables) {
            const existing = next[name] ?? { ...DEFAULT_DRAFT }
            next[name] = { ...existing }
            if (!existing.isUnitsUserSet) {
              next[name].units = response.inferredUnits[name] ?? existing.units ?? ''
            }
          }
          return next
        })
      }

      if (response.solvable) {
        setTableCheckMessage(
          `Table check passed: ${response.equations} equations and ` +
            `${response.unknowns} variables, with ${filled.size} value(s) ` +
            `supplied by the table.`,
        )
      } else {
        const unfilledColumns = tableVars.filter((v) => !filled.has(v))
        const hint =
          unfilledColumns.length > 0
            ? ` Fill input values for: ${unfilledColumns.join(', ')} (or use the column fill).`
            : ' Add the missing variables as table columns via Configure Columns, or fix the equations.'
        setTableCheckMessage(response.message + hint)
      }
    } catch (e) {
      setTableCheckResult(null)
      setTableCheckMessage(`Could not reach the solver backend: ${String(e)}`)
    } finally {
      setTableChecking(false)
    }
  }

  async function onSolveTable() {
    if (tableSolving || tableVars.length === 0) return
    if (tableCheckResult?.solvable !== true) return
    setTableSolving(true)
    try {
      // Non-empty cells become fixed inputs for that run; blank cells are
      // solved per row (EES Solve Table semantics).
      const rows = paramRows.map((row) => {
        const fixed: Record<string, number> = {}
        for (const name of tableVars) {
          const raw = (row.values[name] ?? '').trim()
          if (raw !== '') {
            const value = Number(raw)
            if (Number.isFinite(value)) fixed[name] = value
          }
        }
        return fixed
      })
      const response = await solveTable(
        text,
        { ...stopCriteria, complexMode },
        buildVariableInfo(),
        unitSystem,
        tableVars,
        rows,
      )
      setTableResults(response.results)
      setTableStats(response.stats)
    } catch (e) {
      setTableStats(null)
      setTableResults(
        paramRows.map(() => ({
          success: false,
          values: {},
          error: `Could not reach the solver backend: ${String(e)}`,
        })),
      )
    } finally {
      setTableSolving(false)
    }
  }

  async function onSolve() {
    if (solving || !solvable) return
    setSolving(true)
    try {
      const response = await solve(
        text,
        { ...stopCriteria, complexMode },
        buildVariableInfo(),
        findAll,
        unitSystem,
      )
      setSolvedComplexMode(complexMode)
      setResult(response)
      if (response.success && response.variables) {
        setVarDrafts((drafts) => {
          const next = { ...drafts }
          for (const v of response.variables) {
            const name = v.name
            const existing = next[name] ?? { ...DEFAULT_DRAFT }
            if (!existing.isUnitsUserSet) {
              next[name] = { ...existing, units: v.units || '' }
            }
          }
          return next
        })
      }
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
        formattedEquations: [],
      })
    } finally {
      setSolveCount((n) => n + 1)
      setSolving(false)
    }
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Shortcuts act on the active section: equations vs parametric table.
      if (e.key === 'F2') {
        e.preventDefault()
        void (activeTab === 'table' ? onSolveTable() : onSolve())
      }
      if (e.key === 'F4') {
        e.preventDefault()
        void (activeTab === 'table' ? onCheckTable() : onCheck())
      }
    }
    globalThis.addEventListener('keydown', onKeyDown)
    return () => globalThis.removeEventListener('keydown', onKeyDown)
  })

  const solutions = result?.solutions ?? []
  const formattedEqs = result?.formattedEquations ?? checkResult?.formattedEquations ?? []

  const baseVariables =
    solutions.length > 0 ? solutions[0].variables : result?.variables ?? []

  // Use the mode that was active when the result was solved, not the live checkbox
  const resultIsComplex = result !== null && solvedComplexMode
  const solutionRows = resultIsComplex
    ? buildComplexSolutionRows(baseVariables, solutions)
    : buildRealSolutionRows(baseVariables, solutions)

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
          <Button variant="default" size="xs" onClick={() => setShowMinMax(true)}>
            Min/Max
          </Button>
          <Button variant="default" size="xs" onClick={() => setShowPreferences(true)}>
            Preferences
          </Button>
          <Button variant="default" size="xs" component="a" href="/help" target="_blank">
            Help
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

      {alterColumn && (
        <AlterValuesModal
          variable={alterColumn}
          rowCount={paramRows.length}
          initialFirst={paramRows[0]?.values[alterColumn] ?? ''}
          initialLast={paramRows[paramRows.length - 1]?.values[alterColumn] ?? ''}
          onApply={(values) => {
            setParamRows((rows) =>
              rows.map((row, i) => ({
                ...row,
                values: { ...row.values, [alterColumn]: String(values[i]) },
              })),
            )
            invalidateTable()
            setAlterColumn(null)
          }}
          onClose={() => setAlterColumn(null)}
        />
      )}

      {showConfigureTable && (
        <ConfigureTableModal
          variables={variables}
          selected={tableVars}
          onSave={(selected) => {
            setTableVars(selected)
            invalidateTable()
            setShowConfigureTable(false)
          }}
          onClose={() => setShowConfigureTable(false)}
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

      {showMinMax && (
        <MinMaxModal
          variables={variables}
          text={text}
          stopCriteria={stopCriteria}
          complexMode={complexMode}
          variableInfo={buildVariableInfo()}
          unitSystem={unitSystem}
          onClose={() => setShowMinMax(false)}
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
          <Tabs value={activeTab} onChange={(val) => val && setActiveTab(val)}>
            <Tabs.List>
              <Tabs.Tab value="equations">Equations</Tabs.Tab>
              <Tabs.Tab value="formatted">Formatted Equations</Tabs.Tab>
              <Tabs.Tab value="table">Parametric Table</Tabs.Tab>
              <Tabs.Tab value="plots">Plots</Tabs.Tab>
              <Tabs.Tab value="states">State Points</Tabs.Tab>
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
            {activeTab === 'equations' && (
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
            )}
            {activeTab === 'table' && (
              <ParametricTableTab
                tableVars={tableVars}
                rows={paramRows}
                results={tableResults}
                varDrafts={varDrafts}
                onConfigure={() => setShowConfigureTable(true)}
                onAddRow={() => {
                  setParamRows((r) => [...r, newParamRow()])
                  invalidateTable()
                }}
                onRemoveRow={() => {
                  setParamRows((r) => r.slice(0, -1))
                  invalidateTable()
                }}
                onClearResults={() => setTableResults([])}
                onAlterColumn={setAlterColumn}
                onColumnUnitsChange={setColumnUnits}
                onCellChange={setTableCell}
              />
            )}
            {activeTab === 'plots' && (
              <PlotTab
                plots={plots}
                onPlotsChange={setPlots}
                solvedVariables={result?.variables ?? []}
                tableVars={tableVars}
                rows={paramRows}
                results={tableResults}
              />
            )}
            {activeTab === 'states' && (
              <StatesTab solvedVariables={result?.variables ?? []} />
            )}
            {activeTab === 'formatted' && (
              <FormattedEquationsView equations={formattedEqs} />
            )}
          </Paper>

          {activeTab === 'table' ? (
            <TableActionBar
              tableChecking={tableChecking}
              tableSolving={tableSolving}
              tableCheckResult={tableCheckResult}
              tableCheckMessage={tableCheckMessage}
              tableResults={tableResults}
              onCheckTable={onCheckTable}
              onSolveTable={onSolveTable}
            />
          ) : (
            <EquationActionBar
              checking={checking}
              solving={solving}
              solvable={solvable}
              findAll={findAll}
              complexMode={complexMode}
              checkResult={checkResult}
              result={result}
              onCheck={onCheck}
              onSolve={onSolve}
              onFindAllChange={(checked) => {
                setFindAll(checked)
                setResult(null)
              }}
              onComplexModeChange={(checked) => {
                setComplexMode(checked)
                setCheckResult(null)
                setResult(null)
                invalidateTable()
              }}
            />
          )}
        </Flex>

        <SolutionPanel
          showTable={activeTab === 'table'}
          solveCount={solveCount}
          tableStats={tableStats}
          result={result}
          rows={solutionRows}
        />
      </Flex>
    </Flex>
  )
}
