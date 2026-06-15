import { ChangeEvent, useCallback, useEffect, useMemo, useState, useRef } from 'react'
import {
  ActionIcon,
  Alert,
  Button,
  Divider,
  Flex,
  Group,
  Menu,
  Paper,
  SegmentedControl,
  Select,
  Stack,
  Text,
  Title,
  Tooltip,
} from '@mantine/core'
import { Spotlight, SpotlightActionGroupData } from '@mantine/spotlight'
import {
  IconChartGridDots,
  IconChartLine,
  IconChecks,
  IconCode,
  IconDeviceFloppy,
  IconFilePlus,
  IconFolderOpen,
  IconHelp,
  IconInfoCircle,
  IconKeyboard,
  IconLayoutGrid,
  IconLayoutSidebarRightExpand,
  IconMathFunction,
  IconPlayerPlayFilled,
  IconSchema,
  IconSearch,
  IconSettings,
  IconTable,
  IconTargetArrow,
  IconTemperature,
  IconVariable,
} from '@tabler/icons-react'
import {
  check,
  CheckResponse,
  DEFAULT_STOP_CRITERIA,
  getFluids,
  solve,
  solveTable,
  SolveResponse,
  StopCriteria,
  TableRowResult,
  UnitSystem,
  VariableInfo,
  VariableResult,
} from './api'
import PreferencesModal from './PreferencesModal'
import AboutModal from './AboutModal'
import VariableInfoModal, {
  DEFAULT_DRAFT,
  parseBound,
  VariableDraft,
} from './VariableInfoModal'
import MinMaxModal from './MinMaxModal'
import CurveFitModal from './CurveFitModal'
import FormattedReportView, { MathWithBadges } from './FormattedReportView'
import ConfigureTableModal from './ConfigureTableModal'
import AlterValuesModal from './AlterValuesModal'
import { newParamRow, ParamRow } from './ParametricTableTab'
import TablesTab from './TablesTab'
import {
  functionTableFromDigitizer,
  loadTables,
  mergeCodeTables,
  newParamTable,
  ParamTableSpec,
  saveTables,
  TableSpec,
  toFunctionTableDtos,
} from './tables'
import PlotTab from './PlotTab'
import StatesTab from './StatesTab'
import { DigitizerTab, DigitizedExport } from './DigitizerTab'
import DiagramTab, { loadDiagrams, saveDiagrams } from './diagram/DiagramTab'
import { DiagramSpec } from './diagram/types'
import { PlotSpec } from './plots/types'
import { plotDefToSpec } from './plots/fromCode'
import SolutionPanel from './SolutionPanel'
import ExamplesModal from './ExamplesModal'
import ShortcutsModal from './ShortcutsModal'
import SyntaxHelp from './SyntaxHelp'
import { DEFAULT_EXAMPLE_TEXT, Example } from './examples'
import EquationEditor, { EquationEditorHandle } from './EquationEditor'
import { ConfirmModal, MessageModal, TextPromptModal } from './dialogs'
import { Rail, TopBar } from './WorkspaceChrome'
import { EXPORT_FORMATS } from './plots/exportPlot'
import { detectStates } from './plots/stateTable'
import PlotConfigModal from './plots/PlotConfigModal'
import {
  buildComplexSolutionRows,
  buildRealSolutionRows,
  withStableKeys,
} from './format'
import { FUNCTION_CATEGORIES } from './functionCatalog'
import {
  buildProject,
  clearProjectLocal,
  downloadProject,
  FreesProject,
  loadProjectLocal,
  ProjectSlices,
  readProjectFile,
  saveProjectLocal,
  writeBridgedKeys,
} from './project'

const STOP_CRITERIA_KEY = 'frees.stopCriteria'
const UNIT_SYSTEM_KEY = 'frees.unitSystem'
const FIRST_RUN_KEY = 'frees.firstRunDismissed'

function loadUnitSystem(): UnitSystem {
  const raw = localStorage.getItem(UNIT_SYSTEM_KEY)
  return raw === 'ENG_SI' || raw === 'ENGLISH' ? raw : 'SI'
}

const EXAMPLE = DEFAULT_EXAMPLE_TEXT

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

function FormattedEquationsView({
  equations,
  report,
  variables,
  plots,
  cyclePath,
  tableRows,
  tableResults,
}: Readonly<{
  equations: string[]
  report?: string
  variables?: VariableResult[]
  plots?: PlotSpec[]
  cyclePath?: Record<string, number>[]
  tableRows?: ParamRow[]
  tableResults?: TableRowResult[]
}>) {
  if (report) {
    return (
      <FormattedReportView
        report={report}
        variables={variables}
        plots={plots}
        cyclePath={cyclePath}
        tableRows={tableRows}
        tableResults={tableResults}
      />
    )
  }

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
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
        >
          <MathWithBadges math={eq.value} variables={variables} />
        </Paper>
      ))}
    </Stack>
  )
}

