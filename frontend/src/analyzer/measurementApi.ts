// REST client for the backend measurement service (Data Analyzer Phase 3).
// .mf4 files are uploaded once, indexed server-side, and read back as
// windowed decimated envelopes — the browser never holds the raw file.

const API_BASE = import.meta.env.VITE_API_BASE || ''

export interface RemoteChannelInfo {
  name: string
  unit?: string | null
  timeMaster: boolean
  kind: 'analog' | 'boolean' | 'string'
}

export interface RemoteGroupInfo {
  index: number
  name: string
  records: number
  channels: RemoteChannelInfo[]
}

export interface RemoteMeasurement {
  measurementId: string
  name: string
  size: number
  metadata: { groups: RemoteGroupInfo[] }
}

export interface RemoteWindow {
  t: number[]
  v: number[] | null
  min: number[] | null
  max: number[] | null
  decimated: boolean
  totalSamples: number
  unit?: string | null
  kind: string
}

/** Error carrying the HTTP status so callers can special-case 404 (§2.5b). */
export class MeasurementApiError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'MeasurementApiError'
    this.status = status
  }
}

async function fail(response: Response): Promise<never> {
  let message = `Measurement request failed (${response.status}).`
  try {
    const body = await response.json()
    if (typeof body?.error === 'string') message = body.error
  } catch {
    /* non-JSON error body */
  }
  throw new MeasurementApiError(response.status, message)
}

export async function uploadMeasurement(file: File): Promise<RemoteMeasurement> {
  const form = new FormData()
  form.append('file', file)
  const response = await fetch(`${API_BASE}/api/measurements`, { method: 'POST', body: form })
  if (!response.ok) await fail(response)
  return (await response.json()) as RemoteMeasurement
}

export async function fetchChannelWindow(
  id: string,
  group: number,
  channel: string,
  from: number | null,
  to: number | null,
  maxPoints: number,
): Promise<RemoteWindow> {
  const params = new URLSearchParams({ group: String(group), maxPoints: String(maxPoints) })
  if (from !== null) params.set('from', String(from))
  if (to !== null) params.set('to', String(to))
  const response = await fetch(
    `${API_BASE}/api/measurements/${id}/channels/${encodeURIComponent(channel)}?${params}`,
  )
  if (!response.ok) await fail(response)
  return (await response.json()) as RemoteWindow
}

export function deleteMeasurement(id: string): void {
  // Fire-and-forget; the backend TTL sweep is the safety net.
  void fetch(`${API_BASE}/api/measurements/${id}`, { method: 'DELETE' }).catch(() => undefined)
}
