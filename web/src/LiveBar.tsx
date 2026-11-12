import { useCallback, useEffect, useRef, useState } from 'react'
import { ActionIcon, Badge, Button, Group, NumberInput, Paper, Select, Slider, Stack, Text, TextInput, Tooltip } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconPlayerPause, IconPlayerPlay, IconPlayerRecord, IconWaveSine, IconX } from '@tabler/icons-react'
import { LiveClient, type LiveChunk, type LiveEvent, type LiveInputChange, type LiveProvenance, type LiveSettings, type LiveStepKind, type LiveTable } from './wasm/liveClient'
import type { ModelRevisionTracker } from './modelRevision'
import type { OdeTableDto } from './api'
import { LiveStore } from './liveStore'
import LiveScope from './LiveScope'
import { downloadRecording, LiveRecorder } from './liveRecorder'

/** What the bar needs of a live client; tests pass a fake. */
export type LiveDriver = Pick<LiveClient, 'open' | 'advance' | 'step' | 'reset' | 'setInputs' | 'spectrum' | 'dispose' | 'isOpen'>

interface Props {
  /** The document's DYNAMIC blocks, in order (their ODE Table names). */
  blocks: string[]
  tracker: Pick<ModelRevisionTracker, 'current' | 'subscribe'>
  /** The source and solve request to open with; may throw (a table that does not validate). */
  buildOpen: () => { source: string; request: string }
  driver?: LiveDriver
  /** The run so far as an ODE Table, on each pause, step, stop and failure (K4). */
  onTable?: (table: OdeTableDto) => void
  /**
   * Phase L1: while a run is open the bar sets this to the function that
   * changes inputs live (literal assignments, `Q = 50 [W]`), and to `null`
   * otherwise, so the sliders drive the run instead of closing it.
   */
  inputRef?: { current: ((lines: string[]) => void) | null }
  /** A reset returned the run to the inputs it opened with. */
  onInputsReset?: () => void
  /** The engine applied `lines` (`true`) or refused them, leaving the run as it was (`false`). */
  onInputsSettled?: (lines: string[], applied: boolean) => void
  /** Whether a run is open to inputs (paused or running), on each change (L2: the canvas controls). */
  onOpenChange?: (open: boolean) => void
  /** L3b: the open run's rows and header (`null` once closed), for the canvas mini-scopes. */
  onRows?: (rows: { store: LiveStore; header: LiveTable } | null) => void
}

type Status = 'closed' | 'opening' | 'paused' | 'running' | 'finished' | 'failed'

/** Engine time per chunk; commands queue behind at most one chunk. */
const BUDGET_MS = 10
/** How far the requested time may run ahead of the rows, in wall seconds at the current speed. */
const LEAD_S = 0.25

let shared: LiveClient | null = null
const defaultDriver = (): LiveDriver => (shared ??= new LiveClient())

const fmt = (v: number) => String(Number(v.toPrecision(5)))
const speedOf = (exponent: number) => 10 ** exponent

/**
 * Phase K3: the Live bar. Unlike Playback, which moves through a finished
 * run's samples, Live integrates as it goes: each animation frame asks the
 * live worker for `t + speed·Δt_wall` and waits for that chunk before asking
 * again. Steps run while paused. Any model edit closes the session (through
 * the revision tracker), so a live run never shows a model that is not the
 * one in the editor.
 */
