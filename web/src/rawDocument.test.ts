// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest'
import { buildRawDocumentUrl, fetchRawDocument } from './share'

const source = 'https://example.com/raw?file=model&version=2'
afterEach(() => vi.unstubAllGlobals())

it('downloads exact UTF-8 equation text without credentials or referrer', async () => {
  const text = '// température\nx = 1 [m]\n'
  const fetch = vi.fn().mockResolvedValue(new Response(text))
  vi.stubGlobal('fetch', fetch)
  expect(await fetchRawDocument(source, new AbortController().signal)).toBe(text)
  expect(fetch).toHaveBeenCalledWith(source, expect.objectContaining({ credentials: 'omit', referrerPolicy: 'no-referrer' }))
})

it.each(['', 'not a url', 'javascript:alert(1)', 'file:///tmp/model', 'http://example.com/raw', 'https://user:secret@example.com/raw'])(
  'rejects unsafe or malformed source %s before fetching', async url => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    await expect(fetchRawDocument(url, new AbortController().signal)).rejects.toThrow(/HTTPS/)
    expect(fetch).not.toHaveBeenCalled()
  },
)

it.each([
  [new Response('missing', { status: 404 }), /HTTP 404/],
  [new Response('<html>login</html>', { headers: { 'content-type': 'text/html' } }), /raw text file/],
  [new Response('  \n'), /empty/],
  [new Response('x'.repeat(2 * 1024 * 1024 + 1)), /2 MB/],
])('rejects unusable responses', async (response, error) => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response))
  await expect(fetchRawDocument(source, new AbortController().signal)).rejects.toThrow(error)
})

it('explains browser network/CORS failures', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
  await expect(fetchRawDocument(source, new AbortController().signal)).rejects.toThrow(/CORS/)
})

it('passes cancellation through to the request', async () => {
  const controller = new AbortController()
  vi.stubGlobal('fetch', vi.fn(async (_url, options) => {
    controller.abort()
    options.signal.throwIfAborted()
  }))
  await expect(fetchRawDocument(source, controller.signal)).rejects.toMatchObject({ name: 'AbortError' })
})

it('builds a raw document url with url encoding for the default host and source', () => {
  expect(buildRawDocumentUrl()).toBe('https://frees.softncon.com/?url=https%3A%2F%2Fpw.pee.pw%2Fr%2FHh0WCdP')
  expect(buildRawDocumentUrl('https://pw.pee.pw/r/Hh0WCdP')).toBe('https://frees.softncon.com/?url=https%3A%2F%2Fpw.pee.pw%2Fr%2FHh0WCdP')
})
