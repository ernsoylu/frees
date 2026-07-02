// Data Analyzer window (todo.md Phases 1–2): CSV import → signal browser →
// multi-strip oscilloscope (uPlot) with synced hover cursor, A/B measurement
// cursors with Δt/Δv readout (§2.5e), Table & Statistics instruments, CSV
// export, and template-mode file relocation (§2.5b). Mirrors the whiteboard
// pattern: App owns the AnalyzerSpec[] slice; bulk samples live in the
// module-level ChannelStore.

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useState,
  useSyncExternalStore,
} from 'react'
import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  FileButton,
  Group,
  Modal,
  NumberInput,
  Radio,
  ScrollArea,
  Stack,
  Switch,
  Tabs,
  Text,
  TextInput,
  Tooltip,
  useComputedColorScheme,
} from '@mantine/core'
import {
  IconAlertTriangle,
  IconDownload,
  IconFileImport,
  IconFileSearch,
  IconPlus,
  IconSearch,
  IconSum,
  IconTable,
  IconTrash,
  IconWaveSine,
  IconX,
  IconZoomReset,
} from '@tabler/icons-react'
import uPlot from 'uplot'
import UPlotChart, { type AbCursors } from './UPlotChart'
import { channelStore, flattenRemoteChannels } from './channelStore'
import { uploadMeasurement } from './measurementApi'
import { formatValue } from '../format'
import {
  importCsvFile,
  type ImportedMeasurement,
  type TimeCandidate,
  type TimeChoice,
  type TimeKind,
} from './csvImport'
import { buildCsv, downloadCsv, type ExportSignal } from './exportCsv'
import { checkRelocatedFile } from './relocate'
import { signalColor } from './palette'
import TableInstrument from './instruments/TableInstrument'
import StatisticsInstrument from './instruments/StatisticsInstrument'
import {
  newStrip,
  type AnalyzerSpec,
  type AnalyzerStrip,
  type ChannelMeta,
} from './types'

/** Decimation budget per strip (≈2 samples per px at typical tile widths). */
const MAX_POINTS = 2400
const STRIP_HEIGHT = 200

// ---------------------------------------------------------------------------
// View state (per-window, non-persisted): shared x range, A/B cursors (§2.5e),
// snap mode, selected strip, and the active instrument tab.
// ---------------------------------------------------------------------------

type Instrument = 'scope' | 'table' | 'stats'

interface ViewState {
  /** null = the full recording. Shared by every strip (linked time axes). */
  xRange: [number, number] | null
  selectedStripId: string | null
  cursorA: number | null
  cursorB: number | null
  /** Sample-snap (true) vs continuous (false) cursor placement. */
  snap: boolean
  instrument: Instrument
}

type ViewAction =
  | { type: 'zoom'; min: number; max: number }
  | { type: 'reset-zoom' }
  | { type: 'select-strip'; id: string | null }
  | { type: 'set-cursor'; which: 'a' | 'b'; t: number | null }
  | { type: 'clear-cursors' }
  | { type: 'toggle-snap' }
  | { type: 'set-instrument'; instrument: Instrument }

function viewReducer(state: ViewState, action: ViewAction): ViewState {
  switch (action.type) {
    case 'zoom': {
      if (!(action.max > action.min)) return state
      const [curMin, curMax] = state.xRange ?? [NaN, NaN]
      if (action.min === curMin && action.max === curMax) return state
      return { ...state, xRange: [action.min, action.max] }
    }
    case 'reset-zoom':
      return state.xRange === null ? state : { ...state, xRange: null }
    case 'select-strip':
      return { ...state, selectedStripId: action.id }
    case 'set-cursor':
      return action.which === 'a' ? { ...state, cursorA: action.t } : { ...state, cursorB: action.t }
    case 'clear-cursors':
      return { ...state, cursorA: null, cursorB: null }
    case 'toggle-snap':
      return { ...state, snap: !state.snap }
    case 'set-instrument':
      return { ...state, instrument: action.instrument }
  }
}

// ---------------------------------------------------------------------------
// Per-strip chart assembly
// ---------------------------------------------------------------------------

interface LoadedSignal {
  channel: string
  color: string
  kind: 'analog' | 'boolean'
}

