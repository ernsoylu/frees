// Builds the static frees Book (D14) into dist-book/: the Help's guides and
// reference pages rendered by the app's own React renderers, plus a gallery
// of graded models solved at build time. Exits non-zero on a broken link,
// a gallery model without CHECKs, or a CHECK that fails.
//
//   npm run build-book            FREES_APP_URL overrides the "Open in frees" target.
import { build } from 'vite'
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, posix } from 'node:path'

const WEB = process.cwd()
const OUT = join(WEB, 'dist-book')
const BUNDLE = join(WEB, 'node_modules/.book-build')
const APP_URL = process.env.FREES_APP_URL ?? 'https://frees.softncon.com/'
const PER_CATEGORY = 3

const t0 = performance.now()
await build({
  logLevel: 'error',
  build: { ssr: 'src/book/entry.tsx', outDir: BUNDLE, emptyOutDir: true, ssrEmitAssets: true, minify: false },
  ssr: { noExternal: [/@mantine/, /@tabler/, /katex/, /lz-string/] },
})
const book = await import(join(BUNDLE, 'entry.js'))
book.setAppUrl(APP_URL)
const wasm = await import(join(WEB, 'src/wasm/pkg/frees.js'))
wasm.initSync({ module: readFileSync(join(WEB, 'src/wasm/pkg/frees_bg.wasm')) })
(await import('./packed-fluids.mjs')).installPackedFluids(wasm)

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const fileOf = (s) => s.toLowerCase().replace(/[^a-z0-9_.-]+/g, '_')

// ---- Pages and the id -> path map --------------------------------------
const guideCats = book.ALL_CATEGORIES.filter((c) => !c.title.startsWith('Reference · '))
const refCats = book.ALL_CATEGORIES.filter((c) => c.title.startsWith('Reference · '))
const refPath = new Map()
for (const p of book.REFERENCE_PAGES) {
  let f = `reference/${fileOf(p.slug)}.html`
  for (let k = 2; [...refPath.values()].includes(f); k++) f = `reference/${fileOf(p.slug)}-${k}.html`
  refPath.set(p.slug, f)
}

