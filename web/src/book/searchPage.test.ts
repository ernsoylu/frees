// The Book's search page as build-book.mjs writes it: the index as JSON, the
// script run on load. jsdom stands in for the browser.
import { beforeAll, describe, expect, it } from 'vitest'

const INDEX = [
  { title: 'RC charging', path: 'gallery/rc.html', kind: 'lesson', blurb: 'τ = RC', keywords: '', text: '', concepts: ['time constant'], domains: ['Electrical'], prerequisites: ['Ohm’s law'] },
  { title: 'A ringing RLC circuit', path: 'gallery/rlc.html', kind: 'lesson', blurb: '<b>ζ</b>', keywords: '', text: '', concepts: ['overshoot'], domains: ['Electrical'], prerequisites: ['RC charging'] },
  { title: 'A mass on a spring and damper', path: 'gallery/msd.html', kind: 'lesson', blurb: '', keywords: '', text: '', concepts: ['overshoot'], domains: ['Mechanical'], prerequisites: [] },
  { title: 'MaxValue', path: 'reference/maxvalue.html', kind: 'reference', blurb: 'Peak value; overshoot sizing', keywords: '', text: '' },
]

beforeAll(async () => {
  document.body.innerHTML = `<div id="book-search" data-up="../"><input type="search">
    <select name="concepts"><option value="">Any</option></select>
    <select name="domains"><option value="">Any</option></select>
    <select name="prerequisites"><option value="">Any</option></select>
    <p aria-live="polite"></p><ol></ol></div>
    <script id="search-index" type="application/json">${JSON.stringify(INDEX)}</script>`
  await import('./search.js')
})

const titles = () => [...document.querySelectorAll('ol a')].map((a) => a.textContent)
const choose = (name: string, value: string) => {
  const select = document.querySelector<HTMLSelectElement>(`select[name="${name}"]`)!
  select.value = value
  select.dispatchEvent(new Event('change'))
}

describe('Book search page (I5)', () => {
  it('opens on the lessons, with the filters drawn from them', () => {
    expect(titles()).toEqual(['RC charging', 'A ringing RLC circuit', 'A mass on a spring and damper'])
    expect([...document.querySelectorAll('select[name="domains"] option')].map((o) => o.textContent)).toEqual(['Any', 'Electrical', 'Mechanical'])
    expect([...document.querySelectorAll('select[name="prerequisites"] option')].map((o) => o.textContent)).toEqual(['Any', 'Ohm’s law', 'RC charging'])
  })

  it('searches every kind of page, then narrows by concept and domain', () => {
    const input = document.querySelector('input')!
    input.value = 'overshoot'
    input.dispatchEvent(new Event('input'))
    expect(titles()).toEqual(['A mass on a spring and damper', 'A ringing RLC circuit', 'MaxValue'])
    choose('domains', 'Mechanical')
    expect(titles()).toEqual(['A mass on a spring and damper'])
    expect(document.querySelector('[aria-live]')!.textContent).toBe('1 result')
    choose('domains', '')
  })

  it('links relative to the page and shows blurbs as text, never markup', () => {
    choose('prerequisites', 'RC charging')
    const hit = document.querySelector('ol li')!
    expect(hit.querySelector('a')!.getAttribute('href')).toBe('../gallery/rlc.html')
    expect(hit.querySelector('b')).toBeNull()
    expect(hit.textContent).toContain('<b>ζ</b>')
  })
})
