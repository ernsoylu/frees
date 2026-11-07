import { expect, it } from 'vitest'
import { bindingOf, boundAttrs, sanitizeSvg, type CleanSymbol } from './symbolSvg'

const clean = (markup: string) => {
  const r = sanitizeSvg(markup)
  if ('error' in r) throw new Error(r.error)
  return r
}
const svg = (body: string, attrs = 'viewBox="0 0 10 10"') => `<svg xmlns="http://www.w3.org/2000/svg" ${attrs}>${body}</svg>`

it('keeps shapes and presentation attributes, re-serialised', () => {
  const r = clean(svg('<g transform="translate(1 1)"><path d="M0 0 L5 5" stroke="currentColor" stroke-width="0.5" fill="none"/><circle cx="5" cy="5" r="2" fill="#0a0"/></g>'))
  expect(r.viewBox).toEqual([0, 0, 10, 10])
  expect(r.dropped).toEqual([])
  expect(r.svg).toBe('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><g transform="translate(1 1)"><path d="M0 0 L5 5" stroke="currentColor" stroke-width="0.5" fill="none"></path><circle cx="5" cy="5" r="2" fill="#0a0"></circle></g></svg>')
  // Sanitising the stored form again changes nothing.
  expect(clean(r.svg).svg).toBe(r.svg)
})

it.each([
  ['a script element', '<script>alert(1)</script><rect width="1" height="1"/>', '<script>'],
  ['an event handler', '<rect width="1" height="1" onload="alert(1)" onclick="x()"/>', 'onclick'],
  ['foreignObject HTML', '<foreignObject><div xmlns="http://www.w3.org/1999/xhtml">x</div></foreignObject><rect width="1" height="1"/>', '<foreignObject>'],
  ['an external image', '<image href="https://evil.example/x.png"/><rect width="1" height="1"/>', '<image>'],
  ['a use reference', '<use href="https://evil.example/s.svg#a"/><rect width="1" height="1"/>', '<use>'],
  ['an xlink:href', '<a xlink:href="javascript:alert(1)" xmlns:xlink="http://www.w3.org/1999/xlink"><rect width="1" height="1"/></a><rect width="1" height="1"/>', '<a>'],
  ['a style element', '<style>@import url(https://evil.example/c.css)</style><rect width="1" height="1"/>', '<style>'],
  ['a style attribute', '<rect width="1" height="1" style="fill:url(https://evil.example/p)"/>', 'style'],
  ['url() paint', '<rect width="1" height="1" fill="url(https://evil.example/#g)"/>', 'fill'],
  ['an animation setting href', '<set attributeName="href" to="javascript:alert(1)"/><rect width="1" height="1"/>', '<set>'],
  ['a filter', '<filter id="f"><feImage href="https://evil.example"/></filter><rect width="1" height="1"/>', '<filter>'],
  ['a namespaced attribute', '<rect width="1" height="1" xml:base="https://evil.example/"/>', 'xml:base'],
])('drops %s and names it', (_, body, name) => {
  const r = clean(svg(body))
  expect(r.dropped).toContain(name)
  expect(r.svg).not.toMatch(/script|on\w+=|foreignObject|href|style|url\(|evil|<set|<filter|xml:base/i)
})

it('refuses what it will not parse', () => {
  const refused = (m: unknown) => (sanitizeSvg(m) as { error?: string }).error
  expect(refused('<!DOCTYPE svg [<!ENTITY a "aaaa">]><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><text>&a;</text></svg>')).toMatch(/DOCTYPE/)
  expect(refused('<?xml-stylesheet href="https://evil.example/s.css"?>' + svg('<rect width="1" height="1"/>'))).toMatch(/stylesheet/)
  expect(refused('<html><body>hi</body></html>')).toMatch(/well-formed SVG/)
  expect(refused('<svg xmlns="http://www.w3.org/2000/svg"><rect')).toMatch(/well-formed SVG/)
  expect(refused(svg('<rect width="1" height="1"/>', ''))).toMatch(/viewBox/)
  expect(refused(svg('<script>x</script>'))).toMatch(/Nothing drawable/)
  expect(refused(svg('<rect width="1" height="1"/>'.repeat(2001)))).toMatch(/2000 elements/)
  expect(refused('x'.repeat(100_001))).toMatch(/100 k/)
  expect(refused(42)).toMatch(/empty/)
})

it('takes the size from width and height, and keeps drawn text escaped', () => {
  const r = clean(svg('<text x="1" y="5">P &lt;1&gt;</text>', 'width="24px" height="12"')) as CleanSymbol
  expect(r.viewBox).toEqual([0, 0, 24, 12])
  expect(r.children).toEqual([{ tag: 'text', attrs: { x: '1', y: '5' }, children: ['P <1>'] }])
  expect(r.svg).toContain('P &lt;1&gt;')
})

it('H5: keeps a well-formed binding, drops a malformed one by name, and binds only from a value', () => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
    <rect width="20" height="20" data-bind="level" data-bind-attr="scale-y" data-bind-range="0 1 0 1" data-bind-about="10 20"/>
    <line x1="10" y1="10" x2="18" y2="10" transform="translate(1 0)" data-bind="shaft.phi" data-bind-attr="rotate" data-bind-range="0 6.283185307179586 0 360"/>
    <circle r="2" data-bind="x" data-bind-attr="href" data-bind-range="0 0 0 1" data-bind-about="javascript:1"/>
  </svg>`
  const clean = sanitizeSvg(svg) as CleanSymbol
  const [tank, shaft, bad] = clean.children.filter((c) => typeof c !== 'string')
  expect(clean.dropped).toEqual(['data-bind-about', 'data-bind-attr', 'data-bind-range'])
  expect(bindingOf(bad.attrs)).toBeNull()
  // Re-sanitising the stored markup keeps the bindings.
  expect((sanitizeSvg(clean.svg) as CleanSymbol).svg).toBe(clean.svg)

  const level = bindingOf(tank.attrs)!
  expect(level).toEqual({ member: 'level', attr: 'scale-y', range: [0, 1, 0, 1], about: [10, 20] })
  expect(boundAttrs(tank.attrs, level, 0.25, clean.viewBox).transform).toBe('translate(10 20) scale(1 0.25) translate(-10 -20)')
  // Clamped to the declared range.
  expect(boundAttrs(tank.attrs, level, 3, clean.viewBox)['data-bound']).toBe('1')
  // No value: drawn as authored, marked missing.
  expect(boundAttrs(tank.attrs, level, undefined, clean.viewBox)).toEqual({ ...tank.attrs, 'data-bound': 'missing' })
  expect(boundAttrs(tank.attrs, level, NaN, clean.viewBox)['data-bound']).toBe('missing')

  // Rotation about the viewBox centre by default, in front of the part's own transform.
  const phi = bindingOf(shaft.attrs)!
  expect(boundAttrs(shaft.attrs, phi, Math.PI, clean.viewBox).transform).toBe('rotate(180 10 10) translate(1 0)')
})