// Gallery: graded models that solve without extra requests, at most
// PER_CATEGORY per category, transient (plottable) models first.
const graded = book.EXAMPLES.filter((e) => /\{\s*CHECK\s/.test(e.text))
const byCat = new Map()
for (const e of [...graded].sort((a, b) => Number(/^\s*DYNAMIC\b/m.test(b.text)) - Number(/^\s*DYNAMIC\b/m.test(a.text)))) {
  if (!byCat.has(e.category)) byCat.set(e.category, [])
  byCat.get(e.category).push(e)
}
const failures = []
const gallery = []
for (const [, list] of [...byCat].sort((a, b) => a[0].localeCompare(b[0]))) {
  let taken = 0
  for (const e of list) {
    if (taken === PER_CATEGORY) break
    const r = JSON.parse(wasm.solve(e.text, '{}'))
    if (!r.success) continue
    gallery.push({ ex: e, result: r })
    taken++
  }
}
const galleryIds = new Set(gallery.map((g) => g.ex.id))

const broken = new Set()
function pathOf(id) {
  if (id === 'home') return 'index.html'
  if (id === 'examples') return 'gallery/index.html'
  if (id === 'ref-index') return 'reference/index.html'
  if (id === 'ref-units' || id === 'ref-fluids') return null // live in the app
  if (Object.hasOwn(book.DOCS_CATALOG, id)) return `guide/${fileOf(id)}.html`
  if (id.startsWith('refpage:') && refPath.has(id.slice(8))) return refPath.get(id.slice(8))
  if (id.startsWith('refcat:')) return `reference/index.html#${fileOf(id.slice(7))}`
  if (id.startsWith('example:')) {
    const ex = id.slice(8)
    if (galleryIds.has(ex)) return `gallery/${fileOf(ex)}.html`
    if (book.EXAMPLES.some((e) => e.id === ex)) return null
  }
  broken.add(id)
  return 'missing.html'
}
const hrefFrom = (depth) => (id) => {
  const p = pathOf(id)
  if (p) return '../'.repeat(depth) + p
  if (id.startsWith('example:')) {
    const e = book.EXAMPLES.find((x) => x.id === id.slice(8))
    return book.buildShareUrl(e.text, APP_URL) ?? APP_URL
  }
  return `${APP_URL}help#${id}`
}

// ---- Shell and table of contents ----------------------------------------
function toc(depth, current) {
  const up = '../'.repeat(depth)
  const a = (path, label) => `<a href="${up}${path}"${path === current ? ' aria-current="page"' : ''}>${esc(label)}</a>`
  let html = `<a class="brand" href="${up}index.html">frees Book</a>`
  for (const c of guideCats) {
    const items = c.items.filter((it) => pathOf(it.id))
    if (!items.length) continue
    html += `<h2>${esc(c.title)}</h2>` + items.map((it) => a(pathOf(it.id), it.label)).join('')
  }
  html += `<h2>Gallery</h2>${a('gallery/index.html', `Verified models (${gallery.length})`)}`
  html += `<h2>Reference</h2>${a('reference/index.html', `All ${book.REFERENCE_PAGES.length} pages`)}`
  html += refCats.map((c) => a(`reference/index.html#${fileOf(c.title.slice(12))}`, c.title.slice(12))).join('')
  return html
}
const pages = []
function page(path, title, body) {
  const depth = path.split('/').length - 1
  const up = '../'.repeat(depth)
  pages.push(path)
  const html = `<!doctype html>
<html lang="en" data-mantine-color-scheme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · frees Book</title>
<link rel="stylesheet" href="${up}assets/book.css">
<script>try{if(matchMedia('(prefers-color-scheme: dark)').matches)document.documentElement.dataset.mantineColorScheme='dark'}catch(e){}</script>
</head>
<body>
<div class="book"><nav class="toc" aria-label="Contents">${toc(depth, path)}</nav>
<main class="content">${body}</main></div>
</body>
</html>
`
  mkdirSync(dirname(join(OUT, path)), { recursive: true })
  writeFileSync(join(OUT, path), html)
}

rmSync(OUT, { recursive: true, force: true })

// Home: guide chapters with their blurbs.
page('index.html', 'Home', `<h1>frees Book</h1>
<p>The frees documentation as a static book, generated from the in-app Help. Every model opens in the browser app with <em>Open in frees</em>.</p>
${guideCats.map((c) => {
  const items = c.items.filter((it) => pathOf(it.id))
  return items.length ? `<h2>${esc(c.title)}</h2><ul>${items.map((it) => `<li><a href="${pathOf(it.id)}">${esc(it.label)}</a>${it.blurb ? ` — ${esc(it.blurb)}` : ''}</li>`).join('')}</ul>` : ''
}).join('')}
<h2>Gallery and reference</h2><ul><li><a href="gallery/index.html">${gallery.length} verified models</a></li><li><a href="reference/index.html">${book.REFERENCE_PAGES.length} reference pages</a></li></ul>`)

for (const c of guideCats) for (const it of c.items) {
  if (!Object.hasOwn(book.DOCS_CATALOG, it.id)) continue
  const path = pathOf(it.id)
  page(path, it.label, book.renderGuide(it.id, hrefFrom(1)))
}

page('reference/index.html', 'Reference', `<h1>Reference</h1>${refCats.map((c) => {
  const name = c.title.slice(12)
  return `<h2 id="${fileOf(name)}">${esc(name)}</h2><ul class="cols">${c.items.map((it) => `<li><a href="../${pathOf(it.id)}"><code>${esc(it.label)}</code></a></li>`).join('')}</ul>`
}).join('')}`)
for (const p of book.REFERENCE_PAGES) page(refPath.get(p.slug), p.name, book.renderReference(p.slug, hrefFrom(1)))

// ---- Gallery ------------------------------------------------------------
function niceTicks(lo, hi, n = 5) {
  if (!(hi > lo)) { hi = lo + 1; lo -= 1 }
  const raw = (hi - lo) / n, mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw)
  const ticks = []
  for (let v = Math.floor(lo / step) * step; v < hi + step * 0.999; v += step) ticks.push(+v.toPrecision(12))
  return ticks
}
const label = (v) => v.replaceAll('$', '.')
function plotSvg(table) {
  const t = table.rows.map((r) => r[0])
  const unit = table.units[1]
  const cols = table.vars.map((_, i) => i).filter((i) => i > 0 && table.units[i] === unit).slice(0, 3)
  const ys = cols.flatMap((i) => table.rows.map((r) => r[i])).filter(Number.isFinite)
  if (!ys.length) return ''
  const W = 640, H = 300, L = 64, R = 16, T = 16, B = 40
  const xt = niceTicks(Math.min(...t), Math.max(...t)), yt = niceTicks(Math.min(...ys), Math.max(...ys))
  const [x0, x1, y0, y1] = [xt[0], xt.at(-1), yt[0], yt.at(-1)]
  const X = (v) => L + ((v - x0) / (x1 - x0 || 1)) * (W - L - R), Y = (v) => H - B - ((v - y0) / (y1 - y0 || 1)) * (H - T - B)
  const colors = ['#12b886', '#fd7e14', '#4c6ef5']
  const lines = cols.map((c, k) => `<polyline fill="none" stroke="${colors[k]}" stroke-width="2" points="${table.rows.filter((r) => Number.isFinite(r[c])).map((r) => `${X(r[0]).toFixed(1)},${Y(r[c]).toFixed(1)}`).join(' ')}"/>`)
  const fmt = (v) => +v.toPrecision(4)
  return `<figure class="plot"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(cols.map((c) => label(table.vars[c])).join(', '))} against ${esc(table.vars[0])}">
${xt.map((v) => `<line x1="${X(v)}" x2="${X(v)}" y1="${T}" y2="${H - B}" class="grid"/><text x="${X(v)}" y="${H - B + 16}" text-anchor="middle">${fmt(v)}</text>`).join('')}
${yt.map((v) => `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" class="grid"/><text x="${L - 6}" y="${Y(v) + 4}" text-anchor="end">${fmt(v)}</text>`).join('')}
<text x="${(L + W - R) / 2}" y="${H - 6}" text-anchor="middle">${esc(table.vars[0])} [${esc(table.units[0] || (/^time$/i.test(table.vars[0]) ? 's' : '-'))}]</text>
${lines.join('')}</svg>
<figcaption>${cols.map((c, k) => `<span style="color:${colors[k]}">■</span> ${esc(label(table.vars[c]))}`).join(' &nbsp; ')} [${esc(unit || '-')}] — ${esc(table.name)}, ${esc(table.method)}</figcaption></figure>`
}

let plots = 0, tooLong = 0
for (const { ex, result } of gallery) {
  const vars = new Map(result.variables.map((v) => [v.name.toLowerCase(), v]))
  const checks = [...ex.text.matchAll(/\{\s*CHECK\s+(\S+)\s+(\S+)\s+(\S+)\s*\}/g)].map(([, name, want, tol]) => {
    const v = vars.get(name.toLowerCase())
    const ok = v !== undefined && Math.abs(v.value - Number(want)) <= Number(tol)
    if (!ok) failures.push(`${ex.id}: CHECK ${name} expected ${want} ± ${tol}, got ${v?.value}`)
    return { name, want, tol, v, ok }
  })
  const problem = /^\s*\{([\s\S]*?)\}/.exec(ex.text)?.[1].trim() ?? ''
  const share = book.buildShareUrl(ex.text, APP_URL)
  if (!share) tooLong++
  const table = (result.odeTables ?? []).find((o) => o.rows?.length > 1)
  const plot = table ? plotSvg(table) : ''
  if (plot) plots++
  page(`gallery/${fileOf(ex.id)}.html`, ex.title, `<p class="crumb"><a href="index.html">Gallery</a> · ${esc(ex.category)}</p>
<h1>${esc(ex.title)}</h1>
<p class="lede">${esc(ex.description)}</p>
<p><a class="open" href="${esc(share ?? APP_URL)}">Open in frees</a></p>
${problem ? `<h2>Problem</h2><pre class="problem">${esc(problem)}</pre>` : ''}
<h2>Results</h2>
<table class="results"><thead><tr><th>Variable</th><th>Value</th><th>Units</th><th>Checked against</th></tr></thead><tbody>
${checks.map((c) => `<tr><td><code>${esc(c.name)}</code></td><td>${c.v ? esc(+c.v.value.toPrecision(6)) : '—'}</td><td>${esc(c.v?.units ?? '')}</td><td>${esc(c.want)} ± ${esc(c.tol)} ${c.ok ? '✓' : '✗'}</td></tr>`).join('')}
</tbody></table>
${plot ? `<h2>Plot</h2>${plot}` : ''}
<h2>Model</h2><pre class="model">${esc(ex.text)}</pre>`)
}
page('gallery/index.html', 'Gallery', `<h1>Gallery</h1>
<p>${gallery.length} graded models, solved when this book was built; every CHECK in them passed. Each opens in the app.</p>
${[...new Set(gallery.map((g) => g.ex.category))].map((cat) => `<h2>${esc(cat)}</h2><ul>${gallery.filter((g) => g.ex.category === cat).map((g) => `<li><a href="${fileOf(g.ex.id)}.html">${esc(g.ex.title)}</a> — ${esc(g.ex.description)}</li>`).join('')}</ul>`).join('')}`)

// ---- Assets -------------------------------------------------------------
mkdirSync(join(OUT, 'assets'), { recursive: true })
const emitted = join(BUNDLE, 'assets')
let css = ''
for (const f of readdirSync(emitted)) {
  if (f.endsWith('.css')) css += readFileSync(join(emitted, f), 'utf8') + '\n'
  else cpSync(join(emitted, f), join(OUT, 'assets', f))
}
css = css.replaceAll('/assets/', '') // emitted fonts sit beside the stylesheet
writeFileSync(join(OUT, 'assets/book.css'), `${book.themeVariables()}\n${css}\n${readFileSync(join(WEB, 'src/book/layout.css'), 'utf8')}`)

// ---- Gates: every relative link resolves --------------------------------
for (const path of pages) {
  const html = readFileSync(join(OUT, path), 'utf8')
  for (const [, href] of html.matchAll(/href="([^"#]*)(#[^"]*)?"/g)) {
    if (!href || /^[a-z]+:/i.test(href)) continue
    if (!existsSync(join(OUT, posix.join(posix.dirname(path), href)))) failures.push(`${path}: broken link ${href}`)
  }
}
for (const id of broken) failures.push(`unknown Help id: ${id}`)
if (gallery.length < 30) failures.push(`gallery has ${gallery.length} models; the book needs at least 30`)

console.log(`book: ${pages.length} pages (${Object.keys(book.DOCS_CATALOG).length} guide topics, ${book.REFERENCE_PAGES.length} reference, ${gallery.length} gallery with ${plots} plots${tooLong ? `, ${tooLong} too long for a share link` : ''}) in ${((performance.now() - t0) / 1000).toFixed(1)} s → dist-book/`)
if (failures.length) {
  console.error(`book: ${failures.length} failure(s)\n  ` + [...new Set(failures)].slice(0, 40).join('\n  '))
  process.exit(1)
}
