import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string'
import type { PinnedSlider } from './sliders'
import { seriesOptions, type SeriesId } from './preferredValues'
import type { LabTimelineEntry } from './labs'

/**
 * Share-by-URL: the whole document travels in the URL fragment as
 * `#share=<lz-string>`, so a link is self-contained — no server storage, no
 * account, nothing to expire. The fragment never leaves the browser (it is
 * not sent in the HTTP request), so sharing stays client-side end to end.
 */

const SHARE_PREFIX = '#share='

/** Fetch equation text only; remote documents are never executed on opening. */
export async function fetchRawDocument(source: string, signal: AbortSignal): Promise<string> {
  let url: URL
  try {
    url = new URL(source)
  } catch {
    throw new Error('The url parameter must contain a complete HTTPS URL.')
  }
  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new Error('Use an HTTPS URL without embedded credentials.')
  }
  const response = await fetch(url.href, {
    signal: AbortSignal.any([signal, AbortSignal.timeout(20_000)]),
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
  }).catch((error: unknown) => {
    if (signal.aborted) throw error
    throw new Error('Could not download the raw file. Check the URL and connection; the host must allow cross-origin access (CORS).')
  })
  if (!response.ok) throw new Error(`The raw file server returned HTTP ${response.status}.`)
  if (response.headers.get('content-type')?.includes('text/html')) {
    throw new Error('The URL returned a web page. Use the raw text file URL instead.')
  }
  const reader = response.body?.getReader()
  if (!reader) throw new Error('The raw file is empty.')
  const decoder = new TextDecoder()
  let size = 0
  let text = ''
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > 2 * 1024 * 1024) throw new Error('The raw file exceeds the 2 MB limit.')
      text += decoder.decode(value, { stream: true })
    }
    text += decoder.decode()
  } finally {
    await reader.cancel()
  }
  if (!text.trim()) throw new Error('The raw file is empty.')
  return text
}

/** Consume only the import parameter, preserving other query state and hashes. */
export function clearRawDocumentUrl(): void {
  const url = new URL(globalThis.location.href)
  url.searchParams.delete('url')
  globalThis.history.replaceState(null, '', url.pathname + url.search + url.hash)
}

export const DEFAULT_RAW_DOCUMENT_SOURCE = 'https://pw.pee.pw/r/Hh0WCdP'
export const DEFAULT_RAW_DOCUMENT_HOST = 'https://frees.softncon.com/'

/** Builds a URL with the given raw document source encoded into the `url` query parameter. */
export function buildRawDocumentUrl(
  source: string = DEFAULT_RAW_DOCUMENT_SOURCE,
  host: string = DEFAULT_RAW_DOCUMENT_HOST,
): string {
  const url = new URL(host)
  url.searchParams.set('url', source)
  return url.href
}

/** Normalizes raw document URL inputs, extracting the raw target if wrapped in a frees ?url= parameter. */
export function normalizeRawDocumentUrl(input: string): string {
  const trimmed = input.trim()
  try {
    const url = new URL(trimmed)
    const param = url.searchParams.get('url')
    if (param) return param.trim()
  } catch {
    // Return as-is; fetchRawDocument handles syntax validation.
  }
  return trimmed
}

/** Derives a readable project title from the raw document source URL and optional equation text. */
export function deriveProjectTitle(source: string, text?: string): string {
  if (text) {
    const firstLine = text.split('\n').find((l) => l.trim().length > 0)?.trim()
    if (firstLine && firstLine.startsWith('//')) {
      const candidate = firstLine.slice(2).trim()
      if (candidate.length > 0 && candidate.length <= 60 && !/[{}=]/.test(candidate)) {
        return candidate
      }
    }
  }
  try {
    const parsed = new URL(source)
    const segments = parsed.pathname.split('/').filter(Boolean)
    const last = segments[segments.length - 1]
    if (last) {
      const clean = last.replace(/\.(frees|txt|eqs)$/i, '')
      if (clean.length > 0 && clean.length <= 60) return clean
    }
  } catch {
    // Fallback below.
  }
  return 'Remote Document'
}

/** Ceiling for the emitted URL. Modern browsers handle far longer URLs, but
 *  chat apps, terminals and older proxies start mangling somewhere in the tens
 *  of thousands of characters — past this, refuse rather than emit a link
 *  that truncates silently. */
export const MAX_SHARE_URL_CHARS = 16000

/**
 * I6: what a link carries. Version 1 (`#share=<lz text>`, no prefix) is the
 * document alone, and is still what a link without lesson settings emits, so
 * every deployed reader opens it. Version 2 (`#share=2.<lz JSON>`) adds the
 * open lesson and the pinned sliders. lz-string's URI alphabet has no `.`, so
 * the prefix cannot be mistaken for a v1 payload. M2 adds an optional
 * experiment timeline to version 2; a reader without it opens the document
 * and sliders and drops the timeline.
 */
export interface SharedDocument {
  text: string
  /** The gallery example whose lesson was open. */
  lesson?: string
  sliders?: PinnedSlider[]
  /** M2: a live run's input changes, replayed when the visitor runs it live. */
  timeline?: LabTimelineEntry[]
}
export type ShareRead = SharedDocument | { error: string } | null