/**
 * Every signal always contributes TWO series (envelope min + max). When the
 * window is raw (not decimated) both series reference the SAME value array —
 * no copy, and the series composition stays stable across zoom levels so the
 * chart instance (and its cursor) survives data updates.
 */
function buildStripData(
  strip: AnalyzerStrip,
  xRange: [number, number] | null,
): { data: uPlot.AlignedData; loaded: LoadedSignal[]; missing: string[]; decimated: boolean } {
  const tables: uPlot.AlignedData[] = []
  const loaded: LoadedSignal[] = []
  const missing: string[] = []
  let decimated = false
  for (const sig of strip.signals) {
    const win = channelStore.getWindow(sig, xRange?.[0] ?? null, xRange?.[1] ?? null, MAX_POINTS)
    if (win === null) {
      // null = evicted/unknown (banner) OR a remote window still in flight
      // (loaded → just wait; the store notifies when it lands).
      if (!channelStore.isLoaded(sig.measurementId)) missing.push(sig.channel)
      continue
    }
    if (win.decimated) {
      decimated = true
      tables.push([win.t, win.min, win.max] as unknown as uPlot.AlignedData)
    } else {
      tables.push([win.t, win.v, win.v] as unknown as uPlot.AlignedData)
    }
    loaded.push({
      channel: sig.channel,
      color: sig.color,
      kind: win.kind === 'boolean' ? 'boolean' : 'analog',
    })
  }
  const data: uPlot.AlignedData =
    tables.length === 0
      ? ([[], []] as unknown as uPlot.AlignedData)
      : tables.length === 1
        ? tables[0]
        : uPlot.join(tables)
  return { data, loaded, missing, decimated }
}

function stripOptions(
  loaded: LoadedSignal[],
  syncKey: string,
  dark: boolean,
): Omit<uPlot.Options, 'width' | 'height'> {
  const axisColor = dark ? '#909296' : '#495057'
  const gridColor = dark ? 'rgba(134,142,150,0.15)' : 'rgba(134,142,150,0.25)'
  const series: uPlot.Series[] = [{}]
  for (const sig of loaded) {
    const stepped =
      sig.kind === 'boolean' ? uPlot.paths?.stepped?.({ align: 1 }) : undefined
    // Envelope pair: min line + max line in the signal color (identical when raw).
    series.push({ label: `${sig.channel} (env)`, stroke: sig.color, width: 1, spanGaps: true, paths: stepped })
    series.push({ label: sig.channel, stroke: sig.color, width: 1, spanGaps: true, paths: stepped })
  }
  const allBoolean = loaded.length > 0 && loaded.every((s) => s.kind === 'boolean')
  return {
    series,
    legend: { show: false },
    cursor: {
      sync: { key: syncKey },
      drag: { x: true, y: false },
    },
    scales: {
      x: { time: false },
      // Fixed headroom band for pure boolean strips so pulses read as pulses.
      y: allBoolean ? { range: [-0.15, 1.15] } : { auto: true },
    },
    axes: [
      { stroke: axisColor, grid: { stroke: gridColor, width: 1 }, ticks: { stroke: gridColor } },
      { stroke: axisColor, grid: { stroke: gridColor, width: 1 }, ticks: { stroke: gridColor }, size: 56 },
    ],
  }
}

interface StripViewProps {
  strip: AnalyzerStrip
  syncKey: string
  xRange: [number, number] | null
  cursors: AbCursors
  storeVersion: number
  selected: boolean
  dark: boolean
  onSelect: () => void
  onZoom: (min: number, max: number) => void
  onResetZoom: () => void
  onCursorSet: (t: number, which: 'a' | 'b') => void
  onRemoveSignal: (channel: string, measurementId: string) => void
  onRemoveStrip: () => void
}

