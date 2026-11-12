/**
 * Phase I4: embed and kiosk mode, read once from the page's query string.
 *
 *   ?embed=1&view=schematic|plot&readonly&sliders=a,b&theme=light|dark&autorun
 *   ?example=<gallery-id>          (with or without embed)
 *
 * Every value is bounded and whitelisted: an unknown view or theme is ignored,
 * slider names must be identifiers (at most eight), and an example id is a
 * short slug. An embedded page never reads or writes the visitor's autosaved
 * workspace — a frame on another site must neither show nor overwrite it.
 */
export interface EmbedOptions {
  embed: boolean
  view: 'schematic' | 'plot' | null
  /** Accepted as documented; an embed is always read-only, since no editor is mounted. */
  readonly: boolean
  /** Slider names to show, or null for the lesson's (or none). */
  sliders: string[] | null
  theme: 'light' | 'dark' | null
  example: string | null
  /** M2: run the open lesson's live lab once the visitor solves; only a gallery lesson with a lab qualifies. */
  autorun: boolean
}

const IDENT = /^[A-Za-z_]\w{0,63}$/
const SLUG = /^[a-z0-9][a-z0-9-]{0,79}$/
const MAX_SLIDERS = 8

const flag = (q: URLSearchParams, name: string) => {
  const v = q.get(name)
  return v !== null && !/^(0|false|no|off)$/i.test(v)
}

export function parseEmbed(search: string): EmbedOptions {
  const q = new URLSearchParams(search)
  const view = q.get('view')
  const theme = q.get('theme')
  const example = q.get('example')
  const sliders = q.get('sliders')
  return {
    embed: flag(q, 'embed'),
    view: view === 'schematic' || view === 'plot' ? view : null,
    readonly: flag(q, 'readonly'),
    sliders: sliders === null ? null : [...new Set(sliders.split(',').map((s) => s.trim()).filter((s) => IDENT.test(s)))].slice(0, MAX_SLIDERS),
    theme: theme === 'light' || theme === 'dark' ? theme : null,
    example: example !== null && SLUG.test(example) ? example : null,
    autorun: flag(q, 'autorun'),
  }
}

/** The same model in the full application: the embed parameters dropped, the example and any share link kept. */
export function fullAppUrl(href: string): string {
  const url = new URL(href)
  for (const k of ['embed', 'view', 'readonly', 'sliders', 'theme', 'autorun']) url.searchParams.delete(k)
  return url.href
}

/** Drops `example` once it has opened, so a refresh returns to the visitor's own work. */
export function clearExampleParam(): void {
  const url = new URL(globalThis.location.href)
  if (!url.searchParams.has('example')) return
  url.searchParams.delete('example')
  globalThis.history.replaceState(null, '', url.pathname + url.search + url.hash)
}

/** This page load's options. */
export const EMBED: EmbedOptions = parseEmbed(globalThis.location.search)
