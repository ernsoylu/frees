import { describe, expect, it } from 'vitest'
import {
  buildRawDocumentUrl,
  buildShareUrl,
  clearRawDocumentUrl,
  MAX_SHARE_URL_CHARS,
  readShareHash,
  timelineOfLog,
  type ShareRead,
} from './share'
import { compressToEncodedURIComponent } from 'lz-string'

const BASE = 'https://frees.example/'
const textOf = (r: ShareRead) => (r && 'text' in r ? r.text : null)
const extractSharedText = (hash: string) => textOf(readShareHash(hash))

describe('share-by-URL', () => {
  it('builds a raw document url with url encoding', () => {
    expect(buildRawDocumentUrl()).toBe('https://frees.softncon.com/?url=https%3A%2F%2Fpw.pee.pw%2Fr%2FHh0WCdP')
    expect(buildRawDocumentUrl('https://example.com/test.frees', 'https://example.com/')).toBe('https://example.com/?url=https%3A%2F%2Fexample.com%2Ftest.frees')
  })

  it('consumes the raw URL without losing other query parameters or the fragment', () => {
    const previous = location.href
    try {
      history.replaceState(null, '', '/?url=https%3A%2F%2Fexample.com%2Fraw%3Fa%3D1%26b%3D2&theme=dark#refpage:lqr')
      clearRawDocumentUrl()
      expect(location.search).toBe('?theme=dark')
      expect(location.hash).toBe('#refpage:lqr')
    } finally {
      history.replaceState(null, '', previous)
    }
  })
  it('round-trips a document through the fragment', () => {
    const doc = 'x^2 + y^3 = 77\nx / y = 1.23456\n{ a comment with ünïcödé and [units] }'
    const url = buildShareUrl(doc, BASE)
    expect(url).not.toBeNull()
    expect(url).toMatch(/^https:\/\/frees\.example\/#share=/)
    const hash = new URL(url!).hash
    expect(extractSharedText(hash)).toBe(doc)
  })

  it('round-trips a realistic multi-hundred-line document', () => {
    const doc = Array.from({ length: 400 }, (_, i) => `T[${i + 1}] = ${i} + x_${i} * exp(${i / 7})`).join('\n')
    const url = buildShareUrl(doc, BASE)
    expect(url).not.toBeNull()
    expect(extractSharedText(new URL(url!).hash)).toBe(doc)
  })

  it('refuses documents whose link would exceed the ceiling', () => {
    // Incompressible content (random-ish digits) to defeat lz-string.
    let seed = 1
    const junk = Array.from({ length: 80000 }, () => {
      seed = (seed * 48271) % 2147483647
      return String.fromCharCode(33 + (seed % 90))
    }).join('')
    expect(buildShareUrl(junk, BASE)).toBeNull()
    expect(MAX_SHARE_URL_CHARS).toBeGreaterThan(1000)
  })

  it('returns null for non-share and empty hashes', () => {
    expect(extractSharedText('')).toBeNull()
    expect(extractSharedText('#')).toBeNull()
    expect(extractSharedText('#refpage:lqr')).toBeNull()
    expect(extractSharedText('#share=')).toBeNull()
  })

  it('returns null for a mangled payload instead of throwing', () => {
    expect(extractSharedText('#share=!!!not-lz-data!!!')).toBeNull()
    const url = buildShareUrl('x = 1', BASE)!
    const truncated = new URL(url).hash.slice(0, 12)
    expect(extractSharedText(truncated)).toBeNull()
  })

  describe('I6: versioned lesson settings', () => {
    const RC = { name: 'R', value: 2000, units: 'Ohm', min: 100, max: 5000 }
    const hashOf = (url: string | null) => new URL(url!).hash

    it('a plain document still emits the unprefixed v1 link every reader opens', () => {
      const hash = hashOf(buildShareUrl('x = 1', BASE, { sliders: [] }))
      expect(hash).toMatch(/^#share=[^.]+$/)
      expect(readShareHash(hash)).toEqual({ text: 'x = 1' })
    })

    it('round-trips the lesson and the sliders in a v2 link', () => {
      const hash = hashOf(buildShareUrl('R = 1000 [Ohm]', BASE, { lesson: 'lesson-rc-charging', sliders: [RC] }))
      expect(hash.startsWith('#share=2.')).toBe(true)
      expect(readShareHash(hash)).toEqual({ text: 'R = 1000 [Ohm]', lesson: 'lesson-rc-charging', sliders: [RC] })
    })

    it('carries a slider’s wheel series when its unit takes it (L6)', () => {
      const pipe = { name: 'D', value: 0.05, units: 'm', min: 0.02, max: 0.2, series: 'dn' as const }
      const odd = { name: 'T', value: 300, units: 'K', min: 250, max: 350, series: 'dn' as const }
      const read = readShareHash(hashOf(buildShareUrl('D = 0.05 [m]', BASE, { sliders: [pipe, odd] }))) as { sliders: unknown[] }
      expect(read.sliders).toEqual([pipe, { name: 'T', value: 300, units: 'K', min: 250, max: 350 }])
    })

    it('a link from a newer frees says so instead of opening nothing', () => {
      const read = readShareHash('#share=3.' + new URL(buildShareUrl('x = 1', BASE)!).hash.slice(7))
      expect(read).toEqual({ error: expect.stringMatching(/newer version of frees \(link format 3\)/) })
      expect(readShareHash('#share=1.abc')).toBeNull()
      expect(readShareHash('#share=0.abc')).toBeNull()
    })

    it('keeps only well-formed settings from a hand-made link', async () => {
      const { compressToEncodedURIComponent } = await import('lz-string')
      const forge = (data: unknown) => readShareHash('#share=2.' + compressToEncodedURIComponent(JSON.stringify(data)))
      const read = forge({
        text: 'x = 1',
        lesson: '../evil',
        sliders: [
          { name: 'a', value: 99, units: 'm', min: 0, max: 10 }, // clamped to 10
          { name: 'A', value: 1, units: '', min: 0, max: 2 }, // duplicate (case-insensitive)
          { name: 'b b', value: 1, units: '', min: 0, max: 2 }, // not an identifier
          { name: 'c', value: 1, units: '', min: 2, max: 2 }, // empty range
          { name: 'd', value: Number.NaN, units: '', min: 0, max: 2 }, // NaN → null in JSON
          { name: 'e', value: 1, units: 'm]\ny = 5 [m', min: 0, max: 2 }, // units cannot leave the bracket
          ...Array.from({ length: 20 }, (_, i) => ({ name: `s${i}`, value: 0, units: '', min: 0, max: 1 })),
        ],
      })
      expect(read).toMatchObject({ text: 'x = 1', lesson: undefined })
      const sliders = (read as { sliders: { name: string; value: number; units: string }[] }).sliders
      expect(sliders.slice(0, 2)).toEqual([
        { name: 'a', value: 10, units: 'm', min: 0, max: 10 },
        { name: 'e', value: 1, units: '', min: 0, max: 2 },
      ])
      expect(sliders).toHaveLength(2 + 16 - 6) // the first 16 entries are read, six of them rejected
      expect(forge({ lesson: 'lesson-rc-charging' })).toBeNull()
      expect(forge('not an object')).toBeNull()
    })

    it('refuses a payload longer than any link frees emits', () => {
      expect(readShareHash('#share=' + 'A'.repeat(MAX_SHARE_URL_CHARS + 1))).toBeNull()
    })
  })

  describe('M2: a shared experiment', () => {
    it('carries a live run’s input changes as a timeline, the changes at one time together', () => {
      const timeline = timelineOfLog([
        { time: 100, name: 'q_load', value: 4000 },
        { time: 100, name: 't_t', value: 1e6 },
        { time: 1600, name: 'q_load', value: 1500 },
      ])
      expect(timeline).toEqual([{ at: 100, set: ['q_load = 4000', 't_t = 1000000'] }, { at: 1600, set: ['q_load = 1500'] }])
      const read = readShareHash(new URL(buildShareUrl('Q_load = 1500 [W]', BASE, { timeline })!).hash)
      expect(read).toEqual({ text: 'Q_load = 1500 [W]', timeline })
    })

    it('drops anything but literal assignments at finite, non-negative times, and sorts them', () => {
      const payload = {
        text: 'x = 1',
        timeline: [
          { at: 5, set: ['x = 2 [m]', 'y = sin(1)', 'z = 1 [m]] + 1', 'w = 1e-3'] },
          { at: 1, set: ['x = .5'] },
          { at: -1, set: ['x = 3'] },
          { at: Number.NaN, set: ['x = 3'] },
          { at: 2, set: 'x = 3' },
          { at: 3, set: ['x = 3\ny = 4'] },
        ],
      }
      const read = readShareHash('#share=2.' + compressToEncodedURIComponent(JSON.stringify(payload)))
      expect(read).toEqual({ text: 'x = 1', timeline: [{ at: 1, set: ['x = .5'] }, { at: 5, set: ['x = 2 [m]', 'w = 1e-3'] }] })
    })
  })
})
