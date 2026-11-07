/**
 * COMP-08: imported symbol SVG, reduced to an allowlist. The markup is parsed
 * by an inert DOMParser document (no script runs, nothing is fetched), then
 * only allowlisted shape elements and presentation attributes are copied into
 * a plain tree, and the stored markup is re-serialised from that tree alone.
 * Everything else — scripts, event handlers, `foreignObject`, `<use>`/`<image>`
 * and any other reference, `style` (CSS can fetch), `url(…)` paint, entities,
 * namespaced attributes — is dropped and named, so the import can say what
 * it removed. The tree, not the markup, is what the canvas renders.
 */
export interface SvgElement {
  tag: string
  attrs: Record<string, string>
  children: SvgChild[]
}
export type SvgChild = SvgElement | string

export interface CleanSymbol {
  /** Canonical markup, safe to store and to sanitise again on load. */
  svg: string
  viewBox: [number, number, number, number]
  children: SvgChild[]
  /** What was removed, by element or attribute name. */
  dropped: string[]
}

const SVG_NS = 'http://www.w3.org/2000/svg'
export const MAX_SVG_CHARS = 100_000
const MAX_ELEMENTS = 2_000
const MAX_DEPTH = 24
const ELEMENTS = new Set(['g', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'text', 'tspan'])
const ATTRS = new Set([
  'd', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'rx', 'ry', 'dx', 'dy', 'width', 'height', 'points', 'transform',
  'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit', 'stroke-dasharray', 'stroke-dashoffset',
  'fill-rule', 'clip-rule', 'opacity', 'fill-opacity', 'stroke-opacity', 'vector-effect',
  'font-size', 'font-weight', 'font-family', 'text-anchor', 'dominant-baseline',
])
// Numbers, path data, colours, transforms and keywords. No quote, colon,
// semicolon, slash or angle bracket, so no URL scheme, CSS or markup.
const SAFE_VALUE = /^[\w\s.,#%()+-]*$/

const numbers = (v: string | null) => (v ?? '').trim().split(/[\s,]+/).map(Number)

/**
 * H5: stateful symbols. A part of a project symbol may bind one approved
 * attribute to one output of the block it draws, declared in the SVG itself:
 *
 *   data-bind="opening"            the block's member (`valve.opening`), or `port.member`
 *   data-bind-attr="rotate"        one of {@link BIND_ATTRS}
 *   data-bind-range="0 1 0 90"     output from..to mapped linearly (clamped) onto attribute from..to
 *   data-bind-about="10 10"        optional pivot for rotate/scale, in symbol units (default: the viewBox centre)
 *
 * Each value is checked here like every other attribute; a malformed one is
 * dropped and named. The bound attribute is composed in front of the part's
 * own transform (or replaces its opacity) only from a value the model outputs.
 */
export const BIND_ATTRS = ['rotate', 'translate-x', 'translate-y', 'scale-x', 'scale-y', 'opacity'] as const
export type BindAttr = (typeof BIND_ATTRS)[number]
const finite = (v: string, n: number) => {
  const xs = numbers(v)
  return xs.length === n && xs.every(Number.isFinite)
}
const BIND_RULES: Record<string, (v: string) => boolean> = {
  'data-bind': (v) => /^[a-z_]\w{0,63}(\.[a-z_]\w{0,63})?$/i.test(v),
  'data-bind-attr': (v) => (BIND_ATTRS as readonly string[]).includes(v),
  'data-bind-range': (v) => finite(v, 4) && numbers(v)[0] !== numbers(v)[1],
  'data-bind-about': (v) => finite(v, 2),
}

export interface SymbolBinding {
  member: string
  attr: BindAttr
  range: [number, number, number, number]
  about?: [number, number]
}

/** The binding a sanitised part declares, or null when it declares none or only part of one. */
export function bindingOf(attrs: Readonly<Record<string, string>>): SymbolBinding | null {
  const [member, attr, range] = [attrs['data-bind'], attrs['data-bind-attr'], attrs['data-bind-range']]
  if (!member || !attr || !range) return null
  const r = numbers(range) as SymbolBinding['range']
  const about = attrs['data-bind-about'] ? (numbers(attrs['data-bind-about']) as [number, number]) : undefined
  return { member: member.toLowerCase(), attr: attr as BindAttr, range: r, ...(about ? { about } : {}) }
}

/**
 * The part's attributes with its binding applied for `value`. With no value
 * (the model does not output it, or it is not finite) the part is drawn as
 * authored and marked `data-bound="missing"`.
 */
export function boundAttrs(attrs: Readonly<Record<string, string>>, b: SymbolBinding, value: number | undefined, viewBox: CleanSymbol['viewBox']): Record<string, string> {
  if (value === undefined || !Number.isFinite(value)) return { ...attrs, 'data-bound': 'missing' }
  const [v0, v1, a0, a1] = b.range
  const t = Math.min(1, Math.max(0, (value - v0) / (v1 - v0)))
  const a = a0 + t * (a1 - a0)
  const [px, py] = b.about ?? [viewBox[0] + viewBox[2] / 2, viewBox[1] + viewBox[3] / 2]
  if (b.attr === 'opacity') return { ...attrs, opacity: String(Math.min(1, Math.max(0, a))), 'data-bound': String(a) }
  const move =
    b.attr === 'rotate' ? `rotate(${a} ${px} ${py})`
    : b.attr === 'translate-x' ? `translate(${a} 0)`
    : b.attr === 'translate-y' ? `translate(0 ${a})`
    : b.attr === 'scale-x' ? `translate(${px} ${py}) scale(${a} 1) translate(${-px} ${-py})`
    : `translate(${px} ${py}) scale(1 ${a}) translate(${-px} ${-py})`
  return { ...attrs, transform: attrs.transform ? `${move} ${attrs.transform}` : move, 'data-bound': String(a) }
}

export function sanitizeSvg(markup: unknown): CleanSymbol | { error: string } {
  if (typeof markup !== 'string' || !markup.trim()) return { error: 'The file is empty.' }
  if (markup.length > MAX_SVG_CHARS) return { error: `The SVG is over ${MAX_SVG_CHARS / 1000} k characters.` }
  // Entities and stylesheet instructions are refused outright, not parsed.
  if (/<!DOCTYPE|<!ENTITY|<\?xml-stylesheet/i.test(markup)) return { error: 'A DOCTYPE, entity or stylesheet instruction is not allowed.' }
  const doc = new DOMParser().parseFromString(markup, 'image/svg+xml')
  const root = doc.documentElement
  if (doc.getElementsByTagName('parsererror').length > 0 || root.namespaceURI !== SVG_NS || root.localName !== 'svg') {
    return { error: 'This is not a well-formed SVG document.' }
  }
  const viewBox = viewBoxOf(root)
  if (!viewBox) return { error: 'The SVG needs a viewBox, or a width and height.' }

  const dropped = new Set<string>()
  let count = 0
  const walk = (el: Element, depth: number): SvgChild[] => {
    const out: SvgChild[] = []
    for (const child of el.childNodes) {
      if (child.nodeType === 3) {
        // Text is kept only where SVG draws it; React escapes it.
        if ((el.localName === 'text' || el.localName === 'tspan') && child.textContent) out.push(child.textContent.slice(0, 200))
        continue
      }
      if (child.nodeType !== 1) continue // comments, CDATA, processing instructions
      const c = child as Element
      if (c.namespaceURI !== SVG_NS || !ELEMENTS.has(c.localName) || depth >= MAX_DEPTH) {
        dropped.add(`<${c.localName}>`)
        continue
      }
      if (++count > MAX_ELEMENTS) throw new Error('size')
      out.push({ tag: c.localName, attrs: safeAttrs(c, dropped), children: walk(c, depth + 1) })
    }
    return out
  }
  let children: SvgChild[]
  try {
    children = walk(root, 0)
  } catch {
    return { error: `The SVG has over ${MAX_ELEMENTS} elements.` }
  }
  for (const a of root.attributes) if (!['viewBox', 'width', 'height', 'xmlns', 'version'].includes(a.name)) dropped.add(a.name)
  if (count === 0) return { error: 'Nothing drawable is left once unsafe content is removed.' }
  return { svg: serialize(viewBox, children), viewBox, children, dropped: [...dropped].sort((a, b) => a.localeCompare(b)) }
}

/** The root's viewBox, else its width and height from the origin; null when neither is usable. */
function viewBoxOf(root: Element): CleanSymbol['viewBox'] | null {
  const box = numbers(root.getAttribute('viewBox'))
  if (box.length === 4 && box.every(Number.isFinite) && box[2] > 0 && box[3] > 0) return [box[0], box[1], box[2], box[3]]
  const [w, h] = [root.getAttribute('width'), root.getAttribute('height')].map((v) => Number((v ?? '').replace(/px$/, '')))
  return [w, h].every((n) => Number.isFinite(n) && n > 0) ? [0, 0, w, h] : null
}

/** The allowlisted attributes of `el`; every other one is added to `dropped`. */
function safeAttrs(el: Element, dropped: Set<string>): Record<string, string> {
  const attrs: Record<string, string> = {}
  for (const a of el.attributes) {
    const name = a.name.toLowerCase()
    if (!a.namespaceURI && ATTRS.has(name) && a.value.length <= 20_000 && SAFE_VALUE.test(a.value) && !/url\s*\(/i.test(a.value)) attrs[name] = a.value
    else if (!a.namespaceURI && BIND_RULES[name]?.(a.value)) attrs[name] = a.value.trim()
    else dropped.add(a.name)
  }
  return attrs
}

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function serialize(viewBox: CleanSymbol['viewBox'], children: SvgChild[]): string {
  const attrs = (a: Record<string, string>) => Object.entries(a).map(([k, v]) => ` ${k}="${escape(v)}"`).join('')
  const body = (nodes: SvgChild[]): string =>
    nodes.map((n) => (typeof n === 'string' ? escape(n) : `<${n.tag}${attrs(n.attrs)}>${body(n.children)}</${n.tag}>`)).join('')
  return `<svg xmlns="${SVG_NS}" viewBox="${viewBox.join(' ')}">${body(children)}</svg>`
}