export default function App() {
  // Story 10.10: restore the whole workspace from the unified `.frees` project
  // (autosaved to localStorage). Computed once before any state initializer so
  // every slice below can seed from it, falling back to the legacy per-feature
  // keys when no unified project exists (one-time migration). Child-owned slices
  // (digitizer, custom components) self-restore from their own keys, so they are
  // intentionally not written back here on reload.
  const bootRef = useRef<FreesProject | null | undefined>(undefined)
  if (bootRef.current === undefined) bootRef.current = loadProjectLocal()
  const boot = bootRef.current

  const [projectName, setProjectName] = useState('untitled')
  const [workspaceEpoch, setWorkspaceEpoch] = useState(0)
  const projectFileRef = useRef<HTMLInputElement>(null)

  const [text, setText] = useState(boot?.text ?? EXAMPLE)
  // Equation lines contributed by the Diagram window's input controls
  // (Story 6.2). They are appended to the text on Check/Solve.
  const [diagramBindings, setDiagramBindings] = useState<string[]>([])
  const diagramBoundVarsRef = useRef('')
  const [checkResult, setCheckResult] = useState<CheckResponse | null>(null)
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<SolveResponse | null>(null)
  const [solving, setSolving] = useState(false)
  const [solveCount, setSolveCount] = useState(0)
  const [findAll, setFindAll] = useState(false)
  const [complexMode, setComplexMode] = useState(false)
  const [solvedComplexMode, setSolvedComplexMode] = useState(false)
  const [stopCriteria, setStopCriteria] = useState<StopCriteria>(
    () => boot?.stopCriteria ?? loadStopCriteria(),
  )
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(
    () => boot?.unitSystem ?? loadUnitSystem(),
  )
  const [fillMissing, setFillMissing] = useState<boolean>(() => {
    if (boot) return boot.fillMissing
    return localStorage.getItem('frees.fillMissing') === 'true'
  })
  const [showPreferences, setShowPreferences] = useState(false)
  // Mantine-styled replacements for native prompt()/confirm()/alert().
  const [renameOpen, setRenameOpen] = useState(false)
  const [saveAsOpen, setSaveAsOpen] = useState(false)
  const [confirmNewOpen, setConfirmNewOpen] = useState(false)
  const [dialogError, setDialogError] = useState<string | null>(null)
  const [dismissedWarnings, setDismissedWarnings] = useState(false)
  const [showFirstRun, setShowFirstRun] = useState(
    () => localStorage.getItem(FIRST_RUN_KEY) !== 'true',
  )

  const dismissFirstRun = useCallback(() => {
    setShowFirstRun(false)
    localStorage.setItem(FIRST_RUN_KEY, 'true')
  }, [])
  const [variables, setVariables] = useState<string[]>([])
  const [varDrafts, setVarDrafts] = useState<Record<string, VariableDraft>>(
    () => boot?.varDrafts ?? {},
  )
  const [showVariableInfo, setShowVariableInfo] = useState(false)
  const [showMinMax, setShowMinMax] = useState(false)
  const [showCurveFit, setShowCurveFit] = useState(false)
  const [showAbout, setShowAbout] = useState(false)
  const [showExamples, setShowExamples] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [activeTab, setActiveTab] = useState<string>('equations')
  const [eqView, setEqView] = useState<'editor' | 'formatted'>('editor')

  const editorRef = useRef<EquationEditorHandle>(null)

  // Insert a function template at the editor caret (Functions menu). "$0" in
  // the snippet marks where the caret lands; selected text is replaced. The
  // editor must be visible first, so switch to it before inserting.
  const insertFunction = useCallback((snippet: string) => {
    setActiveTab('equations')
    setEqView('editor')
    setTimeout(() => editorRef.current?.insertSnippet(snippet), 50)
  }, [])
  const [solutionOpen, setSolutionOpen] = useState(true)
  // Tables (Epic 8): any number of Parametric and Curve Tables; the active
  // parametric table is the one Check/Solve Table and the plots act on.
  const [tables, setTables] = useState<TableSpec[]>(() => {
    if (boot) return boot.tables.length > 0 ? boot.tables : [newParamTable([])]
    const loaded = loadTables()
    return loaded.length > 0 ? loaded : [newParamTable([])]
  })
  const [activeTableId, setActiveTableId] = useState<string | null>(null)
  const [tableSolving, setTableSolving] = useState(false)
  const [showConfigureTable, setShowConfigureTable] = useState(false)
  const [alterColumn, setAlterColumn] = useState<string | null>(null)
  const [tableChecking, setTableChecking] = useState(false)
  const [plots, setPlots] = useState<PlotSpec[]>(() => boot?.plots ?? [])
  const [activeThermoPlotId, setActiveThermoPlotId] = useState<string | null>(null)
  const [activePlotId, setActivePlotId] = useState<string | null>(null)
  const [diagrams, setDiagrams] = useState<DiagramSpec[]>(() =>
    boot?.diagrams?.length ? boot.diagrams : loadDiagrams(),
  )
  const [activeDiagramId, setActiveDiagramId] = useState<string | null>(() => {
    const list = boot?.diagrams?.length ? boot.diagrams : loadDiagrams()
    return list[0]?.id ?? null
  })
  const [editingThermoPlot, setEditingThermoPlot] = useState<PlotSpec | null>(null)
  const [addingThermoPlot, setAddingThermoPlot] = useState(false)
  const [thermoExportTrigger, setThermoExportTrigger] = useState<{ format: string; timestamp: number } | null>(null)
  const [fluids, setFluids] = useState<string[]>([])
  const [stateUnitIds, setStateUnitIds] = useState<Record<string, string>>(() => {
    if (boot) return boot.stateUnitIds ?? {}
    try {
      const saved = localStorage.getItem('frees.stateUnitIds')
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })
  const [lastSolvedWithFillMissing, setLastSolvedWithFillMissing] = useState(false)

  useEffect(() => {
    void getFluids().then(setFluids)
  }, [])

  useEffect(() => {
    saveTables(tables)
  }, [tables])

  useEffect(() => {
    saveDiagrams(diagrams)
  }, [diagrams])

  // Story 10.10: the current App-owned slices of the unified project. Child-owned
  // slices (digitizer, custom components) are read from their localStorage caches
  // by buildProject(), so they are captured without lifting them into App.
  const currentSlices = useCallback(
    (): ProjectSlices => ({
      text,
      varDrafts,
      stopCriteria,
      unitSystem,
      fillMissing,
      stateUnitIds,
      tables,
      plots,
      diagrams,
    }),
    [text, varDrafts, stopCriteria, unitSystem, fillMissing, stateUnitIds, tables, plots, diagrams],
  )

  // Debounced autosave of the entire workspace to a single localStorage key,
  // superseding the scattered per-feature keys as the source of truth on reload.
  useEffect(() => {
    const id = setTimeout(() => {
      saveProjectLocal(buildProject(currentSlices()))
    }, 800)
    return () => clearTimeout(id)
  }, [currentSlices])

  // Apply an opened/loaded project to every workspace slice. Child-owned slices
  // are written back to their caches and the relevant tabs are remounted (epoch
  // bump) so they re-read the restored state.
  const applyProject = useCallback((p: FreesProject) => {
    setText(p.text ?? '')
    setVarDrafts(p.varDrafts ?? {})
    setStopCriteria(p.stopCriteria)
    setUnitSystem(p.unitSystem ?? 'SI')
    setFillMissing(Boolean(p.fillMissing))
    setStateUnitIds(p.stateUnitIds ?? {})
    setTables(p.tables.length > 0 ? p.tables : [newParamTable([])])
    setPlots(p.plots ?? [])
    setDiagrams(p.diagrams ?? [])
    setActiveDiagramId(p.diagrams?.[0]?.id ?? null)
    setResult(null)
    setCheckResult(null)
    writeBridgedKeys(p)
    saveProjectLocal(p)
    setWorkspaceEpoch((e) => e + 1)
  }, [])

  const handleSaveProject = useCallback(() => {
    downloadProject(buildProject(currentSlices()), projectName)
  }, [currentSlices, projectName])

  const handleRenameProject = useCallback(() => setRenameOpen(true), [])

  const submitRename = useCallback((name: string) => {
    setProjectName(name.trim() || 'untitled')
    setRenameOpen(false)
  }, [])

  const handleSaveProjectAs = useCallback(() => setSaveAsOpen(true), [])

  const submitSaveAs = useCallback(
    (name: string) => {
      const clean = name.trim() || 'untitled'
      setProjectName(clean)
      downloadProject(buildProject(currentSlices()), clean)
      setSaveAsOpen(false)
    },
    [currentSlices],
  )

  const handleOpenProject = useCallback(() => {
    projectFileRef.current?.click()
  }, [])

  const onProjectFileSelected = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      e.target.value = '' // allow re-opening the same file
      if (!file) return
      try {
        const p = await readProjectFile(file)
        applyProject(p)
        setProjectName(file.name.replace(/\.frees$/i, ''))
      } catch (err) {
        setDialogError(err instanceof Error ? err.message : 'Could not open project file.')
      }
    },
    [applyProject],
  )

  const handleNewProject = useCallback(() => setConfirmNewOpen(true), [])

  const performNewProject = useCallback(() => {
    setConfirmNewOpen(false)
    clearProjectLocal()
    writeBridgedKeys({
      version: 1,
      savedAt: '',
      text: '',
      varDrafts: {},
      stopCriteria,
      unitSystem,
      fillMissing,
      stateUnitIds: {},
      tables: [],
      plots: [],
      diagrams: [],
      customComponents: null,
      digitizer: null,
    })
    setText(EXAMPLE)
    setVarDrafts({})
    setStateUnitIds({})
    setTables([newParamTable([])])
    setPlots([])
    const blank: DiagramSpec = {
      id: crypto.randomUUID(),
      name: 'Diagram 1',
      state: { elements: [], gridSize: 10, snap: true, showGrid: true },
    }
    setDiagrams([blank])
    setActiveDiagramId(blank.id)
    setResult(null)
    setCheckResult(null)
    setProjectName('untitled')
    setWorkspaceEpoch((e) => e + 1)
  }, [stopCriteria, unitSystem, fillMissing])

  // The active table, defaulting to the first; the parametric-table solver
  // state below is derived from the active *parametric* table so all the
  // existing single-table wiring (plots, reports, top bar) keeps working.
  const activeTable = tables.find((t) => t.id === activeTableId) ?? tables[0] ?? null
  const activeParam: ParamTableSpec | null =
    activeTable?.kind === 'parametric' ? activeTable : null
  const tableVars = activeParam?.vars ?? []
  const paramRows = activeParam?.rows ?? []
  const tableResults = activeParam?.results ?? []
  // Solved table runs fed to the Diagram window for animation playback (6.4).
  const diagramRuns = tableResults
    .map((r, i) => ({ ok: r.success, label: `Run ${i + 1}`, values: r.values }))
    .filter((r) => r.ok)
    .map(({ label, values }) => ({ label, values }))
  const tableStats = activeParam?.stats ?? null
  const tableCheckResult = activeParam?.checkResult ?? null
  const tableCheckMessage = activeParam?.checkMessage ?? ''
  const functionTableDtos = toFunctionTableDtos(tables)

  function updateParamTable(id: string, update: (t: ParamTableSpec) => ParamTableSpec) {
    setTables((all) =>
      all.map((t) => (t.id === id && t.kind === 'parametric' ? update(t) : t)),
    )
  }

  function updateActiveParam(update: (t: ParamTableSpec) => ParamTableSpec) {
    if (activeParam) updateParamTable(activeParam.id, update)
  }

  function sendDigitizedToFunctionTable(data: DigitizedExport) {
    const table = functionTableFromDigitizer({ existing: tables, ...data })
    setTables((all) => [...all, table])
    setActiveTableId(table.id)
    setActiveTab('table')
  }

  const handleStateUnitIdsChange = (
    val: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)
  ) => {
    setStateUnitIds((prev) => {
      const next = typeof val === 'function' ? val(prev) : val
      localStorage.setItem('frees.stateUnitIds', JSON.stringify(next))
      return next
    })
  }

  const solvable = checkResult?.solvable === true

  function savePreferences(criteria: StopCriteria, system: UnitSystem, fill: boolean) {
    // Never persist complexMode inside stopCriteria — it is a separate toggle
    const { complexMode: _ignored, ...persistable } = criteria
    setStopCriteria(persistable)
    setUnitSystem(system)
    setFillMissing(fill)
    localStorage.setItem(STOP_CRITERIA_KEY, JSON.stringify(persistable))
    localStorage.setItem(UNIT_SYSTEM_KEY, system)
    localStorage.setItem('frees.fillMissing', String(fill))
    setShowPreferences(false)
  }

  function buildVariableInfo(): VariableInfo[] {
    return variables.map((name) => {
      const draft = varDrafts[name] ?? DEFAULT_DRAFT
      return {
        name,
        guess:
          draft.guess.trim() !== '' && Number.isFinite(Number(draft.guess))
            ? Number(draft.guess)
            : null,
        lower: parseBound(draft.lower) ?? null,
        upper: parseBound(draft.upper) ?? null,
        units: draft.isUnitsUserSet ? (draft.units.trim() || null) : null,
        uncertainty:
          draft.uncertainty && draft.uncertainty.trim() !== '' && Number.isFinite(Number(draft.uncertainty))
            ? Number(draft.uncertainty)
            : null,
      }
    })
  }

  function onTextChange(value: string) {
    setText(value)
    // Any edit invalidates the previous Check; Solve is gated
    // until the system is re-checked. Table checks depend on the same text.
    setCheckResult(null)
    setResult(null)
    setLastSolvedWithFillMissing(false)
    invalidateTable()
  }

  // Load a curated example into the editor, replacing the current document and
  // invalidating any stale check/solve so the user can immediately re-Solve.
  function loadExample(example: Example) {
    setText(example.text)
    setVarDrafts({})
    setCheckResult(null)
    setResult(null)
    setLastSolvedWithFillMissing(false)
    invalidateTable()
    setActiveTab('equations')
    setEqView('editor')
    setShowExamples(false)
  }

  /** The equations actually solved: editor text plus diagram control bindings. */
  function effectiveText(): string {
    return diagramBindings.length > 0
      ? `${text}\n${diagramBindings.join('\n')}`
      : text
  }

  // Diagram input controls report their `var = value` lines here. Changing a
  // control's VALUE keeps the system structure intact (same equation/variable
  // counts), so the existing Check stays valid and Solve can run immediately.
  // Adding/removing a control or renaming its variable changes the structure
  // and invalidates the Check, forcing a re-Check before Solve.
  const handleDiagramBindings = useCallback((lines: string[]) => {
    setDiagramBindings(lines)
    const vars = lines
      .map((l) => l.split('=')[0].trim().toLowerCase())
      .sort((a, b) => a.localeCompare(b))
      .join(',')
    if (vars !== diagramBoundVarsRef.current) {
      diagramBoundVarsRef.current = vars
      setCheckResult(null)
      setResult(null)
      setLastSolvedWithFillMissing(false)
    }
  }, [])

  async function onCheck(): Promise<CheckResponse | null> {
    if (checking) return null
    setChecking(true)
    setResult(null)
    setLastSolvedWithFillMissing(false)
    try {
      const response = await check(effectiveText(), buildVariableInfo(), complexMode, functionTableDtos)
      setCheckResult(response)
      setTables((all) => mergeCodeTables(all, response.codeTables, response.parametricTables))
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
      return response
    } catch (e) {
      const errorResponse: CheckResponse = {
        solvable: false,
        equations: 0,
        unknowns: 0,
        variables: [],
        unitWarnings: [],
        inferredUnits: {},
        message: `Could not reach the solver backend: ${String(e)}`,
        formattedEquations: [],
      }
      setCheckResult(errorResponse)
      return errorResponse
    } finally {
      setChecking(false)
    }
  }

  function invalidateTable() {
    // Text edits invalidate the runs of every parametric table.
    setTables((all) =>
      all.map((t) =>
        t.kind === 'parametric'
          ? { ...t, results: [], stats: null, checkResult: null, checkMessage: '' }
          : t,
      ),
    )
  }

  function invalidateActiveParam(t: ParamTableSpec): ParamTableSpec {
    return { ...t, results: [], stats: null, checkResult: null, checkMessage: '' }
  }

  function setTableCell(rowIndex: number, name: string, value: string) {
    updateActiveParam((t) =>
      invalidateActiveParam({
        ...t,
        rows: t.rows.map((row, i) =>
          i === rowIndex ? { ...row, values: { ...row.values, [name]: value } } : row,
        ),
      }),
    )
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

  async function onCheckTable(): Promise<CheckResponse | null> {
    if (tableChecking || !activeParam) return null
    const tableId = activeParam.id
    setTableChecking(true)
    updateParamTable(tableId, (t) => ({ ...t, results: [] }))
    try {
      // Check the augmented system: the equations plus one representative
      // fixed value per table input column (table semantics).
      const filled = filledTableColumns()
      let augmented = text
      for (const [name, value] of filled) {
        augmented += `\n${name} = ${value}`
      }
      const response = await check(augmented, buildVariableInfo(), complexMode, functionTableDtos)
      updateParamTable(tableId, (t) => ({ ...t, checkResult: response }))

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
        updateParamTable(tableId, (t) => ({
          ...t,
          checkMessage:
            `Table check passed: ${response.equations} equations and ` +
            `${response.unknowns} variables, with ${filled.size} value(s) ` +
            `supplied by the table.`,
        }))
      } else {
        const unfilledColumns = tableVars.filter((v) => !filled.has(v))
        const hint =
          unfilledColumns.length > 0
            ? ` Fill input values for: ${unfilledColumns.join(', ')} (or use the column fill).`
            : ' Add the missing variables as table columns via Configure Columns, or fix the equations.'
        updateParamTable(tableId, (t) => ({ ...t, checkMessage: response.message + hint }))
      }
      return response
    } catch (e) {
      updateParamTable(tableId, (t) => ({
        ...t,
        checkResult: null,
        checkMessage: `Could not reach the solver backend: ${String(e)}`,
      }))
      return null
    } finally {
      setTableChecking(false)
    }
  }

  async function onSolveTable(checkOverride?: CheckResponse) {
    if (tableSolving || !activeParam || tableVars.length === 0) return
    const okCheck = checkOverride
      ? checkOverride.solvable === true
      : tableCheckResult?.solvable === true
    if (!okCheck) return
    const tableId = activeParam.id
    setTableSolving(true)
    try {
      // Non-empty cells become fixed inputs for that run; blank cells are
      // solved per row (Solve Table semantics).
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
        functionTableDtos,
      )
      updateParamTable(tableId, (t) => ({
        ...t,
        results: response.results,
        stats: response.stats,
      }))
    } catch (e) {
      updateParamTable(tableId, (t) => ({
        ...t,
        stats: null,
        results: t.rows.map(() => ({
          success: false,
          values: {},
          error: `Could not reach the solver backend: ${String(e)}`,
        })),
      }))
    } finally {
      setTableSolving(false)
    }
  }

  async function onSolve(
    forceFill: unknown = false,
    overridePlots?: PlotSpec[],
    checkOverride?: CheckResponse,
  ) {
    const canRun = checkOverride ? checkOverride.solvable === true : solvable
    if (solving || !canRun) return
    setSolving(true)
    try {
      const activePlots = overridePlots ?? plots
      const needMissing =
        activePlots.some((p) => p.kind === 'property' && p.property.overlayStates) ||
        // PLOT-block property diagrams (resolved after Check) also need the
        // interpolated cycle path, so request it when one is present.
        codePlots.some((p) => p.kind === 'property' && p.property.overlayStates)
      const shouldFillMissing = (forceFill === true) || fillMissing || needMissing
      const response = await solve(
        effectiveText(),
        { ...stopCriteria, complexMode },
        buildVariableInfo(),
        findAll,
        unitSystem,
        shouldFillMissing,
        functionTableDtos,
      )
      setSolvedComplexMode(complexMode)
      setResult(response)
      setTables((all) => mergeCodeTables(all, response.codeTables, response.parametricTables))
      setLastSolvedWithFillMissing(shouldFillMissing && response.success)
      // Once the user has solved successfully, they've learned the core
      // workflow — retire the first-run welcome banner so it stops eating
      // editor space.
      if (response.success && showFirstRun) dismissFirstRun()
      if (response.success && response.variables) {
        setVarDrafts((drafts) => {
          const next = { ...drafts }
          for (const v of response.variables) {
            const name = v.name
            const existing = next[name] ?? { ...DEFAULT_DRAFT }
            const updated = { ...existing }
            if (!existing.isUnitsUserSet) {
              updated.units = v.units || ''
            }
            if (existing.uncertaintyType === 'relative' && existing.relativeUncertainty.trim() !== '') {
              const relVal = Number(existing.relativeUncertainty)
              if (Number.isFinite(relVal)) {
                updated.uncertainty = String(Number(((relVal / 100) * Math.abs(v.value)).toPrecision(6)))
              }
            }
            next[name] = updated
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
      setLastSolvedWithFillMissing(false)
    } finally {
      setSolveCount((n) => n + 1)
      setSolving(false)
    }
  }

  // "Just solve it": if the system is already checked, solve; otherwise run
  // Check first and chain into Solve when it passes. The fresh CheckResponse is
  // passed through so the solve guard doesn't read stale `solvable` state.
  async function checkThenSolve() {
    if (solving || checking) return
    if (solvable) {
      void onSolve()
      return
    }
    const res = await onCheck()
    if (res?.solvable) void onSolve(false, undefined, res)
  }

  async function checkThenSolveTable() {
    if (tableSolving || tableChecking || !activeParam) return
    if (tableCheckResult?.solvable === true) {
      void onSolveTable()
      return
    }
    const res = await onCheckTable()
    if (res?.solvable) void onSolveTable(res)
  }

  const handlePlotsChange = (nextPlots: PlotSpec[]) => {
    // Code-defined plots are derived from the solve response, not persisted, so
    // strip them before saving — they are re-merged on the next solve/check.
    const userPlots = nextPlots.filter((p) => !p.fromCode)
    setPlots(userPlots)
    const needMissing = userPlots.some((p) => p.kind === 'property' && p.property.overlayStates)
    if (needMissing && result?.success && !lastSolvedWithFillMissing && !solving && solvable) {
      void onSolve(true, userPlots)
    }
  }

  const handleNavigate = useCallback(
    (action: { tab?: string; query?: string; plotId?: string; diagramId?: string }) => {
      if (action.tab) {
        setActiveTab(action.tab)
      }
      if (action.diagramId) {
        setActiveTab('diagram')
        setActiveDiagramId(action.diagramId)
      }
      if (action.plotId) {
        const targetPlot = plots.find((p) => p.id === action.plotId)
        if (targetPlot) {
          if (targetPlot.kind === 'property' || targetPlot.kind === 'psychro') {
            setActiveTab('thermo')
            setActiveThermoPlotId(action.plotId)
          } else {
            setActiveTab('plots')
            setActivePlotId(action.plotId)
          }
        }
      }
      if (action.query) {
        const query = action.query.trim().toLowerCase()
        if (query) {
          const lines = text.split('\n')
          const matchingIdx = lines.findIndex((l) => l.toLowerCase().includes(query))
          if (matchingIdx !== -1) {
            setActiveTab('equations')
            setEqView('editor')
            setTimeout(() => editorRef.current?.goToLine(matchingIdx + 1), 50)
          }
        }
      }
    },
    [plots, text],
  )

  // Jump the editor to a 1-based line (selecting it) — used to reach the line a
  // syntax error points at. Ensures the editor is visible first.
  const goToLine = useCallback((lineNo: number) => {
    setActiveTab('equations')
    setEqView('editor')
    setTimeout(() => editorRef.current?.goToLine(lineNo), 50)
  }, [])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Shortcuts act on the active section: equations vs parametric table.
      if (e.key === 'F2') {
        e.preventDefault()
        void (activeTab === 'table' ? checkThenSolveTable() : checkThenSolve())
      }
      if (e.key === 'F4') {
        e.preventDefault()
        void (activeTab === 'table' ? onCheckTable() : onCheck())
      }
      // "?" opens the shortcuts overlay, but only when the user isn't typing
      // into the editor, an input, or any text field.
      if (e.key === '?') {
        const el = e.target as HTMLElement | null
        const typing =
          !!el &&
          (el.tagName === 'INPUT' ||
            el.tagName === 'TEXTAREA' ||
            el.isContentEditable ||
            el.closest('.cm-editor') !== null)
        if (!typing) {
          e.preventDefault()
          setShowShortcuts(true)
        }
      }
    }
    globalThis.addEventListener('keydown', onKeyDown)
    return () => globalThis.removeEventListener('keydown', onKeyDown)
  })

  const solutions = result?.solutions ?? []
  const formattedEqs = result?.formattedEquations ?? checkResult?.formattedEquations ?? []

  // Unit-consistency warnings from the latest Solve (preferred) or Check, shown
  // as a dismissible banner above the editor. Re-shown whenever the set changes.
  const unitWarnings = result?.unitWarnings ?? checkResult?.unitWarnings ?? []
  const warningsKey = unitWarnings.join('|')
  useEffect(() => {
    setDismissedWarnings(false)
  }, [warningsKey])

  // 1-based editor line a syntax error points at (from Solve, then Check), used
  // to mark the gutter and offer a jump-to-line action.
  const errorLine = result?.errorLine ?? checkResult?.errorLine ?? null

  // Plots declared in the editor text with PLOT ... END blocks, regenerated on
  // every solve/check. Merged with GUI plots for display and [Graph] resolution
  // but kept out of the persisted project (handlePlotsChange strips fromCode).
  const codePlots = useMemo<PlotSpec[]>(() => {
    const dtos = result?.definedPlots ?? checkResult?.definedPlots ?? []
    return dtos.map(plotDefToSpec)
  }, [result?.definedPlots, checkResult?.definedPlots])

  const mergedPlots = useMemo<PlotSpec[]>(() => {
    const userNames = new Set(plots.map((p) => p.name.toLowerCase()))
    return [...plots, ...codePlots.filter((c) => !userNames.has(c.name.toLowerCase()))]
  }, [plots, codePlots])

  const baseVariables =
    solutions.length > 0 ? solutions[0].variables : result?.variables ?? []

  // Use the mode that was active when the result was solved, not the live checkbox
  const resultIsComplex = result !== null && solvedComplexMode
  const solutionRows = resultIsComplex
    ? buildComplexSolutionRows(baseVariables, solutions)
    : buildRealSolutionRows(baseVariables, solutions)

  // Command palette (Ctrl/Cmd+K): jump to any view, open any tool window, run
  // Check/Solve, or manage the project — all from one searchable list.
  const spotlightActions: SpotlightActionGroupData[] = [
    {
      group: 'Run',
      actions: [
        {
          id: 'check',
          label: 'Check',
          description: 'Validate the system (F4)',
          leftSection: <IconChecks size={18} />,
          onClick: () => {
            setActiveTab('equations')
            void onCheck()
          },
        },
        {
          id: 'solve',
          label: 'Solve',
          description: 'Check & solve the system (F2)',
          leftSection: <IconPlayerPlayFilled size={16} />,
          onClick: () => {
            setActiveTab('equations')
            void checkThenSolve()
          },
        },
      ],
    },
    {
      group: 'Views',
      actions: [
        { id: 'view-editor', label: 'Editor', leftSection: <IconCode size={18} />, onClick: () => setActiveTab('equations') },
        { id: 'view-table', label: 'Tables', leftSection: <IconTable size={18} />, onClick: () => setActiveTab('table') },
        { id: 'view-plots', label: 'Plots (X-Y)', leftSection: <IconChartLine size={18} />, onClick: () => setActiveTab('plots') },
        { id: 'view-thermo', label: 'Thermodynamics', leftSection: <IconTemperature size={18} />, onClick: () => setActiveTab('thermo') },
        { id: 'view-digitizer', label: 'Graph Digitizer', leftSection: <IconChartGridDots size={18} />, onClick: () => setActiveTab('digitizer') },
        { id: 'view-diagram', label: 'Diagram', leftSection: <IconSchema size={18} />, onClick: () => setActiveTab('diagram') },
      ],
    },
    {
      group: 'Tools',
      actions: [
        { id: 'tool-variables', label: 'Variable Information', leftSection: <IconVariable size={18} />, onClick: () => setShowVariableInfo(true) },
        { id: 'tool-minmax', label: 'Min/Max (Optimization)', leftSection: <IconTargetArrow size={18} />, onClick: () => setShowMinMax(true) },
        { id: 'tool-curvefit', label: 'Curve Fit', leftSection: <IconMathFunction size={18} />, onClick: () => setShowCurveFit(true) },
        { id: 'tool-preferences', label: 'Preferences', leftSection: <IconSettings size={18} />, onClick: () => setShowPreferences(true) },
        { id: 'tool-about', label: 'About', leftSection: <IconInfoCircle size={18} />, onClick: () => setShowAbout(true) },
      ],
    },
    {
      group: 'Project',
      actions: [
        { id: 'proj-examples', label: 'Open Example…', description: 'Load a ready-to-solve worked example', leftSection: <IconLayoutGrid size={18} />, onClick: () => setShowExamples(true) },
        { id: 'proj-new', label: 'New Project', leftSection: <IconFilePlus size={18} />, onClick: handleNewProject },
        { id: 'proj-open', label: 'Open Project…', leftSection: <IconFolderOpen size={18} />, onClick: handleOpenProject },
        { id: 'proj-save', label: 'Save Project', leftSection: <IconDeviceFloppy size={18} />, onClick: handleSaveProject },
        { id: 'proj-saveas', label: 'Save Project As…', leftSection: <IconDeviceFloppy size={18} />, onClick: handleSaveProjectAs },
      ],
    },
    {
      group: 'Help',
      actions: [
        { id: 'shortcuts', label: 'Keyboard shortcuts', description: 'Show the hotkey reference (?)', leftSection: <IconKeyboard size={18} />, onClick: () => setShowShortcuts(true) },
        { id: 'help', label: 'Help', leftSection: <IconHelp size={18} />, onClick: () => globalThis.open('/help', '_blank') },
      ],
    },
    // Every catalog function as a searchable palette entry: explanation plus a
    // sample call in the description, inserting the snippet at the editor caret.
    ...FUNCTION_CATEGORIES.map((cat) => ({
      group: cat.category,
      actions: cat.items.map((item) => ({
        id: `fn-${cat.category}-${item.label}`,
        label: item.label,
        description: item.usage
          ? `${item.description ?? ''}  e.g. ${item.usage}`
          : item.description,
        keywords: [cat.category, 'function'],
        leftSection: <IconMathFunction size={18} />,
        onClick: () => insertFunction(item.snippet),
      })),
    })),
  ]

  const solutionSidePanel = solutionOpen ? (
    <SolutionPanel
      showTable={activeTab === 'table' && activeParam !== null}
      solveCount={solveCount}
      tableStats={tableStats}
      result={result}
      rows={solutionRows}
      onCollapse={() => setSolutionOpen(false)}
      onOpenExamples={() => setShowExamples(true)}
    />
  ) : (
    <Paper withBorder p={4} visibleFrom="md">
      <Tooltip label="Show solution panel" position="left">
        <ActionIcon
          variant="subtle"
          color="gray"
          onClick={() => setSolutionOpen(true)}
          aria-label="Show solution panel"
        >
          <IconLayoutSidebarRightExpand size={18} />
        </ActionIcon>
      </Tooltip>
    </Paper>
  )

  return (
    <Flex h="100vh" style={{ overflow: 'hidden' }}>
      <Rail
        active={activeTab}
        onSelect={setActiveTab}
        onVariableInfo={() => setShowVariableInfo(true)}
        onMinMax={() => setShowMinMax(true)}
        onCurveFit={() => setShowCurveFit(true)}
        onPreferences={() => setShowPreferences(true)}
        onAbout={() => setShowAbout(true)}
      />

      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}

      <ExamplesModal
        opened={showExamples}
        onClose={() => setShowExamples(false)}
        onSelect={loadExample}
      />

      <ShortcutsModal opened={showShortcuts} onClose={() => setShowShortcuts(false)} />

      <Spotlight
        actions={spotlightActions}
        nothingFound="Nothing found…"
        highlightQuery
        searchProps={{
          leftSection: <IconSearch size={18} />,
          placeholder: 'Search views, tools, and actions…',
        }}
      />

      <TextPromptModal
        opened={renameOpen}
        title="Rename Project"
        label="Project name"
        defaultValue={projectName}
        confirmLabel="Rename"
        onSubmit={submitRename}
        onClose={() => setRenameOpen(false)}
      />

      <TextPromptModal
        opened={saveAsOpen}
        title="Save Project As"
        label="Project name"
        defaultValue={projectName}
        confirmLabel="Save"
        onSubmit={submitSaveAs}
        onClose={() => setSaveAsOpen(false)}
      />

      <ConfirmModal
        opened={confirmNewOpen}
        title="New Project"
        message="Start a new project? Unsaved changes will be lost."
        confirmLabel="New Project"
        onConfirm={performNewProject}
        onClose={() => setConfirmNewOpen(false)}
      />

      <MessageModal
        opened={dialogError !== null}
        title="Could not open project"
        message={dialogError ?? ''}
        onClose={() => setDialogError(null)}
      />

      {showPreferences && (
        <PreferencesModal
          criteria={stopCriteria}
          unitSystem={unitSystem}
          fillMissing={fillMissing}
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
            updateActiveParam((t) =>
              invalidateActiveParam({
                ...t,
                rows: t.rows.map((row, i) => ({
                  ...row,
                  values: { ...row.values, [alterColumn]: String(values[i]) },
                })),
              }),
            )
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
            updateActiveParam((t) => invalidateActiveParam({ ...t, vars: selected }))
            setShowConfigureTable(false)
          }}
          onClose={() => setShowConfigureTable(false)}
        />
      )}

      {showVariableInfo && (
        <VariableInfoModal
          variables={variables}
          drafts={varDrafts}
          solvedValues={(() => {
            const solvedValues: Record<string, number> = {}
            if (result && result.variables) {
              for (const v of result.variables) {
                solvedValues[v.name.toLowerCase()] = v.value
              }
            }
            return solvedValues
          })()}
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

      {showCurveFit && (
        <CurveFitModal
          tables={tables}
          defaultTableId={activeTableId}
          onClose={() => setShowCurveFit(false)}
          onInsertEquation={(eq) => {
            setText((prev) => prev.trim() + '\n\n' + eq)
          }}
        />
      )}


      <Flex direction="column" flex={1} miw={0} p="sm" gap="sm">
        <TopBar
          isTable={activeTab === 'table' && activeParam !== null}
          checking={checking}
          solving={solving}
          solvable={solvable}
          findAll={findAll}
          complexMode={complexMode}
          checkResult={checkResult}
          result={result}
          tableChecking={tableChecking}
          tableSolving={tableSolving}
          tableCheckResult={tableCheckResult}
          tableCheckMessage={tableCheckMessage}
          tableResults={tableResults}
          onCheck={onCheck}
          onSolve={checkThenSolve}
          onCheckTable={onCheckTable}
          onSolveTable={checkThenSolveTable}
          onFindAllChange={(checked) => {
            setFindAll(checked)
            setResult(null)
            setLastSolvedWithFillMissing(false)
          }}
          onComplexModeChange={(checked) => {
            setComplexMode(checked)
            setCheckResult(null)
            setResult(null)
            setLastSolvedWithFillMissing(false)
            invalidateTable()
          }}
          projectName={projectName}
          onRenameProject={handleRenameProject}
          onNewProject={handleNewProject}
          onOpenProject={handleOpenProject}
          onSaveProject={handleSaveProject}
          onSaveProjectAs={handleSaveProjectAs}
          onInsertFunction={insertFunction}
          onOpenExamples={() => setShowExamples(true)}
        />
        <input
          ref={projectFileRef}
          type="file"
          accept=".frees,application/json"
          style={{ display: 'none' }}
          onChange={onProjectFileSelected}
        />

        <Flex
          flex={1}
          gap="sm"
          align="stretch"
          direction={{ base: 'column', md: 'row' }}
          style={{ minHeight: 0 }}
        >
          <Paper
            withBorder
            p="md"
            flex={1}
            miw={0}
            display="flex"
            style={{ flexDirection: 'column', minHeight: 0, overflow: 'auto' }}
          >
            {activeTab === 'equations' && (
              <>
                {errorLine != null && (
                  <Alert color="red" variant="light" p="xs" mb={6} title="Syntax error">
                    <Group justify="space-between" wrap="nowrap" gap="xs">
                      <Text size="xs">Syntax error on line {errorLine}.</Text>
                      <Button
                        size="compact-xs"
                        variant="light"
                        color="red"
                        onClick={() => goToLine(errorLine)}
                      >
                        Go to line {errorLine}
                      </Button>
                    </Group>
                  </Alert>
                )}
                {showFirstRun && (
                  <Alert
                    color="blue"
                    variant="light"
                    p="xs"
                    mb={6}
                    withCloseButton
                    onClose={dismissFirstRun}
                    title="Welcome to frees"
                  >
                    <Text size="xs">
                      Write equations and markdown notes on the left — they can be
                      entered in any order. Click <strong>Check</strong> (F4) to
                      validate, then <strong>Solve</strong> (F2). Solve also runs
                      Check for you automatically.
                    </Text>
                  </Alert>
                )}
                <Group justify="space-between" mb={6} wrap="nowrap">
                  {eqView === 'editor' ? <SyntaxHelp /> : <span />}
                  <SegmentedControl
                    size="xs"
                    value={eqView}
                    onChange={(v) => setEqView(v as 'editor' | 'formatted')}
                    data={[
                      { label: 'Editor', value: 'editor' },
                      { label: 'Formatted', value: 'formatted' },
                    ]}
                  />
                </Group>
                {unitWarnings.length > 0 && !dismissedWarnings && (
                  <Alert
                    color="yellow"
                    variant="light"
                    p="xs"
                    mb={6}
                    withCloseButton
                    onClose={() => setDismissedWarnings(true)}
                    title={`${unitWarnings.length} unit consistency warning${
                      unitWarnings.length === 1 ? '' : 's'
                    }`}
                  >
                    <Stack gap={2} mah={120} style={{ overflowY: 'auto' }}>
                      {withStableKeys(unitWarnings).map((w) => (
                        <Text size="xs" key={w.key}>
                          ⚠ {w.value}
                        </Text>
                      ))}
                    </Stack>
                  </Alert>
                )}
                {eqView === 'editor' ? (
                  <div
                    style={{
                      display: 'flex',
                      flex: 1,
                      minHeight: 260,
                      border: '1px solid var(--mantine-color-default-border)',
                      borderRadius: '4px',
                      overflow: 'hidden',
                    }}
                  >
                    <EquationEditor
                      ref={editorRef}
                      value={text}
                      onChange={onTextChange}
                      variables={variables}
                      errorLine={errorLine}
                      placeholder={'Enter equations and markdown notes, e.g.\n# Rankine Cycle\nT1 = 100 [C]\nP1 = 250 [kPa]'}
                    />
                  </div>
                ) : (
                  <FormattedEquationsView
                    equations={formattedEqs}
                    report={result?.formattedReport ?? checkResult?.formattedReport}
                    variables={result?.variables}
                    plots={mergedPlots}
                    cyclePath={result?.cyclePath}
                    tableRows={paramRows}
                    tableResults={tableResults}
                  />
                )}
              </>
            )}
            {activeTab === 'table' && (
              <TablesTab
                tables={tables}
                activeTableId={activeTable?.id ?? null}
                onTablesChange={setTables}
                onActiveTableIdChange={setActiveTableId}
                tableVars={tableVars}
                rows={paramRows}
                results={tableResults}
                varDrafts={varDrafts}
                onConfigure={() => setShowConfigureTable(true)}
                onAddRow={() =>
                  updateActiveParam((t) =>
                    invalidateActiveParam({ ...t, rows: [...t.rows, newParamRow()] }),
                  )
                }
                onRemoveRow={() =>
                  updateActiveParam((t) =>
                    invalidateActiveParam({ ...t, rows: t.rows.slice(0, -1) }),
                  )
                }
                onClearResults={() =>
                  updateActiveParam((t) => ({ ...t, results: [] }))
                }
                onAlterColumn={setAlterColumn}
                onColumnUnitsChange={setColumnUnits}
                onCellChange={setTableCell}
              />
            )}
            {activeTab === 'plots' && (
              <PlotTab
                kinds={['xy']}
                emptyHint='No plots yet. Click "Add Plot" to chart parametric table runs as X-Y series.'
                plots={mergedPlots}
                onPlotsChange={handlePlotsChange}
                solvedVariables={result?.variables ?? []}
                cyclePath={result?.cyclePath}
                tableVars={tableVars}
                rows={paramRows}
                results={tableResults}
                activePlotId={activePlotId}
                onActivePlotIdChange={setActivePlotId}
              />
            )}
            {activeTab === 'thermo' && (
              <PlotTab
                kinds={['property', 'psychro']}
                emptyHint="No diagrams yet. Click 'Add Diagram' in the right-hand panel to create a property diagram (T-s, log P-h, P-v, …) or a psychrometric chart; solved state points can be overlaid on both."
                plots={mergedPlots}
                onPlotsChange={handlePlotsChange}
                solvedVariables={result?.variables ?? []}
                cyclePath={result?.cyclePath}
                tableVars={tableVars}
                rows={paramRows}
                results={tableResults}
                activePlotId={activeThermoPlotId}
                onActivePlotIdChange={setActiveThermoPlotId}
                hideHeader={true}
                exportTrigger={thermoExportTrigger}
              />
            )}
            {activeTab === 'digitizer' && (
              <DigitizerTab
                key={`digitizer-${workspaceEpoch}`}
                onSendToFunctionTable={sendDigitizedToFunctionTable}
              />
            )}
            {activeTab === 'diagram' && (
              <DiagramTab
                key={`diagram-${workspaceEpoch}`}
                variables={result?.variables ?? []}
                runs={diagramRuns}
                onBindingsChange={handleDiagramBindings}
                plots={mergedPlots}
                tableRows={paramRows}
                tableResults={tableResults}
                cyclePath={result?.cyclePath}
                solving={solving}
                onSolve={onSolve}
                onCheck={async () => {
                  await onCheck()
                }}
                onNavigate={handleNavigate}
                onVarDraftsChange={setVarDrafts}
                diagrams={diagrams}
                activeDiagramId={activeDiagramId}
                onDiagramsChange={setDiagrams}
                onActiveDiagramIdChange={setActiveDiagramId}
              />
            )}
          </Paper>

          {activeTab === 'thermo' ? (
            <Paper
              withBorder
              p="md"
              w={{ base: '100%', md: 480 }}
              display="flex"
              style={{ flexDirection: 'column', minHeight: 0 }}
            >
              <Group justify="space-between" mb={4} wrap="nowrap" align="center">
                <Title order={4} c="blue.4">Thermodynamics</Title>
                <Button size="xs" onClick={() => setAddingThermoPlot(true)}>
                  Add Diagram
                </Button>
              </Group>
              {/* This panel replaces the Solution panel on the Thermo tab, so
                  tell the user where the full variable solution lives. */}
              <Text size="xs" c="dimmed" mb="xs">
                Diagrams &amp; state points. Full variable solutions are on the
                Solution panel — switch to the Editor tab.
              </Text>

              {plots.some((p) => p.kind === 'property' || p.kind === 'psychro') ? (
                <Stack gap="xs" mb="md">
                  <Select
                    label="Active Diagram"
                    size="xs"
                    data={plots
                      .filter((p) => p.kind === 'property' || p.kind === 'psychro')
                      .map((p) => ({ value: p.id, label: p.name }))}
                    value={
                      activeThermoPlotId ??
                      plots.find((p) => p.kind === 'property' || p.kind === 'psychro')?.id ??
                      ''
                    }
                    onChange={(val) => val && setActiveThermoPlotId(val)}
                  />
                  {(() => {
                    const current = plots.find((p) => p.id === activeThermoPlotId) || plots.find((p) => p.kind === 'property' || p.kind === 'psychro') || null;
                    if (!current) return null;
                    return (
                      <Group gap="xs" wrap="nowrap">
                        <Button
                          variant="default"
                          size="xs"
                          flex={1}
                          onClick={() => setEditingThermoPlot(current)}
                        >
                          Configure
                        </Button>
                        <Menu shadow="md">
                          <Menu.Target>
                            <Button variant="default" size="xs" flex={1}>
                              Export
                            </Button>
                          </Menu.Target>
                          <Menu.Dropdown>
                            {EXPORT_FORMATS.map((f) => (
                              <Menu.Item
                                key={f.value}
                                onClick={() =>
                                  setThermoExportTrigger({
                                    format: f.value,
                                    timestamp: Date.now(),
                                  })
                                }
                              >
                                {f.label}
                              </Menu.Item>
                            ))}
                          </Menu.Dropdown>
                        </Menu>
                        <Button
                          variant="subtle"
                          color="red"
                          size="xs"
                          onClick={() => {
                            const nextPlots = plots.filter((p) => p.id !== current.id);
                            handlePlotsChange(nextPlots);
                            const remaining = nextPlots.find((p) => p.kind === 'property' || p.kind === 'psychro');
                            setActiveThermoPlotId(remaining?.id ?? null);
                          }}
                        >
                          Remove
                        </Button>
                      </Group>
                    );
                  })()}
                </Stack>
              ) : (
                <Text size="xs" c="dimmed" mb="md" style={{ fontStyle: 'italic' }}>
                  No diagrams added yet. Click "Add Diagram" above to start.
                </Text>
              )}

              <Divider my="sm" label="State Points" labelPosition="left" />
              <StatesTab
                solvedVariables={result?.variables ?? []}
                unitIds={stateUnitIds}
                onUnitIdsChange={handleStateUnitIdsChange}
                onFillMissing={() => onSolve(true)}
                solving={solving}
                solvable={solvable}
              />
            </Paper>
          ) : (
            // The digitizer, diagram, and tables views own the full width and
            // hide the Solution panel — the solve summary stays in the top-bar
            // status pill, and the panel returns on the Editor/Plots tabs.
            activeTab !== 'digitizer' &&
            activeTab !== 'diagram' &&
            activeTab !== 'table' &&
            solutionSidePanel
          )}
        </Flex>
      </Flex>

      {(addingThermoPlot || editingThermoPlot) && (
        <PlotConfigModal
          spec={editingThermoPlot}
          allowedKinds={['property', 'psychro']}
          defaultName={editingThermoPlot ? editingThermoPlot.name : `Diagram ${plots.filter(p => p.kind === 'property' || p.kind === 'psychro').length + 1}`}
          fluids={fluids}
          tableVars={tableVars}
          hasStates={detectStates(result?.variables ?? []).indices.length > 0}
          onSave={(spec) => {
            if (editingThermoPlot) {
              handlePlotsChange(plots.map((p) => (p.id === spec.id ? spec : p)))
              setEditingThermoPlot(null)
            } else {
              handlePlotsChange([...plots, spec])
              setActiveThermoPlotId(spec.id)
              setAddingThermoPlot(false)
            }
          }}
          onClose={() => {
            setAddingThermoPlot(false)
            setEditingThermoPlot(null)
          }}
        />
      )}
    </Flex>
  )
}