function StripView({
  strip,
  syncKey,
  xRange,
  cursors,
  storeVersion,
  selected,
  dark,
  onSelect,
  onZoom,
  onResetZoom,
  onCursorSet,
  onRemoveSignal,
  onRemoveStrip,
}: Readonly<StripViewProps>) {
  const built = useMemo(
    () => buildStripData(strip, xRange),
    // storeVersion invalidates when measurements register/evict.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [strip, xRange, storeVersion],
  )
  // Options identity only changes when the series composition does, so the
  // chart instance — and the synced cursor — survives zoom/data updates.
  const seriesKey = built.loaded.map((s) => `${s.channel} ${s.color} ${s.kind}`).join('|')
  const options = useMemo(
    () => stripOptions(built.loaded, syncKey, dark),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [seriesKey, syncKey, dark],
  )

  return (
    <Box
      onClick={onSelect}
      style={{
        border: `1px solid var(--mantine-color-${selected ? 'teal-6' : 'default-border'})`,
        borderRadius: 6,
        overflow: 'hidden',
      }}
    >
      <Group justify="space-between" px={6} py={2} gap={4} wrap="nowrap">
        <Group gap={4} style={{ overflow: 'hidden' }} wrap="nowrap">
          {strip.signals.length === 0 && (
            <Text size="xs" c="dimmed">
              Empty strip — add signals from the browser
            </Text>
          )}
          {strip.signals.map((sig) => (
            <Badge
              key={`${sig.measurementId}:${sig.channel}`}
              variant="outline"
              size="sm"
              styles={{ root: { borderColor: sig.color, color: sig.color, textTransform: 'none' } }}
              rightSection={
                <IconX
                  size={10}
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => {
                    e.stopPropagation()
                    onRemoveSignal(sig.channel, sig.measurementId)
                  }}
                />
              }
            >
              {sig.channel}
            </Badge>
          ))}
          {built.decimated && (
            <Badge size="xs" variant="light" color="gray">
              envelope
            </Badge>
          )}
        </Group>
        <Tooltip label="Remove strip">
          <ActionIcon
            size="xs"
            variant="subtle"
            color="gray"
            onClick={(e) => {
              e.stopPropagation()
              onRemoveStrip()
            }}
          >
            <IconTrash size={12} />
          </ActionIcon>
        </Tooltip>
      </Group>
      {built.missing.length > 0 && (
        <Alert color="orange" p={4} m={4} icon={<IconAlertTriangle size={14} />}>
          <Text size="xs">
            Measurement data for {built.missing.join(', ')} is not in memory — use “Locate file…”
            in the signal browser.
          </Text>
        </Alert>
      )}
      <Box h={STRIP_HEIGHT}>
        {built.loaded.length > 0 ? (
          <UPlotChart
            data={built.data}
            options={options}
            xRange={xRange}
            cursors={cursors}
            onUserZoom={onZoom}
            onResetZoom={onResetZoom}
            onCursorSet={onCursorSet}
          />
        ) : (
          <Group justify="center" h="100%">
            <IconWaveSine size={28} color="var(--mantine-color-dimmed)" stroke={1.2} />
          </Group>
        )}
      </Box>
    </Box>
  )
}

// ---------------------------------------------------------------------------
// Time-base modal (§2.5c: ambiguous/absent time column → ask, never guess)
// ---------------------------------------------------------------------------

const KIND_LABELS: Record<TimeKind, string> = {
  iso: 'ISO-8601 timestamps',
  'epoch-s': 'epoch seconds',
  'epoch-ms': 'epoch milliseconds',
  relative: 'relative seconds',
  index: 'sample index',
}

