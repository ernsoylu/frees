import { useEffect, useRef, useState } from 'react'
import { Checkbox, Group, MultiSelect, NumberInput, Stack, Text } from '@mantine/core'
import type { LiveStore } from './liveStore'
import type { LiveSpectrum, LiveTable } from './wasm/liveClient'
import { buckets, detrend as detrendLine, measure, spectrumSamples } from './scopeMath'

interface Props {
  store: LiveStore | null
  header: LiveTable | null
  /** Rows received so far; a change redraws. */
  version: number
  spectrum: (values: ArrayLike<number>, fs: number, detrend: boolean) => Promise<LiveSpectrum>
}

const W = 320
const LANE = 56
const COLUMNS = W
const MAX_TRACES = 4
const SPECTRUM_POINTS = 16_384
const fmt = (v: number) => String(Number(v.toPrecision(4)))

type Spectrum = { freq: number[]; power: number[] }

/** A lane's envelope: each column's min-to-max stroke, joined left to right. */
function envelope(min: Float64Array, max: Float64Array): { d: string; lo: number; hi: number } {
  let lo = Infinity
  let hi = -Infinity
  for (let c = 0; c < min.length; c++) {
    if (Number.isNaN(min[c])) continue
    lo = Math.min(lo, min[c])
    hi = Math.max(hi, max[c])
  }
  const y = (v: number) => (hi > lo ? LANE - 4 - ((v - lo) / (hi - lo)) * (LANE - 8) : LANE / 2)
  let d = ''
  for (let c = 0; c < min.length; c++) {
    if (Number.isNaN(min[c])) continue
    const x = (((c + 0.5) / min.length) * W).toFixed(1)
    d += `${d ? 'L' : 'M'}${x},${y(max[c]).toFixed(1)}L${x},${y(min[c]).toFixed(1)}`
  }
  return { d, lo, hi }
}

/**
 * Phase L3: the rolling scope. Up to four traces in lanes over one time axis,
 * drawn from per-column min/max buckets so a long window never thins out a
 * spike; the measurement strip reads the raw rows of the window, never the
 * buckets. Detrend removes each trace's least-squares line from what is drawn
 * and measured. The spectrum view resamples the window's accepted rows
 * uniformly and takes their Welch spectrum in the engine (`signal.rs`).
 */
