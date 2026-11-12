// Phase M4: a block's operating-point card — its curve, rebuilt only when a
// parameter changes, and the point the values put it at, which moves with a
// live run or the playback sample.

import { useEffect, useMemo, useState } from 'react'
import { Text } from '@mantine/core'
import { curveExtent, curveXs, type CurveSpec } from './operatingPoint'
import { formatCompact } from './readouts'

const W = 280
const H = 140
const L = 46
const B = 22
const T = 8
const R = 10

interface Props {
  spec: CurveSpec
  at: [number, number] | null
  /** Evaluates a table at one x against the solved document (the REPL); null when it cannot. */
  evaluate: (table: string, x: number) => Promise<number | null>
}

export default function OperatingPointChart({ spec, at, evaluate }: Readonly<Props>) {
  const xmax = curveExtent(spec, at)
  const key = `${spec.key}|${xmax}`
  const f = 'f' in spec.curve ? spec.curve.f : null
  const table = 'table' in spec.curve ? spec.curve.table : null
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const direct = useMemo(() => (f ? curveXs(xmax).map((x): [number, number] => [x, f(x)]) : null), [key])
  const [tabled, setTabled] = useState<{ key: string; pts: [number, number][] } | null>(null)
  useEffect(() => {
    if (!table) return
    let current = true
    const xs = curveXs(xmax)
    void Promise.all(xs.map((x) => evaluate(table, x))).then((ys) => {
      if (current) setTabled({ key, pts: xs.flatMap((x, k) => (ys[k] !== null && Number.isFinite(ys[k]) ? [[x, ys[k]] as [number, number]] : [])) })
    })
    return () => {
      current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  const pts = direct ?? (tabled?.key === key ? tabled.pts : null)
  const all = [...(pts ?? []), ...(at ? [at] : [])]
  const [x0, x1] = [Math.min(0, ...all.map((p) => p[0])), Math.max(xmax, ...all.map((p) => p[0]))]
  const [y0, y1] = [Math.min(0, ...all.map((p) => p[1])), Math.max(...all.map((p) => p[1]), 0)]
  const sx = (x: number) => L + ((x - x0) / (x1 - x0 || 1)) * (W - L - R)
  const sy = (y: number) => H - B - ((y - y0) / (y1 - y0 || 1)) * (H - B - T)
  const d = pts?.map(([x, y], k) => `${k ? 'L' : 'M'}${sx(x).toFixed(1)},${sy(y).toFixed(1)}`).join('') ?? ''
  const summary = at ? `${spec.x.label} = ${formatCompact(at[0])} ${spec.x.unit}, ${spec.y.label} = ${formatCompact(at[1])} ${spec.y.unit}` : 'no operating point in the values'
  return (
    <div data-testid="operating-point">
      <Text size="xs" fw={600} c="teal" mt={6}>
        {spec.title}
      </Text>
      <svg width={W} height={H} role="img" aria-label={`${spec.title}: ${summary}`} style={{ display: 'block', color: 'var(--mantine-color-dimmed)' }}>
        <line x1={L} y1={H - B} x2={W - R} y2={H - B} stroke="currentColor" />
        <line x1={L} y1={T} x2={L} y2={H - B} stroke="currentColor" />
        <text x={L - 4} y={T + 8} fontSize={9} textAnchor="end" fill="currentColor">{formatCompact(y1, 3)}</text>
        <text x={L - 4} y={H - B} fontSize={9} textAnchor="end" fill="currentColor">{formatCompact(y0, 3)}</text>
        <text x={L} y={H - 8} fontSize={9} fill="currentColor">{formatCompact(x0, 3)}</text>
        <text x={W - R} y={H - 8} fontSize={9} textAnchor="end" fill="currentColor">{formatCompact(x1, 3)}</text>
        <text x={(L + W - R) / 2} y={H - 4} fontSize={9} textAnchor="middle" fill="currentColor">{`${spec.x.label} [${spec.x.unit}]`}</text>
        <text x={10} y={(T + H - B) / 2} fontSize={9} textAnchor="middle" fill="currentColor" transform={`rotate(-90 10 ${(T + H - B) / 2})`}>{`${spec.y.label} [${spec.y.unit}]`}</text>
        {d && <path d={d} fill="none" stroke="var(--mantine-color-teal-5)" strokeWidth={1.6} data-curve={pts!.length} />}
        {at && <circle cx={sx(at[0])} cy={sy(at[1])} r={4} fill="var(--mantine-color-red-6)" data-point={`${at[0]},${at[1]}`} />}
      </svg>
      <Text size="10px" c="dimmed">
        ● {summary}
        {table && !pts ? ` · evaluating ${table}…` : ''}
        {table && pts?.length === 0 ? ` · ${table} could not be evaluated` : ''}
      </Text>
    </div>
  )
}
