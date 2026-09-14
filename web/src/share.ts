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