export const SHARE_VERSION = 2
export const MAX_SHARED_SLIDERS = 16
const MAX_SHARED_TEXT = 2 * 1024 * 1024
const IDENT = /^[A-Za-z_]\w{0,63}$/
const SLUG = /^[a-z0-9][a-z0-9-]{0,79}$/
// A unit is written into an override equation (`x = 1 [units]`): no brackets,
// braces, quotes or line breaks can close it.
const UNITS = /^[^[\]{}"\r\n]{0,40}$/
export const MAX_SHARED_CHANGES = 64
// A timeline line is one literal assignment, as the sliders write them.
const LINE = /^[A-Za-z_]\w{0,63} = [-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?(?: \[[^[\]{}"\r\n]{0,40}\])?$/i

/** Builds a share URL for the document and, when given, its lesson settings;
 *  null when the link would exceed {@link MAX_SHARE_URL_CHARS}. */
export function buildShareUrl(text: string, base?: string, extras: Omit<SharedDocument, 'text'> = {}): string | null {
  const origin = base ?? globalThis.location.origin + globalThis.location.pathname
  const sliders = extras.sliders?.length ? extras.sliders : undefined
  const timeline = extras.timeline?.length ? extras.timeline : undefined
  // M2: past what a reader keeps, refuse rather than lose the last changes; the caller offers a document-only link.
  if (timeline && (timeline.length > MAX_SHARED_CHANGES || timeline.some((e) => e.set.length > MAX_SHARED_SLIDERS))) return null
  const payload = extras.lesson || sliders || timeline
    ? `${SHARE_VERSION}.${compressToEncodedURIComponent(JSON.stringify({ text, lesson: extras.lesson, sliders, timeline }))}`
    : compressToEncodedURIComponent(text)
  const url = origin + SHARE_PREFIX + payload
  return url.length > MAX_SHARE_URL_CHARS ? null : url
}

/** Only well-formed sliders survive: identifier names, finite bracketing
 *  ranges, the value clamped into them, units that cannot leave the bracket. */
function readSliders(raw: unknown): PinnedSlider[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const out: PinnedSlider[] = []
  for (const r of raw.slice(0, MAX_SHARED_SLIDERS)) {
    const { name, value, units, min, max, series } = (r ?? {}) as Record<string, unknown>
    if (typeof name !== 'string' || !IDENT.test(name) || out.some((o) => o.name.toLowerCase() === name.toLowerCase())) continue
    if (![value, min, max].every((n) => typeof n === 'number' && Number.isFinite(n)) || !((min as number) < (max as number))) continue
    const u = typeof units === 'string' && UNITS.test(units) ? units : ''
    const steps = typeof series === 'string' && (seriesOptions(u) as string[]).includes(series) ? { series: series as SeriesId } : {}
    out.push({ name, units: u, min: min as number, max: max as number, value: Math.min(max as number, Math.max(min as number, value as number)), ...steps })
  }
  return out.length ? out : undefined
}

/** Only literal assignments at finite, non-negative times survive, at most
 *  {@link MAX_SHARED_CHANGES} entries, in time order. */
function readTimeline(raw: unknown): LabTimelineEntry[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const out: LabTimelineEntry[] = []
  for (const r of raw.slice(0, MAX_SHARED_CHANGES)) {
    const { at, set } = (r ?? {}) as Record<string, unknown>
    if (typeof at !== 'number' || !Number.isFinite(at) || at < 0 || !Array.isArray(set)) continue
    const lines = set.slice(0, MAX_SHARED_SLIDERS).filter((l): l is string => typeof l === 'string' && LINE.test(l))
    if (lines.length) out.push({ at, set: lines })
  }
  return out.length ? out.sort((a, b) => a.at - b.at) : undefined
}

/** M2: a live run's input log as a timeline, the changes at one time together, values in SI. */
export function timelineOfLog(log: readonly { time: number; name: string; value: number }[]): LabTimelineEntry[] {
  const out: LabTimelineEntry[] = []
  for (const c of log) {
    const line = `${c.name} = ${c.value}`
    const last = out.at(-1)
    if (last?.at === c.time) last.set.push(line)
    else out.push({ at: c.time, set: [line] })
  }
  return out
}

/** Reads a `#share=` fragment. Null when the hash is absent, not a share link,
 *  or does not decode (a truncated or hand-mangled link must open the normal
 *  workspace, not throw); an error only for a link from a newer frees. */
export function readShareHash(hash: string): ShareRead {
  if (!hash.startsWith(SHARE_PREFIX)) return null
  const payload = hash.slice(SHARE_PREFIX.length)
  if (payload.length === 0 || payload.length > MAX_SHARE_URL_CHARS) return null
  const versioned = /^(\d+)\.(.*)$/s.exec(payload)
  const version = versioned ? Number(versioned[1]) : 1
  if (versioned && version < 2) return null // v1 never carried a prefix
  if (version > SHARE_VERSION) return { error: `This link was made by a newer version of frees (link format ${version}). Reload to update, then open it again.` }
  try {
    const decoded = decompressFromEncodedURIComponent(versioned ? versioned[2] : payload)
    if (!decoded || decoded.length > MAX_SHARED_TEXT) return null
    if (version === 1) return { text: decoded }
    const data = JSON.parse(decoded) as Record<string, unknown>
    if (typeof data.text !== 'string' || data.text.length === 0 || data.text.length > MAX_SHARED_TEXT) return null
    const lesson = typeof data.lesson === 'string' && SLUG.test(data.lesson) ? data.lesson : undefined
    return { text: data.text, lesson, sliders: readSliders(data.sliders), timeline: readTimeline(data.timeline) }
  } catch {
    return null
  }
}

/** A read that opens a document, or null (nothing to open, or an error). */
export const sharedDocumentOf = (read: ShareRead): SharedDocument | null => (read && 'text' in read ? read : null)

/** Removes the share fragment from the address bar without reloading, so a
 *  refresh returns to the user's own autosaved work instead of re-importing
 *  the shared document. */
export function clearShareHash(): void {
  if (globalThis.location.hash.startsWith(SHARE_PREFIX)) {
    globalThis.history.replaceState(null, '', globalThis.location.pathname + globalThis.location.search)
  }
}
