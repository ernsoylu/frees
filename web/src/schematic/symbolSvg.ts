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
