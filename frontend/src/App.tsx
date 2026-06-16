import { ChangeEvent, useCallback, useEffect, useMemo, useState, useRef, type ReactNode } from 'react'
import {
  Alert,
  Badge,
  Button,
  Divider,
  Flex,
  Group,
  Paper,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
  Title,
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
  newFunctionTable,
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
import { PlotSpec, PlotKind } from './plots/types'
import { plotDefToSpec } from './plots/fromCode'
import SolutionPanel from './SolutionPanel'
import ExamplesModal from './ExamplesModal'
import ShortcutsModal from './ShortcutsModal'
import SyntaxHelp from './SyntaxHelp'
import { DEFAULT_EXAMPLE_TEXT, Example } from './examples'
import EquationEditor, { EquationEditorHandle } from './EquationEditor'
import { ConfirmModal, MessageModal, TextPromptModal } from './dialogs'
import { Rail, TopBar } from './WorkspaceChrome'
import { WorkspaceDock, type WorkspaceDockHandle, type OpenWindow } from './workspace/WorkspaceDock'
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
  // Dockview workspace manager: imperative handle + set of currently-open
  // window kinds (drives the sidebar's open-state indicators).
  const dockRef = useRef<WorkspaceDockHandle | null>(null)
  const [openWindows, setOpenWindows] = useState<OpenWindow[]>([])
  // Shared Inspector edge panel: the focused diagram window portals its
  // Properties/Layers into this outlet so one inspector serves all diagrams.
  const [inspectorOutlet, setInspectorOutlet] = useState<HTMLDivElement | null>(null)
  // Last-focused non-auxiliary window — drives the content-aware Inspector
  // (focusing the Inspector/Solution panels themselves doesn't change it).
  const [focusedWindow, setFocusedWindow] = useState<OpenWindow | null>(null)
  const openKinds = useMemo(() => openWindows.map((w) => w.kind), [openWindows])
  const openIds = useMemo(() => openWindows.map((w) => w.id), [openWindows])
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
  // Plots are addressed per-window now; only the setter is needed.
  const [, setActivePlotId] = useState<string | null>(null)
  // New plot creation is lifted to App (the sidebar "New …" actions) so the
  // config modal opens even though plots are now per-instance dock windows.
  // The kind decides which plot type the modal creates: xy / property / psychro.
  const [newPlotKind, setNewPlotKind] = useState<PlotKind | null>(null)
  const [diagrams, setDiagrams] = useState<DiagramSpec[]>(() =>
    boot?.diagrams?.length ? boot.diagrams : loadDiagrams(),
  )
  // Diagrams are addressed per-window now; we only need the setter (to track
  // the most-recently-created/focused diagram for new-window opening).
  const [, setActiveDiagramId] = useState<string | null>(() => {
    const list = boot?.diagrams?.length ? boot.diagrams : loadDiagrams()
    return list[0]?.id ?? null
  })
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
    // Restore the dock layout after React has applied the state updates above.
    // rAF ensures panelContent is rebuilt before dockview recreates the panels.
    requestAnimationFrame(() => dockRef.current?.restore(p.dockLayout))
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
      dockLayout: null,
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
    requestAnimationFrame(() => dockRef.current?.reset())
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
      // A successful equation solve auto-opens the Solution panel (the one
      // place this happens). Table solves don't trigger it.
      if (response.success) dockRef.current?.open('solution')
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
        dockRef.current?.open(action.tab)
      }
      if (action.diagramId) {
        const d = diagrams.find((x) => x.id === action.diagramId)
        if (d) dockRef.current?.openInstance(`diagram:${action.diagramId}`, 'diagram', d.name)
      }
      if (action.plotId) {
        const targetPlot = plots.find((p) => p.id === action.plotId)
        if (targetPlot) {
          dockRef.current?.openInstance(`plot:${action.plotId}`, 'plot', targetPlot.name)
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

  // Auto-close dock windows whose backing instance no longer exists — e.g. a
  // plot removed from its card, a deleted diagram/table, or a stale window
  // restored from a saved layout. Without this they'd render as blank panels.
  useEffect(() => {
    const valid = new Set<string>([
      'equations', 'table', 'plots', 'digitizer', 'solution', 'states', 'inspector',
      ...diagrams.map((d) => `diagram:${d.id}`),
      ...mergedPlots.map((p) => `plot:${p.id}`),
      ...tables.map((t) => `table:${t.id}`),
      ...(result?.stateTableDefs ?? checkResult?.stateTableDefs ?? []).map((s) => `state:${s.name}`),
    ])
    for (const w of openWindows) {
      if (!valid.has(w.id)) dockRef.current?.close(w.id)
    }
  }, [diagrams, mergedPlots, tables, openWindows, result?.stateTableDefs, checkResult?.stateTableDefs])

  // Keep dock tab titles in sync with instance names (so renames in the
  // Inspector show on the tabs). Deferred out of the commit cycle so dockview's
  // own re-render can't re-enter React mid-update.
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      for (const d of diagrams) dockRef.current?.setTitle(`diagram:${d.id}`, d.name)
      for (const p of mergedPlots) dockRef.current?.setTitle(`plot:${p.id}`, p.name)
      for (const t of tables) dockRef.current?.setTitle(`table:${t.id}`, t.name)
    })
    return () => cancelAnimationFrame(raf)
  }, [diagrams, mergedPlots, tables])

  const baseVariables =
    solutions.length > 0 ? solutions[0].variables : result?.variables ?? []

  // Fluid state tables declared with STATE TABLE blocks: surfaced in the left
  // Tables menu (tagged by fluid) and opened in the shared Fluid States window.
  const declaredStateDefs = result?.stateTableDefs ?? checkResult?.stateTableDefs ?? []

  // Use the mode that was active when the result was solved, not the live checkbox
  const resultIsComplex = result !== null && solvedComplexMode
  const solutionRows = resultIsComplex
    ? buildComplexSolutionRows(baseVariables, solutions)
    : buildRealSolutionRows(baseVariables, solutions)

  // Reusable window open/create handlers, shared by the left rail and the
  // command palette so both open real dock windows (not just highlight a tab).
  const createDiagram = () => {
    const id = crypto.randomUUID()
    const name = `Diagram ${diagrams.length + 1}`
    setDiagrams((prev) => [
      ...prev,
      { id, name, state: { elements: [], gridSize: 10, snap: true, showGrid: true } },
    ])
    setActiveDiagramId(id)
    // Defer until the new diagram's content entry exists in the next render.
    requestAnimationFrame(() => dockRef.current?.openInstance(`diagram:${id}`, 'diagram', name))
  }
  const createTable = (kind: 'parametric' | 'function-1d' | 'function-2d') => {
    const t =
      kind === 'parametric'
        ? newParamTable(tables)
        : newFunctionTable(tables, kind === 'function-1d')
    setTables((prev) => [...prev, t])
    setActiveTableId(t.id)
    requestAnimationFrame(() => dockRef.current?.openInstance(`table:${t.id}`, 'table', t.name))
  }
  const openLatestOrNewDiagram = () => {
    const d = diagrams[diagrams.length - 1]
    if (d) dockRef.current?.openInstance(`diagram:${d.id}`, 'diagram', d.name)
    else createDiagram()
  }
  const openLatestOrNewTable = () => {
    const t = tables[tables.length - 1]
    if (t) dockRef.current?.openInstance(`table:${t.id}`, 'table', t.name)
    else createTable('parametric')
  }
  const openLatestOrNewPlot = () => {
    const p = mergedPlots[mergedPlots.length - 1]
    if (p) dockRef.current?.openInstance(`plot:${p.id}`, 'plot', p.name)
    else setNewPlotKind('xy')
  }

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
        { id: 'view-editor', label: 'Editor', leftSection: <IconCode size={18} />, onClick: () => dockRef.current?.open('equations') },
        { id: 'view-table', label: 'Tables', description: 'Open the latest table (or create one)', leftSection: <IconTable size={18} />, onClick: openLatestOrNewTable },
        { id: 'view-plots', label: 'Plots', description: 'Open the latest plot (or create one)', leftSection: <IconChartLine size={18} />, onClick: openLatestOrNewPlot },
        { id: 'view-states', label: 'Fluid States', leftSection: <IconTemperature size={18} />, onClick: () => {
          const first = declaredStateDefs[0]
          if (first) dockRef.current?.openInstance(`state:${first.name}`, 'states', first.name)
          else dockRef.current?.open('states')
        } },
        { id: 'view-digitizer', label: 'Graph Digitizer', leftSection: <IconChartGridDots size={18} />, onClick: () => dockRef.current?.open('digitizer') },
        { id: 'view-diagram', label: 'Diagram', description: 'Open the latest diagram (or create one)', leftSection: <IconSchema size={18} />, onClick: openLatestOrNewDiagram },
        { id: 'view-solution', label: 'Solution', leftSection: <IconChecks size={18} />, onClick: () => dockRef.current?.open('solution') },
        { id: 'view-inspector', label: 'Inspector', leftSection: <IconSettings size={18} />, onClick: () => dockRef.current?.open('inspector') },
      ],
    },
    {
      group: 'Create',
      actions: [
        { id: 'new-param-table', label: 'Add parametric table', leftSection: <IconTable size={18} />, onClick: () => createTable('parametric') },
        { id: 'new-xy-plot', label: 'Add graph (X-Y)', leftSection: <IconChartLine size={18} />, onClick: () => setNewPlotKind('xy') },
        { id: 'new-property-plot', label: 'Add property graph', leftSection: <IconTemperature size={18} />, onClick: () => setNewPlotKind('property') },
        { id: 'new-psychro-plot', label: 'Add psychrometric graph', leftSection: <IconTemperature size={18} />, onClick: () => setNewPlotKind('psychro') },
        { id: 'new-diagram', label: 'Add diagram', leftSection: <IconSchema size={18} />, onClick: createDiagram },
        { id: 'new-state-table', label: 'Add fluid state table', description: 'Insert a STATE TABLE block (fluid-aware circuit) at the caret', leftSection: <IconTemperature size={18} />, onClick: () => insertFunction('STATE TABLE Circuit1(P1, T1, h2)\n  FLUID = Water\nEND\n') },
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

  // Content for each dockview window kind. Recomputed every render and read by
  // the dock through context; closed panels create the element but never mount.
  const panelPad: React.CSSProperties = {
    height: '100%',
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    padding: 'var(--mantine-spacing-md)',
    overflow: 'auto',
  }
  // Plot windows must let the chart fill exactly (no scroll), so the wrapper is
  // a non-scrolling flex column with a tight pad.
  const plotPanelStyle: React.CSSProperties = {
    height: '100%',
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    padding: 'var(--mantine-spacing-xs)',
    overflow: 'hidden',
  }
  const PLOT_KIND_LABEL: Record<PlotKind, string> = {
    xy: 'X-Y',
    property: 'Property',
    psychro: 'Psychrometric',
  }
  const panelContent: Record<string, ReactNode> = {
    equations: (
      <div style={panelPad}>
        {errorLine != null && (
          <Alert color="red" variant="light" p="xs" mb={6} title="Syntax error">
            <Group justify="space-between" wrap="nowrap" gap="xs">
              <Text size="xs">Syntax error on line {errorLine}.</Text>
              <Button size="compact-xs" variant="light" color="red" onClick={() => goToLine(errorLine)}>
                Go to line {errorLine}
              </Button>
            </Group>
          </Alert>
        )}
        {showFirstRun && (
          <Alert color="teal" variant="light" p="xs" mb={6} withCloseButton onClose={dismissFirstRun} title="Welcome to frees">
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
            title={`${unitWarnings.length} unit consistency warning${unitWarnings.length === 1 ? '' : 's'}`}
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
      </div>
    ),
    states: (
      <div style={panelPad}>
        <Group justify="space-between" mb="xs" wrap="nowrap" align="center">
          <Title order={5} c="teal.4">Fluid State Table</Title>
          <Text size="xs" c="dimmed">Solved state points</Text>
        </Group>
        <StatesTab
          solvedVariables={result?.variables ?? []}
          stateTableDefs={result?.stateTableDefs ?? checkResult?.stateTableDefs ?? []}
          unitIds={stateUnitIds}
          onUnitIdsChange={handleStateUnitIdsChange}
          onFillMissing={() => onSolve(true)}
          solving={solving}
          solvable={solvable}
        />
      </div>
    ),
    digitizer: (
      <div style={{ height: '100%', minHeight: 0 }}>
        <DigitizerTab key={`digitizer-${workspaceEpoch}`} onSendToFunctionTable={sendDigitizedToFunctionTable} />
      </div>
    ),
    inspector: (() => {
      const fw = focusedWindow
      const headerStyle: React.CSSProperties = { padding: '6px 10px' }
      const bodyStyle: React.CSSProperties = { flex: 1, minHeight: 0, overflow: 'auto', padding: 10 }

      // Diagram: render the portal outlet (DiagramTab pushes its Properties/
      // Layers in) plus a rename field for the focused diagram.
      if (fw?.kind === 'diagram') {
        const d = diagrams.find((x) => `diagram:${x.id}` === fw.id)
        return (
          <div style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={headerStyle}>
              <TextInput
                size="xs"
                label="Diagram name"
                value={d?.name ?? ''}
                onChange={(e) => {
                  const value = e.currentTarget.value
                  if (d) setDiagrams((prev) => prev.map((x) => (x.id === d.id ? { ...x, name: value } : x)))
                }}
              />
            </div>
            <div ref={setInspectorOutlet} style={{ flex: 1, minHeight: 0, overflow: 'auto' }} />
          </div>
        )
      }

      // Table: rename + the parametric table's quick actions.
      if (fw?.kind === 'table') {
        const t = tables.find((x) => `table:${x.id}` === fw.id)
        return (
          <div style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ ...bodyStyle }}>
              <Stack gap="xs">
                <Text size="sm" fw={600} c="teal.4">Table</Text>
                <TextInput
                  size="xs"
                  label="Table name"
                  value={t?.name ?? ''}
                  disabled={!t || t.source === 'code'}
                  onChange={(e) => {
                    const value = e.currentTarget.value
                    if (t) setTables((prev) => prev.map((x) => (x.id === t.id ? { ...x, name: value } : x)))
                  }}
                />
                {t?.kind === 'parametric' ? (
                  <>
                    <Button size="xs" variant="default" onClick={() => { setActiveTableId(t.id); setShowConfigureTable(true) }}>
                      Configure Columns
                    </Button>
                    <Group grow>
                      <Button size="xs" variant="default" onClick={() => updateParamTable(t.id, (pt) => invalidateActiveParam({ ...pt, rows: [...pt.rows, newParamRow()] }))}>
                        Add Row
                      </Button>
                      <Button size="xs" variant="default" onClick={() => updateParamTable(t.id, (pt) => invalidateActiveParam({ ...pt, rows: pt.rows.slice(0, -1) }))}>
                        Remove Row
                      </Button>
                    </Group>
                    <Button size="xs" variant="default" color="gray" onClick={() => updateParamTable(t.id, (pt) => ({ ...pt, results: [] }))}>
                      Clear Results
                    </Button>
                  </>
                ) : (
                  <Text size="xs" c="dimmed">Function table — edit values in the table window.</Text>
                )}
              </Stack>
            </div>
          </div>
        )
      }

      // Plot: rename (user plots) + delete; configure/export live on the card.
      if (fw?.kind === 'plot') {
        const p = mergedPlots.find((x) => `plot:${x.id}` === fw.id)
        return (
          <div style={bodyStyle}>
            <Stack gap="xs">
              <Text size="sm" fw={600} c="teal.4">{p ? PLOT_KIND_LABEL[p.kind] : 'Plot'}</Text>
              <TextInput
                size="xs"
                label="Plot name"
                value={p?.name ?? ''}
                disabled={!p || p.fromCode}
                onChange={(e) => {
                  const value = e.currentTarget.value
                  if (p) handlePlotsChange(plots.map((x) => (x.id === p.id ? { ...x, name: value } : x)))
                }}
              />
              <Text size="xs" c="dimmed">Configure and Export are on the plot's toolbar.</Text>
              {p && !p.fromCode && (
                <Button size="xs" variant="light" color="red" onClick={() => handlePlotsChange(plots.filter((x) => x.id !== p.id))}>
                  Delete plot
                </Button>
              )}
            </Stack>
          </div>
        )
      }

      // Equations: surface the equation tools.
      if (fw?.kind === 'equations') {
        return (
          <div style={bodyStyle}>
            <Stack gap="xs">
              <Text size="sm" fw={600} c="teal.4">Equations</Text>
              <Button size="xs" variant="default" onClick={() => setShowVariableInfo(true)}>Variable Information</Button>
              <Button size="xs" variant="default" onClick={() => setShowMinMax(true)}>Min / Max (optimize)</Button>
              <Button size="xs" variant="default" onClick={() => setShowCurveFit(true)}>Curve Fit</Button>
              <Divider my="xs" />
              <Text size="xs" c="dimmed">Edit equations in the Editor; press Solve (F2) to compute. Results appear in the Solution panel.</Text>
            </Stack>
          </div>
        )
      }

      return (
        <div style={bodyStyle}>
          <Text size="xs" c="dimmed">Focus a window (Diagram, Table, Plot, Editor) to inspect it here.</Text>
        </div>
      )
    })(),
    solution: (
      <div style={{ height: '100%', minHeight: 0 }}>
        <SolutionPanel
          showTable={activeTab === 'table' && activeParam !== null}
          solveCount={solveCount}
          tableStats={tableStats}
          result={result}
          rows={solutionRows}
          onCollapse={() => dockRef.current?.close('solution')}
          onOpenExamples={() => setShowExamples(true)}
        />
      </div>
    ),
  }
  const panelTitles: Record<string, string> = {
    equations: 'Editor',
    table: 'Tables',
    plots: 'Plots',
    digitizer: 'Digitizer',
    solution: 'Solution',
    states: 'Fluid States',
    inspector: 'Inspector',
  }

  // Per-instance Diagram windows: each diagram opens as its own dock window
  // ("diagram:<id>"), so several diagrams can sit side by side as windows.
  for (const d of diagrams) {
    const winId = `diagram:${d.id}`
    panelTitles[winId] = d.name
    panelContent[winId] = (
      <div style={{ height: '100%', minHeight: 0 }}>
        <DiagramTab
          key={`diagram-${d.id}-${workspaceEpoch}`}
          singleDiagramId={d.id}
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
          activeDiagramId={d.id}
          onDiagramsChange={setDiagrams}
          onActiveDiagramIdChange={setActiveDiagramId}
          inspectorOutlet={inspectorOutlet}
          isActive={focusedWindow?.id === `diagram:${d.id}`}
        />
      </div>
    )
  }

  // Per-instance Plot windows: every plot (X-Y, property diagram, or
  // psychrometric chart) opens as its own dock window ("plot:<id>"). Plot data
  // is global solve output, so these are self-contained. A kind chip
  // distinguishes thermo (property/psychro) windows from X-Y plots.
  for (const pl of mergedPlots) {
    const winId = `plot:${pl.id}`
    const isThermo = pl.kind === 'property' || pl.kind === 'psychro'
    panelTitles[winId] = pl.name
    panelContent[winId] = (
      <div style={plotPanelStyle}>
        <Group justify="space-between" mb={4} wrap="nowrap" align="center" style={{ flexShrink: 0 }}>
          <Badge size="xs" variant="light" color={isThermo ? 'teal' : 'blue'}>
            {PLOT_KIND_LABEL[pl.kind]}
          </Badge>
        </Group>
        <PlotTab
          kinds={[pl.kind]}
          singlePlotId={pl.id}
          emptyHint="This plot was removed."
          plots={mergedPlots}
          onPlotsChange={handlePlotsChange}
          solvedVariables={result?.variables ?? []}
          stateTableDefs={declaredStateDefs}
          cyclePath={result?.cyclePath}
          tableVars={tableVars}
          rows={paramRows}
          results={tableResults}
          activePlotId={pl.id}
          onActivePlotIdChange={setActivePlotId}
        />
      </div>
    )
  }

  // Per-instance STATE TABLE windows: each declared STATE TABLE block gets its
  // own dock window ("state:<name>") so Water/R134a circuits sit side by side.
  for (const s of declaredStateDefs) {
    const winId = `state:${s.name}`
    panelTitles[winId] = s.name
    panelContent[winId] = (
      <div style={panelPad}>
        <Group justify="space-between" mb="xs" wrap="nowrap" align="center">
          {s.fluid && (
            <Badge size="xs" variant="light" color="teal">{s.fluid}</Badge>
          )}
          <Text size="xs" c="dimmed">Solved state points</Text>
        </Group>
        <StatesTab
          solvedVariables={result?.variables ?? []}
          stateTableDefs={[s]}
          unitIds={stateUnitIds}
          onUnitIdsChange={handleStateUnitIdsChange}
          onFillMissing={() => onSolve(true)}
          solving={solving}
          solvable={solvable}
        />
      </div>
    )
  }

  // Per-instance Table windows: each table opens as its own dock window
  // ("table:<id>"). Each window reads its own spec's rows/results and routes
  // edits to that specific table id (decoupled from the "active" table).
  for (const t of tables) {
    const winId = `table:${t.id}`
    const param = t.kind === 'parametric' ? t : null
    panelTitles[winId] = t.name
    panelContent[winId] = (
      <div style={panelPad}>
        <TablesTab
          tables={tables}
          singleTableId={t.id}
          activeTableId={t.id}
          onTablesChange={setTables}
          onActiveTableIdChange={setActiveTableId}
          tableVars={param?.vars ?? []}
          rows={param?.rows ?? []}
          results={param?.results ?? []}
          varDrafts={varDrafts}
          onConfigure={() => {
            setActiveTableId(t.id)
            setShowConfigureTable(true)
          }}
          onAddRow={() =>
            updateParamTable(t.id, (pt) => invalidateActiveParam({ ...pt, rows: [...pt.rows, newParamRow()] }))
          }
          onRemoveRow={() =>
            updateParamTable(t.id, (pt) => invalidateActiveParam({ ...pt, rows: pt.rows.slice(0, -1) }))
          }
          onClearResults={() => updateParamTable(t.id, (pt) => ({ ...pt, results: [] }))}
          onAlterColumn={(name) => {
            setActiveTableId(t.id)
            setAlterColumn(name)
          }}
          onColumnUnitsChange={setColumnUnits}
          onCellChange={(rowIndex, name, value) =>
            updateParamTable(t.id, (pt) =>
              invalidateActiveParam({
                ...pt,
                rows: pt.rows.map((row, i) =>
                  i === rowIndex ? { ...row, values: { ...row.values, [name]: value } } : row,
                ),
              }),
            )
          }
        />
      </div>
    )
  }

  return (
    <Flex h="100vh" style={{ overflow: 'hidden' }}>
      <Rail
        active={activeTab}
        openKinds={openKinds}
        openIds={openIds}
        diagrams={diagrams.map((d) => ({ id: d.id, name: d.name, deletable: true }))}
        plots={mergedPlots.map((p) => ({ id: p.id, name: p.name, tag: PLOT_KIND_LABEL[p.kind], deletable: !p.fromCode }))}
        plotCount={mergedPlots.length}
        onOpenPlot={(id) => {
          const p = mergedPlots.find((x) => x.id === id)
          if (p) dockRef.current?.openInstance(`plot:${id}`, 'plot', p.name)
        }}
        onNewPlot={(kind) => setNewPlotKind(kind)}
        onDeletePlot={(id) => handlePlotsChange(plots.filter((p) => p.id !== id))}
        diagramCount={diagrams.length}
        onDeleteDiagram={(id) => setDiagrams((prev) => prev.filter((d) => d.id !== id))}
        workspaceTables={[
          ...tables.map((t) => ({ id: t.id, name: t.name, deletable: t.source !== 'code' })),
          // Declared STATE TABLE blocks appear as read-only entries that open
          // the shared Fluid States window, tagged with their fluid.
          ...declaredStateDefs.map((s) => ({
            id: `state:${s.name}`,
            name: s.name,
            tag: s.fluid ?? 'States',
            deletable: false,
          })),
        ]}
        tableCount={tables.length + declaredStateDefs.length}
        onOpenTable={(id) => {
          if (id.startsWith('state:')) {
            const name = id.slice('state:'.length)
            dockRef.current?.openInstance(id, 'states', name)
            return
          }
          const t = tables.find((x) => x.id === id)
          if (t) dockRef.current?.openInstance(`table:${id}`, 'table', t.name)
        }}
        onDeleteTable={(id) => setTables((prev) => prev.filter((t) => t.id !== id))}
        onOpenStates={() => {
          const first = declaredStateDefs[0]
          if (first) dockRef.current?.openInstance(`state:${first.name}`, 'states', first.name)
          else dockRef.current?.open('states')
        }}
        onNewTable={(kind) => createTable(kind)}
        onSelect={(kind) => dockRef.current?.open(kind)}
        onClose={(kind) => dockRef.current?.close(kind)}
        onOpenDiagram={(id) => {
          const d = diagrams.find((x) => x.id === id)
          if (d) dockRef.current?.openInstance(`diagram:${id}`, 'diagram', d.name)
        }}
        onNewDiagram={createDiagram}
        onResetLayout={() => dockRef.current?.reset()}
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
          onOpenInspector={() => dockRef.current?.open('inspector')}
          onOpenSolution={() => dockRef.current?.open('solution')}
        />
        <input
          ref={projectFileRef}
          type="file"
          accept=".frees,application/json"
          style={{ display: 'none' }}
          onChange={onProjectFileSelected}
        />

        <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
          <WorkspaceDock
            content={panelContent}
            titles={panelTitles}
            defaultOpen={['equations', 'inspector', 'solution']}
            edgeKinds={['solution', 'inspector']}
            onActiveChange={(active) => {
              setActiveTab(active?.kind ?? '')
              // Focusing a table window makes it the "active" table so the
              // shared Solve-Table / Configure / Alter actions target it.
              if (active?.kind === 'table' && active.id.startsWith('table:')) {
                setActiveTableId(active.id.slice('table:'.length))
              }
              // The Inspector reflects the last-focused main window; focusing
              // the auxiliary Inspector/Solution panels must not change it.
              if (active && active.kind !== 'inspector' && active.kind !== 'solution') {
                setFocusedWindow(active)
              }
            }}
            onOpenChange={setOpenWindows}
            handleRef={dockRef}
          />
        </div>
      </Flex>

      {newPlotKind && (
        <PlotConfigModal
          spec={null}
          allowedKinds={[newPlotKind]}
          defaultName={`${PLOT_KIND_LABEL[newPlotKind]} ${mergedPlots.filter((p) => p.kind === newPlotKind).length + 1}`}
          fluids={fluids}
          tableVars={tableVars}
          hasStates={detectStates(result?.variables ?? []).indices.length > 0}
          onSave={(spec) => {
            handlePlotsChange([...plots, spec])
            setActivePlotId(spec.id)
            setNewPlotKind(null)
            requestAnimationFrame(() => dockRef.current?.openInstance(`plot:${spec.id}`, 'plot', spec.name))
          }}
          onClose={() => setNewPlotKind(null)}
        />
      )}
    </Flex>
  )
}