export default function LiveScope({ store, header, version, spectrum }: Readonly<Props>) {
  const vars = header?.vars ?? []
  const [traces, setTraces] = useState<string[]>(() => (vars[1] ? [vars[1]] : []))
  const [windowSpan, setWindowSpan] = useState<number | string>('')
  const [detrend, setDetrend] = useState(false)
  const [showSpectrum, setShowSpectrum] = useState(false)
  const [spectra, setSpectra] = useState<Map<string, Spectrum | string>>(new Map())
  const inFlight = useRef(false)
  const dirty = useRef(false)
  const [kick, setKick] = useState(0)

  const unit = header?.units[0] || 's'
  const freqUnit = unit === 's' ? 'Hz' : `1/${unit}`
  const span = typeof windowSpan === 'number' && windowSpan > 0 ? windowSpan : null
  const size = store?.size ?? 0
  const tEnd = size > 0 ? store!.row(size - 1)[0] : 0
  const t0 = span === null ? (size > 0 ? store!.row(0)[0] : 0) : tEnd - span
  const windowOf = (name: string) => {
    const s = store!.series(vars.indexOf(name), t0)
    return detrend ? { t: s.t, y: Float64Array.from(detrendLine(s.t, s.y)) } : s
  }

  // The spectra follow the rows with one request in flight; a change that
  // arrives meanwhile is taken up when it answers.
  useEffect(() => {
    if (!showSpectrum || !store || traces.length === 0) return
    if (inFlight.current) {
      dirty.current = true
      return
    }
    inFlight.current = true
    void Promise.all(
      traces.map(async (name): Promise<[string, Spectrum | string]> => {
        const s = store.series(vars.indexOf(name), t0)
        if (s.t.length < 8 || !(s.t[s.t.length - 1] > s.t[0])) return [name, 'Too few rows in the window for a spectrum.']
        const { values, dt } = spectrumSamples(s.t, s.y, SPECTRUM_POINTS)
        const reply = await spectrum(values, 1 / dt, detrend)
        if ('error' in reply) return [name, reply.error]
        // A constant window has no power anywhere, so no bin is its peak.
        return [name, Math.max(...reply.power) > 0 ? reply : 'The window is constant, so it has no spectrum.']
      }),
    )
      .then((all) => setSpectra(new Map(all)))
      .catch((error: unknown) => setSpectra(new Map(traces.map((n) => [n, error instanceof Error ? error.message : String(error)]))))
      .finally(() => {
        inFlight.current = false
        if (dirty.current) {
          dirty.current = false
          setKick((k) => k + 1)
        }
      })
    // `t0` and `vars` follow `version`, `windowSpan` and `header`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSpectrum, store, traces, version, windowSpan, detrend, spectrum, kick])

  /** The span the strip measured, and the window asked for when the rows do not fill it. */
  const measured = (t: Float64Array) => {
    const got = `${fmt(t[t.length - 1] - t[0])} ${unit}`
    return span !== null && t[0] - t0 > 1e-9 * span ? `${got} of a ${fmt(span)} ${unit} window` : `${got} window`
  }
  const lanes = size > 1 && tEnd > t0 ? traces.filter((n) => vars.includes(n)) : []
  // One copy of each lane's window per render, shared by its drawing and its strip.
  // ponytail: copies the whole window each chunk; keep running aggregates if very long windows show in a profile.
  const windows = new Map(showSpectrum ? [] : lanes.map((n) => [n, windowOf(n)]))
  return (
    <Stack gap={4} data-testid="live-scope">
      <Group gap={8} wrap="wrap">
        <MultiSelect
          size="xs"
          w={260}
          aria-label="Scope traces"
          placeholder="Traces"
          data={vars.slice(1)}
          value={traces}
          onChange={setTraces}
          maxValues={MAX_TRACES}
          searchable
          comboboxProps={{ withinPortal: false }}
        />
        <NumberInput size="xs" w={130} aria-label="Scope window" placeholder="all kept" min={0} value={windowSpan} onChange={setWindowSpan} rightSection={<Text size="xs" c="dimmed">{unit}</Text>} />
        <Checkbox size="xs" label="Detrend" checked={detrend} onChange={(e) => setDetrend(e.currentTarget.checked)} />
        <Checkbox size="xs" label="Spectrum" checked={showSpectrum} onChange={(e) => setShowSpectrum(e.currentTarget.checked)} />
      </Group>
      {lanes.length > 0 && (
        <svg viewBox={`0 0 ${W} ${lanes.length * LANE + 14}`} width="100%" role="img" aria-label={showSpectrum ? 'Live spectrum' : 'Live scope'} style={{ display: 'block', maxWidth: 2 * W }}>
          {lanes.map((name, i) => {
            const col = vars.indexOf(name)
            let lane: { d: string; lo: number; hi: number } | null = null
            if (showSpectrum) {
              const sp = spectra.get(name)
              if (sp && typeof sp !== 'string' && sp.freq.length > 1) {
                const top = Math.max(...sp.power)
                const db = sp.power.map((p) => 10 * Math.log10(Math.max(p, top * 1e-12)))
                const { min, max } = buckets(sp.freq, db, 0, sp.freq[sp.freq.length - 1], COLUMNS)
                lane = envelope(min, max)
              }
            } else {
              const s = windows.get(name)!
              const { min, max } = buckets(s.t, s.y, t0, tEnd, COLUMNS)
              lane = envelope(min, max)
            }
            return (
              <g key={name} transform={`translate(0 ${i * LANE})`}>
                <rect x={0} y={0} width={W} height={LANE - 2} fill="none" stroke="var(--mantine-color-default-border)" />
                {lane && <path d={lane.d} fill="none" stroke={`var(--mantine-color-${['blue', 'orange', 'teal', 'grape'][i]}-6)`} strokeWidth={1.2} vectorEffect="non-scaling-stroke" />}
                <text x={4} y={11} fontSize={10} fill="currentColor">{name} [{showSpectrum ? 'dB' : header!.units[col] || '-'}]</text>
                {lane && Number.isFinite(lane.hi) && (
                  <>
                    <text x={W - 4} y={11} fontSize={9} textAnchor="end" fill="currentColor">{fmt(lane.hi)}</text>
                    <text x={W - 4} y={LANE - 6} fontSize={9} textAnchor="end" fill="currentColor">{fmt(lane.lo)}</text>
                  </>
                )}
              </g>
            )
          })}
          <text x={2} y={lanes.length * LANE + 11} fontSize={9} fill="currentColor">{showSpectrum ? `0 ${freqUnit}` : `${fmt(t0)} ${unit}`}</text>
          <text x={W - 2} y={lanes.length * LANE + 11} fontSize={9} textAnchor="end" fill="currentColor">
            {showSpectrum ? `${fmt(Math.max(0, ...[...spectra.values()].map((s) => (typeof s === 'string' ? 0 : (s.freq.at(-1) ?? 0)))))} ${freqUnit}` : `${fmt(tEnd)} ${unit}`}
          </text>
        </svg>
      )}
      {lanes.map((name) => {
        const u = header!.units[vars.indexOf(name)] || ''
        const v = (x: number) => `${fmt(x)}${u ? ` ${u}` : ''}`
        if (showSpectrum) {
          const sp = spectra.get(name)
          if (sp === undefined) return null
          if (typeof sp === 'string') return <Text key={name} size="xs" c="orange" data-testid="scope-measure">{name}: {sp}</Text>
          let k = 1
          for (let i = 2; i < sp.power.length; i++) if (sp.power[i] > sp.power[k]) k = i
          return <Text key={name} size="xs" data-testid="scope-measure">{name}: spectral peak at {fmt(sp.freq[k])} {freqUnit}</Text>
        }
        const s = windows.get(name)!
        const m = measure(s.t, s.y)
        if (!m) return null
        const parts = [
          `peak ${v(m.peak)}`,
          `p-p ${v(m.peakToPeak)}`,
          `RMS ${v(m.rms)}`,
          `mean ${v(m.mean)}`,
          m.frequency === null ? null : `f ${fmt(m.frequency)} ${freqUnit}`,
          m.peakToPeak > 0 ? `duty ${fmt(100 * m.duty)} %` : null,
          m.overshoot === null ? null : `overshoot ${fmt(100 * m.overshoot)} %`,
          m.settling === null ? null : `settling ${fmt(m.settling)} ${unit}`,
        ].filter(Boolean)
        return (
          <Text key={name} size="xs" data-testid="scope-measure">
            {name}{detrend ? ' (detrended)' : ''}, {measured(s.t)}: {parts.join(' · ')}
          </Text>
        )
      })}
    </Stack>
  )
}
