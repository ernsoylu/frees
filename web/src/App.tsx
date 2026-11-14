import { tableInputIssues } from './tableValidation'
import { resolvePlotSource } from './plots/sources'
import { CANVAS_COMMANDS, keysOf, runCanvasCommand } from './schematic/commands'
import type { SchematicHandoff } from './schematic/SchematicTab'
import { flushSync } from 'react-dom'
import { helpUrl } from './helpUrl'
import { ChangeEvent, lazy, startTransition, Suspense, useCallback, useEffect, useEffectEvent, useMemo, useState, useRef, type ReactNode } from 'react'
import {
  Alert,
  Anchor,
  Badge,
  Button,
  Center,
  Flex,
  Group,
  Loader,
  Stack,
  Text,
  TextInput,
  Title,
  useComputedColorScheme,
  useMantineColorScheme,
} from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { Spotlight, SpotlightActionGroupData, spotlight } from '@mantine/spotlight'
import { PLOT_TAB_MENU, commandForKey, commandPaletteGroups, menuCommands, resolveCommands, type CommandId, type Commands } from './commands'
import {
  IconSitemap,
  IconHelp,
  IconInfoCircle,
  IconMathFunction,
  IconPlayerPlayFilled,
  IconSearch,
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { buildShareUrl, clearRawDocumentUrl, clearShareHash, deriveProjectTitle, fetchRawDocument, MAX_SHARE_URL_CHARS, readShareHash, sharedDocumentOf, timelineOfLog, type SharedDocument } from './share'
import { openPrintReport } from './report'
import {
  check,
  CheckResponse,
  DEFAULT_STOP_CRITERIA,
  getFluids,
  solve,
  solveRequest,
  stopSolve,
  replClear,
  solveTable,
  runMonteCarlo,
  runSensitivity,
  extractPlant,
  OdeTableDto,
  SolveResponse,
  StopCriteria,
  UnitSystem,
  UNIT_SYSTEM_OPTIONS,
  VariableInfo,
  VariableResult,
} from './api'
import { ModelRevisionTracker } from './modelRevision'
import { canvasInputLine, liftCanvasInputs, type CanvasInput } from './liveCanvas'
import type { LiveStore } from './liveStore'
import type { LiveTable } from './wasm/liveClient'
import type { LiveControl } from './schematic/LiveControls'
import { findPin, pinnableParameters, sliderOverrideEquation, sliderRange, withSliderBounds, type PinnedSlider } from './sliders'
import type { SeriesId } from './preferredValues'
import { compareRuns, describeRun, DOCUMENT_INPUTS, EMPTY_SCENARIOS, runStatus, sampleOf, scenarioOverrides, type Baseline, type ScenarioState } from './runs'
import { playbackVariables, timeLabel, timelineOf, type Timeline } from './playback'
import { getWorkerPoolConcurrency, wasmUnitConversions } from './wasm/engineClient'
import { contextHandler, useContextVersion } from './contextActions'
import { readRibbon, readRibbonDensity, writeRibbonDensity, type RibbonDensity } from './ribbonPrefs'
import { StatusBar } from './StatusBar'
const PreferencesModal = lazy(() => import('./PreferencesModal'))
const AboutModal = lazy(() => import('./AboutModal'))
import VariableInfoModal, {
  DEFAULT_DRAFT,
  parseBound,
  VariableDraft,
} from './VariableInfoModal'

const ConfigureTableModal = lazy(() => import('./ConfigureTableModal'))
const AlterValuesModal = lazy(() => import('./AlterValuesModal'))
const TablesTab = lazy(() => import('./TablesTab'))
import {
  functionTableFromDigitizer,
  detachLegacyFormulas,
  FunctionTableSpec,
  loadTables,
  mergeCodeTables,
  newFunctionTable,
  newParamRow,
  newParamTable,
  ParamTableSpec,
  sameParamInputs,
  saveTables,
  TableSpec,
  toFunctionTableDtos,
  paramTableFromDto,
} from './tables'
import { applyFunctionSpecs } from './tablesGrid/composeTables'
const StatesTab = lazy(() => import('./StatesTab'))
import type { DigitizedExport } from './DigitizerTab'
import {
  flushTablesWorkbook,
  isHostedTable,
  requestTablesCsvImport,
  TABLES_WORKBOOK_WINDOW_ID,
} from './tablesGrid/tablesWorkbookBridge'
import { applyColumnFill } from './tablesGrid/tableGridModel'
import { downloadValuesAsCsv } from './tablesGrid/csv'

// The Digitizer tab is a large, self-contained editor that most
// sessions never open, so they are code-split and only fetched when their tab
// is first shown (wrapped in <Suspense> at their render sites below).
const SchematicTab = lazy(() => import('./schematic/SchematicTab'))
const LessonPanel = lazy(() => import('./LessonPanel'))
import { declaredInstances } from './schematic/declaration'
import { diagnosisOwners, LOCAL_ENGINE_FAILURE, withEnclosing } from './schematic/wiring'
import { EMPTY_PRESENTATION, type SchematicPresentation } from './schematic/presentation'
import { instanceAt } from './schematic/sourceEdit'
const DigitizerTab = lazy(() =>
  import('./DigitizerTab').then((m) => ({ default: m.DigitizerTab })),
)
// The Tables workbook — native glide-data-grid implementation (decision D10;
// it replaced the Univer-bound-sheets TablesWorkbookTab). Lazy so sessions
// that never open it don't fetch the grid.
const TablesWorkbookTab = lazy(() => import('./tablesGrid/TablesGridTab'))
// Lazy: pulls the full 58 KB example catalog only when the picker opens.
const ExamplesModal = lazy(() => import('./ExamplesModal'))
const OpenUrlModal = lazy(() => import('./OpenUrlModal'))

// The Plot tab (and its Plotly figure builders) plus the optimization and
// plot-config modals are also code-split: the Plotly figure machinery is large
// and only needed once a plot window is opened or a modal is invoked.
const PlotTab = lazy(() => import('./PlotTab'))
const ComponentWizardModal = lazy(() => import('./ComponentWizardModal'))
const SliderStrip = lazy(() => import('./SliderStrip'))
const RunsPanel = lazy(() => import('./RunsPanel'))
const PlaybackBar = lazy(() => import('./PlaybackBar'))
const LiveBar = lazy(() => import('./LiveBar'))
const PlotConfigModal = lazy(() => import('./plots/PlotConfigModal'))
const MonteCarloModal = lazy(() => import('./MonteCarloModal'))
const SensitivityModal = lazy(() => import('./SensitivityModal'))
const MinMaxModal = lazy(() => import('./MinMaxModal'))
const CurveFitModal = lazy(() => import('./CurveFitModal'))
const ParameterFitModal = lazy(() => import('./ParameterFitModal'))
const PidTunerModal = lazy(() => import('./PidTunerModal'))
type PidType = 'p' | 'pi' | 'pid'
// Clipped (decision D5): the Min/Max, Curve Fit, PID Tuner, Monte Carlo and
// Parameter Fit modals launched engine features that only exist as
// NOT_IN_BROWSER_ENGINE stubs in api.ts. The stubs (and the pidLoop /
// pidGainRewrite helpers) remain as the wiring seam; the UI stops promising
// what the engine cannot do.

const lazyTabFallback = (
  <Center h="100%">
    <Loader color="teal" />
  </Center>
)
import { PlotSpec, PlotKind } from './plots/types'
import { plotDefToSpec } from './plots/fromCode'
const Workspace = lazy(() => import('./Workspace'))
const ReplTerminal = lazy(() => import('./ReplTerminal'))
const MobileLayout = lazy(() => import('./MobileLayout'))
import { DOCS_TOPICS } from './docsTopics'
const ShortcutsModal = lazy(() => import('./ShortcutsModal'))
const FunctionBrowserModal = lazy(() => import('./FunctionBrowserModal'))
const GettingStartedModal = lazy(() => import('./GettingStartedModal'))
import { DEFAULT_EXAMPLE_TEXT } from './defaultExample'
import type { Example } from './examples'
import { lessonFor, LESSONS, type Lesson } from './lessons'
import type { LabResult, LabTimelineEntry } from './labs'
import { clearExampleParam, EMBED, fullAppUrl } from './embed'
import type { EquationEditorHandle } from './EquationEditor'
const EquationEditor = lazy(() => import('./EquationEditor'))
import {
  ConfirmModal,
  MessageModal,
  ProjectConflictModal,
  SaveCheckModal,
  SharedLinkModal,
  TextPromptModal,
} from './dialogs'
import { Rail, TopBar, tablePill } from './WorkspaceChrome'
import type { WorkspaceDockHandle, OpenWindow } from './workspace/WorkspaceDock'
import { windowActionReason, type WindowAction } from './workspace/windowActions'
import { WindowListModal } from './WindowListModal'
import { clearKeptState } from './keptState'
import { LayoutsModal } from './LayoutsModal'
import { deleteLayout, layoutForm, readLayouts, renameLayout, saveLayout, writeLayouts, type LayoutStore } from './workspace/layouts'
const WorkspaceDock = lazy(() => import('./workspace/WorkspaceDock').then(m => ({ default: m.WorkspaceDock })))
import { detectStates } from './plots/stateTable'
import { formatValue, withStableKeys } from './format'
import { rewritePidGains } from './pidGainRewrite'
import type { ComponentGroup } from './Workspace'
import { analyzePidLoop } from './pidLoop'
import { FUNCTION_CATEGORIES, catalogFunctionNames } from './functionCatalog'
import {
  buildProject,
  clearProjectLocal,
  FREES_FILE_TYPES,
  FreesProject,
  loadProjectLocal,
  ProjectSlices,
  readProjectFile,
  downloadEquationText,
  projectOnlyNotes,
  saveProject,
  saveProjectLocal,
  saveProjectToHandle,
  type AnalyzerSpec,
  type SpreadsheetSpec,
  writeBridgedKeys,
} from './project'
import {
  clearAutosaveMirror,
  clearFileLink,
  copyName,
  listStoredProjects,
  loadStoredProjectRev,
  mirrorIsNewer,
  readAutosaveMirror,
  readFileLink,
  saveStoredProject,
  subscribeLibraryChanges,
  writeAutosaveMirror,
  writeFileLink,
  type ExpectedRev,
  type SaveOutcome,
  type StoredProjectMeta,
} from './projectStore'
import { queryWritePermission, saveTarget, type SaveProvenance } from './saveTarget'
import { ProjectLibraryModal } from './ProjectLibraryModal'

const STOP_CRITERIA_KEY = 'frees.stopCriteria'
const UNIT_SYSTEM_KEY = 'frees.unitSystem'
const FIRST_RUN_KEY = 'frees.firstRunDismissed'
const GETTING_STARTED_KEY = 'frees.gettingStartedSeen'

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


/** Returns a copy of {@code items} with the matching id's name replaced. */
function renameById<T extends { id: string; name: string }>(items: T[], id: string, name: string): T[] {
  return items.map((x) => (x.id === id ? { ...x, name } : x))
}

/** One-time D10 compatibility notice for a loaded project that carries
 *  spreadsheet data: the feature is removed, the data is preserved inert.
 *  Returns null when the project has no spreadsheets. */
function spreadsheetNotice(spreadsheets: SpreadsheetSpec[] | undefined): string | null {
  const n = spreadsheets?.length ?? 0
  if (n === 0) return null
  return (
    `This project contains ${n} spreadsheet${n === 1 ? '' : 's'}; the spreadsheet ` +
    'feature was removed — the data is preserved in the file but not shown.'
  )
}

/** The same one-time notice for D11's removed Data Analyzer: the `analyzers`
 *  array is carried inert and written back on save, never destroyed.
 *  Returns null when the project has no analyzer windows. */
function analyzerNotice(analyzers: AnalyzerSpec[] | undefined): string | null {
  const n = analyzers?.length ?? 0
  if (n === 0) return null
  return (
    `This project contains ${n} analyzer window${n === 1 ? '' : 's'}; the Data Analyzer ` +
    'was removed — the data is preserved in the file but not shown. Import a CSV as a ' +
    'function table from the Tables window instead.'
  )
}

/** First finite value supplied for each table input column (table-check semantics). */
function firstFilledValues(tVars: string[], tRows: { values: Record<string, string> }[]): Map<string, number> {
  const filled = new Map<string, number>()
  for (const name of tVars) {
    for (const row of tRows) {
      const raw = (row.values[name] ?? '').trim()
      if (raw !== '' && Number.isFinite(Number(raw))) {
        filled.set(name, Number(raw))
        break
      }
    }
  }
  return filled
}

/** Merges backend-inferred units into the variable drafts, never overriding a
 *  unit the user set explicitly. */
function mergeInferredUnits(
  drafts: Record<string, VariableDraft>,
  variables: string[],
  inferredUnits: Record<string, string>,
): Record<string, VariableDraft> {
  const next: Record<string, VariableDraft> = { ...drafts }
  for (const name of variables) {
    const existing = next[name] ?? { ...DEFAULT_DRAFT }
    next[name] = { ...existing }
    if (!existing.isUnitsUserSet) {
      next[name].units = inferredUnits[name] ?? existing.units ?? ''
    }
  }
  return next
}

/** A REPL-defined/changed variable as a frees equation string for the solve
 *  override list, e.g. {@code {name:'eta',value:0.75,units:''}} → "eta = 0.75",
 *  {@code {name:'P',value:250000,units:'Pa'}} → "P = 250000 [Pa]". */
function replOverrideEquation(v: VariableResult): string {
  const unit = v.units && v.units !== '-' ? ` [${v.units}]` : ''
  return `${v.name} = ${v.value}${unit}`
}

/**
 * The `#share=` payload for this page load, read **once, before React renders**.
 *
 * This used to live inside the component behind a `useRef` guard, and that was
 * a real bug rather than a style problem. Reading the hash and calling
 * `clearShareHash()` are both side effects, and React is free to throw a render
 * away and retry it — which the boot path invites, because it is full of lazy
 * children that suspend. A discarded render loses the ref but *not* the cleared
 * hash, so the retry found no payload, fell through to `loadProjectLocal()`,
 * and booted the welcome document. That is exactly the reported symptom: one
 * confirmation prompt, then the default example. Module scope runs once per
 * page load and cannot be replayed.
 *
 * `conflicts` is true only when opening the link would discard a *different*
 * autosaved workspace — the one case worth interrupting the user for.
 *
 * Only the *read* happens here. `clearShareHash()` deliberately does not:
 * a `history.replaceState` issued during module evaluation runs before the
 * navigation has committed, and the browser then re-applies the fragment, so
 * the hash survived and a refresh re-imported the link — the exact behaviour
 * `clearShareHash` exists to prevent. It runs from a mount effect instead,
 * which is after commit and, unlike a render body, never replayed.
 */
const SHARE_READ = readShareHash(globalThis.location.hash)
const SHARED_BOOT: { doc: SharedDocument; conflicts: boolean } | null = (() => {
  const shared = sharedDocumentOf(SHARE_READ)
  if (shared === null) return null
  // I4: an embed never reads the visitor's own workspace, so it never conflicts.
  const saved = EMBED.embed ? null : loadProjectLocal()
  return { doc: shared, conflicts: saved?.text != null && saved.text !== shared.text }
})()
/** I6: a link that carries lesson settings, not only the document. */
const carriesSettings = (d: SharedDocument) => d.lesson !== undefined || d.sliders !== undefined || d.timeline !== undefined

// Capture before effects consume the URL; valid #share= links take precedence.
const RAW_DOCUMENT_URL = new URLSearchParams(globalThis.location.search).get('url')

export default function App() {
  const isMobile = useMediaQuery('(max-width: 768px)')

  // Story 10.10: restore the whole workspace from the unified `.frees` project
  // (autosaved to localStorage). Computed once before any state initializer so
  // every slice below can seed from it, falling back to the legacy per-feature
  // keys when no unified project exists (one-time migration). Child-owned slices
  // (digitizer, custom components) self-restore from their own keys, so they are
  // intentionally not written back here on reload.
  // A #share= link carries a whole document in the URL fragment (share.ts).
  // Opening one replaces the workspace — the same semantics as loading an
  // example — so when an autosaved project exists the user must confirm.
  // The hash is stripped immediately either way: a reload must return to the
  // user's own work, not re-import the link.
  // Nothing to lose (no autosave, or the same document) → the link opens
  // straight into the editor, as before. Otherwise it waits for
  // `SharedLinkModal` below, which replaces the old blocking
  // `globalThis.confirm()` — a browser-chrome dialog that also stalled the
  // boot render while it was open.
  const sharedBoot = SHARED_BOOT !== null && !SHARED_BOOT.conflicts ? SHARED_BOOT.doc.text : null
  const [shareOffer, setShareOffer] = useState<SharedDocument | null>(
    SHARED_BOOT !== null && SHARED_BOOT.conflicts ? SHARED_BOOT.doc : null,
  )

  const bootRef = useRef<FreesProject | null | undefined>(undefined)
  if (bootRef.current === undefined) bootRef.current = sharedBoot !== null || EMBED.embed ? null : loadProjectLocal()
  const boot = bootRef.current

  const [projectName, setProjectName] = useState('untitled')
  const [workspaceEpoch, setWorkspaceEpoch] = useState(0)
  // A draft kept past its dialog names this project's variables and tables: forget it with the project.
  useEffect(() => clearKeptState, [workspaceEpoch])
  const projectFileRef = useRef<HTMLInputElement>(null)

  const [text, setText] = useState(sharedBoot ?? boot?.text ?? EXAMPLE)
  // Always-current editor document. The editor is uncontrolled after mount, so
  // every keystroke lands here synchronously while the `text` state above (which
  // drives autosave/dirty-tracking/modals) trails behind in a low-priority
  // transition, keeping the full App re-render off the typing critical path.
  // Event-time readers (solve/check/save) must use this ref, not `text`.
  const textRef = useRef(text)
  const modelRevisionRef = useRef(new ModelRevisionTracker())
  // Live-lint plumbing: debounce timer + a ref to the latest idle checker
  // (assigned each render, next to onCheck) so the timer never runs stale.
  const idleCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const idleCheckRef = useRef<() => void>(() => {})
  useEffect(() => () => {
    if (idleCheckTimer.current) clearTimeout(idleCheckTimer.current)
  }, [])

  // Share-by-URL: compress the current document into a self-contained link
  // and put it on the clipboard. Refuses documents whose link would be too
  // long to survive chat apps and proxies (share.ts sets the ceiling).
  const openPidTunerFor = useCallback((c: ComponentGroup) => {
    const gain = (key: string): number => {
      const p = c.params.find((x) => x.name.toLowerCase() === key)
      return typeof p?.value === 'number' ? p.value : 0
    }
    const kp = gain('kp')
    const ki = gain('ki')
    const kd = gain('kd')
    let type: PidType = 'p'
    if (kd !== 0) type = 'pid'
    else if (ki !== 0) type = 'pi'
    const initial = { type, kp, ki, kd }

    const loop = analyzePidLoop(textRef.current, c.name)
    if (loop === null) {
      // Couldn't read the wiring — open with manual plant entry.
      setPidTuner({
        instanceName: c.name,
        initial,
        subject: c.name,
        plantError: 'Could not identify the loop automatically — enter the plant transfer function.',
      })
      return
    }
    setPidTuner({ instanceName: c.name, initial, subject: c.name, plantLoading: true })
    extractPlant({ text: textRef.current, dynamic: loop.dynamic, reference: loop.reference, output: loop.output, referenceOnSp: loop.referenceOnSp, type, kp, ki, kd })
      .then((plant) =>
        setPidTuner((prev) =>
          prev && prev.instanceName === c.name ? { ...prev, plant, plantLoading: false } : prev,
        ),
      )
      .catch((e: unknown) =>
        setPidTuner((prev) =>
          prev && prev.instanceName === c.name
            ? { ...prev, plantLoading: false, plantError: `Auto-linearization failed (${e instanceof Error ? e.message : String(e)}). Enter the plant manually.` }
            : prev,
        ),
      )
  }, [])

  // currentSlices is built further down, from state declared after this.
  const currentSlicesRef = useRef<(() => ProjectSlices) | null>(null)
  // The open lesson is declared further down too.
  const shareLessonRef = useRef<string | undefined>(undefined)
  const shareLiveLogRef = useRef<{ time: number; name: string; value: number }[] | null>(null)
  /** M2: the experiment a link opened with, while the text is unchanged. */
  const sharedTimelineRef = useRef<LabTimelineEntry[] | null>(null)
  const copyShareUrl = useCallback((url: string, notes: string[]) => {
    navigator.clipboard.writeText(url).then(
      () => notifications.show({
        color: 'teal',
        title: 'Share link copied',
        message: `Anyone opening it gets this exact document. Nothing is stored on a server.${
          notes.length ? ` Not in the link (send the .frees project to include them): ${notes.join('; ')}.` : ''
        }`,
      }),
      () => { globalThis.prompt('Copy the share link:', url) },
    )
  }, [])
  const handleShareLink = useCallback(() => {
    // CFG-04: the link carries the equations, and (I6) the open lesson and
    // the pinned sliders; say what stays behind.
    const slices = currentSlicesRef.current?.()
    const notes = slices ? projectOnlyNotes(buildProject({ ...slices, sliders: [] })) : []
    // M2: a live run's input changes travel as an experiment, with the sliders the run opened with.
    // A received experiment is forwarded as it came until a live run here makes a newer one.
    const log = shareLiveLogRef.current
    const timeline = log?.length ? timelineOfLog(log) : (sharedTimelineRef.current ?? undefined)
    const sliders = log?.length && liveOpenSlidersRef.current.length ? liveOpenSlidersRef.current : slices?.sliders
    const extras = { lesson: shareLessonRef.current, sliders, timeline }
    const url = buildShareUrl(textRef.current, undefined, extras)
    if (url !== null) return copyShareUrl(url, notes)
    // I6: past the cap the fallback is explicit, never a silently shorter link.
    const bare = extras.lesson || extras.sliders?.length || timeline ? buildShareUrl(textRef.current) : null
    const id = 'share-too-long'
    notifications.show({
      id,
      color: 'yellow',
      autoClose: false,
      title: 'Too large to share by URL',
      message: (
        <>
          <Text size="sm">
            The link would be longer than {MAX_SHARE_URL_CHARS.toLocaleString('en-US')} characters, too long to travel reliably.
            Save the project (Ctrl+S) and send the .frees file instead.
          </Text>
          {bare !== null && (
            <Button mt="xs" size="xs" variant="light" onClick={() => {
              notifications.hide(id)
              copyShareUrl(bare, [...notes, 'the lesson, the pinned sliders and any live experiment'])
            }}>Copy a link to the document alone</Button>
          )}
        </>
      ),
    })
  }, [copyShareUrl])

  const handleOpenUrl = useCallback(() => {
    setShowOpenUrl(true)
  }, [])
  // Strip the share fragment once the navigation has committed, so a refresh
  // returns to the user's own autosaved work instead of re-importing the link.
  // Runs whether or not the document was accepted — declining still means the
  // link has been dealt with.
  useEffect(() => {
    if (SHARE_READ !== null) {
      clearShareHash()
      if (RAW_DOCUMENT_URL !== null && SHARED_BOOT !== null) clearRawDocumentUrl()
      if ('error' in SHARE_READ) notifications.show({ color: 'yellow', title: 'Could not open the link', message: SHARE_READ.error, autoClose: false })
    }
  }, [])

  // A share link opened while the app is *already* running changes only the
  // fragment. That is a same-document navigation: the browser does not reload,
  // so no script re-runs and the module-scope read above never sees the
  // payload — the link silently did nothing. Handle it live instead.
  //
  // This always routes through the modal when the document differs, rather
  // than reusing the boot rule (which compares against the autosave): what is
  // at risk here is the document on screen, which may be newer than any
  // autosave and may never have been saved at all.
  useEffect(() => {
    const onHashChange = () => {
      const shared = readShareHash(globalThis.location.hash)
      if (shared === null) return
      clearShareHash()
      if ('error' in shared) {
        notifications.show({ color: 'yellow', title: 'Could not open the link', message: shared.error, autoClose: false })
        return
      }
      if (shared.text === textRef.current && !carriesSettings(shared)) return // already the open document
      setShareOffer(shared)
    }
    globalThis.addEventListener('hashchange', onHashChange)
    return () => globalThis.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    // I6: a link with lesson settings opens the way an example does, so the
    // lesson and its sliders come with it.
    if (sharedBoot !== null && SHARED_BOOT !== null && carriesSettings(SHARED_BOOT.doc)) openSharedDocument(SHARED_BOOT.doc)
    else if (sharedBoot !== null) {
      notifications.show({
        color: 'teal',
        title: 'Opened shared document',
        message: 'Loaded from the link — nothing was stored on a server.',
      })
    }
    // Boot only, like the read above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sharedBoot])
  const [checkResult, setCheckResult] = useState<CheckResponse | null>(null)
  const [stopped, setStopped] = useState(false)
  // SYNC-09: the instance the editor caret is on, highlighted on the canvas.
  const [cursorInstance, setCursorInstance] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<SolveResponse | null>(null)
  // Printable calculation report (browser print-to-PDF): the last successful
  // solve plus the document that produced it, in a self-contained new window.
  const handlePrintReport = useCallback(() => {
    if (!result?.success) return
    if (!openPrintReport(projectName, textRef.current, result)) {
      notifications.show({
        color: 'yellow',
        title: 'Report window blocked',
        message: 'Allow pop-ups for this site to open the printable report.',
      })
    }
  }, [result, projectName])
  // Stable id for this document's solve session: tags solves so their result is
  // cached server-side for the REPL/Workspace, and bottom-terminal visibility.
  const [sessionId] = useState<string>(() => crypto.randomUUID())
  // Variables defined or changed directly in the REPL (keyed by lowercased name),
  // overlaid on the solved variables so the Variable Explorer / Solution reflect
  // them. Cleared on every solve (the backend resets its session overlay too).
  const [replVars, setReplVars] = useState<Record<string, VariableResult>>({})

  // Parameters pinned to the slider strip. They ride the same override path as
  // REPL assignments and are appended AFTER them, so the backend's
  // last-wins collapse by name lets a dragged slider beat a stale REPL value.
  const [pinnedSliders, setPinnedSliders] = useState<PinnedSlider[]>(() => boot?.sliders ?? [])
  // A handle moved since the last solve landed: the results on screen describe
  // the previous values until one does, which is worth saying out loud because
  // a blocked or failing solve leaves that gap open indefinitely.
  const [slidersStale, setSlidersStale] = useState(false)
  // RUN-07: named input scenarios (a project slice), their own undo history,
  // whether the result on screen predates the scenario now chosen, and the
  // pinned baseline run (kept for the session, not saved).
  const [scenarios, setScenarios] = useState<ScenarioState>(() => boot?.scenarios ?? EMPTY_SCENARIOS)
  const [scenarioHistory, setScenarioHistory] = useState<{ done: ScenarioState[]; undone: ScenarioState[] }>({ done: [], undone: [] })
  const [scenarioStale, setScenarioStale] = useState(false)
  const [baseline, setBaseline] = useState<Baseline | null>(null)
  const [conversions, setConversions] = useState<Record<string, { scale: number; shift: number } | null>>({})
  // RUN-05: playback of the current dynamic run's recorded samples; reset by every new result.
  const [playback, setPlayback] = useState<{ of: SolveResponse | null; table: string | null; index: number | null; playing: boolean }>({ of: null, table: null, index: null, playing: false })
  const [playSpeed, setPlaySpeed] = useState(1)
  const sliderTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sliderSolveRef = useRef<() => void>(() => {})
  /** Phase L1: set by the Live bar while a run is open; the sliders feed it. */
  const liveInputRef = useRef<((lines: string[]) => void) | null>(null)
  /** The sliders a live run opened with, which a Live reset restores. */
  const liveOpenSlidersRef = useRef<PinnedSlider[]>([])
  /** The slider values the live run is using, by lowercase name: a refused change puts its slider back. */
  const liveAppliedRef = useRef(new Map<string, number>())
  /** Phase L2: the canvas inputs the open live run lifted, their values, and whether a run is open to them. */
  const [liveCanvas, setLiveCanvas] = useState<{ inputs: CanvasInput[]; values: Record<string, number> }>({ inputs: [], values: {} })
  const [liveOpen, setLiveOpen] = useState(false)
  /** Phase L3b: the open run's rows, which the canvas mini-scopes trace. */
  const [liveRows, setLiveRows] = useState<{ store: LiveStore; header: LiveTable } | null>(null)
  const setCanvasInput = useCallback((input: CanvasInput, value: number) => {
    const live = liveInputRef.current
    if (!live) return
    setLiveCanvas((c) => ({ ...c, values: { ...c.values, [input.variable.toLowerCase()]: value } }))
    live([canvasInputLine(input, value)])
  }, [])
  const liveControls = useMemo(() => {
    const inputs = liveOpen ? liveCanvas.inputs : []
    if (!inputs.length && !liveRows) return null
    const controls = new Map<string, LiveControl[]>()
    for (const input of inputs) {
      const block = input.block.toLowerCase()
      controls.set(block, [...(controls.get(block) ?? []), { input, value: liveCanvas.values[input.variable.toLowerCase()] ?? input.value }])
    }
    return { controls, set: setCanvasInput, rows: liveRows }
  }, [liveOpen, liveCanvas, setCanvasInput, liveRows])
  // A release that lands while a solve is in flight must not be dropped: the
  // app's policy elsewhere is "skip rather than queue", which is right for a
  // lint tick (another keystroke follows) but wrong here — the displayed
  // solution would stop matching the handle. Remember it and drain on idle.
  const sliderPendingRef = useRef(false)
  // Phase G: the next solve is a slider drag, which the engine answers from its
  // prepared document and last answer. A release is a plain solve, so the
  // settled value is exactly the plain solve's. Every solve clears it.
  const sliderDragRef = useRef(false)
  // A Solve pressed while the live check is still running: run it once the
  // check lands instead of dropping the click.
  const solvePendingRef = useRef(false)
  const checkThenSolveRef = useRef<() => void>(() => {})
  // The same for a table: the id whose Solve arrived during its check.
  const tableSolvePendingRef = useRef<string | null>(null)
  const checkThenSolveTableRef = useRef<(id: string) => void>(() => {})
  useEffect(() => () => {
    if (sliderTimer.current) clearTimeout(sliderTimer.current)
  }, [])
  const [solving, setSolving] = useState(false)
  // Phase I2: the lesson beside the open gallery example, if it has one.
  const [lesson, setLesson] = useState<Lesson | null>(null)
  useEffect(() => { shareLessonRef.current = lesson?.example }, [lesson])
  // M2: the input changes of the live run on screen, which a share link carries as an experiment.
  useEffect(() => { shareLiveLogRef.current = result?.odeTables?.find((t) => t.inputLog?.length)?.inputLog ?? null }, [result])
  // Phase M1: a lesson's live lab. The token opens the Live bar on the lab's
  // timeline and runs it; the grades come from a headless run of the same
  // timeline, which the engine applies at the same rows.
  // Both are kept for the lesson they ran for, so opening another lesson drops them.
  const [labState, setLabState] = useState<{ for: string; token: number; grades: LabResult[] | { error: string } | 'running' | null } | null>(null)
  const labRunRef = useRef(0)
  const labOfLesson = labState && lesson && labState.for === lesson.example ? labState : null
  const labToken = labOfLesson?.token ?? 0
  // M2: a shared experiment's timeline, kept for the document it came with:
  // an edit to the text drops it.
  const [sharedExperiment, setSharedExperiment] = useState<{ text: string; timeline: LabTimelineEntry[] } | null>(null)
  const experiment = useMemo(() => (sharedExperiment && sharedExperiment.text === text ? { timeline: sharedExperiment.timeline } : null), [sharedExperiment, text])
  useEffect(() => { sharedTimelineRef.current = experiment?.timeline ?? null }, [experiment])
  // M1: a model edit ends a lab run and clears its grades; they were for the model before it.
  useEffect(() => modelRevisionRef.current.subscribe(() => {
    labRunRef.current += 1
    setLabState(null)
  }), [])
  const labGrades = labOfLesson?.grades ?? null
  // The engine's overall completion while a solve runs, 0…1, or null when
  // nothing is running. The Solve button paints it as its own background —
  // this is the answer to the Phase 7–8 "spinning worker with no cancel"
  // complaint that let the transient wall-clock budget be raised to an hour.
  const [solveProgress, setSolveProgress] = useState<number | null>(null)
  // The listener the engine drives. Deliberately not `setSolveProgress`: the
  // boundary already throttles to ~60 ms, but an 80-second transient still
  // reports ~800 times, and each one would re-render this whole component —
  // editor, dock, plots and all. The bar is drawn to whole percent, so
  // returning the previous value for a sub-percent move makes React bail out
  // of the render entirely; ~800 reports become ~100 that change a pixel.
  const reportSolveProgress = useCallback((fraction: number) => {
    setSolveProgress((previous) =>
      previous !== null && Math.round(previous * 100) === Math.round(fraction * 100)
        ? previous
        : fraction,
    )
  }, [])
  const [findAll, setFindAll] = useState(false)
  const [selectedSolutionIndex, setSelectedSolutionIndex] = useState(0)
  const [complexMode, setComplexMode] = useState(false)
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
  const [showSaveCheck, setShowSaveCheck] = useState(false)
  // Phase 11 (D4): the browser-resident project library.
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [dialogError, setDialogError] = useState<string | null>(null)
  // Tracks unsaved changes; suppressed for one render-cycle after a project
  // load / new / save so the dirty-tracking effect doesn't fire falsely.
  const isDirtyRef = useRef(false)
  // Phase O's status bar shows both; the refs stay the source the save paths read.
  const [dirty, setDirty] = useState(false)
  const [saveWhere, setSaveWhere] = useState<SaveProvenance>(null)
  const suppressDirtyRef = useRef(false)
  // Stores the action to run once the save-check dialog is resolved.
  const pendingActionRef = useRef<(() => void) | null>(null)
  const [dismissedWarnings, setDismissedWarnings] = useState(false)
  // Whether the current check came from the idle live-lint rather than from
  // Check/Solve. Lint warnings still reach the status pill, but they must not
  // open the banner above the editor: that reflows the document mid-keystroke,
  // usually to complain about the half-typed line under the cursor.
  const [checkWasLint, setCheckWasLint] = useState(false)
  const [showFirstRun, setShowFirstRun] = useState(
    () => localStorage.getItem(FIRST_RUN_KEY) !== 'true',
  )

  const dismissFirstRun = useCallback(() => {
    setShowFirstRun(false)
    localStorage.setItem(FIRST_RUN_KEY, 'true')
  }, [])

  // The app opens straight into the workspace (a deliberate decision — no
  // landing page), so this modal is its welcome mat: auto-opened once per
  // browser on desktop. Share-link visits skip it (the visitor came for a
  // document, not a tour), and isMobile is undefined until the media query
  // resolves, so wait for an explicit false.
  const [showGettingStarted, setShowGettingStarted] = useState(false)
  useEffect(() => {
    if (isMobile === false && sharedBoot === null && RAW_DOCUMENT_URL === null
        && !EMBED.embed && EMBED.example === null
        && localStorage.getItem(GETTING_STARTED_KEY) !== 'true') {
      setShowGettingStarted(true)
    }
  }, [isMobile, sharedBoot])
  const closeGettingStarted = useCallback(() => {
    localStorage.setItem(GETTING_STARTED_KEY, 'true')
    setShowGettingStarted(false)
  }, [])
  // Seed from a loaded project's configured drafts so buildVariableInfo() carries
  // their units (display conversion, dimensional grounding) on the very first solve
  // after load — Check/Solve then replaces this with the authoritative variable list.
  const [variables, setVariables] = useState<string[]>(() => Object.keys(boot?.varDrafts ?? {}))
  const [varDrafts, setVarDrafts] = useState<Record<string, VariableDraft>>(
    () => boot?.varDrafts ?? {},
  )
  const [showVariableInfo, setShowVariableInfo] = useState(false)
  const [showMonteCarlo, setShowMonteCarlo] = useState(false)
  const [showSensitivity, setShowSensitivity] = useState(false)
  const [showMinMax, setShowMinMax] = useState(false)
  const [showCurveFit, setShowCurveFit] = useState(false)
  const [showParameterFit, setShowParameterFit] = useState(false)
  const computedScheme = useComputedColorScheme('dark')
  // PID Tuner: null = closed; the object carries what to tune. `instanceName`
  // set → Apply rewrites that SigPID's gains in the editor; absent (Tools
  // menu) → Apply inserts a tuned SigPID snippet.
  const [pidTuner, setPidTuner] = useState<{
    instanceName?: string
    initial?: { type: PidType; kp: number; ki: number; kd: number }
    subject?: string
    plant?: { num: number[]; den: number[] }
    plantLoading?: boolean
    plantError?: string
  } | null>(null)
  const [showAbout, setShowAbout] = useState(false)
  const [showExamples, setShowExamples] = useState(false)
  const [showOpenUrl, setShowOpenUrl] = useState(false)
  const [showComponentWizard, setShowComponentWizard] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [showFunctionBrowser, setShowFunctionBrowser] = useState(false)
  // Phase O: the ribbon flag and its density are device preferences.
  const [ribbonOn, setRibbonOn] = useState(readRibbon)
  const [ribbonDensity, setRibbonDensity] = useState<RibbonDensity>(() => readRibbonDensity())
  const ribbonLastOpenRef = useRef<RibbonDensity>('expanded')
  const changeRibbonDensity = (d: RibbonDensity) => {
    if (d !== 'collapsed') ribbonLastOpenRef.current = d
    setRibbonDensity(d)
    writeRibbonDensity(d)
  }
  const [layoutName, setLayoutName] = useState('Restored')
  // Phase Q: named layouts, saved on this device for this screen size.
  const [layouts, setLayouts] = useState<LayoutStore>(() => readLayouts())
  const [ribbonTab, setRibbonTab] = useState('home')
  const [showSaveLayout, setShowSaveLayout] = useState(false)
  const [showManageLayouts, setShowManageLayouts] = useState(false)
  const [canUndoLayout, setCanUndoLayout] = useState(false)
  // The window ids this project can show, kept by the effect that closes the
  // rest. A restored layout is checked against it, so the windows it names
  // that no longer exist are left out with a notice, not silently.
  const validWindowIdsRef = useRef<Set<string>>(new Set())
  /** Restores a layout without the windows this project cannot show, as one change to undo. */
  const restoreLayout = (layout: unknown): boolean => {
    const r = dockRef.current?.restore(layout, (id) => validWindowIdsRef.current.has(id))
    if (r && r.dropped.length > 0) {
      notifications.show({
        color: 'yellow',
        title: 'Layout restored without some windows',
        message: `${r.dropped.join(', ')}: no longer in this project, so left out.`,
      })
    }
    return r?.ok ?? true
  }
  const { setColorScheme } = useMantineColorScheme()
  // Windows publish their contextual commands (contextActions.ts); re-render when they change.
  useContextVersion()
  const [activeTab, setActiveTab] = useState<string>('equations')

  const editorRef = useRef<EquationEditorHandle>(null)

  const dockRef = useRef<WorkspaceDockHandle | null>(null)

  // Insert a function template at the editor caret (Functions menu). "$0" in
  // the snippet marks where the caret lands; selected text is replaced. With the
  // Editor closed there is no caret: the snippet is appended on its own line
  // before the editor mounts and reads the document, then its window opens.
  const textChangeRef = useRef<(value: string) => void>(() => {})
  const insertFunction = useCallback((snippet: string) => {
    setActiveTab('equations')
    if (!editorRef.current?.insertSnippet(snippet)) {
      const doc = textRef.current
      textChangeRef.current(`${doc}${doc === '' || doc.endsWith('\n') ? '' : '\n'}${snippet.replace('$0', '')}`)
    }
    dockRef.current?.open('equations')
  }, [])
  // Component Browser/Wizard: append the generated `Type NAME(...)` block on its
  // own line in the equations editor (same path as bound-cell statements).
  // Wiring emits a statement while the user stays on the schematic, so unlike
  // the wizard's insertion this must NOT pull focus to the editor. The live
  // lint re-checks shortly after, which is what redraws the canvas.
  const emitFromSchematic = useCallback((statement: string) => {
    editorRef.current?.insertStatement(statement, { focus: false })
  }, [])

  const insertComponentBlock = useCallback((block: string) => {
    setActiveTab('equations')
    setTimeout(() => editorRef.current?.insertStatement(block), 50)
  }, [])
  const existingInstanceNames = useMemo(
    () => [...declaredInstances(text).values()].map((hit) => hit.label),
    [text],
  )
  // Programmatic document replacement (project load, new/example, generated
  // equations): updates the ref + state and pushes the doc into the uncontrolled
  // editor. setDoc does not echo back through onTextChange.
  const applyText = useCallback((next: string) => {
    modelRevisionRef.current.bump()
    textRef.current = next
    setText(next)
    editorRef.current?.setDoc(next)
  }, [])

  // Dockview workspace manager: imperative handle + set of currently-open
  // window kinds (drives the sidebar's open-state indicators).
  const [openWindows, setOpenWindows] = useState<OpenWindow[]>([])
  // Last-focused non-auxiliary window — drives the content-aware Inspector
  // (focusing the Inspector/Solution panels themselves doesn't change it).
  const [focusedWindow, setFocusedWindow] = useState<Pick<OpenWindow, 'id' | 'kind' | 'title'> | null>(null)
  // The dock's active window, utility panels included: what the window
  // commands act on (Phase Q).
  const [activeWindowId, setActiveWindowId] = useState<string | undefined>(undefined)
  const [showWindowList, setShowWindowList] = useState(false)
  const [renamePlot, setRenamePlot] = useState<{ id: string; name: string } | null>(null)
  // Tracks which state-table circuit triggered the last fill-missing solve so
  // only that circuit's button shows the loading spinner.
  const [fillMissingFor, setFillMissingFor] = useState<string | null>(null)
  const openKinds = useMemo(() => openWindows.map((w) => w.kind), [openWindows])
  const openIds = useMemo(() => openWindows.map((w) => w.id), [openWindows])
  // Tables (Epic 8): any number of Parametric and Curve Tables; the active
  // parametric table is the one Check/Solve Table and the plots act on.
  const [tables, setTablesState] = useState<TableSpec[]>(() => {
    if (boot) return boot.tables
    const raw = localStorage.getItem('frees.tables')
    if (raw) return loadTables()
    return []
  })
  const [deletedTables, setDeletedTables] = useState<TableSpec[]>([])
  // N3: Delete table / Delete plot ask first. The target is captured when the
  // button is pressed; if it is gone by the time the user confirms, nothing is deleted.
  const [confirmDelete, setConfirmDelete] = useState<{ kind: 'table' | 'plot'; id: string; name: string } | null>(null)
  const tablesRef = useRef(tables)
  function writeTables(update: React.SetStateAction<TableSpec[]>) {
    const next = typeof update === 'function' ? update(tablesRef.current) : update
    tablesRef.current = next
    setTablesState(next)
  }
  function setTables(update: React.SetStateAction<TableSpec[]>) {
    const next = typeof update === 'function' ? update(tablesRef.current) : update
    if (next === tablesRef.current) return
    const removed = tablesRef.current.filter((t) => !next.some((n) => n.id === t.id))
    if (removed.length) setDeletedTables(removed)
    modelRevisionRef.current.bump()
    modelRevisionRef.current.invalidateCheck()
    setCheckResult(null)
    setResult(null)
    writeTables(next.map((t) => {
      const before = tablesRef.current.find((b) => b.id === t.id)
      if (before && (before.rows.length !== t.rows.length ||
        (before.kind === 'function' && t.kind === 'function' && before.columns !== t.columns) ||
        (before.kind === 'parametric' && t.kind === 'parametric' && before.vars !== t.vars))) t = detachLegacyFormulas(t)
      return t.kind === 'parametric' ? invalidateActiveParam(t) : t
    }))
  }
  function flushTableEdits() {
    flushSync(() => {
      // Blurring is how an in-progress grid cell or input edit gets committed
      // before a check/solve reads it. The equation editor has nothing pending —
      // its keystrokes are already in the document — so blurring it would only
      // throw the caret out of the text the caller is about to check.
      const active = document.activeElement
      if (active instanceof HTMLElement && !active.closest('.cm-editor')) active.blur()
    })
    flushTablesWorkbook()
  }
  const [activeTableId, setActiveTableId] = useState<string | null>(null)
  const [solvingTableId, setSolvingTableId] = useState<string | null>(null)
  const [showConfigureTable, setShowConfigureTable] = useState(false)
  const [alterColumn, setAlterColumn] = useState<string | null>(null)
  const [checkingTableId, setCheckingTableId] = useState<string | null>(null)
  const [plots, setPlots] = useState<PlotSpec[]>(() => boot?.plots ?? [])
  // Plots are addressed per-window now; only the setter is needed.
  const [, setActivePlotId] = useState<string | null>(null)
  // New plot creation is lifted to App (the sidebar "New …" actions) so the
  // config modal opens even though plots are now per-instance dock windows.
  // The kind decides which plot type the modal creates: xy / property / psychro.
  const [newPlotKind, setNewPlotKind] = useState<PlotKind | null>(null)
  // Seed for a new X-Y plot opened from a table's column selection (x + y vars),
  // applied as the modal's initial XY config.
  const [plotSeed, setPlotSeed] = useState<{ xVar: string; yVars: string[]; tableId?: string } | null>(null)
  // RUN-06: a schematic stream's fluid for a new property diagram; a variable to open Sensitivity on.
  const [fluidSeed, setFluidSeed] = useState<string | null>(null)
  const [sensitivityOutput, setSensitivityOutput] = useState<string | null>(null)
  // D10: the spreadsheet feature is removed. A loaded project's spreadsheets
  // array is carried INERT — held here, written back on save, never shown and
  // never destroyed (ARCHITECTURE_AND_REQUIREMENTS.md#11-retained-architectural-decisions, compatibility
  // policy). A one-time notice tells the user the data is preserved.
  const spreadsheetsRef = useRef<SpreadsheetSpec[]>(boot?.spreadsheets ?? [])
  // D11: the Data Analyzer is removed, and its `analyzers` slice is carried
  // the same inert way — held here, written back on save, never shown and
  // never destroyed (ARCHITECTURE_AND_REQUIREMENTS.md#11-retained-architectural-decisions, compatibility
  // policy). A one-time notice tells the user the data is preserved.
  const analyzersRef = useRef<AnalyzerSpec[]>(boot?.analyzers ?? [])
  // How the schematic is presented (positions, locks, areas, view settings).
  // The network itself is always derived from the document; this is the part
  // of the drawing that has to be saved. Not a semantic change: it never
  // touches the model revision (RUN-10).
  const [schematic, setSchematic] = useState<SchematicPresentation>(() => boot?.schematic ?? EMPTY_PRESENTATION)
  // One-line self-dismissing notice (e.g. the D10/D11 "the data is preserved
  // in the file but not shown" line after a project load).
  const [loadNotice, setLoadNotice] = useState<string | null>(null)
  useEffect(() => {
    if (loadNotice === null) return
    const id = setTimeout(() => setLoadNotice(null), 8000)
    return () => clearTimeout(id)
  }, [loadNotice])
  // D10/D11: the autosave-restored workspace gets the same one-time notice a
  // project load does when it carries (inert, preserved) spreadsheet or
  // analyzer data.
  useEffect(() => {
    const notice = [spreadsheetNotice(boot?.spreadsheets), analyzerNotice(boot?.analyzers)]
      .filter((n) => n !== null)
      .join(' ')
    if (notice !== '') setLoadNotice(notice)
    // Boot project only — runs once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
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
    if (newPlotKind === 'property') void getFluids().then(setFluids)
  }, [newPlotKind])

  useEffect(() => {
    const id = setTimeout(() => {
      saveTables(tables)
    }, 300)
    const handleBeforeUnload = () => {
      saveTables(tables)
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      clearTimeout(id)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [tables])

  // Story 10.10: the current App-owned slices of the unified project. Child-owned
  // slices (digitizer, custom components) are read from their localStorage caches
  // by buildProject(), so they are captured without lifting them into App.
  const currentSlices = useCallback(
    (): ProjectSlices => ({
      // Ref, not state: an explicit Save fired right after a keystroke must not
      // lose the edits still riding the deferred `text` transition.
      text: textRef.current,
      varDrafts,
      stopCriteria,
      unitSystem,
      fillMissing,
      stateUnitIds,
      tables,
      plots,
      // Inert retention (D10/D11): the loaded project's spreadsheets and
      // analyzer windows ride along unchanged so saving never destroys them.
      spreadsheets: spreadsheetsRef.current,
      analyzers: analyzersRef.current,
      sliders: pinnedSliders,
      scenarios,
      schematic,
    }),
    // `text` stays a dependency so the autosave effect keyed on this callback
    // still refreshes when the (deferred) editor document state lands.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [text, varDrafts, stopCriteria, unitSystem, fillMissing, stateUnitIds, tables, plots, pinnedSliders, scenarios, schematic],
  )
  useEffect(() => {
    currentSlicesRef.current = currentSlices
  }, [currentSlices])

  // Debounced autosave of the entire workspace to a single localStorage key,
  // superseding the scattered per-feature keys as the source of truth on reload.
  // The same document also lands in the IndexedDB mirror (D4): localStorage is
  // what boot reads synchronously, but its ~5 MB quota means this write can
  // silently stop succeeding once the workspace grows — the
  // mirror is the durable copy that keeps updating past that point.
  useEffect(() => {
    if (EMBED.embed) return // I4: a frame on another site must not overwrite the visitor's work
    const id = setTimeout(() => {
      const project = buildProject(currentSlices())
      saveProjectLocal(project)
      void writeAutosaveMirror(project)
    }, 800)
    return () => clearTimeout(id)
  }, [currentSlices])


  // Clear the per-circuit fill-missing tracker once the solve finishes so the
  // next click correctly identifies which circuit triggered the loading state.
  useEffect(() => {
    if (!solving) setFillMissingFor(null)
  }, [solving])

  // A landed solve is what makes the strip's handles describe the results
  // again; until one does, the strip says so.
  useEffect(() => {
    if (result) {
      setSlidersStale(false)
      setScenarioStale(false)
    }
  }, [result])

  // Drain a slider re-solve that the in-flight guard blocked. Without this a
  // handle released mid-solve leaves the solution showing the previous value.
  useEffect(() => {
    if (!solving && !checking && sliderPendingRef.current) {
      sliderPendingRef.current = false
      sliderSolveRef.current()
    }
    if (!solving && !checking && solvePendingRef.current) {
      solvePendingRef.current = false
      checkThenSolveRef.current()
    }
  }, [solving, checking])

  useEffect(() => {
    const pending = tableSolvePendingRef.current
    if (pending !== null && checkingTableId === null && solvingTableId === null) {
      tableSolvePendingRef.current = null
      checkThenSolveTableRef.current(pending)
    }
  }, [checkingTableId, solvingTableId])

  // Mark the project dirty whenever content changes, unless the change came from
  // an explicit load/new/save (suppressDirtyRef lets those operations opt out).
  useEffect(() => {
    if (suppressDirtyRef.current) {
      suppressDirtyRef.current = false
      isDirtyRef.current = false
      setDirty(false)
      return
    }
    isDirtyRef.current = true
    setDirty(true)

  }, [text, tables, plots, varDrafts, pinnedSliders, schematic])

  // Apply an opened/loaded project to every workspace slice. Child-owned slices
  // are written back to their caches and the relevant tabs are remounted (epoch
  // bump) so they re-read the restored state.
  const applyProject = useCallback((p: FreesProject) => {
    suppressDirtyRef.current = true
    isDirtyRef.current = false
    setDirty(false)
    // Whatever is now in the workspace, it is not the library row this tab was
    // tracking. Every load path funnels through here, so clearing it here (and
    // re-arming it only in the two library paths) is the one place that has to
    // be right.
    libraryRevRef.current = null
    applyText(p.text ?? '')
    setVarDrafts(p.varDrafts ?? {})
    setStopCriteria(p.stopCriteria)
    setUnitSystem(p.unitSystem ?? 'SI')
    setFillMissing(Boolean(p.fillMissing))
    setStateUnitIds(p.stateUnitIds ?? {})
    setTables(p.tables)
    setPlots(p.plots ?? [])
    // Inert retention (D10/D11): keep the arrays to write back on save, show
    // nothing.
    spreadsheetsRef.current = p.spreadsheets ?? []
    analyzersRef.current = p.analyzers ?? []
    setPinnedSliders(p.sliders ?? [])
    setScenarios(p.scenarios ?? EMPTY_SCENARIOS)
    setScenarioHistory({ done: [], undone: [] })
    setScenarioStale(false)
    setBaseline(null)
    setSchematic(p.schematic ?? EMPTY_PRESENTATION)
    // D10/D11 compatibility notices: the spreadsheet and Data Analyzer
    // features are removed, but the data in the file is preserved (inert),
    // never destroyed.
    const notices = [
      spreadsheetNotice(p.spreadsheets),
      analyzerNotice(p.analyzers),
      p.schematicRepaired ? `${p.schematicRepaired} malformed schematic layout entries in this file were ignored; the model is unaffected.` : null,
    ].filter((n) => n !== null)
    setLoadNotice(notices.length > 0 ? notices.join(' ') : null)
    setResult(null)
    setCheckResult(null)
    writeBridgedKeys(p)
    saveProjectLocal(p)
    // Keep the durable mirror in step (D4): a mirror left carrying the
    // *previous* workspace would read as "newer" on the next boot and offer a
    // restore of the exact state the user just navigated away from.
    void writeAutosaveMirror(p)
    setWorkspaceEpoch((e) => e + 1)
    requestAnimationFrame(() => {
      restoreLayout(p.dockLayout)
    })
  }, [applyText])

  // D4 quota recovery, once per boot: when the IndexedDB mirror is strictly
  // newer than what localStorage booted, the localStorage autosave had started
  // failing — offer the newer copy rather than silently restoring it, because
  // the user may have *wanted* the state they are looking at.
  const mirrorCheckedRef = useRef(false)
  useEffect(() => {
    // I4: an embed never reads the visitor's workspace, the mirror included.
    if (mirrorCheckedRef.current || sharedBoot !== null || EMBED.embed) return
    mirrorCheckedRef.current = true
    const booted = bootRef.current ?? null
    void readAutosaveMirror().then((mirror) => {
      if (!mirrorIsNewer(mirror, booted)) return
      const when = new Date(Date.parse(mirror.savedAt)).toLocaleString()
      notifications.show({
        id: 'autosave-mirror-restore',
        color: 'yellow',
        autoClose: false,
        title: 'A newer autosave exists in browser storage',
        message: (
          <Stack gap="xs">
            <Text size="sm">
              The quick autosave fell behind (usually a storage-quota limit). A newer copy from {when} is
              available.
            </Text>
            <Button
              size="xs"
              onClick={() => {
                notifications.hide('autosave-mirror-restore')
                applyProject(mirror)
              }}
            >
              Restore newer autosave
            </Button>
          </Stack>
        ),
      })
    })
  }, [sharedBoot, applyProject])

  // Wave E (closing Phase 11's gap 2): where this project lives. Opened from
  // the browser library => Save re-saves there; opened or saved as a file
  // through the File System Access API => Save writes back to that same file
  // (Wave I — the handle half); otherwise Save keeps meaning the file picker.
  const projectSourceRef = useRef<SaveProvenance>(null)
  // The FileSystemFileHandle behind a 'file' provenance, when the FS Access
  // API produced one (Chromium). Firefox/Safari have no FS Access pickers, so
  // no handle ever exists there and Save degrades to today's picker/download.
  // Mirrored to IndexedDB (projectStore's file link) beside the autosave that
  // holds the workspace it belongs to, so it survives a reload.
  const projectHandleRef = useRef<FileSystemFileHandle | null>(null)
  // The browser-library row this tab is editing: the name it was read under and
  // the revision it saw. A save states this back to the store, which refuses
  // rather than clobber when another tab has moved on. The name travels with
  // the revision so that renaming the project (or opening anything else) can
  // never leave a stale revision pointing at a row it no longer describes.
  const libraryRevRef = useRef<{ name: string; rev: number } | null>(null)
  const [libraryConflict, setLibraryConflict] = useState<{ name: string; theirs: StoredProjectMeta } | null>(null)

  /** Adopt (or clear) the current file handle, keeping the persisted link in step. */
  const adoptFileHandle = useCallback((handle: FileSystemFileHandle | null, name: string) => {
    projectHandleRef.current = handle
    if (handle) void writeFileLink(name, handle)
    else void clearFileLink()
  }, [])

  // Wave I: restore the file link after a reload. The autosaved workspace the
  // app just booted from is the state of the linked file's project, so a
  // persisted handle means Save keeps writing back to that file — after the
  // permission re-prompt the browser requires post-reload. Skipped for share
  // links and fresh sessions, whose workspace is not that project; the
  // provenance guard keeps a slow read from clobbering an open/save that
  // happened first.
  useEffect(() => {
    if (sharedBoot !== null || boot === null) return
    let cancelled = false
    void readFileLink().then((link) => {
      if (cancelled || link === null) return
      if (projectSourceRef.current !== null) return
      projectSourceRef.current = 'file'
      setSaveWhere('file')
      projectHandleRef.current = link.handle
      setProjectName(link.name)
    })
    return () => {
      cancelled = true
    }
  }, [sharedBoot, boot])

  // The one Save. Decides where this project re-saves (saveTarget.ts: browser
  // library / its own file via the kept handle / the picker) and performs it;
  // a refused handle write falls back to the picker rather than failing the
  // save. Returns false only when nothing was saved (unavailable library,
  // cancelled picker) so callers can keep the dirty flag and any pending
  // destructive action on hold.
  /** What this tab believes it is replacing when it writes `name`. */
  const expectedLibraryRev = useCallback((name: string): ExpectedRev => {
    const known = libraryRevRef.current
    if (!known) return 'new'
    return known.name.trim().toLowerCase() === name.trim().toLowerCase() ? known.rev : 'new'
  }, [])

  /**
   * The one write into the browser library. On success it records the new
   * revision so the *next* save of this tab is checked against its own write;
   * on a conflict it raises the resolution dialog and writes nothing.
   */
  const saveToLibrary = useCallback(
    async (name: string, expected: ExpectedRev): Promise<SaveOutcome['status']> => {
      const outcome = await saveStoredProject(name, buildProject(currentSlices()), expected)
      if (outcome.status === 'saved') {
        libraryRevRef.current = { name, rev: outcome.meta.rev }
        isDirtyRef.current = false
        setDirty(false)
        projectSourceRef.current = 'browser'
        setSaveWhere('browser')
        // The library is the project's home now; drop any stale file link.
        adoptFileHandle(null, name)
      } else if (outcome.status === 'conflict') {
        setLibraryConflict({ name, theirs: outcome.theirs })
      }
      return outcome.status
    },
    [currentSlices, adoptFileHandle],
  )

  const performSave = useCallback(async (): Promise<boolean> => {
    const project = buildProject(currentSlices())
    const handle = projectHandleRef.current
    const permission = handle ? await queryWritePermission(handle) : 'unsupported'
    const target = saveTarget(projectSourceRef.current, handle !== null, permission)

    if (target === 'library') {
      const status = await saveToLibrary(projectName, expectedLibraryRev(projectName))
      if (status !== 'saved') return false
      notifications.show({
        color: 'teal',
        title: 'Saved',
        message: `Saved “${projectName}” to the browser library.`,
      })
      return true
    }

    if (target === 'handle' && handle) {
      const outcome = await saveProjectToHandle(project, handle)
      if (outcome === 'saved') {
        isDirtyRef.current = false
        setDirty(false)
        void writeFileLink(projectName, handle)
        notifications.show({
          color: 'teal',
          title: 'Saved',
          message: `Saved “${handle.name}” back to its file — no picker needed.`,
        })
        return true
      }
      // Permission refused, or the file is gone: say so, then let the picker
      // choose a fresh destination instead of failing the save.
      notifications.show({
        color: 'yellow',
        title: outcome === 'denied' ? 'File access not granted' : 'Could not write the file',
        message: `Choose where to save “${projectName}” instead.`,
      })
    }

    const saved = await saveProject(project, projectName)
    if (saved.saved) {
      isDirtyRef.current = false
      setDirty(false)
      projectSourceRef.current = 'file'
      setSaveWhere('file')
      adoptFileHandle(saved.handle, projectName)
    }
    return saved.saved
  }, [currentSlices, projectName, adoptFileHandle, saveToLibrary, expectedLibraryRev])

  // If the project is dirty, show the save-check dialog; otherwise run immediately.
  const guardedAction = useCallback((action: () => void) => {
    if (isDirtyRef.current) {
      pendingActionRef.current = action
      setShowSaveCheck(true)
    } else {
      action()
    }
  }, [])

  const onSaveCheckSave = useCallback(async () => {
    // The same provenance-aware Save as the menu (Wave I — this dialog used
    // to always open the picker, even for a library project). If nothing was
    // saved, keep the project (and the pending destructive action, e.g.
    // opening another project) on hold.
    const saved = await performSave()
    if (!saved) return
    setShowSaveCheck(false)
    pendingActionRef.current?.()
    pendingActionRef.current = null
  }, [performSave])

  const onSaveCheckDiscard = useCallback(() => {
    setShowSaveCheck(false)
    isDirtyRef.current = false
    setDirty(false)
    pendingActionRef.current?.()
    pendingActionRef.current = null
  }, [])

  const onSaveCheckCancel = useCallback(() => {
    setShowSaveCheck(false)
    pendingActionRef.current = null
  }, [])

  // Wave E (narrowing Phase 11's gap 5): if another tab overwrites or
  // deletes the browser-library project THIS tab has open, say so — writes
  // stay last-write-wins, but silently is no longer how they win.
  useEffect(() => {
    return subscribeLibraryChanges((change) => {
      if (projectSourceRef.current !== 'browser') return
      const current = projectName.trim().toLowerCase()
      const changed = change.name.trim().toLowerCase()
      if (changed !== current) return
      notifications.show({
        color: 'yellow',
        title: change.kind === 'deleted' ? 'Project deleted in another tab' : 'Project changed in another tab',
        message:
          change.kind === 'deleted'
            ? `“${projectName}” was deleted from the browser library by another tab. Saving here will re-create it.`
            : change.kind === 'renamed'
              ? `“${projectName}” was renamed to “${change.to ?? ''}” by another tab. Saving here will re-create “${projectName}”.`
              : `“${projectName}” was saved by another tab. Saving here will overwrite that version.`,
      })
    })
  }, [projectName])

  const handleSaveProject = useCallback(async () => {
    await performSave()
  }, [performSave])

  const handleRenameProject = useCallback(() => setRenameOpen(true), [])

  const submitRename = useCallback((name: string) => {
    setProjectName(name.trim() || 'untitled')
    setRenameOpen(false)
  }, [])

  const handleSaveProjectAs = useCallback(() => setSaveAsOpen(true), [])

  const handleExportEquations = useCallback(() => {
    const notes = projectOnlyNotes(buildProject(currentSlices()))
    downloadEquationText(textRef.current, projectName)
    notifications.show({
      color: 'blue',
      title: 'Exported equation text',
      message: notes.length
        ? `Not included (save the project to keep them): ${notes.join('; ')}.`
        : 'This document has no project-only inputs — the text is the whole model.',
    })
  }, [currentSlices, projectName])

  // Save As always picks (never the kept handle) — but the file it picks
  // becomes the project's new home, so a following Save writes there.
  const submitSaveAs = useCallback(
    async (name: string) => {
      const clean = name.trim() || 'untitled'
      setProjectName(clean)
      const saved = await saveProject(buildProject(currentSlices()), clean)
      if (saved.saved) {
        isDirtyRef.current = false
        setDirty(false)
        projectSourceRef.current = 'file'
        setSaveWhere('file')
        adoptFileHandle(saved.handle, clean)
      }
      setSaveAsOpen(false)
    },
    [currentSlices, adoptFileHandle],
  )

  // Open via the FS Access picker where it exists, so the handle can be kept
  // for pickerless re-saving (Wave I); otherwise (Firefox/Safari, embeds that
  // refuse the API) the hidden <input type=file> path, exactly as before.
  const handleOpenProject = useCallback(() => {
    guardedAction(() => {
      const picker = (window as unknown as {
        showOpenFilePicker?: (opts: unknown) => Promise<FileSystemFileHandle[]>
      }).showOpenFilePicker
      if (typeof picker !== 'function') {
        projectFileRef.current?.click()
        return
      }
      void (async () => {
        let handle: FileSystemFileHandle | undefined
        try {
          ;[handle] = await picker({ types: FREES_FILE_TYPES, multiple: false })
        } catch (err) {
          // Cancelled => nothing to do; the API refusing for any other
          // reason degrades to the input element.
          if (!(err instanceof DOMException && err.name === 'AbortError')) projectFileRef.current?.click()
          return
        }
        if (!handle) return
        try {
          const file = await handle.getFile()
          const p = await readProjectFile(file)
          applyProject(p)
          const name = file.name.replace(/\.frees$/i, '')
          setProjectName(name)
          projectSourceRef.current = 'file'
          setSaveWhere('file')
          adoptFileHandle(handle, name)
        } catch (err) {
          setDialogError(err instanceof Error ? err.message : 'Could not open project file.')
        }
      })()
    })
  }, [guardedAction, applyProject, adoptFileHandle])

  // Phase 11 (D4): the browser-resident project library. Saving is name-keyed
  // with file semantics (same name overwrites) — but only the revision this tab
  // loaded; another tab's newer write raises the conflict dialog instead of
  // being flattened. A failed explicit save is surfaced by the modal, never
  // silent.
  const handleSaveToBrowser = useCallback(
    () => saveToLibrary(projectName, expectedLibraryRev(projectName)),
    [projectName, saveToLibrary, expectedLibraryRev],
  )

  // A conflict can be raised from *inside* the unsaved-changes dialog (Save →
  // refused), which leaves that dialog stacked behind this one. Once the
  // conflict is resolved by writing something, the save it was blocking has
  // happened, so release the dialog and let the action it was guarding run.
  const releaseSaveCheck = useCallback(
    (runPending: boolean) => {
      if (!showSaveCheck) return
      setShowSaveCheck(false)
      const pending = pendingActionRef.current
      pendingActionRef.current = null
      if (runPending) pending?.()
    },
    [showSaveCheck],
  )

  // The three ways out of a library save conflict. Each is a deliberate choice
  // the user made in ProjectConflictModal; none of them runs on its own.
  const resolveConflictOverwrite = useCallback(async () => {
    const conflict = libraryConflict
    if (!conflict) return
    setLibraryConflict(null)
    const status = await saveToLibrary(conflict.name, 'overwrite')
    if (status === 'saved') {
      notifications.show({
        color: 'teal',
        title: 'Saved',
        message: `Replaced “${conflict.name}” in the browser library with this window’s version.`,
      })
      releaseSaveCheck(true)
    }
  }, [libraryConflict, saveToLibrary, releaseSaveCheck])

  const resolveConflictSaveCopy = useCallback(async () => {
    const conflict = libraryConflict
    if (!conflict) return
    setLibraryConflict(null)
    const taken = (await listStoredProjects()).map((p) => p.name)
    const copy = copyName(conflict.name, taken)
    // 'new' and not 'overwrite': if a third tab claimed that exact name in the
    // last few milliseconds, refusing is still better than flattening it.
    const status = await saveToLibrary(copy, 'new')
    if (status === 'saved') {
      setProjectName(copy)
      notifications.show({
        color: 'teal',
        title: 'Saved as a copy',
        message: `Both versions are kept — this window is now “${copy}”.`,
      })
      releaseSaveCheck(true)
    }
  }, [libraryConflict, saveToLibrary, releaseSaveCheck])

  const resolveConflictTakeTheirs = useCallback(async () => {
    const conflict = libraryConflict
    if (!conflict) return
    setLibraryConflict(null)
    const loaded = await loadStoredProjectRev(conflict.name)
    if (!loaded) {
      notifications.show({
        color: 'yellow',
        title: 'Could not open browser project',
        message: 'It may have been deleted in another tab.',
      })
      return
    }
    applyProject(loaded.project)
    setProjectName(conflict.name)
    projectSourceRef.current = 'browser'
    setSaveWhere('browser')
    libraryRevRef.current = { name: conflict.name, rev: loaded.rev }
    adoptFileHandle(null, conflict.name)
    notifications.show({
      color: 'teal',
      title: 'Loaded the other tab’s version',
      message: `“${conflict.name}” now shows what the other tab saved.`,
    })
    // Deliberately NOT running the pending action: whatever it was (New
    // Project, opening something else) would immediately discard the version
    // just loaded, which is the opposite of what asking for it meant.
    releaseSaveCheck(false)
  }, [libraryConflict, applyProject, adoptFileHandle, releaseSaveCheck])

  const handleOpenFromBrowser = useCallback(
    (name: string) => {
      guardedAction(() => {
        void loadStoredProjectRev(name).then((loaded) => {
          if (loaded) {
            applyProject(loaded.project)
            setProjectName(name)
            projectSourceRef.current = 'browser'
            setSaveWhere('browser')
            // Remember the revision read, so this tab's next save is checked
            // against exactly what it opened.
            libraryRevRef.current = { name, rev: loaded.rev }
            adoptFileHandle(null, name)
            setLibraryOpen(false)
          } else {
            notifications.show({
              color: 'yellow',
              title: 'Could not open browser project',
              message: 'It may have been deleted in another tab.',
            })
          }
        })
      })
    },
    [guardedAction, applyProject, adoptFileHandle],
  )

  const onProjectFileSelected = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      e.target.value = '' // allow re-opening the same file
      if (!file) return
      try {
        const p = await readProjectFile(file)
        applyProject(p)
        const name = file.name.replace(/\.frees$/i, '')
        setProjectName(name)
        projectSourceRef.current = 'file'
        setSaveWhere('file')
        // An <input type=file> read has no handle — any kept one is stale.
        adoptFileHandle(null, name)
      } catch (err) {
        setDialogError(err instanceof Error ? err.message : 'Could not open project file.')
      }
    },
    [applyProject, adoptFileHandle],
  )

  const performNewProject = useCallback(() => {
    projectSourceRef.current = null
    setSaveWhere(null)
    libraryRevRef.current = null
    adoptFileHandle(null, 'untitled')
    suppressDirtyRef.current = true
    isDirtyRef.current = false
    setDirty(false)
    clearProjectLocal()
    void clearAutosaveMirror()
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
      spreadsheets: [],
      analyzers: [],
      digitizer: null,
      dockLayout: null,
    })
    applyText(EXAMPLE)
    setVarDrafts({})
    setStateUnitIds({})
    setTables([])
    setPlots([])
    spreadsheetsRef.current = []
    analyzersRef.current = []
    setSchematic(EMPTY_PRESENTATION)
    setResult(null)
    setCheckResult(null)
    setProjectName('untitled')
    setWorkspaceEpoch((e) => e + 1)
    requestAnimationFrame(() => dockRef.current?.reset())
  }, [stopCriteria, unitSystem, fillMissing, applyText, adoptFileHandle])

  const handleNewProject = useCallback(() => guardedAction(performNewProject), [guardedAction, performNewProject])

  // The active table, defaulting to the first; the parametric-table solver
  // state below is derived from the active *parametric* table so all the
  // existing single-table wiring (plots, reports, top bar) keeps working.
  const activeTable = tables.find((t) => t.id === activeTableId) ?? tables[0] ?? null
  const activeParam: ParamTableSpec | null =
    activeTable?.kind === 'parametric' ? activeTable : null
  const tableVars = activeParam?.vars ?? []
  const paramRows = activeParam?.rows ?? []
  const tableResults = activeParam?.results ?? []

  // The parametric table window that is currently focused in the dock — the
  // TopBar's Check Table / Run Table buttons and status pill track this table.
  const focusedParam: ParamTableSpec | null = (() => {
    if (focusedWindow?.kind !== 'table') return null
    // The Tables workbook window tracks whichever hosted table is active.
    if (focusedWindow.id === TABLES_WORKBOOK_WINDOW_ID) return activeParam
    const t = tables.find((x) => `table:${x.id}` === focusedWindow.id)
    return t?.kind === 'parametric' ? t : null
  })()
  const tableCheckResult = focusedParam?.checkResult ?? null
  const tableCheckMessage = focusedParam?.checkMessage ?? ''
  // Function-table wire payloads. When the Tables workbook is mounted,
  // flush its pending sheet→spec sync first (contract b's pre-DTO scrape) and
  // build from the returned fresh specs — React state lands a render later,
  // too late for the calling handler's closure.
  const functionTableDtos = () => {
    flushTablesWorkbook()
    return toFunctionTableDtos(tablesRef.current)
  }

  function updateParamTable(id: string, update: (t: ParamTableSpec) => ParamTableSpec) {
    writeTables((all) =>
      all.map((t) => (t.id === id && t.kind === 'parametric' ? update(t) : t)),
    )
  }

  function updateActiveParam(update: (t: ParamTableSpec) => ParamTableSpec) {
    if (activeParam) setTables((all) => all.map((t) => t.id === activeParam.id && t.kind === 'parametric' ? update(t) : t))
  }

  function sendDigitizedToFunctionTable(data: DigitizedExport) {
    let table
    try {
      table = functionTableFromDigitizer({ existing: tables, ...data })
    } catch (error) {
      setLoadNotice(error instanceof Error ? error.message : String(error))
      return
    }
    setTables((all) => [...all, table])
    setActiveTableId(table.id)
    setActiveTab('table')
    requestAnimationFrame(() =>
      dockRef.current?.openInstance(TABLES_WORKBOOK_WINDOW_ID, 'table', 'Tables'),
    )
  }

  /** Wave-H composition features (sweep→function, digitizer fit→function,
   * CSV→function): applies produced GUI function tables — replacing a
   * same-named GUI table in place (the dialogs asked first), never touching
   * code tables (the document TABLE block keeps winning in the solver, D10) —
   * then focuses the first one in the Tables workbook. */
  function addFunctionTables(specs: FunctionTableSpec[]) {
    let firstId: string | null = null
    setTables((prev) => {
      const applied = applyFunctionSpecs(prev, specs)
      firstId = applied.ids[0] ?? null
      return applied.tables
    })
    requestAnimationFrame(() => {
      if (firstId) setActiveTableId(firstId)
      dockRef.current?.openInstance(TABLES_WORKBOOK_WINDOW_ID, 'table', 'Tables')
    })
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

  textChangeRef.current = onTextChange
  function onTextChange(value: string) {
    modelRevisionRef.current.bump()
    modelRevisionRef.current.invalidateCheck()
    // Keystrokes land in the ref synchronously; the state update that re-renders
    // the rest of the app rides a low-priority (interruptible) transition.
    textRef.current = value
    startTransition(() => setText(value))
    // Any edit invalidates the previous Check; Solve is gated
    // until the system is re-checked. Table checks depend on the same text.
    // Guarded so only the first edit after a check/solve pays an urgent render.
    if (checkResult) setCheckResult(null)
    if (result) setResult(null)
    if (stopped) setStopped(false)
    if (lastSolvedWithFillMissing) setLastSolvedWithFillMissing(false)
    invalidateTable()
    if (idleCheckTimer.current) clearTimeout(idleCheckTimer.current)
    idleCheckTimer.current = setTimeout(() => idleCheckRef.current(), 700)
  }

  /** Replaces the stored workspace with a just-opened example (not in an embed). */
  function persistLoadedExample(example: Example) {
    clearProjectLocal()
    void clearAutosaveMirror()
    writeBridgedKeys({
      version: 1,
      savedAt: '',
      text: example.text,
      varDrafts: {},
      stopCriteria,
      unitSystem,
      fillMissing,
      stateUnitIds: {},
      tables: [],
      plots: [],
      spreadsheets: [],
      analyzers: [],
      digitizer: null,
      dockLayout: null,
    })
  }

  // Load a curated example into the editor, replacing the current document and
  // invalidating any stale check/solve so the user can immediately re-Solve.
  function actuallyLoadExample(example: Example) {
    suppressDirtyRef.current = true
    isDirtyRef.current = false
    setDirty(false)
    // I4: an embed leaves the visitor's stored workspace exactly as it was.
    if (!EMBED.embed) persistLoadedExample(example)
    applyText(example.text)
    setVarDrafts({})
    setStateUnitIds({})
    setTables([])
    setPlots([])
    spreadsheetsRef.current = []
    analyzersRef.current = []
    setSchematic(EMPTY_PRESENTATION)
    setResult(null)
    setCheckResult(null)
    setLastSolvedWithFillMissing(false)
    setProjectName(example.title)
    setWorkspaceEpoch((e) => e + 1)
    const nextLesson = lessonFor(example.id)
    setLesson(nextLesson)
    lessonPlotShown.current = null
    if (nextLesson) setPinnedSliders(nextLesson.sliders.map((sl) => ({ ...sl })))
    requestAnimationFrame(() => {
      dockRef.current?.reset()
      if (nextLesson?.view === 'schematic') dockRef.current?.open('schematic')
    })
  }

  /** The source and solve request a live run opens with (the Live bar's and a lab's). */
  function buildLiveOpen() {
    flushTableEdits()
    liveOpenSlidersRef.current = pinnedSliders
    // L2: a valid check's instances locate the canvas inputs in this text.
    const lifted = modelRevisionRef.current.isCheckValidAndSolvable()
      ? liftCanvasInputs(effectiveText(), checkResult?.instances ?? [])
      : { source: effectiveText(), inputs: [] }
    const opening = Object.fromEntries(lifted.inputs.map((i) => [i.variable.toLowerCase(), i.value]))
    setLiveCanvas({ inputs: lifted.inputs, values: opening })
    liveAppliedRef.current = new Map([...pinnedSliders.map((p) => [p.name.toLowerCase(), p.value] as const), ...Object.entries(opening)])
    return {
      source: lifted.source,
      request: solveRequest({ ...stopCriteria, complexMode }, buildVariableInfo(), false, unitSystem, false, functionTableDtos(), solveOverrides()),
    }
  }

  /** M1: run the lesson's lab live, and grade a headless run of the same timeline. */
  async function runLessonLab(l: Lesson) {
    if (!l.lab) return
    // Opened first: flushing table edits may bump the revision, which would end this run.
    const { source, request } = buildLiveOpen()
    const run = ++labRunRef.current
    setLabState((s) => ({ for: l.example, token: (s?.token ?? 0) + 1, grades: 'running' }))
    // A model edit (see the revision subscription) ends the run; its grades are never written.
    const settle = (grades: LabResult[] | { error: string }) => {
      if (run === labRunRef.current) setLabState((s) => (s && s.for === l.example ? { ...s, grades } : s))
    }
    const [{ LiveClient }, { gradeLab, runLab }] = await Promise.all([import('./wasm/liveClient'), import('./labs')])
    const client = new LiveClient()
    try {
      settle(gradeLab(l.lab, await runLab(client, source, request, l.lab)))
    } catch (error) {
      settle({ error: error instanceof Error ? error.message : String(error) })
    } finally {
      client.terminate()
    }
  }

  /** M1: the sliders follow the lines a lab's timeline applied, where their units match. */
  function followTimeline(lines: string[]) {
    const parsed = lines.flatMap((line) => {
      const m = /^\s*([A-Za-z_][\w.]*)\s*=\s*([-+0-9.eE]+)\s*(?:\[([^\]]*)\])?\s*$/.exec(line)
      return m ? [{ name: m[1].toLowerCase(), value: Number(m[2]), units: (m[3] ?? '').trim() }] : []
    })
    for (const p of parsed) liveAppliedRef.current.set(p.name, p.value)
    // The chunk may carry several changes to one name; the last one applied is current.
    const latest = new Map(parsed.map((p) => [p.name, p]))
    setPinnedSliders((prev) => prev.map((s) => {
      const hit = latest.get(s.name.toLowerCase())
      return hit && hit.units === s.units ? { ...s, value: hit.value } : s
    }))
  }

  /** I2: the lesson's Reset — its baseline sliders, solved again. */
  function resetLesson(l: Lesson) {
    modelRevisionRef.current.bumpValues()
    setSlidersStale(true)
    setPinnedSliders(l.sliders.map((sl) => ({ ...sl })))
    scheduleSliderSolve(30)
  }

  function openSharedDocument(doc: SharedDocument) {
    // I6: a known lesson reopens beside the shared text, as its example would.
    const shared = doc.lesson ? lessonFor(doc.lesson) : null
    actuallyLoadExample({
      id: shared?.example ?? 'shared-link', title: shared?.title ?? 'Shared document',
      description: 'Opened from a link', category: 'Shared', text: doc.text,
    })
    if (doc.sliders) setPinnedSliders(doc.sliders)
    setSharedExperiment(doc.timeline ? { text: doc.text, timeline: doc.timeline } : null)
    const changes = doc.timeline?.reduce((n, e) => n + e.set.length, 0) ?? 0
    notifications.show({
      color: 'teal',
      title: 'Opened shared document',
      message: doc.timeline
        ? `Loaded from the link, with a live experiment: ${changes} input change${changes === 1 ? '' : 's'} from t = ${doc.timeline[0].at} s to ${doc.timeline.at(-1)!.at} s. Solve, then run it live to replay them.`
        : 'Loaded from the link.',
    })
  }

  // I4: `?example=<id>` opens a gallery example (and its lesson) at boot. A
  // share link takes precedence. Outside an embed it goes through the usual
  // unsaved-changes prompt and the parameter is dropped, so a refresh returns
  // to the visitor's own work; an embed keeps it, and Reset returns to it.
  // Nothing solves until Solve runs the check, as for any opened document.
  // An embed shows nothing until its example is in: a Solve pressed on the
  // placeholder document would be cleared by the example arriving.
  const [embedReady, setEmbedReady] = useState(!EMBED.embed || !EMBED.example || sharedBoot !== null)
  const [embedOrigin, setEmbedOrigin] = useState<Example>(() => ({ id: 'embed', title: 'Embedded model', description: '', category: 'Embed', text: textRef.current }))
  useEffect(() => {
    if (!EMBED.example || sharedBoot !== null) return
    void import('./examples').then((m) => {
      const example = m.EXAMPLES.find((e) => e.id === EMBED.example)
      setEmbedReady(true)
      if (!example) {
        notifications.show({ color: 'yellow', title: 'Example not found', message: `The gallery has no example "${EMBED.example}".` })
        return
      }
      setEmbedOrigin(example)
      if (EMBED.embed) actuallyLoadExample(example)
      else {
        clearExampleParam()
        loadExample(example)
      }
    })
    // Boot only: the parameter is read once per page load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const receiveRawDocument = useEffectEvent((loaded: string, initialText: string, initialEpoch: number) => {
    if (loaded === textRef.current) return
    // Include edits and project switches made while the download was pending.
    if (boot !== null || textRef.current !== initialText || workspaceEpoch !== initialEpoch) {
      setShareOffer({ text: loaded })
    } else {
      openSharedDocument({ text: loaded })
    }
  })

  useEffect(() => {
    if (RAW_DOCUMENT_URL === null || SHARED_BOOT !== null) return
    clearRawDocumentUrl()
    const controller = new AbortController()
    const initialText = textRef.current
    const initialEpoch = workspaceEpoch
    notifications.show({ id: 'raw-document', title: 'Opening raw document', message: 'Downloading the file…', loading: true, autoClose: false })
    void fetchRawDocument(RAW_DOCUMENT_URL, controller.signal).then(loaded => {
      if (!controller.signal.aborted) receiveRawDocument(loaded, initialText, initialEpoch)
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) notifications.show({
        color: 'red', title: 'Could not open raw document', autoClose: false,
        message: error instanceof Error ? error.message : String(error),
      })
    }).finally(() => {
      if (!controller.signal.aborted) notifications.hide('raw-document')
    })
    return () => { controller.abort(); notifications.hide('raw-document') }
    // The URL is a boot request; edits must not restart its download.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function loadExample(example: Example) {
    setShowExamples(false)
    guardedAction(() => actuallyLoadExample(example))
  }

  function handleOpenUrlSuccess(url: string, loadedText: string) {
    guardedAction(() => {
      const title = deriveProjectTitle(url, loadedText)
      actuallyLoadExample({
        id: 'url-document',
        title,
        description: `Loaded from ${url}`,
        category: 'Remote',
        text: loadedText,
      })
      notifications.show({
        color: 'teal',
        title: 'Opened document from URL',
        message: `Loaded “${title}”.`,
      })
    })
  }

  // "Open in Editor" handoff from the /help docs: the Help page parks a runnable
  // snippet in localStorage and opens this route; consume it exactly once on
  // mount. Stale keys (> 5 min) are dropped — they are leftovers, not intent.
  useEffect(() => {
    const raw = localStorage.getItem('frees.pendingSnippet')
    if (!raw) return
    localStorage.removeItem('frees.pendingSnippet')
    try {
      const snip = JSON.parse(raw)
      if (typeof snip?.text !== 'string' || !snip.text.trim()) return
      if (typeof snip.ts !== 'number' || Date.now() - snip.ts > 5 * 60_000) return
      loadExample({
        id: 'doc-snippet',
        title: String(snip.title || 'Documentation example'),
        description: 'Loaded from the documentation',
        category: 'Documentation',
        text: snip.text,
      })
    } catch {
      // Malformed handoff: nothing to load.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** The equations actually solved. Reads textRef (not `text`) so a solve
   *  fired right after a keystroke sees the document before the deferred
   *  state sync lands. (Until D10 this appended spreadsheet input bindings
   *  and substituted spreadsheet cell references into the document; the
   *  spreadsheet feature is removed, so a document calling the old cell
   *  reference function now fails at parse — deliberately, and loudly.) */
  function effectiveText(): string {
    return textRef.current
  }

  async function onCheck(fromLint = false): Promise<CheckResponse | null> {
    if (checking) return null
    // The live lint was not asked for, so it must not take focus from whatever
    // the user is typing in (a quick-add search, an inspector field); it reads
    // what is already committed.
    if (fromLint) flushTablesWorkbook()
    else flushTableEdits()
    const requestRevision = modelRevisionRef.current.startCheck()
    setChecking(true)
    setStopped(false)
    setResult(null)
    setLastSolvedWithFillMissing(false)
    try {
      const response = await check(
        effectiveText(),
        buildVariableInfo(),
        complexMode,
        functionTableDtos(),
        solveOverrides(),
      )
      const { isCurrent, needsRecheck } = modelRevisionRef.current.finishCheck(
        requestRevision,
        response.solvable,
      )
      if (!isCurrent) {
        if (needsRecheck && idleCheckRef.current) {
          setTimeout(() => idleCheckRef.current(), 50)
        }
        return null
      }
      setCheckResult(response)
      setCheckWasLint(fromLint)
      writeTables((all) =>
        mergeCodeTables(all, response.codeTables, response.parametricTables).map((t) => {
          if (t.kind !== 'parametric' || t.source === 'code') return t
          const columnUnits = { ...t.columnUnits }
          let changed = false
          for (const name of t.vars) {
            const inferred = response.inferredUnits[name]
            if (inferred && columnUnits[name] !== inferred) {
              columnUnits[name] = inferred
              changed = true
            }
          }
          return changed ? { ...t, columnUnits } : t
        }),
      )
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
      if (!modelRevisionRef.current.isCurrent(requestRevision)) {
        return null
      }
      const errorResponse: CheckResponse = {
        solvable: false,
        equations: 0,
        unknowns: 0,
        variables: [],
        unitWarnings: [],
        inferredUnits: {},
        message: LOCAL_ENGINE_FAILURE,
      }
      setCheckResult(errorResponse)
      setCheckWasLint(fromLint)
      return errorResponse
    } finally {
      setChecking(false)
    }
  }

  // Live lint: run Check automatically once typing pauses, so broken lines are
  // marked (all of them — the multi-error lint) without pressing F4. The timer
  // fires through a ref because its closure would otherwise go stale across
  // renders; anything already in flight skips the tick rather than queueing.
  idleCheckRef.current = () => {
    if (checking || solving || solvingTableId) return
    if (!textRef.current.trim()) return
    // A Solve pressed inside the debounce has checked this revision already;
    // a lint check now would only clear the solution it produced.
    const checked = modelRevisionRef.current.lastCheckedRevision
    if (checked !== null && modelRevisionRef.current.isCurrent(checked)) return
    void onCheck(true)
  }

  // Every solve/check override, REPL first then sliders: the backend collapses
  // the list by variable name keeping the last, so a pinned slider wins.
  // Only variables the document assigns a literal may be pinned: an override
  // replaces any line assigning the name, so offering a computed variable
  // would let a drag silently delete the equation defining it.
  const pinnableNames = useMemo(
    () => pinnableParameters(textRef.current),
    // Recomputed when a check/solve lands, which is also when the variable
    // list the affordance decorates is refreshed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [checkResult, result],
  )

  const pinnedSliderNames = useMemo(
    () => new Set(pinnedSliders.map((p) => p.name.toLowerCase())),
    [pinnedSliders],
  )

  // Last wins by name: the document < the active scenario < the REPL < a dragged slider.
  const solveOverrides = () => [
    ...scenarioOverrides(scenarios, pinnableNames),
    ...Object.values(replVars).map(replOverrideEquation),
    // Only pins that are STILL literal parameters are applied. A document edit
    // can turn a pinned name into a computed variable, and an override on one
    // of those replaces the equation defining it — so a stale pin goes inert
    // rather than silently deleting physics.
    ...pinnedSliders
      .filter((p) => pinnableNames.has(p.name.toLowerCase()))
      .map(sliderOverrideEquation),
  ]

  // Re-solve for the current slider values, honouring the in-flight guard.
  sliderSolveRef.current = () => {
    if (!solvable) return
    if (solving || checking) {
      sliderPendingRef.current = true
      return
    }
    void onSolve()
  }

  function scheduleSliderSolve(delayMs: number, drag = false) {
    if (sliderTimer.current) clearTimeout(sliderTimer.current)
    sliderTimer.current = setTimeout(() => {
      sliderDragRef.current = drag
      sliderSolveRef.current()
    }, delayMs)
  }

  /**
   * RUN-07: a scenario change is a model change: the revision moves (an
   * in-flight solve is discarded) and the result on screen is kept but marked
   * stale until the next solve. No solve runs by itself.
   */
  function applyScenarios(next: ScenarioState) {
    modelRevisionRef.current.bump()
    if (result) setScenarioStale(true)
    setScenarios(next)
  }
  function changeScenarios(next: ScenarioState) {
    setScenarioHistory((h) => ({ done: [...h.done.slice(-49), scenarios], undone: [] }))
    applyScenarios(next)
  }
  function stepScenarios(direction: 'undo' | 'redo') {
    const from = direction === 'undo' ? scenarioHistory.done : scenarioHistory.undone
    const target = from.at(-1)
    if (!target) return
    setScenarioHistory((h) => direction === 'undo'
      ? { done: h.done.slice(0, -1), undone: [...h.undone, scenarios] }
      : { done: [...h.done, scenarios], undone: h.undone.slice(0, -1) })
    applyScenarios(target)
  }

  function setSliderValue(name: string, value: number, commit: boolean) {
    // Phase L1: an open live run takes the value as a live input instead of
    // closing; the steady result is stale until the next solve.
    const live = liveInputRef.current
    const pin = findPin(pinnedSliders, name)
    if (live && pin) {
      setSlidersStale(true)
      setPinnedSliders((prev) => prev.map((p) => (p.name === name ? { ...p, value } : p)))
      live([sliderOverrideEquation({ ...pin, value })])
      return
    }
    modelRevisionRef.current.bumpValues()
    setSlidersStale(true)
    setPinnedSliders((prev) => prev.map((p) => (p.name === name ? { ...p, value } : p)))
    // Dragging re-solves on a short debounce so the solution tracks the handle;
    // the release commits promptly. Both go through the timer, so a fast drag
    // collapses into one solve rather than a queue of them.
    scheduleSliderSolve(commit ? 30 : 220, !commit)
  }

  function pinSlider(v: VariableResult) {
    setPinnedSliders((prev) => {
      if (findPin(prev, v.name)) return prev
      const draft = varDrafts[v.name]
        ?? varDrafts[Object.keys(varDrafts).find((k) => k.toLowerCase() === v.name.toLowerCase()) ?? '']
      const { min, max } = sliderRange(v.value, parseBound(draft?.lower ?? ''), parseBound(draft?.upper ?? ''))
      return [...prev, { name: v.name, value: v.value, units: v.units, min, max }]
    })
  }

  function unpinSlider(name: string) {
    setPinnedSliders((prev) => prev.filter((p) => p.name !== name))
  }

  /** Phase L6: what a slider's wheel steps through (presentation; no solve). */
  function setSliderSeries(name: string, series: SeriesId) {
    setPinnedSliders((prev) => prev.map((p) => (p.name === name ? { ...p, series } : p)))
  }

  function invalidateTable() {
    // Text edits invalidate the runs of every parametric table. Return the same
    // array when there is nothing to clear so a plain keystroke doesn't
    // re-render every table consumer.
    writeTables((all) => {
      let changed = false
      const next = all.map((t) => {
        if (t.kind !== 'parametric') return t
        if (t.results.length === 0 && !t.stats && !t.checkResult && !t.checkMessage) return t
        changed = true
        return { ...t, results: [], stats: null, checkResult: null, checkMessage: '', runStatus: 'stale' as const }
      })
      return changed ? next : all
    })
  }

  function invalidateActiveParam(t: ParamTableSpec): ParamTableSpec {
    return { ...t, results: [], stats: null, checkResult: null, checkMessage: '', runStatus: 'stale' as const }
  }

  // Fresh hosted spec for a table run (contract b's pre-run scrape): flush
  // the Tables workbook so a just-typed sheet edit is part of THIS run — the
  // React state update from the flush lands a render too late for this
  // handler's closure.
  function freshParamTable(tableId: string): ParamTableSpec | undefined {
    flushTableEdits()
    const fresh = flushTablesWorkbook()?.find((t) => t.id === tableId)
    const t = fresh ?? tablesRef.current.find((x) => x.id === tableId)
    return t?.kind === 'parametric' ? t : undefined
  }

  function tableRequestCurrent(revision: number, snapshot: ParamTableSpec): boolean {
    return modelRevisionRef.current.isCurrent(revision)
      && sameParamInputs(snapshot, tablesRef.current.find((t) => t.id === snapshot.id))
  }

  async function onCheckTable(tableIdArg?: string, overrideTbl?: ParamTableSpec): Promise<CheckResponse | null> {
    const tableId = tableIdArg ?? activeParam?.id
    if (checkingTableId !== null || !tableId) return null
    const tbl = overrideTbl ?? freshParamTable(tableId)
    if (!tbl || tbl.kind !== 'parametric') return null
    const tableRevision = modelRevisionRef.current.current
    const issues = tableInputIssues(tbl)
    if (issues.length) {
      updateParamTable(tableId, (t) => ({ ...t, checkMessage: issues.join('; ') }))
      return null
    }
    const tVars = tbl.vars
    const tRows = tbl.rows
    setCheckingTableId(tableId)
    updateParamTable(tableId, (t) => ({ ...t, results: [] }))
    try {
      // Check the augmented system: the equations plus one representative
      // fixed value per table input column (table semantics).
      const filled = firstFilledValues(tVars, tRows)
      let augmented = effectiveText()
      for (const [name, value] of filled) {
        augmented += `\n${name} = ${value}`
      }
      const response = await check(augmented, buildVariableInfo(), complexMode, functionTableDtos())
      if (!tableRequestCurrent(tableRevision, tbl)) return null
      updateParamTable(tableId, (t) => ({ ...t, checkResult: response }))

      // Sync variable list and units so the column headers show units for
      // calculated variables too (inferred + dimensionally derived).
      if (response.variables.length > 0) {
        setVariables(response.variables)
        setVarDrafts((drafts) => mergeInferredUnits(drafts, response.variables, response.inferredUnits))
        updateParamTable(tableId, (t) => {
          const columnUnits = { ...t.columnUnits }
          let changed = false
          for (const name of t.vars) {
            const inferred = response.inferredUnits[name]
            if (inferred && columnUnits[name] !== inferred) {
              columnUnits[name] = inferred
              changed = true
            }
          }
          return changed ? { ...t, columnUnits } : t
        })
      }

      if (response.solvable) {
        updateParamTable(tableId, (t) => ({
          ...t,
          checkMessage:
            `Structural representative check passed: ${response.equations} equations and ` +
            `${response.unknowns} variables, with ${filled.size} value(s) ` +
            `supplied by the table.`,
        }))
      } else {
        const unfilledColumns = tVars.filter((v) => !filled.has(v))
        const hint =
          unfilledColumns.length > 0
            ? ` Fill input values for: ${unfilledColumns.join(', ')} (or use the column fill).`
            : ' Add the missing variables as table columns via Configure Columns, or fix the equations.'
        updateParamTable(tableId, (t) => ({ ...t, checkMessage: response.message + hint }))
      }
      return response
    } catch (e) {
      if (!tableRequestCurrent(tableRevision, tbl)) return null
      updateParamTable(tableId, (t) => ({
        ...t,
        checkResult: null,
        checkMessage: LOCAL_ENGINE_FAILURE,
      }))
      return null
    } finally {
      setCheckingTableId(null)
    }
  }

  async function onSolveTable(tableIdArg?: string, checkOverride?: CheckResponse, overrideTbl?: ParamTableSpec): Promise<boolean> {
    const tableId = tableIdArg ?? activeParam?.id
    if (solvingTableId !== null || !tableId) return false
    const tbl = overrideTbl ?? freshParamTable(tableId)
    if (!tbl || tbl.kind !== 'parametric' || tbl.vars.length === 0) return false
    const issues = tableInputIssues(tbl)
    if (issues.length) {
      updateParamTable(tableId, (t) => ({ ...t, checkMessage: issues.join('; ') }))
      return false
    }
    // When checkOverride is explicitly provided (from checkThenSolveTable), honour it.
    // When called directly from a per-window "Run Table" button we skip the gate so
    // independent-block equations (e.g. two separate circuits) still solve correctly
    // even when the global underdetermination check fails.
    if (checkOverride !== undefined && !checkOverride.solvable) return false
    const solveTableRevision = modelRevisionRef.current.current
    setSolvingTableId(tableId)
    updateParamTable(tableId, (t) => ({ ...t, runStatus: 'running', results: [], stats: null }))
    setSolveProgress(0)
    try {
      // Non-empty cells become fixed inputs for that run; blank cells are
      // solved per row (Solve Table semantics).
      const rows = tbl.rows.map((row) => {
        const fixed: Record<string, number> = {}
        for (const name of tbl.vars) {
          const raw = (row.values[name] ?? '').trim()
          if (raw !== '') {
            const value = Number(raw)
            if (Number.isFinite(value)) fixed[name] = value
          }
        }
        return fixed
      })
      const response = await solveTable(
        effectiveText(),
        { ...stopCriteria, complexMode },
        buildVariableInfo(),
        unitSystem,
        tbl.vars,
        rows,
        functionTableDtos(),
        reportSolveProgress,
      )
      if (!tableRequestCurrent(solveTableRevision, tbl)) {
        return false
      }
      updateParamTable(tableId, (t) => ({
        ...t,
        resultRevision: solveTableRevision,
        results: response.results,
        stats: response.stats,
        runStatus: response.results.some((r) => r.status === 'cancelled') ? 'cancelled' : 'completed',
      }))
      if (response.stats?.converged !== false && response.variables && response.variables.length > 0) {
        setResult((prev) => ({
          success: true,
          variables: response.variables,
          blocks: prev?.blocks ?? [],
          residuals: prev?.residuals ?? [],
          stats: prev?.stats ?? null,
          solutions: [],
          unitWarnings: prev?.unitWarnings ?? [],
          error: null,
        }))
      }
      return true
    } catch (e) {
      if (!tableRequestCurrent(solveTableRevision, tbl)) {
        return false
      }
      if (e instanceof Error && e.message === 'Operation stopped') {
        return false
      }
      updateParamTable(tableId, (t) => ({
        ...t,
        stats: null,
        results: t.rows.map(() => ({
          success: false,
          values: {},
          error: LOCAL_ENGINE_FAILURE,
        })),
      }))
      return false
    } finally {
      setSolvingTableId(null)
      setSolveProgress(null)
    }
  }

  async function onSolve(
    forceFill: unknown = false,
    overridePlots?: PlotSpec[],
    checkOverride?: CheckResponse,
  ): Promise<boolean> {
    flushTableEdits()
    const isCurrentSolvable = modelRevisionRef.current.isCheckValidAndSolvable()
    const canRun = checkOverride ? checkOverride.solvable === true : (isCurrentSolvable && solvable)
    if (solving || !canRun) return false
    const solveRevision = modelRevisionRef.current.current
    const solveScenario = scenarios.active ?? DOCUMENT_INPUTS
    const sliderDrag = sliderDragRef.current
    sliderDragRef.current = false
    setSolving(true)
    setStopped(false)
    setSolveProgress(0)
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
        functionTableDtos(),
        sessionId,
        // REPL-defined/changed variables take priority over the editor until the
        // user runs `clear` in the terminal.
        solveOverrides(),
        reportSolveProgress,
        sliderDrag,
      )
      if (!modelRevisionRef.current.isCurrent(solveRevision)) {
        return false
      }
      setResult({
        ...response,
        resultRevision: solveRevision,
        run: { revision: solveRevision, scenario: solveScenario, sample: sampleOf(response.solutions?.length ?? 0, 0), status: runStatus(response) },
      })
      // REPL overrides persist across solves (the terminal keeps priority over the
      // editor); they're dropped only by the `clear` command, not by solving.
      // The Variable Explorer lives in the right edge group (expanded by default)
      // and shows the solved variables — it replaces the old Solution panel.
      // Solving updates its contents; the user can collapse it via its edge tab.
      writeTables((all) => mergeCodeTables(all, response.codeTables, response.parametricTables, response.odeTables))
      setLastSolvedWithFillMissing(shouldFillMissing && response.success)
      // Once the user has solved successfully, they've learned the core
      // workflow — retire the first-run welcome banner so it stops eating
      // editor space.
      if (response.success && showFirstRun) dismissFirstRun()
      if (response.success && response.variables) {
        setReplVars((prev) => {
          const next = { ...prev }
          for (const v of response.variables) {
            const lower = v.name.toLowerCase()
            if (next[lower]) {
              next[lower] = {
                ...next[lower],
                value: v.value,
                units: v.units || '',
                uncertainty: v.uncertainty,
              }
            }
          }
          return next
        })
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
      return response.success
    } catch (e) {
      if (!modelRevisionRef.current.isCurrent(solveRevision)) {
        return false
      }
      if (e instanceof Error && e.message === 'Operation stopped') {
        return false
      }
      setResult({
        success: false,
        variables: [],
        blocks: [],
        residuals: [],
        stats: null,
        solutions: [],
        unitWarnings: [],
        error: LOCAL_ENGINE_FAILURE,
      })
      setLastSolvedWithFillMissing(false)
      return false
    } finally {
      setSolving(false)
      setSolveProgress(null)
    }
  }

  function onStop() {
    if (solving || checking) setStopped(true)
    // A Solve queued behind the running check must not start once stopped.
    solvePendingRef.current = false
    tableSolvePendingRef.current = null
    stopSolve()
    setSolving(false)
    setSolvingTableId(null)
    setSolveProgress(null)
    setChecking(false)
    setCheckingTableId(null)
    setReplVars({})
  }

  // "Just solve it": if the system is already checked, solve; otherwise run
  // Check first and chain into Solve when it passes. The fresh CheckResponse is
  // passed through so the solve guard doesn't read stale `solvable` state.
  async function checkThenSolve(): Promise<'workspace' | 'table' | void> {
    if (solving) return
    if (checking) {
      solvePendingRef.current = true
      return
    }
    flushTableEdits()
    const isCurrentSolvable = modelRevisionRef.current.isCheckValidAndSolvable()
    if (isCurrentSolvable && solvable) {
      const ok = await onSolve()
      if (ok) return 'workspace'
      return
    }
    const res = await onCheck()
    // The document moved on while the check ran (an example still landing):
    // the check is discarded, but the Solve the user asked for is not.
    if (res === null) {
      solvePendingRef.current = true
      return
    }
    if (res.solvable) {
      const ok = await onSolve(false, undefined, res)
      if (ok) return 'workspace'
    } else if (res.parametricTables && res.parametricTables.length > 0) {
      // Auto-fallback: if the main block is not fully determined but there is a parametric
      // sweep defined, the user likely intended to just "Solve Table".
      const dto = res.parametricTables[0]
      const overrideTbl = paramTableFromDto(dto)
      const tableId = overrideTbl.id
      dockRef.current?.openInstance(`table:${tableId}`, 'table', overrideTbl.name)
      const ok = await checkThenSolveTable(tableId, overrideTbl)
      if (ok) return 'table'
    }
  }

  checkThenSolveRef.current = () => { void checkThenSolve() }

  async function checkWithFallback() {
    if (checking || solving) return
    const res = await onCheck()
    if (res && !res.solvable && res.parametricTables && res.parametricTables.length > 0) {
      const dto = res.parametricTables[0]
      const overrideTbl = paramTableFromDto(dto)
      const tableId = overrideTbl.id
      dockRef.current?.openInstance(`table:${tableId}`, 'table', overrideTbl.name)
      void onCheckTable(tableId, overrideTbl)
    }
  }

  async function checkThenSolveTable(tableIdArg?: string, overrideTbl?: ParamTableSpec): Promise<boolean> {
    const tableId = tableIdArg ?? activeParam?.id
    if (solvingTableId !== null || !tableId) return false
    if (checkingTableId !== null) {
      tableSolvePendingRef.current = tableId
      return false
    }
    const tbl = overrideTbl ?? freshParamTable(tableId)
    if (!tbl || tbl.kind !== 'parametric') return false
    if (tbl.checkResult?.solvable === true) {
      return await onSolveTable(tableId, undefined, overrideTbl)
    }
    const res = await onCheckTable(tableId, overrideTbl)
    if (res?.solvable) {
      return await onSolveTable(tableId, res, overrideTbl)
    }
    return false
  }

  checkThenSolveTableRef.current = (id) => { void checkThenSolveTable(id) }

  // N2: one run target for the toolbar, F2/F4 and the palette — the focused
  // parametric table, else the model. `focusedWindow` already ignores the
  // utility panels (Inspector, Variables, Terminal), so they keep the target.
  // Solve always checks first; Check falls back to a code-defined parametric
  // table the same way on every path.
  const solveTarget = () => (focusedParam ? checkThenSolveTable(focusedParam.id) : checkThenSolve())
  const checkTarget = () => (focusedParam ? onCheckTable(focusedParam.id) : checkWithFallback())
  // A palette or menu entry captures its table when it is built; if the table
  // is gone when the command runs, say so and do nothing — never redirect.
  const solveTableById = (id: string, name: string) => {
    if (!tablesRef.current.some((t) => t.id === id && t.kind === 'parametric')) {
      notifications.show({ color: 'orange', title: 'Table not found', message: `“${name}” no longer exists; nothing was solved.` })
      return
    }
    openTableWindow(tablesRef.current.find((t) => t.id === id)!)
    void checkThenSolveTable(id)
  }

  // From a read-only table's column selection: open the New X-Y plot modal
  // pre-filled with the time column as x and the selected columns as y.
  const handlePlotColumns = (xVar: string, yVars: string[], tableId?: string) => {
    setPlotSeed({ xVar, yVars, tableId })
    setNewPlotKind('xy')
  }

  // RUN-06: a solved variable handed from the schematic to the app's own windows.
  const plotTableFor = (name: string) =>
    tables.find((t): t is ParamTableSpec => t.kind === 'parametric' && t.results.length > 1 && t.vars.some((v) => v.toLowerCase() === name.toLowerCase()))
  const handoffReason = (kind: SchematicHandoff, name: string): string | null => {
    if (!result) return 'Solve first.'
    if (kind === 'plot' && !plotTableFor(name)) return 'Add it to a parametric table and run the table: a plot needs more than one solved point.'
    return null
  }
  const handoff = (kind: SchematicHandoff, name: string, fluid?: string) => {
    if (kind === 'plot') {
      const t = plotTableFor(name)
      if (t) handlePlotColumns(t.vars.find((v) => v.toLowerCase() !== name.toLowerCase()) ?? t.vars[0], [name], t.id)
    } else if (kind === 'table') {
      const target = [...tables].reverse().find((t): t is ParamTableSpec => t.kind === 'parametric' && t.source !== 'code' && t.origin !== 'ode')
      const t = target ?? newParamTable(tables)
      const next = t.vars.some((v) => v.toLowerCase() === name.toLowerCase()) ? t : invalidateActiveParam({ ...t, vars: [...t.vars, name] })
      setTables((prev) => (target ? prev.map((x) => (x.id === t.id ? next : x)) : [...prev, next]))
      setActiveTableId(t.id)
      requestAnimationFrame(() => openTableWindow(next))
    } else if (kind === 'state' && fluid) {
      setFluidSeed(fluid)
      setNewPlotKind('property')
    } else if (kind === 'sensitivity') {
      setSensitivityOutput(name)
      setShowSensitivity(true)
    }
  }

  const handlePlotsChange = (nextPlots: PlotSpec[]) => {
    // Code-defined plots are derived from the solve response, not persisted, so
    // strip them before saving — they are re-merged on the next solve/check.
    const userPlots = nextPlots.filter((p) => !p.fromCode)
    const names = [...userPlots, ...codePlots].map((p) => p.name.trim().toLowerCase())
    if (names.some((n) => !n) || new Set(names).size !== names.length) {
      setLoadNotice('Plot names must be nonempty and unique, including code-owned plots.')
      return
    }
    setPlots(userPlots)
    const needMissing = userPlots.some((p) => p.kind === 'property' && p.property.overlayStates)
    if (needMissing && result?.success && !lastSolvedWithFillMissing && !solving && solvable) {
      void onSolve(true, userPlots)
    }
  }


  // Jump the editor to a 1-based line (selecting it) — the error Alert's "Go to
  // line" and the schematic's click-to-reveal. Opening the dock panel is what
  // actually makes the jump visible: setting the rail tab alone leaves the
  // editor behind whichever window is focused (or closed entirely), so the
  // selection would land somewhere the user cannot see.
  const goToLine = useCallback((lineNo: number) => {
    setActiveTab('equations')
    dockRef.current?.open('equations')
    setTimeout(() => editorRef.current?.goToLine(lineNo), 50)
  }, [])

  // Linked selection: move the editor's selection to a line without bringing
  // its tab forward or taking focus, so the view the user clicked stays put.
  const selectLine = useCallback((lineNo: number) => {
    editorRef.current?.goToLine(lineNo, { focus: false })
  }, [])

  const handleGoToTableDeclaration = useCallback((tableName: string) => {
    const lower = tableName.toLowerCase()
    const regex = new RegExp(String.raw`^\s*(TABLE|PARAMETRIC)\s+${lower}\b`, 'i')
    const lines = (textRef.current ?? '').split('\n')
    const idx = lines.findIndex((l: string) => regex.test(l))
    if (idx >= 0) {
      goToLine(idx + 1)
    }
  }, [goToLine])

  const handleReproduceRow = useCallback((table: ParamTableSpec, rowIndex: number) => {
    const row = table.rows[rowIndex]
    if (!row) return
    const nextRepl: Record<string, VariableResult> = { ...replVars }
    let pinnedCount = 0
    for (const v of table.vars) {
      const val = (row.values[v] ?? '').trim()
      if (val !== '') {
        const num = Number(val)
        if (Number.isFinite(num)) {
          nextRepl[v.toLowerCase()] = {
            name: v,
            value: num,
            units: table.columnUnits?.[v] || '',
          }
          pinnedCount++
        }
      }
    }
    if (pinnedCount > 0) {
      setReplVars(nextRepl)
      dockRef.current?.openInstance('terminal', 'terminal', 'Terminal')
      setLoadNotice(`Pinned ${pinnedCount} input variable(s) from ${table.name} (run ${rowIndex + 1}) into calculation session.`)
    }
  }, [replVars])

  const [highlightedRowId, setHighlightedRowId] = useState<string | null>(null)

  const handleSelectTableRow = useCallback((tableId: string | undefined, rowId: string) => {
    if (tableId) {
      setActiveTableId(tableId)
    }
    setHighlightedRowId(rowId)
    setActiveTab('tables')
    dockRef.current?.openInstance(TABLES_WORKBOOK_WINDOW_ID, 'table', 'Tables')
  }, [])

  // Global keys come from the registry (N4). A command that cannot run now is
  // left to the browser — Ctrl+P prints the page until there is a report — and
  // a single printable key (`?`) never fires while the user is typing.
  const commandsRef = useRef<Commands | null>(null)
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const cmds = commandsRef.current
      const c = cmds && commandForKey(cmds, e)
      if (!c || c.unavailable !== null) return
      if (c.shortcut?.length === 1 && c.shortcut[0].length === 1) {
        const el = e.target as HTMLElement | null
        const typing = !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable || el.closest('.cm-editor') !== null)
        if (typing) return
      }
      e.preventDefault()
      // A form field may hold an uncommitted edit (scenario values commit on
      // blur or Enter): commit it first, then run the command from the next
      // task, once React has re-rendered with that edit in its handlers.
      const el = document.activeElement
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
        el.blur()
        setTimeout(() => commandsRef.current?.[c.id].run(), 0)
        return
      }
      c.run()
    }
    globalThis.addEventListener('keydown', onKeyDown)
    return () => globalThis.removeEventListener('keydown', onKeyDown)
  })

  const solutions = result?.solutions ?? []
  // RUN-05: the dynamic run's recorded timelines and the sample playback shows, if any.
  const timelines = useMemo(() => (result?.odeTables ?? []).map(timelineOf).filter((t): t is Timeline => t !== null), [result])
  const timeline = timelines.find((t) => t.table === playback.table) ?? timelines[0] ?? null
  // Phase K4: a live run's rows so far replace its block's ODE Table, so
  // Playback, the Tables tab and CSV export read it as they read a batch run.
  // The solve's other results stand: live mode integrates the same model.
  const publishLiveTable = (table: OdeTableDto) => {
    if (!result) return
    const odeTables = (result.odeTables ?? []).map((t) => (t.name === table.name ? table : t))
    setResult({ ...result, odeTables })
    setPlayback({ of: null, table: table.name, index: null, playing: false })
    writeTables((all) => mergeCodeTables(all, result.codeTables, result.parametricTables, odeTables))
  }
  // Phase K3: the solved document's DYNAMIC blocks, in order, are what Live can open.
  const liveBlocks = useMemo(() => (result?.odeTables ?? []).map((t) => t.name), [result])
  // Playback belongs to the result it started on: a new result shows its end until played.
  const playIndex = timeline && playback.of === result && playback.index !== null && playback.index < timeline.times.length ? playback.index : null
  const playTable = timeline && playIndex !== null ? result?.odeTables?.find((t) => t.name === timeline.table) : undefined
  // H3: the recorded sample for the property-diagram cursor (memoised so a figure rebuilds only when it moves).
  // H4: the blocks an event recorded at this sample reads flash on the schematic.
  const flashOwners = useMemo(() => {
    if (!timeline || playIndex === null) return undefined
    const here = new Set(timeline.events.filter((e) => e.index === playIndex).map((e) => e.name))
    return (checkResult?.events ?? []).filter((w) => w.table.toLowerCase() === timeline.table.toLowerCase() && here.has(w.name)).flatMap((w) => w.owners)
  }, [timeline, playIndex, checkResult?.events])
  const playSampleOf = useMemo(
    () => (playTable && playIndex !== null ? { table: playTable, index: playIndex, connections: checkResult?.connections ?? [] } : undefined),
    [playTable, playIndex, checkResult?.connections],
  )
  const playSample = timeline && playIndex !== null ? `${timeLabel(timeline, playIndex)} (sample ${playIndex + 1} of ${timeline.times.length})` : null
  const changePlayIndex = useCallback((index: number) => setPlayback((p) => ({ ...p, of: result, index })), [result])
  const changePlaying = useCallback(
    (playing: boolean) => setPlayback((p) => (p.of === result ? { ...p, playing, index: p.index ?? 0 } : { ...p, of: result, playing, index: 0 })),
    [result],
  )
  // RUN-07: the run on screen, with the sample the explorer shows, and its comparison with the baseline.
  const currentRun = result?.run ? { ...result.run, sample: playSample ?? sampleOf(solutions.length, selectedSolutionIndex) } : null
  const comparedVariables = useMemo(() => {
    const solved = result?.solutions?.length ? (result.solutions[selectedSolutionIndex]?.variables ?? result.variables) : (result?.variables ?? [])
    return playTable && playIndex !== null ? playbackVariables(solved, playTable, playIndex) : solved
  }, [result, selectedSolutionIndex, playTable, playIndex])
  const exportPlayback = () => {
    if (!timeline || !currentRun) return
    const k = playIndex ?? timeline.times.length - 1
    const values = playbackVariables(result?.variables ?? [], result!.odeTables!.find((t) => t.name === timeline.table)!, k)
    downloadValuesAsCsv(
      [['variable', 'value', 'unit'], ...values.map((v) => [v.name, v.value, v.units])],
      `${timeline.table}-${timeline.timeVar}-${timeline.times[k]}.csv`,
      [describeRun({ ...currentRun, sample: `${timeLabel(timeline, k)} (sample ${k + 1} of ${timeline.times.length})` })],
    )
  }
  const unitPairs = useMemo(() => {
    if (!baseline) return []
    const now = new Map(comparedVariables.map((v) => [v.name.toLowerCase(), v.units]))
    return [...new Set(baseline.variables.flatMap((b) => {
      const c = now.get(b.name.toLowerCase())
      return c && b.units && c !== b.units && c !== '-' && b.units !== '-' ? [`${b.units}\u0000${c}`] : []
    }))]
  }, [baseline, comparedVariables])
  useEffect(() => {
    const missing = unitPairs.filter((k) => !(k in conversions))
    if (missing.length === 0) return
    void Promise.all(missing.map(async (k) => {
      const [from, to] = k.split('\u0000')
      const u = await wasmUnitConversions(from, [to]).then((r) => r.units[0], () => undefined)
      return [k, u && !u.error && u.scale !== undefined ? { scale: u.scale, shift: u.shift ?? 0 } : null] as const
    })).then((found) => setConversions((c) => ({ ...c, ...Object.fromEntries(found) })))
  }, [unitPairs, conversions])
  const comparison = baseline && currentRun
    ? compareRuns(baseline, { run: currentRun, variables: comparedVariables }, (from, to) => conversions[`${from}\u0000${to}`] ?? null)
    : null
  useEffect(() => {
    if (selectedSolutionIndex >= solutions.length && solutions.length > 0) {
      setSelectedSolutionIndex(0)
    }
  }, [solutions.length, selectedSolutionIndex])

  // The banners above the editor report a Check or Solve the user asked for.
  // The idle live-lint is deliberately excluded: its findings are about the
  // half-typed line under the cursor, and opening a banner for them reflows the
  // document mid-keystroke. The lint still marks the line in the editor gutter
  // and colours the status pill, which cost no layout.
  const bannerCheck = checkWasLint ? null : checkResult

  // Unit-consistency warnings from the latest Solve (preferred) or Check, shown
  // as a dismissible banner above the editor. Re-shown whenever the set changes.
  const unitWarnings = result?.unitWarnings ?? bannerCheck?.unitWarnings ?? []
  const warningsKey = unitWarnings.join('|')
  useEffect(() => {
    setDismissedWarnings(false)
  }, [warningsKey])

  // 1-based editor line a syntax error points at (from Solve, then Check), used
  // to mark the gutter. `bannerErrorLine` is the subset that also opens the
  // banner with its jump-to-line action.
  const errorLine = result?.errorLine ?? checkResult?.errorLine ?? null
  const bannerErrorLine = result?.errorLine ?? bannerCheck?.errorLine ?? null

  // Plots declared in the editor text with PLOT ... END blocks, regenerated on
  // every solve/check. Merged with GUI plots for display and [Graph] resolution
  // but kept out of the persisted project (handlePlotsChange strips fromCode).
  const codePlots = useMemo<PlotSpec[]>(() => {
    const dtos = result?.definedPlots ?? checkResult?.definedPlots ?? []
    return dtos.map(plotDefToSpec)
  }, [result?.definedPlots, checkResult?.definedPlots])

  useEffect(() => {
    setPlots((previous) => {
      let changed = false
      const next = previous.map((plot) => {
        const source = resolvePlotSource(plot, tables, result?.variables ?? [])
        const sourceTable = source?.kind === 'table' ? tables.find((t) => t.id === source.tableId) : undefined
        const revision = source?.kind === 'arrays' ? result?.resultRevision : sourceTable?.kind === 'parametric' ? sourceTable.resultRevision : undefined
        if (source === plot.source && revision === plot.resultRevision) return plot
        changed = true
        return { ...plot, source, resultRevision: revision }
      })
      return changed ? next : previous
    })
  }, [tables, result])

  const mergedPlots = useMemo<PlotSpec[]>(() => {
    const codeNames = new Set(codePlots.map((p) => p.name.toLowerCase()))
    return [...plots.filter((p) => !codeNames.has(p.name.toLowerCase())), ...codePlots]
  }, [plots, codePlots])

  // I2–I3: a chart lesson opens its example's first PLOT once the check has
  // declared it — the Plots container alone would open empty.
  const lessonPlotShown = useRef<string | null>(null)
  useEffect(() => {
    if (lesson?.view !== 'plots' || lessonPlotShown.current === lesson.example) return
    const first = codePlots[0]
    if (!first) return
    lessonPlotShown.current = lesson.example
    requestAnimationFrame(() => dockRef.current?.openInstance(`plot:${first.id}`, 'plot', first.name))
  }, [lesson, codePlots])

  // I4: an embed mounts no editor, whose edits schedule the idle check; check
  // each document it opens instead (a check, never a solve), so its sliders
  // and Solve know the model before anyone presses Solve.
  useEffect(() => {
    if (!EMBED.embed) return
    const id = setTimeout(() => idleCheckRef.current(), 300)
    return () => clearTimeout(id)
  }, [text])

  // I4: `sliders=a,b` pins the named literals once a solve has given them
  // values (a lesson has pinned its own already); only those are shown.
  const embedPinned = useRef(false)
  useEffect(() => {
    if (!EMBED.sliders || embedPinned.current || !result?.success) return
    embedPinned.current = true
    for (const name of EMBED.sliders) {
      const v = result.variables.find((x) => x.name.toLowerCase() === name.toLowerCase())
      if (v && pinnableNames.has(v.name.toLowerCase())) pinSlider(v)
    }
    // pinSlider and pinnableNames are read at the solve that lands.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result])

  // Auto-close dock windows whose backing instance no longer exists — e.g. a
  // plot removed from its card, a deleted table, or a stale window
  // restored from a saved layout. Without this they'd render as blank panels.
  useEffect(() => {
    const valid = new Set<string>([
      'equations', 'table', 'plots', 'digitizer', 'schematic', 'workspace', 'terminal', 'states', 'inspector',
      TABLES_WORKBOOK_WINDOW_ID,
      ...mergedPlots.map((p) => `plot:${p.id}`),
      // Hosted tables (function + GUI parametric) live as sheets in the
      // single Tables workbook window; no per-table windows (decision 2).
      ...tables.filter((t) => !isHostedTable(t)).map((t) => `table:${t.id}`),
      ...(result?.stateTableDefs ?? checkResult?.stateTableDefs ?? []).map((s) => `state:${s.name}`),
    ])
    validWindowIdsRef.current = valid
    for (const w of openWindows) {
      if (!valid.has(w.id)) dockRef.current?.close(w.id)
    }
  }, [mergedPlots, tables, openWindows, result?.stateTableDefs, checkResult?.stateTableDefs])

  // Keep dock tab titles in sync with instance names (so renames in the
  // Inspector show on the tabs). Deferred out of the commit cycle so dockview's
  // own re-render can't re-enter React mid-update.
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      for (const p of mergedPlots) dockRef.current?.setTitle(`plot:${p.id}`, p.name)
      for (const t of tables) {
        if (isHostedTable(t)) continue // hosted in the Tables workbook
        dockRef.current?.setTitle(`table:${t.id}`, t.name)
      }
    })
    return () => cancelAnimationFrame(raf)
  }, [mergedPlots, tables])

  const activeSolution = solutions[selectedSolutionIndex] ?? solutions[0]
  const baseVariables =
    activeSolution ? activeSolution.variables : result?.variables ?? []

  // Solved variables with the REPL overlay applied: REPL-defined names are
  // appended, and REPL-changed names override the solved value. Feeds the
  // Variable Explorer, the Solution rows and the terminal's tab-completion.
  const replOverlay = Object.values(replVars)
  const workspaceVariables: VariableResult[] = replOverlay.length === 0
    ? baseVariables
    : [
        ...baseVariables.map((v) => replVars[v.name.toLowerCase()] ?? v),
        ...replOverlay.filter(
          (v) => !baseVariables.some((b) => b.name.toLowerCase() === v.name.toLowerCase()),
        ),
      ]
  const replNames = new Set(Object.keys(replVars))
  // All callable function names (property functions + built-ins, including CALL
  // library callees) for the terminal's Tab-completion — bare names so a
  // completion inserts `lqr(`, not the menu's descriptive label.
  const replFunctionNames = catalogFunctionNames()

  // Fluid state tables declared with STATE TABLE blocks: surfaced in the left
  // Tables menu (tagged by fluid) and opened in the shared Fluid States window.
  const declaredStateDefs = result?.stateTableDefs ?? checkResult?.stateTableDefs ?? []

  // Reusable window open/create handlers, shared by the left rail and the
  // command palette so both open real dock windows (not just highlight a tab).
  // Opens the dock window backing a table: function tables live as sheets in
  // the single Tables workbook (decision 2), everything else keeps its
  // per-table window.
  const openTableWindow = (t: TableSpec) => {
    if (isHostedTable(t)) {
      setActiveTableId(t.id)
      dockRef.current?.openInstance(TABLES_WORKBOOK_WINDOW_ID, 'table', 'Tables')
    } else {
      dockRef.current?.openInstance(`table:${t.id}`, 'table', t.name)
    }
  }
  const createTable = (kind: 'parametric' | 'function-1d' | 'function-2d') => {
    const t =
      kind === 'parametric'
        ? newParamTable(tables)
        : newFunctionTable(tables, kind === 'function-1d')
    setTables((prev) => [...prev, t])
    setActiveTableId(t.id)
    requestAnimationFrame(() => openTableWindow(t))
  }
  // D11: measured data enters through Tables now. Opens the workbook window
  // and asks it for the Import CSV… dialog — the request survives the lazy
  // chunk load, so this works whether the window was open or not.
  const importCsvAsFunctionTable = () => {
    dockRef.current?.openInstance(TABLES_WORKBOOK_WINDOW_ID, 'table', 'Tables')
    requestTablesCsvImport()
  }
  const openLatestOrNewTable = () => {
    const t = tables[tables.length - 1]
    if (t) openTableWindow(t)
    else createTable('parametric')
  }
  const openLatestOrNewPlot = () => {
    const p = mergedPlots[mergedPlots.length - 1]
    if (p) dockRef.current?.openInstance(`plot:${p.id}`, 'plot', p.name)
    else setNewPlotKind('xy')
  }

  // N1: every app command, once. The TopBar menus, the rail, the mobile menu,
  // the palette, the `?` sheet and the global keys are all built from this.
  const runBusy = solving || checking || solvingTableId !== null || checkingTableId !== null
  const openStates = () => {
    const first = declaredStateDefs[0]
    if (first) dockRef.current?.openInstance(`state:${first.name}`, 'states', first.name)
    else dockRef.current?.open('states')
  }
  const changeFindAll = (checked: boolean) => {
    setFindAll(checked)
    setResult(null)
    setLastSolvedWithFillMissing(false)
  }
  const changeComplexMode = (checked: boolean) => {
    setComplexMode(checked)
    setCheckResult(null)
    setResult(null)
    setLastSolvedWithFillMissing(false)
    invalidateTable()
  }
  // Phase O: contextual commands run in the focused window, which publishes
  // them (contextActions.ts); App names the reason when it has not. A code
  // table or plot is "defined in the equations" and is never redirected.
  const fw = focusedWindow
  const focusedTable = fw?.kind === 'table'
    ? fw.id === TABLES_WORKBOOK_WINDOW_ID
      ? (activeTable && isHostedTable(activeTable) ? activeTable : undefined)
      : tables.find((x) => `table:${x.id}` === fw.id)
    : undefined
  const focusedPlot = fw?.kind === 'plot' ? mergedPlots.find((x) => `plot:${x.id}` === fw.id) : undefined
  const codeTable = focusedTable?.source === 'code' && fw?.id !== TABLES_WORKBOOK_WINDOW_ID
  const noop = () => {}
  const inWindow = (windowId: string | undefined, id: CommandId, none: string) =>
    contextHandler(windowId, id) ?? { run: noop, unavailable: none }
  const onTable = (id: CommandId) => {
    if (fw?.kind !== 'table') return { run: noop, unavailable: 'Focus a table first.' }
    if (codeTable) return { run: noop, unavailable: 'Defined in the equations: edit its block in the Editor.' }
    return inWindow(fw.id, id, 'Open the Tables workbook first.')
  }
  const onWorkbook = (id: CommandId) =>
    codeTable ? { run: noop, unavailable: 'Defined in the equations: edit its block in the Editor.' } : inWindow(TABLES_WORKBOOK_WINDOW_ID, id, 'Open the Tables workbook first.')
  const onPlot = (id: CommandId) => (fw?.kind === 'plot' ? inWindow(fw.id, id, 'This plot has not loaded yet.') : { run: noop, unavailable: 'Focus a plot first.' })
  const onDigitizer = (id: CommandId) => inWindow('digitizer', id, 'Open the Graph Digitizer first.')
  // The Variable Explorer is a utility panel, so it never becomes the focused
  // document; while it is the active panel, Undo and Redo reach its scenarios.
  const onHistory = (id: CommandId) => {
    if (activeTab === 'workspace') {
      const undo = id === 'edit.undo'
      const steps = undo ? scenarioHistory.done.length : scenarioHistory.undone.length
      return {
        run: () => stepScenarios(undo ? 'undo' : 'redo'),
        unavailable: steps ? null : `Nothing to ${undo ? 'undo' : 'redo'} in the scenarios.`,
        description: `${undo ? 'Undo' : 'Redo'} the last scenario edit`,
      }
    }
    return inWindow(fw?.id, id, 'No undo history here: focus the Editor, the Tables workbook, the schematic or the scenarios.')
  }
  // Phase Q: context menus run on the row or tab they were opened on. A plot's
  // Configure and Export live in its card, which mounts when its window shows:
  // bring the window forward, then run the command once the card has published it.
  const runInWindow = (windowId: string, id: CommandId, tries = 60) => {
    dockRef.current?.focus(windowId)
    const h = contextHandler(windowId, id)
    if (h) {
      if (h.unavailable) notifications.show({ color: 'yellow', message: h.unavailable })
      else h.run()
    } else if (tries > 0) requestAnimationFrame(() => runInWindow(windowId, id, tries - 1))
    else notifications.show({ color: 'yellow', message: 'That window has not loaded yet.' })
  }
  const plotTabMenu = (w: OpenWindow) => {
    const p = w.kind === 'plot' ? mergedPlots.find((x) => `plot:${x.id}` === w.id) : undefined
    if (!p) return null
    return {
      entries: PLOT_TAB_MENU,
      cmds: menuCommands({
        'plot.rename': { run: () => setRenamePlot({ id: p.id, name: p.name }), unavailable: p.fromCode ? 'Defined in the equations: rename its PLOT block in the Editor.' : null },
        'plot.configure': { run: () => runInWindow(w.id, 'plot.configure'), unavailable: p.fromCode ? 'Defined in the equations: Duplicate as editable first.' : null },
        'plot.export': { run: () => runInWindow(w.id, 'plot.export') },
      }),
    }
  }
  const copyText = (text: string, what: string) => {
    navigator.clipboard.writeText(text).then(
      () => notifications.show({ message: `Copied ${what}.` }),
      () => notifications.show({ color: 'red', message: 'The browser refused the clipboard.' }),
    )
  }
  const variableRowMenu = (v: VariableResult) => {
    const key = v.name.toLowerCase()
    return menuCommands({
      'variable.pin': {
        run: () => pinSlider(v),
        unavailable: pinnedSliderNames.has(key) ? 'It is already pinned to a slider.' : pinnableNames.has(key) ? null : 'Only a variable the equations set to a number can be pinned.',
      },
      // Full precision, not the six digits shown.
      'variable.copyValue': { run: () => copyText(v.units ? `${v.value} [${v.units}]` : String(v.value), `the value of ${v.name}`) },
      'variable.copyName': { run: () => copyText(v.name, 'the name') },
      'tool.variableInfo': { run: () => setShowVariableInfo(true) },
    })
  }
  const needsRow = { run: () => {}, unavailable: 'Right-click a variable in the Variable Explorer.' }
  const onWindow = (action: WindowAction) => ({
    run: () => { if (activeWindowId) dockRef.current?.act(activeWindowId, action) },
    unavailable: windowActionReason(openWindows, activeWindowId, action),
  })
  const toggleRibbon = () => changeRibbonDensity(ribbonDensity === 'collapsed' ? ribbonLastOpenRef.current : 'collapsed')
  const perspective = (name: 'default' | 'results' | 'split', label: string) => () => {
    dockRef.current?.applyPerspective(name)
    setLayoutName(label)
  }
  const form = layoutForm()
  const storeLayouts = (next: LayoutStore) => {
    setLayouts(next)
    if (!writeLayouts(next)) notifications.show({ color: 'red', message: 'This browser would not store the layouts; they last until the page closes.' })
  }
  const applyLayout = (name: string) => {
    const l = layouts[form].find((x) => x.name === name)
    if (!l) return
    if (!restoreLayout(l.dock)) {
      notifications.show({ color: 'red', title: `Layout "${l.name}" could not be read`, message: 'The default layout was built instead. Undo Layout Change returns to the windows as they were.' })
      setLayoutName('Default')
      return
    }
    if (l.density) changeRibbonDensity(l.density)
    if (l.ribbonTab) setRibbonTab(l.ribbonTab)
    setLayoutName(l.name)
  }
  // With a parametric table focused, the status bar reads that table, as the status pill does.
  const statusSolveText = focusedParam
    ? `${focusedParam.name}: ${solvingTableId === focusedParam.id ? 'running…' : checkingTableId === focusedParam.id ? 'checking…' : (tablePill(focusedParam.results, tableCheckResult, tableCheckMessage, focusedParam.stats)?.label ?? 'not run yet')}`
    : solving ? 'Solving…'
    : checking ? 'Checking…'
    : solvingTableId !== null || checkingTableId !== null ? 'Table running…'
    : stopped ? 'Stopped'
    : result ? (result.success ? `Solved${result.stats ? ` in ${result.stats.elapsedMillis < 1000 ? `${Math.round(result.stats.elapsedMillis)} ms` : `${(result.stats.elapsedMillis / 1000).toFixed(1)} s`}` : ''}` : 'Did not converge')
    : checkResult ? (checkResult.solvable ? 'Checked: solvable' : 'Checked: not solvable')
    : 'Not solved yet'
  const commands = resolveCommands({
    'run.check': { run: () => { void checkTarget() } },
    'run.solve': { run: () => { void solveTarget() } },
    'run.stop': { run: onStop, unavailable: runBusy ? null : 'Nothing is running.' },
    'model.check': { run: () => { void checkWithFallback() } },
    'model.solve': { run: () => { void checkThenSolve() } },
    'view.editor': { run: () => dockRef.current?.open('equations') },
    'view.tables': { run: openLatestOrNewTable },
    'view.plots': { run: openLatestOrNewPlot },
    'view.states': { run: openStates },
    'view.digitizer': { run: () => dockRef.current?.open('digitizer') },
    'view.schematic': { run: () => dockRef.current?.open('schematic') },
    'view.variables': { run: () => dockRef.current?.open('workspace') },
    'view.terminal': { run: () => dockRef.current?.open('terminal') },
    'view.inspector': { run: () => dockRef.current?.open('inspector') },
    'window.list': { run: () => setShowWindowList(true) },
    'window.close': onWindow('close'),
    'window.closeOthers': onWindow('closeOthers'),
    'window.closeGroup': onWindow('closeGroup'),
    'window.float': onWindow('float'),
    'window.maximize': onWindow('maximize'),
    'window.moveEdge': onWindow('moveEdge'),
    'window.moveCentre': onWindow('moveCentre'),
    'window.moveLeft': onWindow('moveLeft'),
    'window.moveRight': onWindow('moveRight'),
    'window.moveBelow': onWindow('moveBelow'),
    'layout.default': { run: perspective('default', 'Default') },
    'layout.saveAs': { run: () => setShowSaveLayout(true) },
    'layout.manage': { run: () => setShowManageLayouts(true) },
    'layout.undo': { run: () => { dockRef.current?.undoLayout(); setLayoutName('Custom') }, unavailable: canUndoLayout ? null : 'No layout change to undo yet.' },
    'layout.results': { run: perspective('results', 'Results Focused') },
    'layout.split': { run: perspective('split', 'Split View') },
    'table.newParametric': { run: () => createTable('parametric') },
    'table.newFunction1': { run: () => createTable('function-1d') },
    'table.newFunction2': { run: () => createTable('function-2d') },
    'table.importCsv': { run: importCsvAsFunctionTable },
    'state.newTable': { run: () => insertFunction('STATE TABLE Circuit1(P1, T1, h2)\n  FLUID = Water\nEND\n') },
    'plot.newXY': { run: () => setNewPlotKind('xy') },
    'plot.newProperty': { run: () => setNewPlotKind('property') },
    'plot.newPsychro': { run: () => setNewPlotKind('psychro') },
    'tool.componentWizard': { run: () => setShowComponentWizard(true) },
    'tool.variableInfo': { run: () => setShowVariableInfo(true) },
    'tool.minMax': { run: () => setShowMinMax(true) },
    'tool.curveFit': { run: () => setShowCurveFit(true) },
    'tool.monteCarlo': { run: () => setShowMonteCarlo(true) },
    'tool.sensitivity': { run: () => setShowSensitivity(true) },
    'tool.pidTuner': { run: () => setPidTuner({}) },
    'tool.parameterFit': { run: () => setShowParameterFit(true) },
    'app.preferences': { run: () => setShowPreferences(true) },
    'app.about': { run: () => setShowAbout(true) },
    'file.new': { run: handleNewProject },
    'file.open': { run: handleOpenProject },
    'file.library': { run: () => setLibraryOpen(true) },
    'file.example': { run: () => setShowExamples(true) },
    'file.url': { run: handleOpenUrl },
    'file.share': { run: handleShareLink },
    'file.print': { run: handlePrintReport, unavailable: result?.success === true ? null : 'Solve first: the report prints the last successful solve.' },
    'file.save': { run: handleSaveProject },
    'file.saveAs': { run: handleSaveProjectAs },
    'file.exportText': { run: handleExportEquations },
    'file.saveBrowser': { run: () => { void handleSaveToBrowser().then((ok) => notifications.show(ok ? { color: 'teal', title: 'Saved to browser', message: `“${projectName}” is stored in this browser.` } : { color: 'yellow', title: 'Could not save to browser', message: 'Browser storage may be unavailable in this browsing mode.' })) } },
    'help.gettingStarted': { run: () => setShowGettingStarted(true) },
    'help.shortcuts': { run: () => setShowShortcuts(true) },
    'help.docs': { run: () => globalThis.open(helpUrl(), '_blank') },
    'app.palette': { run: spotlight.open },
    'editor.complete': { run: () => {} },
    'run.findAll': { run: () => changeFindAll(!findAll), checked: findAll },
    'run.complex': { run: () => changeComplexMode(!complexMode), checked: complexMode },
    'app.stopCriteria': { run: () => setShowPreferences(true) },
    'edit.undo': onHistory('edit.undo'),
    'edit.redo': onHistory('edit.redo'),
    'insert.function': { run: () => setShowFunctionBrowser(true) },
    'view.theme': { run: () => setColorScheme(computedScheme === 'dark' ? 'light' : 'dark'), description: computedScheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode' },
    'view.ribbon': { run: toggleRibbon, unavailable: ribbonOn ? null : 'Turn the ribbon on in Preferences first.' },
    'data.tableOps': onWorkbook('data.tableOps'),
    'data.functionFromColumns': onWorkbook('data.functionFromColumns'),
    'table.configure': onTable('table.configure'),
    'table.addRow': onTable('table.addRow'),
    'table.removeLastRow': onTable('table.removeLastRow'),
    'table.fillColumn': onTable('table.fillColumn'),
    'table.plotSelected': onTable('table.plotSelected'),
    'table.retryFailed': onTable('table.retryFailed'),
    'table.exportData': onWorkbook('table.exportData'),
    'table.exportReport': onWorkbook('table.exportReport'),
    'table.goToDefinition': focusedTable?.source === 'code'
      ? { run: () => handleGoToTableDeclaration(focusedTable.name) }
      : { run: noop, unavailable: focusedTable ? 'This table is defined in the workbook, not in the equations.' : 'Focus a table first.' },
    'table.rename': onTable('table.rename'),
    'plot.rename': focusedPlot && !focusedPlot.fromCode
      ? { run: () => setRenamePlot({ id: focusedPlot.id, name: focusedPlot.name }) }
      : { run: noop, unavailable: focusedPlot ? 'Defined in the equations: rename its PLOT block in the Editor.' : 'Focus a plot first.' },
    'variable.pin': needsRow,
    'variable.copyValue': needsRow,
    'variable.copyName': needsRow,
    'table.delete': focusedTable && focusedTable.source !== 'code'
      ? { run: () => setConfirmDelete({ kind: 'table', id: focusedTable.id, name: focusedTable.name }) }
      : { run: noop, unavailable: focusedTable ? 'Defined in the equations: delete its block in the Editor.' : 'Focus a table first.' },
    'plot.configure': onPlot('plot.configure'),
    'plot.export': onPlot('plot.export'),
    'plot.inspect': onPlot('plot.inspect'),
    'plot.delete': focusedPlot && !focusedPlot.fromCode
      ? { run: () => setConfirmDelete({ kind: 'plot', id: focusedPlot.id, name: focusedPlot.name }) }
      : { run: noop, unavailable: focusedPlot ? 'Defined in the equations: delete its PLOT block in the Editor.' : 'Focus a plot first.' },
    'digitizer.image': onDigitizer('digitizer.image'),
    'digitizer.calibrate': onDigitizer('digitizer.calibrate'),
    'digitizer.extract': onDigitizer('digitizer.extract'),
    'digitizer.review': onDigitizer('digitizer.review'),
    'digitizer.useData': onDigitizer('digitizer.useData'),
  })
  commandsRef.current = commands

  // Command palette (Ctrl/Cmd+K): the registry's commands, one "Solve Table"
  // per parametric table, the canvas commands, the guides and the functions.
  const paletteGroups = commandPaletteGroups(commands, ribbonOn)
  paletteGroups.find((g) => g.group === 'Run')?.actions.push(
    ...tables.filter((t) => t.kind === 'parametric').map((t) => ({
      id: `solve-table:${t.id}`,
      label: `Solve Table: ${t.name}`,
      keywords: ['solve', 'run', 'parametric'],
      description: 'Toolbar ▸ Solve, with the table focused · Check & solve every run of this table',
      leftSection: <IconPlayerPlayFilled size={16} />,
      onClick: () => solveTableById(t.id, t.name),
    })),
  )
  const spotlightActions: SpotlightActionGroupData[] = [
    ...paletteGroups,
    {
      // CFG-10: canvas commands; each opens the schematic, then runs there.
      group: 'Schematic',
      actions: CANVAS_COMMANDS.map((c) => ({
        id: `canvas-${c.id}`,
        label: c.label,
        description: [ribbonOn && `Schematic ▸ ${c.group}`, c.keys.length && `${keysOf(c).join('+')} on the drawing`].filter(Boolean).join(' · ') || undefined,
        leftSection: <IconSitemap size={18} />,
        onClick: () => {
          dockRef.current?.open('schematic')
          runCanvasCommand(c.id)
        },
      })),
    },
    // Every documentation guide page as a palette entry, deep-linked into the
    // /help portal (the compact id/label list is generated by compile-docs so
    // the full doc catalogs stay code-split with the /help route).
    {
      group: 'Documentation',
      actions: DOCS_TOPICS.map((t) => ({
        id: `doc-${t.id}`,
        label: t.label,
        description: 'Open this guide in the documentation portal',
        keywords: ['docs', 'documentation', 'guide', 'help'],
        leftSection: <IconHelp size={18} />,
        onClick: () => globalThis.open(helpUrl(`#${t.id}`), '_blank'),
      })),
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
  // On mobile the editor should fill the whole tab with only a hairline of
  // padding for visibility; on desktop it keeps the standard panel padding.
  const editorPanelPad: React.CSSProperties = isMobile
    ? { ...panelPad, padding: 4 }
    : panelPad
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
    bode: 'Bode',
    nyquist: 'Nyquist',
    nichols: 'Nichols',
    polezero: 'Pole-Zero',
    rootlocus: 'Root Locus',
  }
  // Phase K3/M1/M2: the Live bar. A lesson's lab runs on its timeline; a shared
  // experiment's timeline replays on any live run of the document it came with.
  // M2: an embed may autorun only an approved lesson's lab (`?autorun`), once the visitor has solved it.
  const embedLab = EMBED.embed && EMBED.autorun && lesson?.lab && result?.success ? lesson.lab : null
  const liveBar = liveBlocks.length > 0 ? (
    <Suspense fallback={null}>
      <LiveBar
        blocks={liveBlocks}
        tracker={modelRevisionRef.current}
        buildOpen={buildLiveOpen}
        lab={labToken && lesson?.lab ? lesson.lab : embedLab ?? experiment}
        autorun={labToken || (embedLab ? 1 : 0)}
        onTimelineApplied={followTimeline}
        onTable={publishLiveTable}
        inputRef={liveInputRef}
        onInputsReset={() => {
          const opening = Object.fromEntries(liveCanvas.inputs.map((i) => [i.variable.toLowerCase(), i.value]))
          liveAppliedRef.current = new Map([...liveOpenSlidersRef.current.map((p) => [p.name.toLowerCase(), p.value] as const), ...Object.entries(opening)])
          setPinnedSliders(liveOpenSlidersRef.current)
          setLiveCanvas((c) => ({ ...c, values: opening }))
        }}
        onOpenChange={setLiveOpen}
        onRows={setLiveRows}
        onInputsSettled={(lines, applied) => {
          const names = lines.map((l) => l.split('=')[0].trim().toLowerCase())
          if (applied) {
            lines.forEach((l, i) => liveAppliedRef.current.set(names[i], Number.parseFloat(l.split('=')[1])))
            return
          }
          setPinnedSliders((prev) => prev.map((p) => {
            const value = liveAppliedRef.current.get(p.name.toLowerCase())
            return names.includes(p.name.toLowerCase()) && value !== undefined ? { ...p, value } : p
          }))
          setLiveCanvas((c) => ({
            ...c,
            values: { ...c.values, ...Object.fromEntries(names.flatMap((n) => (n in c.values ? [[n, liveAppliedRef.current.get(n) ?? c.values[n]]] : []))) },
          }))
        }}
      />
    </Suspense>
  ) : null

  const panelContent: Record<string, ReactNode> = {
    equations: (
      <div style={editorPanelPad}>
        {bannerErrorLine != null && (
          <Alert color="red" variant="light" p="xs" mb={6} title="Syntax error">
            <Group justify="space-between" wrap="nowrap" gap="xs">
              <Text size="xs">Syntax error on line {bannerErrorLine}.</Text>
              <Button size="compact-xs" variant="light" color="red" onClick={() => goToLine(bannerErrorLine)}>
                Go to line {bannerErrorLine}
              </Button>
            </Group>
          </Alert>
        )}
        {showFirstRun && (
          <Alert color="teal" variant="light" p="xs" mb={6} withCloseButton onClose={dismissFirstRun} title="Welcome to frees">
            <Text size="xs">
              Write equations and notes on the left — they can be
              entered in any order. Click <strong>Check</strong> (F4) to
              validate, then <strong>Solve</strong> (F2). Solve also runs
              Check for you automatically.{' '}
              <Anchor size="xs" component="button" type="button" onClick={() => setShowGettingStarted(true)}>
                Getting started guide
              </Anchor>
            </Text>
          </Alert>
        )}
        {unitWarnings.length > 0 && !dismissedWarnings && (
          <Alert
            color="yellow"
            variant="light"
            p="xs"
            mb={6}
            withCloseButton
            onClose={() => setDismissedWarnings(true)}
            title={`${unitWarnings.length} warning${unitWarnings.length === 1 ? '' : 's'}`}
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
        <div
          style={{
            display: 'flex',
            flex: 1,
            minHeight: 0,
            border: '1px solid var(--mantine-color-default-border)',
            borderRadius: 'var(--mantine-radius-sm)',
          }}
        >
          <Suspense fallback={lazyTabFallback}>
            <EquationEditor
              ref={editorRef}
              initialDoc={() => textRef.current}
              onChange={onTextChange}
              onCursor={(at) => setCursorInstance(instanceAt(checkResult?.instances, at))}
              variables={variables}
              errorLine={errorLine}
              errorMessage={result?.error ?? checkResult?.message ?? null}
              errorList={checkResult?.errors ?? null}
              placeholder={'Enter equations and notes, e.g.\n{ Rankine Cycle }\nT1 = 100 [C]\nP1 = 250 [kPa]'}
            />
          </Suspense>
        </div>
      </div>
    ),
    states: (
      <div style={panelPad}>
        <Group justify="space-between" mb="xs" wrap="nowrap" align="center">
          <Title order={5} c="teal.4">Fluid State Table</Title>
          <Text size="xs" c="dimmed">Solved state points</Text>
        </Group>
        <Suspense fallback={lazyTabFallback}>
          <StatesTab
            solvedVariables={result?.variables ?? []}
            stateTableDefs={result?.stateTableDefs ?? checkResult?.stateTableDefs ?? []}
            unitIds={stateUnitIds}
            onUnitIdsChange={handleStateUnitIdsChange}
            onFillMissing={() => onSolve(true)}
            solving={solving}
            solvable={solvable}
          />
        </Suspense>
      </div>
    ),
    digitizer: (
      <div style={{ height: '100%', minHeight: 0 }}>
        <Suspense fallback={lazyTabFallback}>
          <DigitizerTab
            key={`digitizer-${workspaceEpoch}`}
            onSendToFunctionTable={sendDigitizedToFunctionTable}
            tables={tables}
            onInsertEquation={(eq) => applyText(textRef.current.trim() + '\n\n' + eq)}
            onCreateFunctionTable={(spec) => addFunctionTables([spec])}
          />
        </Suspense>
      </div>
    ),
    schematic: (
      <div style={{ height: '100%', minHeight: 0 }}>
        <Suspense fallback={lazyTabFallback}>
          <SchematicTab
            key={`schematic-${workspaceEpoch}`}
            checkResult={checkResult}
            components={result?.components}
            variables={playIndex === null ? result?.variables : comparedVariables}
            sample={playSample && currentRun ? `run ${currentRun.revision} · ${playSample}` : undefined}
            paused={playIndex !== null && !playback.playing}
            recorded={playIndex !== null ? playTable?.vars : undefined}
            phases={playIndex === null ? result?.phases : undefined}
            flash={flashOwners}
            blocks={result?.blocks}
            text={textRef.current}
            onRevealLine={goToLine}
            onSelectLine={selectLine}
            onEmitStatement={EMBED.embed ? undefined : emitFromSchematic}
            onSourceEdit={EMBED.embed ? undefined : (changes, expected) => editorRef.current?.applyEdit(changes, expected) ?? false}
            presentation={schematic}
            onPresentationChange={setSchematic}
            handoff={{ reason: handoffReason, run: handoff }}
            highlightIds={[...withEnclosing(diagnosisOwners(checkResult?.diagnosis, checkResult?.instances ?? []).map((o) => o.instance)), ...(cursorInstance ? [cursorInstance] : [])]}
            live={liveControls}
          />
        </Suspense>
      </div>
    ),
    inspector: (() => {
      const fw = focusedWindow
      const bodyStyle: React.CSSProperties = { flex: 1, minHeight: 0, overflow: 'auto', padding: 10 }

      // Table: rename + the parametric table's quick actions. The Tables
      // workbook window inspects whichever hosted table is active in it.
      if (fw?.kind === 'table') {
        const t =
          fw.id === TABLES_WORKBOOK_WINDOW_ID
            ? (activeTable && isHostedTable(activeTable) ? activeTable : undefined)
            : tables.find((x) => `table:${x.id}` === fw.id)
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
                    if (t) setTables((prev) => renameById(prev, t.id, value))
                  }}
                />
                {t?.kind === 'parametric' ? (
                  <>
                    <Button size="xs" variant="default" onClick={() => { setActiveTableId(t.id); setShowConfigureTable(true) }}>
                      Configure Columns
                    </Button>
                    <Group grow>
                      <Button size="xs" variant="default" onClick={() => setTables((all) => all.map((pt) => pt.id === t.id && pt.kind === 'parametric' ? invalidateActiveParam({ ...pt, rows: [...pt.rows, newParamRow()] }) : pt))}>
                        Add Row
                      </Button>
                      <Button size="xs" variant="default" disabled={t.rows.length <= 1} onClick={() => setTables((all) => all.map((pt) => pt.id === t.id && pt.kind === 'parametric' ? invalidateActiveParam({ ...pt, rows: pt.rows.slice(0, -1) }) : pt))}>
                        Remove Last Row
                      </Button>
                    </Group>
                    <Button size="xs" variant="default" color="gray" onClick={() => updateParamTable(t.id, (pt) => ({ ...pt, results: [] }))}>
                      Clear Results
                    </Button>
                  </>
                ) : (
                  <Text size="xs" c="dimmed">Function table — edit values in the table window.</Text>
                )}
                {t && t.source !== 'code' && (
                  <Button size="xs" variant="light" color="red" onClick={() => setConfirmDelete({ kind: 'table', id: t.id, name: t.name })}>
                    Delete table
                  </Button>
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
                <Button size="xs" variant="light" color="red" onClick={() => setConfirmDelete({ kind: 'plot', id: p.id, name: p.name })}>
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
              <Text size="xs" c="dimmed">Edit equations in the Editor; press Solve (F2) to compute. Results appear in the Variable Explorer on the right.</Text>
            </Stack>
          </div>
        )
      }

      return (
        <div style={bodyStyle}>
          <Text size="xs" c="dimmed">Focus a window (Table, Plot, Editor) to inspect it here.</Text>
        </div>
      )
    })(),
    workspace: (
      <div style={{ height: '100%', minHeight: 0 }}>
        <Suspense fallback={lazyTabFallback}>
          <Workspace
            variables={workspaceVariables}
            onSolve={() => { void checkThenSolve() }}
            solveBusy={solving || checking || solvingTableId !== null || checkingTableId !== null}
            onOpenExamples={() => setShowExamples(true)}
            replNames={replNames}
            components={result?.components}
            diagnostics={result}
            onEdit={() => setShowVariableInfo(true)}
            onTunePid={openPidTunerFor}
            pinnedNames={pinnedSliderNames}
            pinnableNames={pinnableNames}
            onPin={pinSlider}
            rowMenu={variableRowMenu}
            solutionsCount={solutions.length}
            selectedSolutionIndex={selectedSolutionIndex}
            onSelectSolutionIndex={setSelectedSolutionIndex}
            sliderStrip={
              <>
                {pinnedSliders.length > 0 && (
                  <Suspense fallback={null}>
                    <SliderStrip
                      pins={pinnedSliders}
                      inertNames={pinnedSliders.filter((p) => !pinnableNames.has(p.name.toLowerCase())).map((p) => p.name)}
                      onChange={(name, v) => setSliderValue(name, v, false)}
                      onCommit={(name, v) => setSliderValue(name, v, true)}
                      onUnpin={unpinSlider}
                      onSeries={setSliderSeries}
                      solving={solving}
                      stale={slidersStale}
                    />
                  </Suspense>
                )}
                {timeline && (
                  <Suspense fallback={null}>
                    <PlaybackBar
                      timelines={timelines}
                      timeline={timeline}
                      onTimeline={(table) => setPlayback({ of: result, table, index: null, playing: false })}
                      index={playIndex}
                      playing={playIndex !== null && playback.playing}
                      speed={playSpeed}
                      unavailable={scenarioStale || slidersStale ? 'The inputs changed since this run: Solve to play the new one. Stepping still shows this run.' : null}
                      onIndex={changePlayIndex}
                      onPlaying={changePlaying}
                      onSpeed={setPlaySpeed}
                      onExit={() => setPlayback((p) => ({ ...p, index: null, playing: false }))}
                      onExport={exportPlayback}
                    />
                  </Suspense>
                )}
                {liveBar}
                <Suspense fallback={null}>
                  <RunsPanel
                    scenarios={scenarios}
                    onScenarios={changeScenarios}
                    canUndo={scenarioHistory.done.length > 0}
                    canRedo={scenarioHistory.undone.length > 0}
                    onUndo={() => stepScenarios('undo')}
                    onRedo={() => stepScenarios('redo')}
                    inputs={(result?.variables ?? []).filter((v) => pinnableNames.has(v.name.toLowerCase()))}
                    run={currentRun}
                    stale={scenarioStale}
                    baseline={baseline}
                    onSetBaseline={() => currentRun && setBaseline({ run: currentRun, variables: comparedVariables })}
                    onClearBaseline={() => setBaseline(null)}
                    rows={comparison}
                  />
                </Suspense>
              </>
            }
          />
        </Suspense>
      </div>
    ),
    terminal: (
      <div style={{ height: '100%', minHeight: 0 }}>
        <Suspense fallback={lazyTabFallback}>
          <ReplTerminal
            sessionId={sessionId}
            variables={workspaceVariables}
            replNames={replNames}
            functions={replFunctionNames}
            unitSystem={unitSystem}
            onAssign={(v) => {
              setReplVars((prev) => ({ ...prev, [v.name.toLowerCase()]: v }))
              if (!v.name.includes('[')) {
                setVarDrafts((prev) => {
                  const existing = prev[v.name]
                  if (existing?.isUnitsUserSet) return prev
                  return {
                    ...prev,
                    [v.name]: { ...(existing ?? DEFAULT_DRAFT), units: v.units || '' },
                  }
                })
              }
            }}
            onCheck={() => void onCheck()}
            onSolve={() => void checkThenSolve()}
            onClear={() => {
              setReplVars({})
              setResult(null)
              setCheckResult(null)
              setVariables([])
              void replClear(sessionId)
            }}
            onClearVar={(name) => {
              const lower = name.toLowerCase()
              const prefix = lower + '['
              setReplVars((prev) => {
                const next = { ...prev }
                delete next[lower]
                for (const k of Object.keys(next)) {
                  if (k.startsWith(prefix)) {
                    delete next[k]
                  }
                }
                return next
              })
              void replClear(sessionId, name)
            }}
          />
        </Suspense>
      </div>
    ),
  }
  const panelTitles: Record<string, string> = {
    equations: 'Editor',
    table: 'Tables',
    plots: 'Plots',
    digitizer: 'Digitizer',
    schematic: 'Schematic',
    workspace: 'Variable Explorer',
    terminal: 'Terminal',
    states: 'Fluid States',
    inspector: 'Inspector',
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
        <Suspense fallback={lazyTabFallback}>
        <PlotTab
          kinds={[pl.kind]}
          singlePlotId={pl.id}
          emptyHint="This plot was removed."
          plots={mergedPlots}
          tables={tables}
          onPlotsChange={handlePlotsChange}
          solvedVariables={result?.variables ?? []}
          stateTableDefs={declaredStateDefs}
          cyclePath={result?.cyclePath}
          tableVars={tableVars}
          rows={paramRows}
          results={tableResults}
          tableUnits={activeParam?.columnUnits}
          activePlotId={pl.id}
          onActivePlotIdChange={setActivePlotId}
          onSelectRow={handleSelectTableRow}
          playhead={timeline && playIndex !== null ? { tableId: `code-ode-${timeline.table.toLowerCase()}`, xVar: timeline.timeVar, x: timeline.times[playIndex], sample: playSampleOf } : null}
        />
        </Suspense>
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
          onFillMissing={() => {
            setFillMissingFor(s.name)
            void onSolve(true)
          }}
          solving={solving && fillMissingFor === s.name}
          solvable={solvable}
        />
      </div>
    )
  }

  // The single Tables workbook window (native glide grid, D10) hosting every editable table
  // (function/lookup + GUI parametric) as a bound sheet (decision 2 of the
  // unification plan). Code PARAMETRIC / ODE tables keep per-table windows.
  {
    panelTitles[TABLES_WORKBOOK_WINDOW_ID] = 'Tables'
    panelContent[TABLES_WORKBOOK_WINDOW_ID] = (
      <div style={{ height: '100%', minHeight: 0 }}>
        <Suspense fallback={lazyTabFallback}>
          <TablesWorkbookTab
            key={`tables-workbook-${workspaceEpoch}`}
            tables={tables}
            activeTableId={activeTableId}
            onTablesChange={setTables}
            onActiveTableIdChange={setActiveTableId}
            onConfigureTable={(id) => {
              setActiveTableId(id)
              setShowConfigureTable(true)
            }}
            onAlterColumn={(id, name) => {
              setActiveTableId(id)
              setAlterColumn(name)
            }}
            onPlotColumns={(x, ys, tableId) => handlePlotColumns(x, ys, tableId)}
            onGoToDeclaration={handleGoToTableDeclaration}
            onReproduceRow={handleReproduceRow}
            onRetryFailedRows={(id) => void checkThenSolveTable(id)}
            onDeleteTable={(id) => {
              const t = tables.find((x) => x.id === id)
              if (t) setConfirmDelete({ kind: 'table', id, name: t.name })
            }}
            highlightedRowId={highlightedRowId}
          />
        </Suspense>
      </div>
    )
  }

  // Per-instance Table windows: only read-only code PARAMETRIC / ODE tables
  // (each "table:<id>"); editable tables are sheets in the Tables workbook.
  for (const t of tables) {
    if (isHostedTable(t)) continue
    const winId = `table:${t.id}`
    panelTitles[winId] = t.name
    panelContent[winId] = (
      <div style={panelPad}>
        <Suspense fallback={lazyTabFallback}>
          <TablesTab
            tables={tables}
            singleTableId={t.id}
            varDrafts={varDrafts}
            onPlotColumns={(x, ys) => handlePlotColumns(x, ys, t.id)}
            onCopyToEditable={(copy) => {
              setTables((prev) => [...prev, copy])
              setActiveTableId(copy.id)
              requestAnimationFrame(() => openTableWindow(copy))
            }}
            onCreateFunctionTables={addFunctionTables}
          />
        </Suspense>
      </div>
    )
  }

  // I4: the kiosk embed — one view, the approved sliders, Solve, Reset and a
  // way out to the full application, nothing else.
  const embedView = EMBED.view ?? (lesson?.view === 'plots' ? 'plot' : 'schematic')
  const embedPlot = codePlots[0] ?? mergedPlots[0]
  const embedSliders = EMBED.sliders
  const embedPins = embedSliders ? pinnedSliders.filter((p) => embedSliders.some((n) => n.toLowerCase() === p.name.toLowerCase())) : pinnedSliders
  const fullHref = fullAppUrl(globalThis.location.href)
  const embedFullUrl = embedOrigin.id === 'embed' ? (buildShareUrl(embedOrigin.text, fullHref.split('#')[0]) ?? fullHref) : fullHref
  const embedLayout = !embedReady ? (
    <Center h="100vh"><Loader color="teal" /></Center>
  ) : (
    <Flex direction="column" h="100vh" p="xs" gap="xs" style={{ overflow: 'hidden' }} data-testid="embed">
      <Group justify="space-between" wrap="nowrap" gap="xs">
        <Text size="sm" fw={600} truncate>{projectName}</Text>
        <Group gap={6} wrap="nowrap">
          <Text size="xs" c="dimmed" aria-live="polite">
            {solving || checking ? 'Solving…' : result?.success ? 'Solved' : result ? 'Not solved' : ''}
          </Text>
          <Button size="xs" loading={solving || checking} onClick={() => void checkThenSolve()}>Solve</Button>
          <Button size="xs" variant="default" onClick={() => actuallyLoadExample(embedOrigin)}>Reset</Button>
          <Button size="xs" variant="subtle" component="a" href={embedFullUrl} target="_blank" rel="noopener noreferrer">
            Open in full frees
          </Button>
        </Group>
      </Group>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {embedView === 'schematic' && panelContent.schematic}
        {embedView === 'plot' && embedPlot && panelContent[`plot:${embedPlot.id}`]}
        {embedView === 'plot' && !embedPlot && (
          <Center flex={1}><Text size="sm" c="dimmed">Solve to draw the plot.</Text></Center>
        )}
      </div>
      {embedLab && liveBar}
      {embedPins.length > 0 && (
        <Suspense fallback={null}>
          <SliderStrip
            pins={embedPins}
            inertNames={embedPins.filter((p) => !pinnableNames.has(p.name.toLowerCase())).map((p) => p.name)}
            onChange={(name, v) => setSliderValue(name, v, false)}
            onCommit={(name, v) => setSliderValue(name, v, true)}
            solving={solving}
            stale={slidersStale}
          />
        </Suspense>
      )}
    </Flex>
  )

  return (
    <>
      {EMBED.embed ? embedLayout : isMobile === undefined ? null : isMobile ? (
        <Suspense fallback={lazyTabFallback}>
          <MobileLayout
            panelContent={panelContent}
            tables={tables}
            stateTables={declaredStateDefs.map((s) => ({ id: `state:${s.name}`, name: s.name }))}
            activeTableId={activeTableId}
            onActiveTableId={setActiveTableId}
            plots={mergedPlots}
            projectName={projectName}
            checking={checking}
            solving={solving}
            onCheck={checkWithFallback}
            onSolve={checkThenSolve}
            onStop={onStop}
            checkingTableId={checkingTableId}
            solvingTableId={solvingTableId}
            onCheckTable={onCheckTable}
            onSolveTable={checkThenSolveTable}
            onRenameProject={handleRenameProject}
            commands={commands}
          />
        </Suspense>
      ) : (
        <Flex h="100vh" style={{ overflow: 'hidden' }}>
      <Rail
        active={activeTab}
        openKinds={openKinds}
        openIds={openIds}
        plots={mergedPlots.map((p) => ({ id: p.id, name: p.name, tag: PLOT_KIND_LABEL[p.kind] }))}
        plotCount={mergedPlots.length}
        onOpenPlot={(id) => {
          const p = mergedPlots.find((x) => x.id === id)
          if (p) dockRef.current?.openInstance(`plot:${id}`, 'plot', p.name)
        }}
        workspaceTables={[
          ...tables.map((t) => ({ id: t.id, name: t.name })),
          // Declared STATE TABLE blocks appear as read-only entries that open
          // the shared Fluid States window, tagged with their fluid.
          ...declaredStateDefs.map((s) => ({
            id: `state:${s.name}`,
            name: s.name,
            tag: s.fluid ?? 'States',
          })),
        ]}
        tableCount={tables.length + declaredStateDefs.length}
        onCloseWindows={(prefixes) => {
          for (const w of openWindows) if (prefixes.some((p) => w.id.startsWith(p))) dockRef.current?.close(w.id)
        }}
        onOpenTable={(id) => {
          if (id.startsWith('state:')) {
            const name = id.slice('state:'.length)
            dockRef.current?.openInstance(id, 'states', name)
            return
          }
          const t = tables.find((x) => x.id === id)
          if (t) openTableWindow(t)
        }}
        onSelect={(kind) => dockRef.current?.open(kind)}
        onClose={(kind) => dockRef.current?.close(kind)}
        commands={commands}
        onPreferences={() => setShowPreferences(true)}
        onAbout={() => setShowAbout(true)}
      />

      <Flex direction="column" flex={1} miw={0} p="sm" gap="sm">
        <TopBar
          isTable={focusedParam !== null}
          checking={checking}
          solving={solving}
          solveProgress={solveProgress}
          solvable={solvable}
          findAll={findAll}
          complexMode={complexMode}
          checkResult={checkResult}
          result={result}
          stopped={stopped}
          tableChecking={checkingTableId === focusedParam?.id}
          tableSolving={solvingTableId === focusedParam?.id}
          tableCheckResult={tableCheckResult}
          tableStats={focusedParam?.stats}
          tableCheckMessage={tableCheckMessage}
          tableResults={focusedParam?.results ?? []}
          onCheck={checkWithFallback}
          onSolve={checkThenSolve}
          onStop={onStop}
          targetLabel={focusedParam ? `Table: ${focusedParam.name}` : 'Model'}
          runBusy={solving || checking || solvingTableId !== null || checkingTableId !== null}
          onCheckTable={() => { void checkTarget() }}
          onSolveTable={() => { void solveTarget() }}
          onFindAllChange={changeFindAll}
          onComplexModeChange={changeComplexMode}
          projectName={projectName}
          onRenameProject={handleRenameProject}
          onInsertFunction={insertFunction}
          commands={commands}
          ribbon={ribbonOn ? {
            density: ribbonDensity,
            onDensityChange: changeRibbonDensity,
            context: fw?.kind === 'table' || fw?.kind === 'plot' || fw?.kind === 'schematic' || fw?.kind === 'digitizer' ? fw.kind : null,
            contextNote: codeTable ? 'Defined in equations' : null,
            tab: ribbonTab,
            onTabChange: setRibbonTab,
          } : undefined}
        />
        <input
          ref={projectFileRef}
          type="file"
          accept=".frees,application/json"
          style={{ display: 'none' }}
          onChange={onProjectFileSelected}
        />

        <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
          <Suspense fallback={lazyTabFallback}>
            <WorkspaceDock
              content={panelContent}
              titles={panelTitles}
              defaultOpen={['equations', 'inspector', 'workspace']}
              edgeKinds={['workspace', 'inspector']}
              onActiveChange={(active) => {
                setActiveTab(active?.kind ?? '')
                setActiveWindowId(active?.id)
                // Focusing a table window makes it the "active" table so the
                // shared Solve-Table / Configure / Alter actions target it.
                // The Tables workbook window is excluded: its nav list drives
                // activeTableId itself (one window, many hosted tables).
                if (
                  active?.kind === 'table' &&
                  active.id.startsWith('table:') &&
                  active.id !== TABLES_WORKBOOK_WINDOW_ID
                ) {
                  setActiveTableId(active.id.slice('table:'.length))
                }
                // The Inspector reflects the last-focused main window; focusing
                // the auxiliary Inspector / Variable Explorer edge panels must not change it.
                if (active && active.kind !== 'inspector' && active.kind !== 'workspace' && active.kind !== 'terminal') {
                  setFocusedWindow(active)
                }
              }}
              onOpenChange={setOpenWindows}
              onUndoChange={setCanUndoLayout}
              tabMenuFor={plotTabMenu}
              handleRef={dockRef}
            />
          </Suspense>
        </div>
        {ribbonOn && (
          <StatusBar
            save={`${dirty ? 'Unsaved changes' : 'All changes saved'} · Save writes to ${saveWhere === 'file' ? `${projectName}.frees` : saveWhere === 'browser' ? 'this browser' : 'a new file'}`}
            solve={statusSolveText}
            units={UNIT_SYSTEM_OPTIONS.find((o) => o.value === unitSystem)?.label ?? unitSystem}
            onUnits={() => setShowPreferences(true)}
            warnings={(focusedParam ? tableCheckResult : (result ?? checkResult))?.unitWarnings.length ?? 0}
            onWarnings={() => {
              // The warnings carry no position of their own: show the Editor at
              // the reported line, and the list in the status pill's details.
              dockRef.current?.open('equations')
              if (errorLine !== null) editorRef.current?.goToLine(errorLine)
              document.querySelector<HTMLElement>('[aria-label="Status details"]')?.click()
            }}
            layout={layoutName}
            engine={`Engine: ${runBusy ? 'busy' : 'idle'} · ${getWorkerPoolConcurrency()} workers`}
          />
        )}
      </Flex>

        </Flex>
      )}
      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
      <TextPromptModal
        opened={showSaveLayout}
        title="Save Layout As"
        label="Layout name (a layout of the same name is replaced)"
        defaultValue={layoutName === 'Restored' || layoutName === 'Custom' || layoutName === 'Default' ? '' : layoutName}
        confirmLabel="Save layout"
        onClose={() => setShowSaveLayout(false)}
        onSubmit={(value) => {
          const name = value.trim()
          const dock = dockRef.current?.serialize()
          if (!name || !dock) return
          storeLayouts(saveLayout(layouts, form, { name, dock, ribbonTab, density: ribbonDensity }))
          setLayoutName(name)
          setShowSaveLayout(false)
        }}
      />
      <TextPromptModal
        opened={renamePlot !== null}
        title="Rename Plot"
        label="Plot name"
        defaultValue={renamePlot?.name ?? ''}
        confirmLabel="Rename"
        onClose={() => setRenamePlot(null)}
        onSubmit={(value) => {
          const name = value.trim()
          // The plot may have been deleted while the dialog was open.
          if (renamePlot && name && plots.some((x) => x.id === renamePlot.id)) {
            handlePlotsChange(plots.map((x) => (x.id === renamePlot.id ? { ...x, name } : x)))
          }
          setRenamePlot(null)
        }}
      />
      {showManageLayouts && (
        <LayoutsModal
          layouts={layouts[form]}
          form={form}
          onApply={applyLayout}
          onRename={(from, to) => {
            const next = renameLayout(layouts, form, from, to)
            if (!next) return false
            storeLayouts(next)
            if (layoutName === from) setLayoutName(to.trim())
            return true
          }}
          onDelete={(name) => storeLayouts(deleteLayout(layouts, form, name))}
          onClose={() => setShowManageLayouts(false)}
        />
      )}
      {showWindowList && (
        <WindowListModal
          windows={openWindows}
          activeId={activeWindowId}
          onFocus={(id) => dockRef.current?.focus(id)}
          onCloseWindow={(id) => dockRef.current?.close(id)}
          onClose={() => setShowWindowList(false)}
        />
      )}

      {pidTuner !== null && (
        <Suspense fallback={null}>
          <PidTunerModal
            opened
            onClose={() => setPidTuner(null)}
            initial={pidTuner.initial}
            subject={pidTuner.subject}
            plant={pidTuner.plant}
            plantLoading={pidTuner.plantLoading}
            plantError={pidTuner.plantError}
            dark={computedScheme === 'dark'}
            onApply={(g) => {
              if (pidTuner.instanceName) {
                // Rewrite the SigPID's gains in place in the editor text.
                applyText(rewritePidGains(textRef.current, pidTuner.instanceName, g))
              } else {
                // Tools-menu path: drop a ready-to-wire SigPID snippet.
                const parts = [`Kp=${formatValue(g.kp)}`]
                if (g.type !== 'p') parts.push(`Ki=${formatValue(g.ki)}`)
                if (g.type === 'pid') parts.push(`Kd=${formatValue(g.kd)}`)
                applyText(
                  `${textRef.current.trim()}\n\n// PID Tuner result\nSigPID PID(${parts.join(', ')})`,
                )
              }
            }}
          />
        </Suspense>
      )}

      {showMinMax && (
        <Suspense fallback={null}>
          <MinMaxModal
            variables={checkResult?.variables ?? []}
            text={effectiveText()}
            stopCriteria={stopCriteria}
            complexMode={complexMode}
            variableInfo={buildVariableInfo()}
            unitSystem={unitSystem}
            getFunctionTables={functionTableDtos}
            onClose={() => setShowMinMax(false)}
            onApply={(next) => applyText(next)}
          />
        </Suspense>
      )}

      {showCurveFit && (
        <Suspense fallback={null}>
          <CurveFitModal
            tables={tables}
            defaultTableId={activeTableId}
            onClose={() => setShowCurveFit(false)}
            onInsertEquation={(eq) => applyText(textRef.current.trim() + '\n\n' + eq)}
          />
        </Suspense>
      )}

      {showParameterFit && (
        <Suspense fallback={null}>
          <ParameterFitModal
            opened
            onClose={() => setShowParameterFit(false)}
            text={effectiveText()}
            stopCriteria={{ ...stopCriteria, complexMode }}
            variableInfo={buildVariableInfo()}
            getFunctionTables={functionTableDtos}
            tables={tables}
            onApply={(next) => applyText(next)}
          />
        </Suspense>
      )}

      {showMonteCarlo && (
        <Suspense fallback={null}>
          <MonteCarloModal
            opened
            onClose={() => setShowMonteCarlo(false)}
            onRun={(samples, seed, design) =>
              runMonteCarlo({
                text: effectiveText(),
                stopCriteria: { ...stopCriteria, complexMode },
                variableInfo: buildVariableInfo(),
                displayUnitSystem: unitSystem,
                functionTables: functionTableDtos(),
                samples,
                seed,
                design,
              })
            }
          />
        </Suspense>
      )}

      {showSensitivity && (
        <Suspense fallback={null}>
          <SensitivityModal
            opened
            onClose={() => { setShowSensitivity(false); setSensitivityOutput(null) }}
            initialOutput={sensitivityOutput ?? undefined}
            onRun={(params) =>
              runSensitivity({
                text: effectiveText(),
                ...params,
                stopCriteria: { ...stopCriteria, complexMode },
                variableInfo: buildVariableInfo(),
                displayUnitSystem: unitSystem,
                functionTables: functionTableDtos(),
              })
            }
          />
        </Suspense>
      )}

      {lesson && (
        <Suspense fallback={null}>
          <LessonPanel
            key={`${lesson.example}-${workspaceEpoch}`}
            lesson={lesson}
            value={(name) => result?.variables.find((v) => v.name.toLowerCase() === name.toLowerCase())?.value}
            solving={solving}
            onSet={(name, value) => setSliderValue(name, value, true)}
            onReset={() => {
              labRunRef.current += 1
              setLabState(null)
              resetLesson(lesson)
            }}
            canRunLab={liveBlocks.length > 0 && !solving}
            onRunLab={() => void runLessonLab(lesson)}
            labGrades={labGrades}
            pairTitle={LESSONS.find((l) => l.example === lesson.pair)?.title}
            onOpenPair={lesson.pair ? () => void import('./examples').then((m) => {
              const pair = m.EXAMPLES.find((e) => e.id === lesson.pair)
              if (pair) loadExample(pair)
            }) : undefined}
            onClose={() => setLesson(null)}
          />
        </Suspense>
      )}

      {showExamples && (
        <Suspense fallback={null}>
          <ExamplesModal
            opened={showExamples}
            onClose={() => setShowExamples(false)}
            onSelect={loadExample}
          />
        </Suspense>
      )}

      {showOpenUrl && (
        <Suspense fallback={null}>
          <OpenUrlModal
            opened={showOpenUrl}
            onClose={() => setShowOpenUrl(false)}
            onSuccess={handleOpenUrlSuccess}
          />
        </Suspense>
      )}

      <Suspense fallback={null}>
        {showComponentWizard && (
          <ComponentWizardModal
            opened={showComponentWizard}
            onClose={() => setShowComponentWizard(false)}
            onInsert={insertComponentBlock}
            existingNames={existingInstanceNames}
          />
        )}
      </Suspense>

      <ShortcutsModal opened={showShortcuts} onClose={() => setShowShortcuts(false)} commands={commands} />
      {showFunctionBrowser && (
        <Suspense fallback={null}>
          <FunctionBrowserModal onInsert={insertFunction} onClose={() => setShowFunctionBrowser(false)} />
        </Suspense>
      )}

      <GettingStartedModal
        opened={showGettingStarted}
        onClose={closeGettingStarted}
        onSolveExample={() => {
          void checkThenSolve()
        }}
        onOpenExamples={() => setShowExamples(true)}
      />

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

      <SaveCheckModal
        opened={showSaveCheck}
        projectName={projectName}
        onSave={onSaveCheckSave}
        onDiscard={onSaveCheckDiscard}
        onCancel={onSaveCheckCancel}
      />

      <ProjectLibraryModal
        opened={libraryOpen}
        currentName={projectName}
        onClose={() => setLibraryOpen(false)}
        onSaveCurrent={handleSaveToBrowser}
        onOpenProject={handleOpenFromBrowser}
      />

      <ProjectConflictModal
        opened={libraryConflict !== null}
        projectName={libraryConflict?.name ?? ''}
        theirSavedAt={
          libraryConflict ? new Date(Date.parse(libraryConflict.theirs.savedAt)).toLocaleString() : ''
        }
        onOverwrite={() => void resolveConflictOverwrite()}
        onSaveCopy={() => void resolveConflictSaveCopy()}
        onTakeTheirs={() => void resolveConflictTakeTheirs()}
        onCancel={() => setLibraryConflict(null)}
      />

      <SharedLinkModal
        opened={shareOffer !== null}
        onCancel={() => setShareOffer(null)}
        onOpenShared={() => {
          const doc = shareOffer
          setShareOffer(null)
          if (doc === null) return
          openSharedDocument(doc)
        }}
      />

      <ConfirmModal
        opened={confirmDelete !== null}
        title={confirmDelete?.kind === 'plot' ? 'Delete plot' : 'Delete table'}
        message={`Delete “${confirmDelete?.name ?? ''}”? Closing its window keeps it; deleting removes it from the project.`}
        confirmLabel="Delete"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          const target = confirmDelete
          setConfirmDelete(null)
          if (!target) return
          const exists = target.kind === 'table' ? tablesRef.current.some((t) => t.id === target.id) : plots.some((p) => p.id === target.id)
          if (!exists) {
            notifications.show({ color: 'orange', title: 'Nothing deleted', message: `“${target.name}” no longer exists.` })
            return
          }
          if (target.kind === 'table') setTables((prev) => prev.filter((t) => t.id !== target.id))
          else handlePlotsChange(plots.filter((p) => p.id !== target.id))
        }}
      />

      <MessageModal
        opened={dialogError !== null}
        title="Could not open project"
        message={dialogError ?? ''}
        onClose={() => setDialogError(null)}
      />

      {/* Self-dismissing project-load summary (the D10/D11 inert-slice
          notices: data preserved in the file, feature no longer shown). */}
      {deletedTables.length > 0 && (
        <Alert title="Table deleted" withCloseButton onClose={() => setDeletedTables([])}>
          <Button size="xs" onClick={() => {
            setTables((all) => [...all, ...deletedTables.filter((t) => !all.some((a) => a.id === t.id))])
            setDeletedTables([])
          }}>Restore deleted tables</Button>
        </Alert>
      )}
      {loadNotice !== null && (
        <Alert
          icon={<IconInfoCircle size={16} />}
          color="teal"
          withCloseButton
          onClose={() => setLoadNotice(null)}
          style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 400, maxWidth: 420 }}
        >
          {loadNotice}
        </Alert>
      )}

      {showPreferences && (
        <PreferencesModal
          criteria={stopCriteria}
          unitSystem={unitSystem}
          fillMissing={fillMissing}
          onSave={savePreferences}
          onClose={() => setShowPreferences(false)}
          ribbon={ribbonOn}
          onRibbonChange={setRibbonOn}
        />
      )}

      {alterColumn && (
        <AlterValuesModal
          variable={alterColumn}
          rowCount={paramRows.length}
          initialFirst={paramRows[0]?.values[alterColumn] ?? ''}
          initialLast={paramRows[paramRows.length - 1]?.values[alterColumn] ?? ''}
          onApply={(values) => {
            updateActiveParam((t) => applyColumnFill(t, alterColumn, values))
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
          variables={(() => {
            const replScalarNames = Object.values(replVars)
              .map((v) => v.name)
              .filter((n) => !n.includes('['))
              .filter((n) => !variables.some((vn) => vn.toLowerCase() === n.toLowerCase()))
            return [...variables, ...replScalarNames]
          })()}
          drafts={varDrafts}
          sliders={pinnedSliders}
          solvedValues={(() => {
            const solvedValues: Record<string, number> = {}
            if (result && result.variables) {
              for (const v of result.variables) {
                solvedValues[v.name.toLowerCase()] = v.value
              }
            }
            for (const v of Object.values(replVars)) {
              if (!v.name.includes('[')) solvedValues[v.name.toLowerCase()] = v.value
            }
            return solvedValues
          })()}
          onSave={(drafts, sliderBounds) => {
            setVarDrafts(drafts)
            // A re-ranged slider keeps its handle inside the new track, and the
            // solution follows it, so narrowing a range can't strand the model
            // on a value the slider can no longer reach.
            setPinnedSliders((prev) => {
              const next = prev.map((p) => {
                const range = sliderBounds[p.name.toLowerCase()]
                return range ? withSliderBounds(p, range.min, range.max) : p
              })
              if (next.some((p, i) => p.value !== prev[i].value)) {
                modelRevisionRef.current.bumpValues()
                setSlidersStale(true)
                scheduleSliderSolve(30)
              }
              return next
            })
            setShowVariableInfo(false)
          }}
          onClose={() => setShowVariableInfo(false)}
          documentText={textRef.current}
          onWriteToDocument={(next) => {
            applyText(next)
            setShowVariableInfo(false)
          }}
        />
      )}

      {newPlotKind && (
        <Suspense fallback={null}>
          <PlotConfigModal
            spec={null}
            allowedKinds={[newPlotKind]}
            defaultName={`${PLOT_KIND_LABEL[newPlotKind]} ${mergedPlots.filter((p) => p.kind === newPlotKind).length + 1}`}
            fluids={fluids}
            tables={tables}
            occupiedNames={mergedPlots.map((p) => p.name)}
            tableVars={tableVars}
            initialXy={newPlotKind === 'xy' ? (plotSeed ?? undefined) : undefined}
            initialFluid={newPlotKind === 'property' ? (fluidSeed ?? undefined) : undefined}
            hasStates={detectStates(result?.variables ?? []).indices.length > 0}
            onSave={(spec) => {
              handlePlotsChange([...plots, spec])
              setActivePlotId(spec.id)
              setNewPlotKind(null)
              setPlotSeed(null)
              setFluidSeed(null)
              requestAnimationFrame(() => dockRef.current?.openInstance(`plot:${spec.id}`, 'plot', spec.name))
            }}
            onClose={() => { setNewPlotKind(null); setPlotSeed(null); setFluidSeed(null) }}
          />
        </Suspense>
      )}
    </>
  )
}
