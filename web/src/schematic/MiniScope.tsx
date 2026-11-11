// Phase L3b: a mini-scope pinned to a block — the newest rows of one variable
// of the live run, drawn under the block while the run is open. Which
// variable a block traces is presentation state (`scopes`); the rows are the
// Live bar's store, which this follows on its own, so a chunk redraws the
// mini-scopes and not the canvas.

import { useSyncExternalStore } from 'react'
import type { LiveStore } from '../liveStore'
import type { LiveTable } from '../wasm/liveClient'
import { buckets, columnOf, envelopePath } from '../scopeMath'

/** The newest rows a mini-scope shows. */
export const MINI_ROWS = 400
const H = 30
const fmt = (v: number) => String(Number(v.toPrecision(4)))

interface Props {
  store: LiveStore
  header: LiveTable
  variable: string
  /** The block's width, in drawing units. */
  width: number
  /** Where under the block it sits. */
  y: number
  ink: { text: string; subtext: string; block: string; border: string; badge: string }
}

export default function MiniScope({ store, header, variable, width, y, ink }: Readonly<Props>) {
  useSyncExternalStore(store.subscribe, () => store.version)
  const w = Math.max(80, width)
  const col = columnOf(header, variable)
  const size = store.size
  let label = `${variable}: not in ${header.name}'s table`
  let d = ''
  if (col >= 0) {
    label = variable
    if (size > 0) {
      const from = store.row(Math.max(0, size - MINI_ROWS))[0]
      const s = store.series(col, from)
      const t1 = s.t[s.t.length - 1]
      if (t1 > from) {
        const { min, max } = buckets(s.t, s.y, from, t1, Math.round(w / 2))
        d = envelopePath(min, max, w, H).d
      }
      label = `${variable} ${fmt(s.y[s.y.length - 1])} ${header.units[col] ?? ''}`.trim()
    }
  }
  return (
    <g data-mini-scope={variable} transform={`translate(0, ${y})`} pointerEvents="none">
      <rect width={w} height={H + 12} rx={3} fill={ink.block} stroke={ink.border} />
      <text x={4} y={10} fontSize={9} fill={col >= 0 ? ink.text : ink.subtext}>{label}</text>
      {d && <path transform="translate(0, 10)" d={d} fill="none" stroke={ink.badge} strokeWidth={1.2} />}
    </g>
  )
}