function TimeColumnModal({
  fileName,
  candidates,
  onConfirm,
  onCancel,
}: Readonly<{
  fileName: string
  candidates: TimeCandidate[]
  onConfirm: (choice: TimeChoice) => void
  onCancel: () => void
}>) {
  const [selection, setSelection] = useState<string>(
    candidates.length > 0 ? String(candidates[0].column) : 'dt',
  )
  const [dt, setDt] = useState<number | string>(0.01)

  const confirm = () => {
    if (selection === 'dt') {
      const v = typeof dt === 'number' ? dt : Number(dt)
      if (!(v > 0)) return
      onConfirm({ mode: 'dt', dt: v })
    } else {
      onConfirm({ mode: 'column', column: Number(selection) })
    }
  }

  return (
    <Modal opened onClose={onCancel} title="Select the time base" centered>
      <Stack gap="sm">
        <Text size="sm">
          The time column of “{fileName}” could not be identified unambiguously. Pick the column
          that holds time, or give a fixed sample interval for index-based data.
        </Text>
        <Radio.Group value={selection} onChange={setSelection}>
          <Stack gap={6}>
            {candidates.map((c) => (
              <Radio
                key={c.column}
                value={String(c.column)}
                label={`${c.name} — ${KIND_LABELS[c.kind]}`}
              />
            ))}
            <Radio value="dt" label="No time column — use a fixed sample interval" />
          </Stack>
        </Radio.Group>
        {selection === 'dt' && (
          <NumberInput
            label="Sample interval dt"
            suffix=" s"
            value={dt}
            onChange={setDt}
            min={1e-9}
            step={0.001}
            decimalScale={9}
          />
        )}
        <Group justify="flex-end" gap="xs">
          <Button variant="default" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={confirm}>Import</Button>
        </Group>
      </Stack>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// The analyzer window
// ---------------------------------------------------------------------------

interface Props {
  singleAnalyzerId: string
  analyzers: AnalyzerSpec[]
  /** setState-compatible so rapid updates can't clobber each other. */
  onAnalyzersChange: (update: (prev: AnalyzerSpec[]) => AnalyzerSpec[]) => void
}

export default function DataAnalyzerTab({ singleAnalyzerId, analyzers, onAnalyzersChange }: Readonly<Props>) {
  const spec = analyzers.find((a) => a.id === singleAnalyzerId)
  const dark = useComputedColorScheme('dark') === 'dark'
  const storeVersion = useSyncExternalStore(channelStore.subscribe, channelStore.version)
  const [view, dispatch] = useReducer(viewReducer, {
    xRange: null,
    selectedStripId: null,
    cursorA: null,
    cursorB: null,
    snap: true,
    instrument: 'scope',
  })
  const [search, setSearch] = useState('')
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [pendingTime, setPendingTime] = useState<{
    file: File
    candidates: TimeCandidate[]
    relocateId?: string
  } | null>(null)
  const [pendingAdvisory, setPendingAdvisory] = useState<{
    measurement: ImportedMeasurement
    relocateId: string
    mismatches: string[]
  } | null>(null)
  const [memWarning, setMemWarning] = useState(false)

  useEffect(
    () =>
      channelStore.subscribe((ev) => {
        if (ev === 'warn') setMemWarning(true)
      }),
    [],
  )

  // Functional update against the LATEST state: two spec changes in the same
  // tick (e.g. two rapid add-signal clicks) must both land, so never derive
  // the next array from this render's (possibly stale) `analyzers` closure.
  const updateSpec = useCallback(
    (mutate: (current: AnalyzerSpec) => AnalyzerSpec) => {
      onAnalyzersChange((prev) =>
        prev.map((a) => (a.id === singleAnalyzerId ? mutate(a) : a)),
      )
    },
    [onAnalyzersChange, singleAnalyzerId],
  )

  /** Template-mode re-pick (§2.5b): rebind an existing measurementId to the
   *  re-imported data and refresh the stored signature. */
  const applyRelocation = useCallback(
    (measurement: ImportedMeasurement, relocateId: string) => {
      if (spec === undefined) return
      const meta = channelStore.register(measurement, spec.id, relocateId)
      updateSpec((cur) => ({
        ...cur,
        files: cur.files.map((f) =>
          f.measurementId === relocateId ? { ...f, signature: meta.signature } : f,
        ),
      }))
      dispatch({ type: 'reset-zoom' })
    },
    [spec, updateSpec],
  )

  const handleImport = useCallback(
    async (file: File | null, choice?: TimeChoice, relocateId?: string) => {
      if (file === null || spec === undefined) return
      setImporting(true)
      setImportError(null)
      try {
        // .mf4 goes to the backend measurement service (RemoteSource); the
        // browser only ever sees windowed decimated envelopes.
        if (file.name.toLowerCase().endsWith('.mf4')) {
          const remote = await uploadMeasurement(file)
          if (relocateId !== undefined) {
            const required = spec.strips
              .flatMap((s) => s.signals)
              .filter((sig) => sig.measurementId === relocateId)
              .map((sig) => sig.channel)
            const stored = spec.files.find((f) => f.measurementId === relocateId)?.signature
            const check = checkRelocatedFile(
              [...new Set(required)],
              flattenRemoteChannels(remote).map((c) => c.display),
              stored ?? { name: file.name, size: -1, headerHash: 'mf4' },
              { size: remote.size, headerHash: 'mf4' },
            )
            if (check.status === 'rejected') {
              setImportError(
                `Wrong file: it is missing the channel(s) ${check.missingChannels.join(', ')} that this analyzer uses.`,
              )
              return
            }
            // Advisory (size drift) applies immediately for remote files —
            // the upload already happened; the strips just rebind.
            const meta = channelStore.registerRemote(remote, spec.id, relocateId)
            updateSpec((cur) => ({
              ...cur,
              files: cur.files.map((f) =>
                f.measurementId === relocateId ? { ...f, signature: meta.signature } : f,
              ),
            }))
          } else {
            const meta = channelStore.registerRemote(remote, spec.id)
            updateSpec((cur) => ({
              ...cur,
              files: [
                ...cur.files,
                { measurementId: meta.measurementId, signature: meta.signature },
              ],
            }))
          }
          dispatch({ type: 'reset-zoom' })
          return
        }
        const outcome = await importCsvFile(file, choice)
        if (outcome.status === 'needs-time') {
          setPendingTime({ file, candidates: outcome.candidates, relocateId })
        } else if (relocateId !== undefined) {
          // §2.5b verification: referenced channels are mandatory; size/hash
          // differences are advisory with an explicit override.
          const required = spec.strips
            .flatMap((s) => s.signals)
            .filter((sig) => sig.measurementId === relocateId)
            .map((sig) => sig.channel)
          const stored = spec.files.find((f) => f.measurementId === relocateId)?.signature
          const check = checkRelocatedFile(
            [...new Set(required)],
            outcome.measurement.channels.map((c) => c.name),
            stored ?? { name: file.name, size: -1, headerHash: '' },
            { size: outcome.measurement.size, headerHash: outcome.measurement.headerHash },
          )
          if (check.status === 'rejected') {
            setImportError(
              `Wrong file: it is missing the channel(s) ${check.missingChannels.join(', ')} that this analyzer uses.`,
            )
          } else if (check.status === 'advisory') {
            setPendingAdvisory({ measurement: outcome.measurement, relocateId, mismatches: check.mismatches })
          } else {
            applyRelocation(outcome.measurement, relocateId)
          }
        } else {
          const meta = channelStore.register(outcome.measurement, spec.id)
          updateSpec((cur) => ({
            ...cur,
            files: [
              ...cur.files,
              { measurementId: meta.measurementId, signature: meta.signature },
            ],
          }))
          dispatch({ type: 'reset-zoom' })
        }
      } catch (err) {
        setImportError(err instanceof Error ? err.message : String(err))
      } finally {
        setImporting(false)
      }
    },
    [spec, updateSpec, applyRelocation],
  )

  // All hooks above; early-out below keeps hook order stable.
  const allSignals = useMemo(() => spec?.strips.flatMap((s) => s.signals) ?? [], [spec])

  if (spec === undefined) return null
  const syncKey = `frees-analyzer-${spec.id}`

  const removeFile = (measurementId: string) => {
    channelStore.release(measurementId, spec.id)
    updateSpec((cur) => ({
      ...cur,
      files: cur.files.filter((f) => f.measurementId !== measurementId),
      strips: cur.strips.map((s) => ({
        ...s,
        signals: s.signals.filter((sig) => sig.measurementId !== measurementId),
      })),
    }))
  }

  const addSignal = (measurementId: string, channel: ChannelMeta) => {
    const selectedStripId = view.selectedStripId
    updateSpec((cur) => {
      // Color by assignment slot, persisted per-signal (§2.5e).
      const slot = cur.strips.reduce((acc, s) => acc + s.signals.length, 0)
      let strips = cur.strips
      let target =
        strips.find((s) => s.id === selectedStripId) ?? strips[strips.length - 1]
      if (target === undefined) {
        target = newStrip()
        strips = [target]
      }
      if (target.signals.some((s) => s.measurementId === measurementId && s.channel === channel.name)) {
        return cur
      }
      const signal = { measurementId, channel: channel.name, color: signalColor(slot) }
      const targetId = target.id
      return {
        ...cur,
        strips: strips.map((s) => (s.id === targetId ? { ...s, signals: [...s.signals, signal] } : s)),
      }
    })
  }

  const addStrip = () => {
    const strip = newStrip()
    updateSpec((cur) => ({ ...cur, strips: [...cur.strips, strip] }))
    dispatch({ type: 'select-strip', id: strip.id })
  }

  const removeStrip = (id: string) => {
    updateSpec((cur) => ({ ...cur, strips: cur.strips.filter((s) => s.id !== id) }))
    if (view.selectedStripId === id) dispatch({ type: 'select-strip', id: null })
  }

  const removeSignal = (stripId: string, channel: string, measurementId: string) => {
    updateSpec((cur) => ({
      ...cur,
      strips: cur.strips.map((s) =>
        s.id === stripId
          ? {
              ...s,
              signals: s.signals.filter(
                (sig) => !(sig.channel === channel && sig.measurementId === measurementId),
              ),
            }
          : s,
      ),
    }))
  }

  /** Cursor placement: snap to the nearest sample of the clicked strip's
   *  first loaded signal when snap mode is on (§2.5e). */
  const placeCursor = (strip: AnalyzerStrip) => (t: number, which: 'a' | 'b') => {
    let snapped = t
    if (view.snap) {
      const first = strip.signals[0]
      if (first) snapped = channelStore.nearestTime(first, t) ?? t
    }
    dispatch({ type: 'set-cursor', which, t: snapped })
  }

  const handleExport = () => {
    const exportSignals: ExportSignal[] = []
    for (const sig of allSignals) {
      const raw = channelStore.getRawRange(sig, null, null)
      if (raw) exportSignals.push({ name: sig.channel, unit: raw.unit, t: raw.t, v: raw.v })
    }
    if (exportSignals.length === 0) return
    downloadCsv(
      `${spec.name.replace(/\s+/g, '_')}_export`,
      buildCsv(exportSignals, view.xRange?.[0] ?? null, view.xRange?.[1] ?? null),
    )
  }

  const cursors: AbCursors = { a: view.cursorA, b: view.cursorB }
  const dt = view.cursorA !== null && view.cursorB !== null ? view.cursorB - view.cursorA : null
  const searchLower = search.trim().toLowerCase()

  return (
    <Group align="stretch" gap={0} h="100%" wrap="nowrap">
      {/* Signal browser */}
      <Stack
        w={280}
        gap="xs"
        p="xs"
        h="100%"
        style={{ borderRight: '1px solid var(--mantine-color-default-border)', flexShrink: 0 }}
      >
        <Group gap="xs" wrap="nowrap">
          <FileButton onChange={(f) => void handleImport(f)} accept=".csv,.tsv,.txt,.mf4,text/csv">
            {(props) => (
              <Button
                {...props}
                size="xs"
                variant="light"
                leftSection={<IconFileImport size={14} />}
                loading={importing}
              >
                Import CSV/MF4
              </Button>
            )}
          </FileButton>
        </Group>
        <TextInput
          size="xs"
          placeholder="Search signals…"
          leftSection={<IconSearch size={13} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
        />
        {importError !== null && (
          <Alert
            color="red"
            icon={<IconAlertTriangle size={14} />}
            withCloseButton
            onClose={() => setImportError(null)}
            p="xs"
          >
            <Text size="xs">{importError}</Text>
          </Alert>
        )}
        {memWarning && (
          <Alert
            color="yellow"
            icon={<IconAlertTriangle size={14} />}
            withCloseButton
            onClose={() => setMemWarning(false)}
            p="xs"
          >
            <Text size="xs">
              Measurement cache is large (&gt;50M cells). Least-recently-used files not shown in an
              open analyzer may be evicted.
            </Text>
          </Alert>
        )}
        <ScrollArea style={{ flex: 1 }} type="auto">
          <Stack gap="sm">
            {spec.files.length === 0 && (
              <Text size="xs" c="dimmed" ta="center" mt="lg">
                Import a CSV/TSV measurement file to browse its signals.
              </Text>
            )}
            {spec.files.map((f) => {
              const meta = channelStore.getMeta(f.measurementId)
              const loaded = channelStore.isLoaded(f.measurementId)
              const remoteError = channelStore.remoteError(f.measurementId)
              return (
                <Box key={f.measurementId}>
                  <Group justify="space-between" gap={4} wrap="nowrap">
                    <Text size="xs" fw={600} truncate title={f.signature.name}>
                      {f.signature.name}
                    </Text>
                    <Tooltip label="Remove file from this analyzer">
                      <ActionIcon
                        size="xs"
                        variant="subtle"
                        color="gray"
                        onClick={() => removeFile(f.measurementId)}
                      >
                        <IconTrash size={12} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                  {meta !== null && loaded && (
                    <Text size="xs" c="dimmed">
                      {meta.totalSamples.toLocaleString()} samples · {meta.channels.length} channels
                    </Text>
                  )}
                  {remoteError !== null && (
                    <Alert color="red" p={6} mt={4} icon={<IconAlertTriangle size={14} />}>
                      <Text size="xs">{remoteError}</Text>
                    </Alert>
                  )}
                  {!loaded && (
                    // Template mode (§2.5b): the layout survived the project
                    // round-trip; the samples did not. One re-pick repopulates
                    // every strip bound to this file.
                    <Alert color="orange" p={6} mt={4} icon={<IconAlertTriangle size={14} />}>
                      <Stack gap={6}>
                        <Text size="xs">
                          Measurement data is not loaded ({(f.signature.size / 1e6).toFixed(1)} MB
                          file).
                        </Text>
                        <FileButton
                          onChange={(nf) => void handleImport(nf, undefined, f.measurementId)}
                          accept=".csv,.tsv,.txt,.mf4,text/csv"
                        >
                          {(props) => (
                            <Button
                              {...props}
                              size="compact-xs"
                              variant="light"
                              color="orange"
                              leftSection={<IconFileSearch size={13} />}
                            >
                              Locate file…
                            </Button>
                          )}
                        </FileButton>
                      </Stack>
                    </Alert>
                  )}
                  {loaded &&
                    meta?.channels
                      .filter((ch) => searchLower === '' || ch.name.toLowerCase().includes(searchLower))
                      .map((ch) => (
                        <Group key={ch.name} justify="space-between" gap={4} wrap="nowrap" py={1}>
                          <Group gap={4} wrap="nowrap" style={{ overflow: 'hidden' }}>
                            <Text size="xs" truncate title={ch.name}>
                              {ch.name}
                            </Text>
                            {ch.unit !== undefined && (
                              <Text size="xs" c="dimmed">
                                [{ch.unit}]
                              </Text>
                            )}
                            {ch.kind !== 'analog' && (
                              <Badge size="xs" variant="light" color={ch.kind === 'boolean' ? 'teal' : 'gray'}>
                                {ch.kind === 'boolean' ? 'bool' : 'str'}
                              </Badge>
                            )}
                          </Group>
                          <Tooltip
                            label={
                              ch.kind === 'string'
                                ? 'String channels cannot be plotted (known limitation)'
                                : 'Add to the selected strip'
                            }
                          >
                            <ActionIcon
                              size="xs"
                              variant="subtle"
                              disabled={ch.kind === 'string'}
                              onClick={() => addSignal(f.measurementId, ch)}
                            >
                              <IconPlus size={12} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      ))}
                </Box>
              )
            })}
          </Stack>
        </ScrollArea>
      </Stack>

      {/* Instruments */}
      <Tabs
        value={view.instrument}
        onChange={(v) => dispatch({ type: 'set-instrument', instrument: (v ?? 'scope') as Instrument })}
        keepMounted={false}
        style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}
        p="xs"
      >
        <Group justify="space-between" wrap="nowrap">
          <Tabs.List>
            <Tabs.Tab value="scope" leftSection={<IconWaveSine size={14} />}>
              Oscilloscope
            </Tabs.Tab>
            <Tabs.Tab value="table" leftSection={<IconTable size={14} />}>
              Table
            </Tabs.Tab>
            <Tabs.Tab value="stats" leftSection={<IconSum size={14} />}>
              Statistics
            </Tabs.Tab>
          </Tabs.List>
          <Group gap="xs" wrap="nowrap">
            <Button
              size="compact-xs"
              variant="default"
              leftSection={<IconDownload size={13} />}
              disabled={allSignals.length === 0}
              onClick={handleExport}
            >
              Export CSV
            </Button>
            <Button
              size="compact-xs"
              variant="default"
              leftSection={<IconZoomReset size={13} />}
              onClick={() => dispatch({ type: 'reset-zoom' })}
            >
              Reset zoom
            </Button>
            <Button
              size="compact-xs"
              variant="default"
              leftSection={<IconPlus size={13} />}
              onClick={addStrip}
            >
              Add strip
            </Button>
          </Group>
        </Group>

        <Tabs.Panel value="scope" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }} pt={6}>
          {/* Cursor readout bar (§2.5e): A (click), B (Shift+click), Δt. */}
          <Group gap="md" wrap="nowrap" mb={6}>
            <Group gap={4} wrap="nowrap">
              <Badge size="sm" variant="light" color="yellow">
                A
              </Badge>
              <Text size="xs" ff="monospace">
                {view.cursorA !== null ? `${formatValue(view.cursorA)} s` : '—'}
              </Text>
            </Group>
            <Group gap={4} wrap="nowrap">
              <Badge size="sm" variant="light" color="cyan">
                B
              </Badge>
              <Text size="xs" ff="monospace">
                {view.cursorB !== null ? `${formatValue(view.cursorB)} s` : '—'}
              </Text>
            </Group>
            <Text size="xs" ff="monospace" c={dt !== null ? undefined : 'dimmed'}>
              Δt = {dt !== null ? `${formatValue(dt)} s` : '—'}
              {dt !== null && dt !== 0 ? `  (${formatValue(1 / Math.abs(dt))} Hz)` : ''}
            </Text>
            <Switch
              size="xs"
              label="Snap to samples"
              checked={view.snap}
              onChange={() => dispatch({ type: 'toggle-snap' })}
            />
            <Button
              size="compact-xs"
              variant="subtle"
              color="gray"
              disabled={view.cursorA === null && view.cursorB === null}
              onClick={() => dispatch({ type: 'clear-cursors' })}
            >
              Clear cursors
            </Button>
          </Group>
          <ScrollArea style={{ flex: 1 }} type="auto">
            <Stack gap="sm">
              {spec.strips.map((strip) => (
                <StripView
                  key={strip.id}
                  strip={strip}
                  syncKey={syncKey}
                  xRange={view.xRange}
                  cursors={cursors}
                  storeVersion={storeVersion}
                  selected={view.selectedStripId === strip.id}
                  dark={dark}
                  onSelect={() => dispatch({ type: 'select-strip', id: strip.id })}
                  onZoom={(min, max) => dispatch({ type: 'zoom', min, max })}
                  onResetZoom={() => dispatch({ type: 'reset-zoom' })}
                  onCursorSet={placeCursor(strip)}
                  onRemoveSignal={(channel, measurementId) =>
                    removeSignal(strip.id, channel, measurementId)
                  }
                  onRemoveStrip={() => removeStrip(strip.id)}
                />
              ))}
              {spec.strips.length === 0 && (
                <Text size="sm" c="dimmed" ta="center" mt="xl">
                  No strips — add one to start plotting signals.
                </Text>
              )}
            </Stack>
          </ScrollArea>
        </Tabs.Panel>

        <Tabs.Panel value="table" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }} pt={6}>
          <TableInstrument signals={allSignals} xRange={view.xRange} storeVersion={storeVersion} />
        </Tabs.Panel>

        <Tabs.Panel value="stats" style={{ flex: 1, minHeight: 0 }} pt={6}>
          <ScrollArea h="100%" type="auto">
            <StatisticsInstrument
              signals={allSignals}
              xRange={view.xRange}
              cursors={cursors}
              storeVersion={storeVersion}
            />
          </ScrollArea>
        </Tabs.Panel>
      </Tabs>

      {pendingTime !== null && (
        <TimeColumnModal
          fileName={pendingTime.file.name}
          candidates={pendingTime.candidates}
          onConfirm={(choice) => {
            const { file, relocateId } = pendingTime
            setPendingTime(null)
            void handleImport(file, choice, relocateId)
          }}
          onCancel={() => setPendingTime(null)}
        />
      )}

      {pendingAdvisory !== null && (
        <Modal opened onClose={() => setPendingAdvisory(null)} title="File differs from the saved reference" centered>
          <Stack gap="sm">
            <Text size="sm">
              The picked file has all the channels this analyzer uses, but its{' '}
              {pendingAdvisory.mismatches.join(' and ')} differ
              {pendingAdvisory.mismatches.length === 1 ? 's' : ''} from the file the project was
              saved with. It may be a different recording.
            </Text>
            <Group justify="flex-end" gap="xs">
              <Button variant="default" onClick={() => setPendingAdvisory(null)}>
                Cancel
              </Button>
              <Button
                color="orange"
                onClick={() => {
                  const { measurement, relocateId } = pendingAdvisory
                  setPendingAdvisory(null)
                  applyRelocation(measurement, relocateId)
                }}
              >
                Use anyway
              </Button>
            </Group>
          </Stack>
        </Modal>
      )}
    </Group>
  )
}
