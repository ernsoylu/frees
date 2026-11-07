import type { ConnectionDto, OdeTableDto } from '../api'

/**
 * Phase H3: the playback cursor on a property diagram (P-h, T-s, …) or the
 * psychrometric chart. Each point is one fluid node's state at one recorded
 * sample, read only from the run's recorded columns (SI), never interpolated
 * and never from end-of-run values. A bounded trail shows the samples leading
 * up to it. A state that cannot be drawn is a gap with a reason.
 */
export interface CursorOverlay {
  /** One point per node at the current sample. */
  points: { label: string; x: number; y: number }[]
  /** Per node, the last {@link TRAIL} samples up to the current one; null is a gap. */
  trail: { label: string; x: (number | null)[]; y: (number | null)[] }[]
  /** Why a node has no point at the current sample. */
  gaps: string[]
}

/** The recorded sample playback is on, with the network it draws nodes for. */
export interface PlaybackSample {
  table: OdeTableDto
  index: number
  connections: readonly ConnectionDto[]
}

/** How many recorded samples the trail keeps. */
export const TRAIL = 30

/** The stream member carrying a diagram axis property. */
const MEMBER: Record<string, string> = { P: 'p', h: 'h', T: 't', s: 's', x: 'x', w: 'w', v: 'v', u: 'u', rho: 'rho' }

/**
 * The cursor for the axes `xProperty`/`yProperty` at sample `index`. A
 * property diagram takes the nodes carrying `fluid`; the psychrometric chart
 * (`fluid` null) takes the moist-air nodes. Each node is drawn from the first
 * of its streams the run recorded both axes for.
 */
export function cursorFor(
  connections: readonly ConnectionDto[],
  table: OdeTableDto,
  index: number,
  xProperty: string,
  yProperty: string,
  fluid: string | null,
  log: { x: boolean; y: boolean } = { x: false, y: false },
): CursorOverlay {
  const column = new Map(table.vars.map((name, j) => [name.replaceAll('$', '.').toLowerCase(), j]))
  const [mx, my] = [MEMBER[xProperty], MEMBER[yProperty]]
  const out: CursorOverlay = { points: [], trail: [], gaps: [] }
  if (!mx || !my) return out
  const nodes = connections.filter((c) =>
    fluid === null ? c.connector === 'moistair' : c.fluid?.toLowerCase() === fluid.toLowerCase(),
  )
  const first = Math.max(0, index - TRAIL + 1)
  for (const c of nodes) {
    const streams = (c.streams ?? []).map((s) => s.toLowerCase())
    const stream = streams.find((s) => column.has(`${s}.${mx}`) && column.has(`${s}.${my}`))
    const label = c.endpoints[0] ?? streams[0] ?? 'node'
    if (!stream) {
      out.gaps.push(`${label}: the run did not record ${xProperty} and ${yProperty}`)
      continue
    }
    const [jx, jy] = [column.get(`${stream}.${mx}`)!, column.get(`${stream}.${my}`)!]
    const why = (x: number | null | undefined, y: number | null | undefined) =>
      typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y) ? 'not finite'
        : (log.x && x <= 0) || (log.y && y <= 0) ? 'not positive on a log axis'
        : null
    const trail = { label, x: [] as (number | null)[], y: [] as (number | null)[] }
    for (let k = first; k <= index; k++) {
      const row = table.rows[k] ?? []
      const ok = why(row[jx], row[jy]) === null
      trail.x.push(ok ? (row[jx] as number) : null)
      trail.y.push(ok ? (row[jy] as number) : null)
    }
    out.trail.push(trail)
    const row = table.rows[index] ?? []
    const reason = why(row[jx], row[jy])
    if (reason) out.gaps.push(`${label}: ${reason} at this sample`)
    else out.points.push({ label, x: row[jx] as number, y: row[jy] as number })
  }
  return out
}
