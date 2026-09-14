import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string'

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

/** Builds a share URL for the given document text, or null when the
 *  compressed link would exceed {@link MAX_SHARE_URL_CHARS}. */
export function buildShareUrl(text: string, base?: string): string | null {
  const origin = base ?? globalThis.location.origin + globalThis.location.pathname
  const url = origin + SHARE_PREFIX + compressToEncodedURIComponent(text)
  return url.length > MAX_SHARE_URL_CHARS ? null : url
}

/** Extracts the document text carried by a `#share=` fragment, or null when
 *  the hash is absent, not a share link, or fails to decompress (a truncated
 *  or hand-mangled link must open the normal workspace, not throw). */
export function extractSharedText(hash: string): string | null {
  if (!hash.startsWith(SHARE_PREFIX)) {
    return null
  }
  const payload = hash.slice(SHARE_PREFIX.length)
  if (payload.length === 0) {
    return null
  }
  try {
    const text = decompressFromEncodedURIComponent(payload)
    return text === null || text.length === 0 ? null : text
  } catch {
    return null
  }
}

/** Removes the share fragment from the address bar without reloading, so a
 *  refresh returns to the user's own autosaved work instead of re-importing
 *  the shared document. */
export function clearShareHash(): void {
  if (globalThis.location.hash.startsWith(SHARE_PREFIX)) {
    globalThis.history.replaceState(null, '', globalThis.location.pathname + globalThis.location.search)
  }
}