export default function LiveBar({ blocks, tracker, buildOpen, driver: given, onTable, inputRef, onInputsReset, onInputsSettled, onOpenChange, onRows }: Readonly<Props>) {
  const driver = given ?? defaultDriver()
  const [block, setBlock] = useState(blocks[0] ?? '')
  const [status, setStatus] = useState<Status>('closed')
  const [table, setTable] = useState<LiveTable | null>(null)
  const [simT, setSimT] = useState<number | null>(null)
  const [step, setStep] = useState<number | null>(null)
  const [rows, setRows] = useState(0)
  const [achieved, setAchieved] = useState<number | null>(null)
  const [lastEvent, setLastEvent] = useState<LiveEvent | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [exponent, setExponent] = useState(0)
  const [kept, setKept] = useState<{ size: number; dropped: number } | null>(null)
  const [retryStep, setRetryStep] = useState<number | null>(null)
  const [lastInput, setLastInput] = useState<LiveInputChange | null>(null)
  const [scope, setScope] = useState(false)
  /** Phase L4: pause conditions, `;`-separated, sent when the run opens. */
  const [watchText, setWatchText] = useState('')
  /** The store, for drawing; `storeRef` is the one the loop writes. */
  const [store, setStore] = useState<LiveStore | null>(null)
  /** Phase L5: the recording's duration (blank: until exported), and the recording. */
  const [recFor, setRecFor] = useState<number | string>('')
  const [recording, setRecording] = useState<LiveRecorder | null>(null)
  const [, setRecTick] = useState(0)
  const spectrum = useCallback((values: ArrayLike<number>, fs: number, detrend: boolean) => driver.spectrum(values, fs, detrend), [driver])

  const statusRef = useRef<Status>('closed')
  const simRef = useRef<number | null>(null)
  const spacingRef = useRef<number | null>(null)
  const speedRef = useRef(speedOf(exponent))
  const stepRef = useRef<number | null>(null)
  const storeRef = useRef<LiveStore | null>(null)
  const headerRef = useRef<LiveTable | null>(null)
  const metaRef = useRef<{ settings: LiveSettings | null; provenance: LiveProvenance | null }>({ settings: null, provenance: null })
  const recRef = useRef<LiveRecorder | null>(null)
  const onTableRef = useRef(onTable)
  const onSettledRef = useRef(onInputsSettled)
  const inputLogRef = useRef<LiveInputChange[]>([])
  /** Input lines waiting for the change in flight, newest per name. */
  const queuedRef = useRef<Map<string, string> | null>(null)
  useEffect(() => {
    speedRef.current = speedOf(exponent)
  }, [exponent])
  useEffect(() => {
    onTableRef.current = onTable
    onSettledRef.current = onInputsSettled
  }, [onTable, onInputsSettled])

  /** Hand the run so far to the app as an ODE Table. */
  const publish = (stopped: boolean) => {
    const store = storeRef.current
    const header = headerRef.current
    if (!store || !header || store.size === 0) return
    setKept({ size: store.size, dropped: store.dropped })
    const table = store.toTable(header, stopped)
    const log = inputLogRef.current
    onTableRef.current?.(log.length ? { ...table, inputLog: log } : table)
  }
  const go = (next: Status) => {
    statusRef.current = next
    setStatus(next)
  }

  /** End a recording still open, keeping what it has (L5). */
  const endRecording = (status: 'complete' | 'partial' | 'failed', reason: string | null) => {
    const rec = recRef.current
    if (!rec || rec.status !== 'recording') return
    rec.end(status, reason)
    setRecTick((n) => n + 1)
  }
  const at = () => `t = ${fmt(simRef.current ?? 0)} ${headerRef.current?.units[0] || 's'}`
  /** A request to the live worker failed: the run is over, and so is a recording of it. */
  const fail = (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    setNotice(message)
    go('failed')
    endRecording('failed', message)
  }

  const clear = () => {
    simRef.current = null
    spacingRef.current = null
    stepRef.current = null
    storeRef.current?.clear()
    setKept(null)
    setRetryStep(null)
    setSimT(null)
    setStep(null)
    setRows(0)
    setAchieved(null)
    setLastEvent(null)
    inputLogRef.current = []
    queuedRef.current = null
    setLastInput(null)
  }

  /**
   * Change inputs live. One change is in flight at a time; lines that arrive
   * meanwhile wait, the newest per name, so a slider drag never queues a
   * steady solve per pixel.
   */
  const setInputs = (lines: string[]) => {
    const byName = (all: Map<string, string>, line: string) => all.set(line.split('=')[0].trim().toLowerCase(), line)
    if (queuedRef.current) {
      for (const line of lines) byName(queuedRef.current, line)
      return
    }
    queuedRef.current = new Map()
    void driver
      .setInputs(lines)
      .then((reply) => {
        if (!reply) return
        if ('error' in reply) {
          setNotice(`The input change was refused, and the run is unchanged: ${reply.error}`)
          onSettledRef.current?.(lines, false)
          return
        }
        onSettledRef.current?.(lines, true)
        inputLogRef.current = reply.log
        setLastInput(reply.log.at(-1) ?? null)
        setNotice(null)
      })
      .catch((error: unknown) => setNotice(error instanceof Error ? error.message : String(error)))
      .finally(() => {
        const queued = queuedRef.current
        queuedRef.current = null
        if (queued?.size && statusRef.current !== 'closed') setInputs([...queued.values()])
      })
  }
  const live = status === 'paused' || status === 'running'
  useEffect(() => {
    onOpenChange?.(live)
  }, [live, onOpenChange])
  const shown = status !== 'closed' && store && table ? store : null
  useEffect(() => {
    onRows?.(shown && table ? { store: shown, header: table } : null)
    // Unmounting the bar disposes the run, so the canvas must drop its rows too.
    return () => onRows?.(null)
  }, [shown, table, onRows])
  useEffect(() => {
    if (!inputRef) return
    inputRef.current = live ? setInputs : null
    return () => {
      inputRef.current = null
    }
    // `setInputs` reads refs and the driver only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputRef, live, driver])

  const apply = (chunk: LiveChunk) => {
    storeRef.current?.push(chunk.rows, chunk.numRows, chunk.events)
    const rec = recRef.current
    if (rec?.status === 'recording') {
      rec.push(chunk.rows, chunk.numRows, chunk.events)
      setRecTick((n) => n + 1)
    }
    if (chunk.numRows > 0) {
      const timeAt = (r: number) => chunk.rows[r * chunk.numCols]
      const t = timeAt(chunk.numRows - 1)
      const before = chunk.numRows > 1 ? timeAt(chunk.numRows - 2) : simRef.current
      if (before !== null && t > before) spacingRef.current = t - before
      simRef.current = t
      setSimT(t)
      setRows((n) => n + chunk.numRows)
    }
    if (chunk.state) {
      simRef.current = chunk.state[0]
      setSimT(chunk.state[0])
    }
    if (chunk.clock && chunk.clock.h > 0) {
      stepRef.current = chunk.clock.h
      setStep(chunk.clock.h)
    }
    if (chunk.events.length) setLastEvent(chunk.events[chunk.events.length - 1])
    // L4: a pause condition crossed; the engine ended the chunk on it.
    const paused = !chunk.error && !chunk.finished ? chunk.paused : null
    if (paused) {
      const at = chunk.events.find((e) => e.name === paused)?.time
      const unit = headerRef.current?.units[0] || 's'
      setNotice(`Paused: ${paused}${at === undefined ? '' : ` at t = ${fmt(at)} ${unit}`}.`)
      go('paused')
      publish(false)
    }
    if (chunk.error) {
      // Paused at the last accepted row, which is what the store holds: the
      // failed step never produced one, so nothing non-finite is published.
      setNotice(chunk.error)
      endRecording('failed', chunk.error)
      const h = stepRef.current ?? spacingRef.current
      setRetryStep(h !== null && h > 0 ? h / 4 : null)
      go('failed')
      publish(false)
    } else if (chunk.finished) {
      setNotice(chunk.stopped && simRef.current !== null ? `A stop event ended the run at t = ${fmt(simRef.current)}.` : 'The run has ended.')
      const ended = `The run ended at ${at()}`
      if (recRef.current?.duration === null) endRecording('complete', `${ended}.`)
      else endRecording('partial', `${ended}, before the recording's ${fmt(recRef.current?.duration ?? 0)} ${headerRef.current?.units[0] || 's'} elapsed.`)
      go('finished')
      publish(chunk.stopped)
    }
  }

  // A model edit closes the session: its structure and inputs are the old model's.
  useEffect(
    () =>
      tracker.subscribe(() => {
        if (statusRef.current === 'closed') return
        driver.dispose()
        endRecording('partial', `The model changed, closing the live run at ${at()}.`)
        go('closed')
        setNotice('The model changed, so the live run closed. Run it again to go live on the new model.')
      }),
    [tracker, driver],
  )
  useEffect(() => () => driver.dispose(), [driver])
  // The bar goes when the model's run does (an edit clears the solve). A
  // recording that was not saved outlives it: a notice offers its export.
  useEffect(() => () => {
    const rec = recRef.current
    if (!rec || rec.rows === 0 || rec.exported) return
    rec.end('partial', `The live run closed at ${at()}.`)
    notifications.show({
      id: 'live-recording-kept',
      autoClose: false,
      title: `Live recording of ${rec.block} kept`,
      message: (
        <Button size="compact-xs" variant="light" mt={4} onClick={() => { downloadRecording(rec); notifications.hide('live-recording-kept') }}>
          Export recording
        </Button>
      ),
    })
    // Runs once, on unmount; `at` reads refs.
  }, [])

  // The pull loop: one advance in flight, asked for on each animation frame.
  useEffect(() => {
    if (status !== 'running') return
    let cancelled = false
    let frame = 0
    let wall = performance.now()
    let target = simRef.current ?? Number.NEGATIVE_INFINITY
    const history: Array<[number, number]> = []
    let lastBehind = Number.NEGATIVE_INFINITY
    const tick = async (now: number) => {
      const speed = speedRef.current
      const sim = simRef.current
      if (sim !== null) {
        const wanted = Math.max(target, sim) + (speed * (now - wall)) / 1000
        // A slow model must not build a backlog it then races through: once
        // the row spacing is known, the request stays within a fraction of a
        // second (or two rows) of the rows. Rows always lag the request by up
        // to one spacing, so only a lag past that is the engine falling behind.
        const spacing = spacingRef.current
        const lead = spacing === null ? Number.POSITIVE_INFINITY : Math.max(speed * LEAD_S, 2 * spacing)
        if (wanted > sim + lead) lastBehind = now
        target = Math.min(wanted, sim + lead)
      }
      wall = now
      let chunk: LiveChunk | null
      try {
        chunk = await driver.advance(target, BUDGET_MS)
      } catch (error) {
        if (!cancelled) fail(error)
        return
      }
      if (cancelled) return
      if (chunk) {
        apply(chunk)
        if (simRef.current !== null) {
          const end = performance.now()
          history.push([end, simRef.current])
          while (history.length > 2 && end - history[0][0] > 1000) history.shift()
          const [w0, s0] = history[0]
          if (end - lastBehind > 1000) setAchieved(null)
          else if (end - w0 >= 500) setAchieved((simRef.current - s0) / ((end - w0) / 1000) / speed)
        }
      }
      if (statusRef.current === 'running') frame = requestAnimationFrame((t) => void tick(t))
    }
    frame = requestAnimationFrame((t) => void tick(t))
    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
    }
    // `apply` reads refs and calls state setters only, so the render it closes over does not matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, driver])

  /** Open the chosen block at `t0`; true once it is open. */
  const open = async (maxStep?: number): Promise<boolean> => {
    go('opening')
    setNotice(null)
    clear()
    let built: { source: string; request: string }
    try {
      built = buildOpen()
      // A retry after a failure caps the integrator's step for this run only;
      // pause conditions (L4) go with every open, a retry's included.
      const watches = watchText.split(';').map((w) => w.trim()).filter(Boolean)
      if (maxStep !== undefined || watches.length) {
        const extra = { ...(maxStep === undefined ? {} : { liveMaxStep: maxStep }), ...(watches.length ? { liveWatches: watches } : {}) }
        built = { ...built, request: JSON.stringify({ ...JSON.parse(built.request), ...extra }) }
      }
    } catch (error) {
      go('closed')
      setNotice(error instanceof Error ? error.message : String(error))
      return false
    }
    const revision = tracker.current
    let result
    try {
      result = await driver.open(built.source, built.request, Math.max(0, blocks.indexOf(block)), revision)
    } catch (error) {
      go('closed')
      setNotice(`Live mode failed: ${error instanceof Error ? error.message : String(error)}`)
      return false
    }
    if (!result || statusRef.current !== 'opening') return false
    if (!result.ok) {
      go('closed')
      setNotice(result.error)
      return false
    }
    setTable(result.table)
    headerRef.current = result.table
    metaRef.current = { settings: result.settings ?? null, provenance: result.provenance ?? null }
    storeRef.current = new LiveStore(result.table.vars.length)
    setStore(storeRef.current)
    go('paused')
    return true
  }

  // Resuming or stepping moves on from whatever the last notice said, a pause included.
  const run = async () => {
    if (status === 'closed' && !(await open())) return
    setNotice(null)
    go('running')
  }

  const pause = () => {
    go('paused')
    publish(false)
  }

  const retry = async (maxStep: number) => {
    driver.dispose()
    if (await open(maxStep)) go('running')
  }

  const stepBy = async (kind: LiveStepKind) => {
    if (status === 'closed' && !(await open())) return
    setNotice(null)
    go('paused')
    const chunk = await driver.step(kind).catch((error: unknown) => {
      fail(error)
      return null
    })
    if (chunk) {
      apply(chunk)
      if (statusRef.current === 'paused') publish(false)
    }
  }

  const reset = async () => {
    const changed = inputLogRef.current.length > 0
    endRecording('partial', `The run was reset at ${at()}.`)
    go('paused')
    setNotice(null)
    clear()
    if (!(await driver.reset())) go('closed')
    else if (changed) onInputsReset?.()
  }

  const close = () => {
    endRecording('partial', `The live run was closed at ${at()}.`)
    driver.dispose()
    go('closed')
    setNotice(null)
    clear()
  }

  /** Start recording from the current row (or the run's first), opening the run if need be. */
  const record = async () => {
    if (status === 'closed' && !(await open())) return
    const header = headerRef.current
    const store = storeRef.current
    if (!header || !store) return
    const duration = typeof recFor === 'number' && recFor > 0 ? recFor : null
    const first = store.size > 0 ? store.row(store.size - 1) : null
    recRef.current = new LiveRecorder({ header, ...metaRef.current }, duration, first, () => inputLogRef.current)
    setRecording(recRef.current)
    setRecTick((n) => n + 1)
  }

  /** Save the recording, ending it first when it is still recording. */
  const exportRecording = () => {
    const rec = recRef.current
    if (!rec) return
    if (rec.duration === null) endRecording('complete', `Exported at ${at()}.`)
    else endRecording('partial', `Exported at ${at()}, before the recording's ${fmt(rec.duration)} ${unit} elapsed.`)
    downloadRecording(rec)
  }

  const isOpen = status !== 'closed'
  const busy = status === 'opening'
  const ended = status === 'finished' || status === 'failed'
  const unit = table?.units[0] || 's'
  const speed = speedOf(exponent)

  return (
    <Paper withBorder p="xs" data-testid="live-bar">
      <Stack gap={6}>
        <Group gap={6} wrap="wrap">
          <Text size="xs" fw={600}>Live</Text>
          {blocks.length > 1 ? (
            <Select size="xs" w={130} aria-label="Live block" data={blocks} value={block} onChange={(v) => v && setBlock(v)} disabled={isOpen} allowDeselect={false} comboboxProps={{ withinPortal: false }} />
          ) : (
            <Text size="xs" c="dimmed">{block}</Text>
          )}
          {simT !== null && <Text size="xs" data-testid="live-time">t = {fmt(simT)} {unit}</Text>}
          {step !== null && <Text size="xs" c="dimmed" data-testid="live-step">step {fmt(step)} {unit}</Text>}
          {status === 'running' && (
            <Text size="xs" c={achieved === null ? 'dimmed' : 'orange'} data-testid="live-achieved">
              {achieved === null ? 'at requested speed' : `×${achieved.toFixed(2)} of requested`}
            </Text>
          )}
          {rows > 0 && <Text size="xs" c="dimmed">{rows} rows</Text>}
          {kept && kept.dropped > 0 && (
            <Text size="xs" c="dimmed" data-testid="live-kept">keeping the newest {kept.size} rows</Text>
          )}
          {lastInput && (
            <Badge size="xs" color="blue" variant="light" data-testid="live-input">{lastInput.name} = {fmt(lastInput.value)} from t = {fmt(lastInput.time)}</Badge>
          )}
          {lastEvent && (
            <Badge size="xs" color="orange" variant="light" data-testid="live-event">event {lastEvent.name} · t = {fmt(lastEvent.time)}</Badge>
          )}
        </Group>
        <Group gap={4} wrap="wrap">
          {status === 'running' ? (
            <ActionIcon size="sm" variant="light" aria-label="Pause" onClick={pause}><IconPlayerPause size={14} /></ActionIcon>
          ) : (
            <Tooltip label={ended ? 'The run has ended: Reset to run it again' : 'Integrate live'}>
              <ActionIcon size="sm" variant="light" aria-label="Run live" disabled={busy || ended} onClick={() => void run()}><IconPlayerPlay size={14} /></ActionIcon>
            </Tooltip>
          )}
          <Button size="compact-xs" variant="subtle" disabled={busy || ended || status === 'running'} onClick={() => void stepBy('sample')}>Next sample</Button>
          <Button size="compact-xs" variant="subtle" disabled={busy || ended || status === 'running'} onClick={() => void stepBy('event')}>Next event</Button>
          <Button size="compact-xs" variant="subtle" disabled={busy || ended || status === 'running'} onClick={() => void stepBy('accepted')}>One step</Button>
          <Button size="compact-xs" variant="subtle" disabled={!isOpen || busy} onClick={() => void reset()}>Reset</Button>
          <Tooltip label={isOpen ? 'Close the run to change what pauses it' : 'Pause where a column crosses a value: L < 2 [m]; T > 60 [C]'}>
            <TextInput size="xs" w={170} aria-label="Pause when" placeholder="Pause when… T > 60 [C]" value={watchText} onChange={(e) => setWatchText(e.currentTarget.value)} disabled={isOpen} />
          </Tooltip>
          <NumberInput size="xs" w={120} aria-label="Record for" placeholder="until export" min={0} value={recFor} onChange={setRecFor} disabled={recording?.status === 'recording'} rightSection={<Text size="xs" c="dimmed">{unit}</Text>} />
          {recording?.status === 'recording' ? (
            <Button size="compact-xs" variant="light" color="red" onClick={exportRecording}>Stop and export</Button>
          ) : (
            <Tooltip label="Record every row from here, for the duration or until exported">
              <Button size="compact-xs" variant="subtle" color="red" leftSection={<IconPlayerRecord size={12} />} disabled={busy || ended} onClick={() => void record()}>Record</Button>
            </Tooltip>
          )}
          {recording && recording.status !== 'recording' && (
            <Button size="compact-xs" variant="subtle" onClick={() => downloadRecording(recording)}>Export recording</Button>
          )}
          <Text size="xs" c="dimmed" ml={6}>Speed</Text>
          <Slider
            w={140}
            size="xs"
            aria-label="Live speed"
            min={-2}
            max={3}
            step={0.25}
            value={exponent}
            onChange={setExponent}
            label={(v) => `${fmt(speedOf(v))} ${unit}/s`}
          />
          <Text size="xs" data-testid="live-speed">{fmt(speed)} {unit}/s</Text>
          <Tooltip label={scope ? 'Hide the scope' : 'Show the scope'}>
            <ActionIcon size="sm" variant={scope ? 'light' : 'subtle'} aria-label="Scope" aria-pressed={scope} onClick={() => setScope((s) => !s)}><IconWaveSine size={14} /></ActionIcon>
          </Tooltip>
          {isOpen && (
            <ActionIcon size="sm" variant="subtle" color="gray" aria-label="Close live run" onClick={close}><IconX size={14} /></ActionIcon>
          )}
        </Group>
        {scope && table && isOpen && <LiveScope key={table.name} store={store} header={table} version={rows} spectrum={spectrum} />}
        {notice && <Text size="xs" c={status === 'failed' ? 'red' : 'orange'} data-testid="live-notice">{notice}</Text>}
        {recording && (
          <Text size="xs" c={recording.status === 'recording' ? 'red' : 'dimmed'} data-testid="live-recording">
            {recording.status === 'recording' ? 'Recording' : `Recording ${recording.status}`}: {recording.rows} rows
            {recording.from !== null ? ` from t = ${fmt(recording.from)} ${unit}` : ''}
            {recording.status === 'recording'
              ? recording.until !== null ? ` until ${fmt(recording.until)} ${unit}` : ''
              : recording.last !== null && recording.rows > 1 ? ` to ${fmt(recording.last)} ${unit}` : ''}
            {recording.reason ? `. ${recording.reason}` : ''}
          </Text>
        )}
        {status === 'failed' && retryStep !== null && (
          <Group gap={6}>
            <Text size="xs" c="dimmed">The rows up to the failure are kept.</Text>
            <Button size="compact-xs" variant="light" onClick={() => void retry(retryStep)}>Retry from the start with max step {fmt(retryStep)} {unit}</Button>
          </Group>
        )}
      </Stack>
    </Paper>
  )
}
