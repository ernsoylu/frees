// Phase I5: search across the static frees Book, with concept, domain and
// prerequisite filters drawn from the lessons. Plain JavaScript so the Book
// works from a web server or straight from disk (file://): the index sits in
// the page as JSON, build-book.mjs inlines this file as a classic script (its
// one `export` removed), and results are built with DOM methods (text, never
// markup).

/**
 * @typedef {{ title: string, path: string, kind: string, blurb: string, keywords: string,
 *   text: string, concepts?: string[], domains?: string[], prerequisites?: string[] }} Entry
 * @typedef {{ concepts?: string, domains?: string, prerequisites?: string }} Filters
 */

/**
 * Every entry holding all query terms and every chosen filter value, title
 * matches first. With no terms and no filters, the lessons — a place to start.
 * @param {Entry[]} entries @param {string} query @param {Filters} filters @returns {Entry[]}
 */
export function matchEntries(entries, query, filters) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  const chosen = Object.entries(filters).filter(([, v]) => v)
  if (!terms.length && !chosen.length) return entries.filter((e) => e.kind === 'lesson')
  return entries
    .filter((e) => chosen.every(([k, v]) => (e[k] ?? []).includes(v)))
    .map((e) => {
      const title = e.title.toLowerCase()
      const tags = FACETS.flatMap((f) => e[f] ?? []).join(' ')
      const hay = `${title} ${e.blurb} ${e.keywords} ${tags} ${e.text}`.toLowerCase()
      return terms.every((t) => hay.includes(t)) ? { e, score: terms.filter((t) => title.includes(t)).length * 10 + (e.kind === 'lesson' ? 1 : 0) } : null
    })
    .filter((r) => r !== null)
    .sort((a, b) => b.score - a.score || a.e.title.localeCompare(b.e.title))
    .map((r) => r.e)
}

const FACETS = /** @type {const} */ (['concepts', 'domains', 'prerequisites'])

function install(root) {
  const entries = JSON.parse(document.getElementById('search-index').textContent)
  const up = root.dataset.up ?? ''
  const input = root.querySelector('input')
  const selects = Object.fromEntries(FACETS.map((f) => [f, root.querySelector(`select[name="${f}"]`)]))
  for (const f of FACETS) {
    const values = [...new Set(entries.flatMap((e) => e[f] ?? []))].sort((a, b) => a.localeCompare(b))
    for (const v of values) selects[f].append(new Option(v, v))
  }
  const list = root.querySelector('ol')
  const count = root.querySelector('[aria-live]')
  const run = () => {
    const filters = Object.fromEntries(FACETS.map((f) => [f, selects[f].value]))
    const hits = matchEntries(entries, input.value, filters)
    list.replaceChildren(...hits.slice(0, 100).map((e) => {
      const li = document.createElement('li')
      const a = document.createElement('a')
      a.href = up + e.path
      a.textContent = e.title
      const kind = document.createElement('span')
      kind.className = 'kind'
      kind.textContent = e.kind
      li.append(a, ' ', kind)
      if (e.blurb) li.append(document.createElement('br'), e.blurb)
      return li
    }))
    count.textContent = `${hits.length} result${hits.length === 1 ? '' : 's'}${hits.length > 100 ? ' (first 100 shown)' : ''}`
  }
  input.addEventListener('input', run)
  for (const f of FACETS) selects[f].addEventListener('change', run)
  const q = new URLSearchParams(location.search).get('q')
  if (q) input.value = q
  run()
}

if (typeof document !== 'undefined') {
  const root = document.getElementById('book-search')
  if (root) install(root)
}
