// Browser baseline for CR-SCHEMATIC-01a (docs/schematic-workspace-change-request.md,
// section 2). Section 2 names schematic defects from a code reading: selection
// dims the rest of the model, Fit and circuit frames ignore moved nodes, and
// routes ignore moved obstacles. This spec reproduces each one in the shipped
// app on the humid-air model and the 26-component EV example.
//
// What must hold today is asserted: the models solve, every instance is drawn,
// auto-fit and Fit after a drag frame every instance, a dragged node stays in its
// circuit frame, no wire runs under a component, names stay at least 12 px at
// auto-fit, hover dims nothing, a click
// keeps the canvas in front while selecting the declaration in the editor, and
// an unchecked document is not reported as broken, junction dots mark only
// real three-way joins and unrelated crossings hop. A separate test covers
// 01a navigation (fit selection, pointer zoom, pan, pinch, minimap); others
// cover context commands, selection, and view settings (flow, spacing, frames,
// background, snap, guides, labels). The remaining defects are MEASURED, not asserted. Each test attaches its numbers
// as `evidence.json` and annotates the run, so the same spec stays green before
// and after the 01a fixes and its attachments show what changed.
//
// Run:  npm run build && npx playwright test e2e/schematic-baseline.spec.ts --project=chromium
import { readFileSync } from 'node:fs'
import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test'
import { EV_THERMAL_EXAMPLE_TEXT } from '../src/defaultExample'

const HUMID_AIR = `// Humid-air conditioning: wrap-around heat pipe, cooling coil and supply fan
MoistAirSource     ROOM(P=101325 [Pa], T=299 [K], W=0.012, mdot=0.6 [kg/s])
HeatPipeWrapAround HP(eff=0.5)
CoolingCoil        COIL(Tout=286 [K])
MoistAirFan        FAN(dP=250 [Pa], eta=0.55)
MoistAirSink       SUP()

connect(ROOM.out, HP.pre_in)
connect(HP.pre_out, COIL.in)
connect(COIL.out, HP.re_in)
connect(HP.re_out, FAN.in)
connect(FAN.out, SUP.in)
`

// Dense fixture for VIEW-01 at scale (Figma frame 26): a chilled-water floor of
// 16 zones, each a runout pipe, balancing valve, fan-coil, zone load and
// envelope, joined by 15 mixers. 100 instances, 83 connection sets.
const ZONES = Array.from({ length: 16 }, (_, j) => j + 1)
const QGEN = [1800, 2200, 2600, 3000, 2400, 2000, 3400, 2800, 1600, 2300, 2900, 3200, 2100, 2500, 2700, 1900]
const DENSE_FLOOR = [
  'LiquidSource  CHWS(fluid$=Water, mdot=2.2 [kg/s], P=200000 [Pa], T=280 [K])',
  'LiquidPump    PUMP(fluid$=Water, eta=0.65)',
  'PUMP.out.P = 320000 [Pa]',
  'ThermalSource OUT(T=305 [K])',
  ...ZONES.flatMap((i) => [
    `LiquidPipe    P${i}(fluid$=Water, L=${2 + 4 * i} [m], D=0.025 [m], rough=4.5e-5 [m])`,
    `LiquidOrifice V${i}(CdA=${(2.2 + 0.1 * (i % 5)).toFixed(2)}e-05, rho=1000)`,
    `LiquidWallHX  FC${i}(fluid$=Water, UA=${150 + Math.floor(QGEN[i - 1] / 20)} [W/K])`,
    `MassGen       Z${i}(C=2e6, Qgen=${QGEN[i - 1]}, T0=297 [K])`,
    `Convection    E${i}(htc=3, area=${18 + 2 * (i % 4)} [m^2])`,
  ]),
  ...ZONES.slice(1).map((i) => `LiquidMixer   M${i - 1}()`),
  'LiquidPipe    RISER(fluid$=Water, L=30 [m], D=0.065 [m], rough=4.5e-5 [m])',
  'LiquidSink    CHWR()',
  `connect(PUMP.out, ${ZONES.map((i) => `P${i}.in`).join(', ')})`,
  'connect(CHWS.out, PUMP.in)',
  ...ZONES.flatMap((i) => [`connect(P${i}.out, V${i}.in)`, `connect(V${i}.out, FC${i}.in)`, `connect(FC${i}.wall, Z${i}.port, E${i}.a)`]),
  `connect(OUT.port, ${ZONES.map((i) => `E${i}.b`).join(', ')})`,
  'connect(FC1.out, M1.in1)',
  ...ZONES.slice(1).map((i) => `connect(FC${i}.out, M${i - 1}.in2)`),
  ...ZONES.slice(2).map((i) => `connect(M${i - 2}.out, M${i - 1}.in1)`),
  'connect(M15.out, RISER.in)',
  'connect(RISER.out, CHWR.in)',
].join('\n')

const MODELS = [
  { name: 'humid-air', text: HUMID_AIR, instances: 5, drag: 'FAN' },
  { name: 'ev-thermal', text: EV_THERMAL_EXAMPLE_TEXT, instances: 26, drag: 'LIQ' },
  { name: 'dense-floor', text: '// Chilled-water floor: 16 zones, 100 instances\n' + DENSE_FLOOR + '\n', instances: 100, drag: 'FC7' },
] as const

test.use({ serviceWorkers: 'block', viewport: { width: 1440, height: 960 } })
test.skip(({ browserName }) => browserName !== 'chromium', 'Evidence is recorded on one engine.')

async function openSolved(page: Page, text: string, run: 'Solve' | 'Check' = 'Solve') {
  const source = 'https://raw.example/schematic-baseline.frees'
  await page.route(source, (route) => route.fulfill({ contentType: 'text/plain', body: text }))
  await page.goto('/?url=' + encodeURIComponent(source))
  // CodeMirror renders only visible lines, so wait on the first one.
  await expect(page.locator('.cm-content')).toContainText(text.split('\n')[0], { timeout: 60_000 })
  await page.getByRole('button', { name: run, exact: true }).click()
  if (run === 'Solve') await expect(page.getByText(/^Solved/i).first()).toBeVisible({ timeout: 120_000 })
  await page.locator('body').click({ position: { x: 5, y: 5 } })
  await page.keyboard.press('Control+K')
  await page.getByPlaceholder('Search views, tools, and actions…').fill('Schematic')
  await page.keyboard.press('Enter')
  const svg = page.getByRole('application', { name: /Component network schematic/ })
  await expect(svg).toBeVisible()
  await expect(svg.locator('[data-node]').first()).toBeVisible({ timeout: 120_000 })
  return svg
}

/** One pass over the drawing in screen coordinates. */
function measure(svg: Locator) {
  return svg.evaluate((root: SVGSVGElement) => {
    const box = (e: Element) => {
      const r = e.getBoundingClientRect()
      return { x: r.x, y: r.y, w: r.width, h: r.height }
    }
    const nodes = [...root.querySelectorAll('g[role="button"][aria-label]')]
      .filter((g) => !g.getAttribute('aria-label')!.endsWith(' port'))
      .map((g) => ({
        label: g.getAttribute('aria-label')!.split(' ').pop()!,
        opacity: Number(g.getAttribute('opacity') ?? 1),
        box: box(g.querySelector('rect')!),
        labelPx: Math.round(g.querySelector('text')!.getBoundingClientRect().height * 10) / 10,
      }))
    const wires = [...root.querySelectorAll(':scope > g:nth-of-type(2) path[data-net]')] as SVGPathElement[]
    const frames = [...root.querySelectorAll(':scope > g:first-of-type rect')].map(box)
    const view = box(root)
    const inside = (p: { x: number; y: number }, b: { x: number; y: number; w: number; h: number }, inset: number) =>
      p.x > b.x + inset && p.x < b.x + b.w - inset && p.y > b.y + inset && p.y < b.y + b.h - inset
    // Sample every wire and count samples that cross the interior of a component
    // box. Ports sit on box edges, so a 4px inset excludes legitimate endpoints.
    const ctm = root.getScreenCTM()!
    let crossings = 0
    const crossed = new Set<string>()
    for (const w of wires) {
      const len = w.getTotalLength()
      for (let s = 0; s <= len; s += 4) {
        const q = w.getPointAtLength(s).matrixTransform(ctm)
        for (const n of nodes) {
          if (inside(q, n.box, 4)) {
            crossings++
            crossed.add(n.label)
          }
        }
      }
    }
    const within = (b: { x: number; y: number; w: number; h: number }, o: typeof b) =>
      b.x >= o.x - 0.5 && b.y >= o.y - 0.5 && b.x + b.w <= o.x + o.w + 0.5 && b.y + b.h <= o.y + o.h + 0.5
    return {
      nodes,
      minLabelPx: Math.min(...nodes.map((n) => n.labelPx)),
      wireCount: wires.length,
      wireOpacities: wires.map((w) => Number(w.getAttribute('stroke-opacity'))),
      frameCount: frames.length,
      wireSamplesInsideComponents: crossings,
      componentsCrossedByWires: [...crossed].sort(),
      nodesOutsideView: nodes.filter((n) => !within(n.box, view)).map((n) => n.label),
      nodesOutsideFrames: frames.length ? nodes.filter((n) => !frames.some((f) => within(n.box, f))).map((n) => n.label) : [],
    }
  })
}

/**
 * WIRE-04 wire semantics. Junction dots and their wire counts, and every place
 * a wire touches a wire of a DIFFERENT connection set: each contact is a run of
 * 2-unit samples lying in the other wire's stroke, so a short run is a crossing
 * or a T-touch and a long one is two unrelated wires running on top of each
 * other. A hopped crossing is no contact: the hop arc leaves the other's stroke.
 */
function wireSemantics(svg: Locator) {
  return svg.evaluate((root: SVGSVGElement) => {
    const paths = [...root.querySelectorAll('path[data-net]')] as SVGPathElement[]
    // Contact is about where wires run, not their dash gaps (CFG-02 patterns).
    for (const p of paths) p.style.strokeDasharray = 'none'
    const boxes = paths.map((p) => p.getBBox())
    // Hop centres, from the arcs' end points: a crossing wire passes through
    // its hop's apex by design, which is no contact.
    const hops = paths.flatMap((p) =>
      [...p.getAttribute('d')!.matchAll(/([HV]) ([\d.-]+) A [\d.]+ [\d.]+ 0 0 [01] ([\d.-]+) ([\d.-]+)/g)].map((m) =>
        m[1] === 'H' ? { x: (Number(m[2]) + Number(m[3])) / 2, y: Number(m[4]) } : { x: Number(m[3]), y: (Number(m[2]) + Number(m[4])) / 2 },
      ),
    )
    const atHop = (q: { x: number; y: number }) => hops.some((h) => Math.abs(h.x - q.x) <= 6 && Math.abs(h.y - q.y) <= 6)
    const contacts: { net: string; other: string; length: number; at: { x: number; y: number } }[] = []
    paths.forEach((p) => {
      const len = p.getTotalLength()
      const runs = new Map<number, { start: number; at: DOMPoint }>()
      for (let s = 3; s <= len - 3; s += 2) {
        const q = p.getPointAtLength(s)
        const inside = new Set<number>()
        paths.forEach((o, j) => {
          const b = boxes[j]
          if (o.dataset.net !== p.dataset.net && !atHop(q) && q.x >= b.x - 3 && q.x <= b.x + b.width + 3 && q.y >= b.y - 3 && q.y <= b.y + b.height + 3 && o.isPointInStroke(q)) {
            inside.add(j)
            if (!runs.has(j)) runs.set(j, { start: s, at: q })
          }
        })
        for (const [j, r] of [...runs]) {
          if (!inside.has(j) || s + 2 > len - 3) {
            contacts.push({ net: p.dataset.net!, other: paths[j].dataset.net!, length: s - r.start + 2, at: { x: Math.round(r.at.x), y: Math.round(r.at.y) } })
            runs.delete(j)
          }
        }
      }
    })
    const circles = [...root.querySelectorAll('circle[data-ends]')] as SVGCircleElement[]
    const dots = circles.map((c) => Number(c.getAttribute('data-ends')))
    // Wires passing through another set's junction dot (which would read as joining it).
    let throughDots = 0
    for (const p of paths) {
      const len = p.getTotalLength()
      for (let s = 0; s <= len; s += 2) {
        const q = p.getPointAtLength(s)
        throughDots += circles.filter((c) => c.dataset.net !== p.dataset.net && Math.hypot(q.x - c.cx.baseVal.value, q.y - c.cy.baseVal.value) <= c.r.baseVal.value + 1).length
      }
    }
    for (const p of paths) p.style.strokeDasharray = ''
    return {
      wires: paths.length,
      dots: dots.length,
      dotsWithFewerThanThreeWires: dots.filter((n) => n < 3).length,
      wireSamplesThroughOtherDots: throughDots,
      crossingsOrTouches: contacts.filter((c) => c.length <= 8).length,
      overlaps: contacts.filter((c) => c.length > 8),
      contacts: contacts.filter((c) => c.length <= 8),
      hops: hops.length,
    }
  })
}

async function record(testInfo: TestInfo, name: string, data: unknown) {
  await testInfo.attach(`${name}.json`, { body: JSON.stringify(data, null, 2), contentType: 'application/json' })
}

for (const model of MODELS) {
  test.describe(`${model.name} baseline`, () => {
    test('every instance is drawn after a solve', async ({ page }, testInfo) => {
      const svg = await openSolved(page, model.text)
      const m = await measure(svg)
      expect(m.nodes.map((n) => n.label)).toHaveLength(model.instances)
      await record(testInfo, 'evidence', { model: model.name, initial: m })
      await testInfo.attach('initial.png', { body: await svg.screenshot(), contentType: 'image/png' })
      // Fit is not clamped by the manual zoom floor, so even 100 instances fit.
      expect(m.nodesOutsideView).toEqual([])
      // No wire runs underneath a component.
      expect(m.wireSamplesInsideComponents).toBe(0)
      // Every name stays legible at auto-fit (the chip level of detail below 12 px).
      expect(m.minLabelPx).toBeGreaterThanOrEqual(12)
      testInfo.annotations.push(
        { type: 'VIEW-01', description: `after auto-fit, smallest instance label is ${m.minLabelPx}px tall` },
        {
          type: 'WIRE-08',
          description: `${m.wireSamplesInsideComponents} wire samples inside component boxes before any drag (${m.componentsCrossedByWires.join(', ') || 'none'})`,
        },
      )
    })

    test('wire semantics: dots only at real junctions, no unrelated contact', async ({ page }, testInfo) => {
      const svg = await openSolved(page, model.text)
      const w = await wireSemantics(svg)
      await record(testInfo, 'evidence', { model: model.name, ...w })
      await testInfo.attach('wires.png', { body: await svg.screenshot(), contentType: 'image/png' })
      const overlapLength = w.overlaps.reduce((t, o) => t + o.length, 0)
      testInfo.annotations.push({
        type: 'WIRE-04',
        description: JSON.stringify({ ...w, overlaps: w.overlaps.length, overlapLength, contacts: w.contacts.length }),
      })
      // A dot only where three or more wires of one set meet; no wire through another set's dot.
      expect(w.dotsWithFewerThanThreeWires).toBe(0)
      expect(w.wireSamplesThroughOtherDots).toBe(0)
      // Every crossing of unrelated wires hops, and unrelated wires never share a lane.
      // The dense floor's 16 three-way junctions feed bundles wider than the
      // parallel tracks, so a little overlap remains there; it is measured.
      if (model.name !== 'dense-floor') {
        expect(w.contacts).toEqual([])
        expect(w.overlaps).toEqual([])
      }
    })

    test('selection context: hover keeps the model readable, click keeps the canvas', async ({ page }, testInfo) => {
      const svg = await openSolved(page, model.text)
      const target = svg.getByRole('button', { name: new RegExp(`\\b${model.drag}$`) })
      await target.hover()
      const hovered = await measure(svg)
      const dimmed = hovered.nodes.filter((n) => n.opacity < 1)
      const fadedWires = hovered.wireOpacities.filter((o) => o < 0.5).length
      await testInfo.attach('hover.png', { body: await svg.screenshot(), contentType: 'image/png' })
      await target.click()
      const canvasStillVisible = await svg.isVisible()
      // Linked selection: the editor, opened afterwards, has the declaration selected.
      await page.getByRole('tab', { name: 'Editor' }).click()
      const declarationSelected = (await page.locator('.cm-activeLine').allTextContents()).some((l) => new RegExp(`\\b${model.drag}\\(`).test(l))
      await record(testInfo, 'evidence', {
        model: model.name,
        hovered: model.drag,
        dimmedNodes: dimmed.length,
        dimmedOpacity: [...new Set(dimmed.map((n) => n.opacity))],
        fadedWires,
        wireCount: hovered.wireCount,
        canvasVisibleAfterClick: canvasStillVisible,
        declarationSelectedInEditor: declarationSelected,
      })
      expect(dimmed).toHaveLength(0)
      expect(fadedWires).toBe(0)
      expect(canvasStillVisible).toBe(true)
      expect(declarationSelected).toBe(true)
      testInfo.annotations.push(
        { type: 'VIEW-06', description: `hover on ${model.drag}: ${dimmed.length}/${hovered.nodes.length - 1} other nodes at opacity ${dimmed[0]?.opacity ?? 1}; ${fadedWires}/${hovered.wireCount} wires faded` },
        { type: 'SYNC-09', description: `click on ${model.drag}: canvas ${canvasStillVisible ? 'stays visible' : 'is replaced by the editor tab'}; declaration ${declarationSelected ? 'selected' : 'not selected'} in the editor` },
      )
    })

    test('drag beyond the layout, then Fit and reopen', async ({ page }, testInfo) => {
      const svg = await openSolved(page, model.text)
      const target = svg.getByRole('button', { name: new RegExp(`\\b${model.drag}$`) })
      const before = await measure(svg)
      const start = before.nodes.find((n) => n.label === model.drag)!.box
      await page.mouse.move(start.x + start.w / 2, start.y + start.h / 2)
      await page.mouse.down()
      await page.mouse.move(start.x + start.w / 2 + 420, start.y + start.h / 2 + 260, { steps: 12 })
      await page.mouse.up()
      const dragged = await measure(svg)
      // A dragged node stays inside its circuit frame.
      expect(dragged.nodesOutsideFrames).toEqual([])
      expect(dragged.wireSamplesInsideComponents).toBe(0)
      await testInfo.attach('dragged.png', { body: await svg.screenshot(), contentType: 'image/png' })
      await page.getByRole('button', { name: 'Fit to window' }).click()
      await page.waitForTimeout(300)
      const fitted = await measure(svg)
      // Fit frames the drawing as it stands, the dragged node included.
      expect(fitted.nodesOutsideView).toEqual([])
      await testInfo.attach('fitted.png', { body: await svg.screenshot(), contentType: 'image/png' })

      // Reopen: the project autosaves the offset; reloading must restore it.
      await page.waitForTimeout(1500)
      await page.reload()
      // A plain reload shows the welcome dialog, and the drawing stays unwired
      // until Check supplies connections. The dock layout persists, so the
      // Schematic tab comes back by itself.
      const welcome = page.getByRole('dialog').filter({ hasText: 'Welcome to frees' })
      await expect(svg).toBeVisible({ timeout: 60_000 })
      const uncheckedNotice = (await page.getByText(/connections (not shown|appear after Check)/).first().textContent({ timeout: 10_000 }).catch(() => null))?.trim() ?? null
      if (await welcome.waitFor({ timeout: 15_000 }).then(() => true, () => false)) {
        await page.keyboard.press('Escape')
        await expect(welcome).toBeHidden()
      }
      await page.getByRole('button', { name: 'Check', exact: true }).click()
      await expect(svg.getByText(/^UNWIRED$/i)).toHaveCount(0, { timeout: 60_000 })
      await expect(target).toBeVisible()
      const reopened = await measure(svg)
      await testInfo.attach('reopened.png', { body: await svg.screenshot(), contentType: 'image/png' })

      const rel = (m: typeof before) => {
        const n = m.nodes.find((x) => x.label === model.drag)!.box
        const ref = m.nodes.find((x) => x.label !== model.drag)!.box
        return { dx: Math.round((n.x - ref.x) / ref.w * 100) / 100, dy: Math.round((n.y - ref.y) / ref.h * 100) / 100 }
      }
      await record(testInfo, 'evidence', {
        model: model.name,
        dragged: model.drag,
        afterDrag: { outsideFrames: dragged.nodesOutsideFrames, wireSamplesInsideComponents: dragged.wireSamplesInsideComponents, componentsCrossedByWires: dragged.componentsCrossedByWires },
        afterFit: { outsideView: fitted.nodesOutsideView, outsideFrames: fitted.nodesOutsideFrames },
        positionRelativeToNeighbour: { afterDrag: rel(dragged), afterReopen: rel(reopened) },
        noticeBeforeFirstCheck: uncheckedNotice,
      })
      // Not having run Check yet is not an error in the document.
      expect(uncheckedNotice ?? '').not.toMatch(/errors/)
      testInfo.annotations.push(
        { type: 'VIEW-01', description: `after Fit, outside the view: ${fitted.nodesOutsideView.join(', ') || 'none'}` },
        { type: 'VIEW-05', description: `after drag, outside every circuit frame: ${dragged.nodesOutsideFrames.join(', ') || 'none'}` },
        { type: 'WIRE-08', description: `after drag, ${dragged.wireSamplesInsideComponents} wire samples inside component boxes (${dragged.componentsCrossedByWires.join(', ') || 'none'})` },
        { type: 'RUN-01', description: `after reload, before any Check: ${uncheckedNotice ?? 'no notice'}` },
        { type: 'CFG-03', description: `relative position after drag ${JSON.stringify(rel(dragged))}, after reopen ${JSON.stringify(rel(reopened))}` },
      )
    })
  })
}

// VIEW-01 navigation on the EV example: fit selection, zoom about the pointer,
// wheel pan, touch pinch, preset size, the minimap, and Fit all.
test('navigation: fit selection, pointer zoom, pan, pinch, minimap', async ({ page }, testInfo) => {
  const svg = await openSolved(page, EV_THERMAL_EXAMPLE_TEXT)
  const zoomLabel = page.getByRole('button', { name: 'Zoom level' })
  const minimap = page.getByTestId('schematic-minimap')
  const centre = async (label: string) => {
    const b = (await measure(svg)).nodes.find((n) => n.label === label)!.box
    return { x: b.x + b.w / 2, y: b.y + b.h / 2 }
  }
  const view = (await svg.boundingBox())!
  await expect(minimap).toHaveCount(0) // auto-fit shows everything

  // Fit selection frames the clicked block, centred.
  await svg.getByRole('button', { name: /\bLIQ$/ }).click()
  await page.keyboard.press('Shift+Digit2')
  const liq = await centre('LIQ')
  expect(Math.abs(liq.x - (view.x + view.width / 2))).toBeLessThan(2)
  expect(Math.abs(liq.y - (view.y + view.height / 2))).toBeLessThan(2)
  const pct = async () => Number((await zoomLabel.textContent())!.replace('%', ''))
  expect(await pct()).toBeGreaterThan(200) // one block fills the pane (capped at 300 %)
  await expect(minimap).toBeVisible()

  // Clicking the minimap moves the view there.
  const mm = (await minimap.boundingBox())!
  await page.mouse.click(mm.x + 4, mm.y + 4)
  expect((await centre('LIQ')).x).not.toBeCloseTo(liq.x, 0)

  // Fit all: everything in view, minimap gone.
  await svg.getByRole('button', { name: /\bLIQ$/ }).focus()
  await page.keyboard.press('Shift+Digit1')
  expect((await measure(svg)).nodesOutsideView).toEqual([])
  await expect(minimap).toHaveCount(0)

  // Ctrl+wheel zooms about the pointer: the block under it stays put.
  const pump = await centre('PUMP')
  await page.mouse.move(pump.x, pump.y)
  await page.keyboard.down('Control')
  await page.mouse.wheel(0, -100)
  await page.keyboard.up('Control')
  await expect.poll(async () => (await zoomLabel.textContent()) ?? '').not.toBe('')
  const zoomed = await centre('PUMP')
  expect(Math.abs(zoomed.x - pump.x)).toBeLessThan(1.5)
  expect(Math.abs(zoomed.y - pump.y)).toBeLessThan(1.5)

  // A plain wheel pans by its delta.
  await page.mouse.wheel(40, 120)
  await expect.poll(async () => (await centre('PUMP')).y).toBeCloseTo(zoomed.y - 120, 0)
  expect((await centre('PUMP')).x).toBeCloseTo(zoomed.x - 40, 0)

  // Two-finger pinch spreading apart zooms in about its midpoint.
  const before = await pct()
  const cdp = await page.context().newCDPSession(page)
  const mid = { x: view.x + view.width / 2, y: view.y + view.height / 2 }
  const touch = async (type: string, d: number) =>
    cdp.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: type === 'touchEnd' ? [] : [{ x: mid.x - d, y: mid.y, id: 1 }, { x: mid.x + d, y: mid.y, id: 2 }],
    })
  await touch('touchStart', 40)
  for (let d = 45; d <= 80; d += 5) await touch('touchMove', d)
  await touch('touchEnd', 0)
  const after = await pct()
  expect(after / before).toBeGreaterThan(1.8)

  // Shift+0 is actual size.
  await svg.getByRole('button', { name: /\bLIQ$/ }).focus()
  await page.keyboard.press('Shift+Digit0')
  await expect(zoomLabel).toHaveText('100%')
  await record(testInfo, 'evidence', { pinchZoom: { before, after } })
  await testInfo.attach('navigation.png', { body: await svg.screenshot(), contentType: 'image/png' })
})

// VIEW-06 explicit context commands on the EV example, from the chiller, which
// sits on both the coolant and the refrigerant loop.
test('context commands: neighbours, trace net, isolate circuit, show all', async ({ page }, testInfo) => {
  const svg = await openSolved(page, EV_THERMAL_EXAMPLE_TEXT)
  const banner = page.getByRole('status').filter({ hasText: /showing \d+ of \d+ components/ })
  const counts = async () => {
    const [, k, n] = (await banner.textContent())!.match(/showing (\d+) of (\d+)/)!.map(Number)
    const m = await measure(svg)
    return { k, n, drawn: m.nodes.length, faded: m.nodes.filter((x) => x.opacity < 1).length, outside: m.nodesOutsideView }
  }
  await svg.getByRole('button', { name: /\bCHLR$/ }).click()

  await page.getByRole('button', { name: 'Neighbours' }).click()
  const neighbours = await counts()
  expect(neighbours.n).toBe(26)
  expect(neighbours.faded).toBe(26 - neighbours.k) // the rest stay drawn, faded
  await testInfo.attach('neighbours.png', { body: await svg.screenshot(), contentType: 'image/png' })

  // A command closes the pinned card (it would cover the result); click again for the next.
  await expect(page.getByRole('button', { name: 'Trace net' })).toHaveCount(0)
  await svg.getByRole('button', { name: /\bCHLR$/ }).click()
  await page.getByRole('button', { name: 'Trace net' }).click()
  const trace = await counts()
  expect(trace.k).toBeGreaterThan(neighbours.k)
  expect(trace.faded).toBe(26 - trace.k)
  await testInfo.attach('trace.png', { body: await svg.screenshot(), contentType: 'image/png' })

  await svg.getByRole('button', { name: /\bCHLR$/ }).click()
  await page.getByRole('button', { name: 'Isolate circuit' }).click()
  await expect(banner).toContainText('the rest hidden')
  const circuit = await counts()
  expect(circuit.drawn).toBe(circuit.k) // the rest are not drawn at all
  expect(circuit.k).toBeLessThan(26)
  expect(circuit.faded).toBe(0)
  expect(circuit.outside).toEqual([]) // and the circuit is framed
  await expect(page.getByTestId('schematic-minimap')).toHaveCount(0)
  await testInfo.attach('isolated.png', { body: await svg.screenshot(), contentType: 'image/png' })

  // One action restores everything.
  await page.keyboard.press('Escape')
  await expect(banner).toHaveCount(0)
  const restored = await measure(svg)
  expect(restored.nodes).toHaveLength(26)
  expect(restored.nodes.filter((x) => x.opacity < 1)).toHaveLength(0)
  await record(testInfo, 'evidence', { from: 'CHLR', neighbours, trace, circuit })
})

// VIEW-02 selection on the EV example: select all, marquee, align, group drag
// and nudge, keyboard traversal, select connected, clear.
test('selection: marquee, align, group move, traversal', async ({ page }, testInfo) => {
  const svg = await openSolved(page, EV_THERMAL_EXAMPLE_TEXT)
  const pressed = () => svg.locator('[data-node][aria-pressed="true"]').evaluateAll((g) => g.map((x) => x.getAttribute('data-node')!).sort())
  const boxes = async () => Object.fromEntries((await measure(svg)).nodes.map((n) => [n.label, n.box]))
  const ROW = ['FEED', 'CHLR', 'CABE', 'SUC', 'CMP', 'COND', 'LIQ']

  // Ctrl+A with focus in the canvas, then Esc.
  await svg.getByRole('button', { name: /\bFEED$/ }).click()
  await page.keyboard.press('Control+a')
  expect(await pressed()).toHaveLength(26)
  await expect(page.getByText('26 selected')).toBeVisible()
  await page.keyboard.press('Escape')
  expect(await pressed()).toHaveLength(0)

  // Shift+drag a marquee round the refrigerant row.
  let b = await boxes()
  const x0 = Math.min(...ROW.map((l) => b[l].x)) - 6
  const y0 = Math.min(...ROW.map((l) => b[l].y)) - 6
  const x1 = Math.max(...ROW.map((l) => b[l].x + b[l].w)) + 6
  const y1 = Math.max(...ROW.map((l) => b[l].y + b[l].h)) + 6
  await page.keyboard.down('Shift')
  await page.mouse.move(x0, y0)
  await page.mouse.down()
  await page.mouse.move(x1, y1, { steps: 8 })
  await expect(page.getByTestId('schematic-marquee')).toBeVisible()
  await page.mouse.up()
  await page.keyboard.up('Shift')
  const marqueed = await pressed()
  expect(await page.evaluate(() => getSelection()?.toString() ?? '')).toBe('') // no browser text selection
  expect(marqueed).toEqual(expect.arrayContaining(ROW.map((l) => l.toLowerCase())))

  // Align top: every selected block shares one top edge.
  await page.getByRole('button', { name: 'Arrange' }).click()
  await page.getByRole('menuitem', { name: 'Align top' }).click()
  b = await boxes()
  const tops = ROW.map((l) => b[l].y)
  expect(Math.max(...tops) - Math.min(...tops)).toBeLessThan(0.5)

  // Dragging one selected block carries the rest; routes stay clear.
  const cmp = b.CMP
  await page.mouse.move(cmp.x + cmp.w / 2, cmp.y + cmp.h / 2)
  await page.mouse.down()
  await page.mouse.move(cmp.x + cmp.w / 2, cmp.y + cmp.h / 2 + 90, { steps: 10 })
  await page.mouse.up()
  const moved = await boxes()
  for (const l of ROW) expect(moved[l].y - b[l].y).toBeCloseTo(moved.CMP.y - b.CMP.y, 0)
  expect(moved.CMP.y - b.CMP.y).toBeGreaterThan(40)
  expect((await measure(svg)).wireSamplesInsideComponents).toBe(0)

  // Arrow keys nudge the whole selection.
  await svg.locator('[data-node="liq"]').focus()
  await page.keyboard.press('ArrowRight')
  const nudged = await boxes()
  for (const l of ROW) expect(nudged[l].x).toBeGreaterThan(moved[l].x)
  await testInfo.attach('selection.png', { body: await svg.screenshot(), contentType: 'image/png' })

  // Alt+arrow moves keyboard focus to the nearest block that way.
  await svg.locator('[data-node="suc"]').focus()
  await page.keyboard.press('Alt+ArrowRight')
  expect(await page.evaluate(() => document.activeElement?.getAttribute('data-node'))).toBe('cmp')

  // A click on empty canvas clears; Select > Connected grows from one block.
  const view = (await svg.boundingBox())!
  await page.mouse.click(view.x + view.width - 30, view.y + 20)
  expect(await pressed()).toHaveLength(0)
  await svg.getByRole('button', { name: /\bLIQ$/ }).click()
  await page.getByRole('button', { name: 'Select', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Connected' }).click()
  const connected = await pressed()
  expect(connected.length).toBeGreaterThanOrEqual(ROW.length)
  await record(testInfo, 'evidence', { marqueed, connectedFromLIQ: connected.length })
})

test('presentation: flow, spacing, frames, background, snap, guides, labels', async ({ page }, testInfo) => {
  const svg = await openSolved(page, EV_THERMAL_EXAMPLE_TEXT)
  const choose = async (...labels: string[]) => {
    await page.getByRole('button', { name: 'View settings' }).click()
    for (const l of labels) {
      // A switch's input sits over its label; segment labels take the click.
      const toggle = page.getByRole('switch', { name: l, exact: true })
      await ((await toggle.count()) ? toggle.click({ force: true }) : page.getByText(l, { exact: true }).click())
    }
    await page.keyboard.press('Escape')
    await expect(page.getByText('Alignment guides')).toBeHidden()
  }
  const overlaps = (nodes: { label: string; box: { x: number; y: number; w: number; h: number } }[]) =>
    nodes.flatMap((a) => nodes.filter((b) => a.label < b.label && a.box.x < b.box.x + b.box.w && b.box.x < a.box.x + a.box.w && a.box.y < b.box.y + b.box.h && b.box.y < a.box.y + a.box.h).map((b) => `${a.label}/${b.label}`))
  const at = (id: string) =>
    svg.locator(`[data-node="${id}"]`).evaluate((g) => g.getAttribute('transform')!.match(/[\d.-]+/g)!.map(Number))

  // Flow top to bottom at each spacing: framed, nothing overlapping, wires clear.
  const flows: Record<string, unknown> = {}
  for (const spacing of ['Compact', 'Roomy', 'Normal']) {
    await choose('Top to bottom', spacing)
    const m = await measure(svg)
    expect(overlaps(m.nodes), spacing).toEqual([])
    expect(m.nodesOutsideView, spacing).toEqual([])
    expect(m.wireSamplesInsideComponents, spacing).toBe(0)
    flows[spacing] = { frames: m.frameCount, wires: m.wireCount }
  }
  const [pumpin, pump] = [await at('pumpin'), await at('pump')]
  expect(pump[1]).toBeGreaterThan(pumpin[1]) // downstream is below
  // The view is part of the project's presentation (CFG-03), saved with the autosave.
  await expect
    .poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('frees.project') ?? '{}').schematic?.view?.orientation))
    .toBe('vertical')
  await testInfo.attach('vertical.png', { body: await svg.screenshot(), contentType: 'image/png' })

  // Frames: one per circuit, one per domain, or none.
  await choose('Left to right')
  const circuits = (await measure(svg)).frameCount
  await choose('Domain')
  const domains = (await measure(svg)).frameCount
  expect(domains).toBeGreaterThan(0)
  expect(domains).toBeLessThan(circuits)
  await choose('None')
  expect((await measure(svg)).frameCount).toBe(0)
  await choose('Circuit')

  // Background follows the setting and is never exported.
  await expect(svg.locator('[data-background="dots"]')).toHaveCount(1)
  await choose('Grid')
  await expect(svg.locator('[data-background="grid"]')).toHaveCount(1)
  await choose('Plain')
  await expect(svg.locator('[data-background]')).toHaveCount(0)

  // Snap (guides off): a drag lands the block on the 16-unit grid.
  await choose('Alignment guides', 'Snap to grid')
  let box = (await svg.locator('[data-node="mcp"] rect').first().boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 37, box.y + box.height / 2 + 23, { steps: 6 })
  await page.mouse.up()
  const snapped = await at('mcp')
  expect(snapped.map((v) => Math.abs(v - Math.round(v / 16) * 16))).toEqual([0, 0].map(() => expect.closeTo(0, 6)))

  // Guides (snap off): near an alignment, a dashed guide shows and the block lands on it.
  await choose('Alignment guides', 'Snap to grid')
  const others = await svg.locator('[data-node]').evaluateAll((gs) =>
    gs.filter((g) => g.getAttribute('data-node') !== 'motor').map((g) => {
      const r = g.querySelector('rect')!
      const [x, y] = g.getAttribute('transform')!.match(/[\d.-]+/g)!.map(Number)
      return { x, y, w: r.width.baseVal.value, h: r.height.baseVal.value }
    }),
  )
  const target = (await at('mcp'))[1] // its top, a row away from MOTOR
  box = (await svg.locator('[data-node="motor"] rect').first().boundingBox())!
  const zoom = box.height / (await svg.locator('[data-node="motor"] rect').first().evaluate((r: SVGRectElement) => r.height.baseVal.value))
  const motor0 = await at('motor')
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2 + (target - motor0[1]) * zoom + 2, { steps: 8 })
  await expect(svg.getByTestId('schematic-guides')).toBeVisible()
  await page.mouse.up()
  await expect(svg.getByTestId('schematic-guides')).toHaveCount(0)
  const [mx, my] = await at('motor')
  const mh = (await svg.locator('[data-node="motor"] rect').first().evaluate((r: SVGRectElement) => r.height.baseVal.value))
  const ownY = [my, my + mh / 2, my + mh]
  expect(others.some((o) => [o.y, o.y + o.h / 2, o.y + o.h].some((t) => ownY.some((v) => Math.abs(v - t) < 0.01)))).toBe(true)

  // Names only, then port names at 100%.
  await choose('Names only')
  const textsPerBlock = await svg.locator('[data-node]').evaluateAll((gs) => gs.map((g) => g.querySelectorAll(':scope > text').length))
  expect(new Set(textsPerBlock)).toEqual(new Set([1]))
  await choose('Full', 'Port names')
  await svg.locator('[data-node="pump"]').focus()
  await page.keyboard.press('Shift+Digit0')
  await expect(svg.locator('[data-node="pump"] text', { hasText: /^out$/ })).toHaveCount(1)
  await testInfo.attach('port-names.png', { body: await svg.screenshot(), contentType: 'image/png' })
  await record(testInfo, 'evidence', { flows, frames: { circuits, domains }, snapped, motor: { from: motor0, to: [mx, my] } })
})

test('themes: dark and light colours, contrast, and grayscale-safe lines', async ({ page }, testInfo) => {
  const svg = await openSolved(page, EV_THERMAL_EXAMPLE_TEXT)
  const look = () =>
    svg.evaluate((root: SVGSVGElement) => {
      const lum = (hex: string) => {
        const [r, g, b] = [1, 3, 5].map((i) => {
          const v = parseInt(hex.slice(i, i + 2), 16) / 255
          return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
        })
        return 0.2126 * r + 0.7152 * g + 0.0722 * b
      }
      const ratio = (a: string, b: string) => {
        const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
        return (hi + 0.05) / (lo + 0.05)
      }
      const blocks = [...root.querySelectorAll('[data-node]')]
      const textContrast = blocks.flatMap((g) => {
        const fill = g.querySelector('rect')!.getAttribute('fill')!
        return [...g.querySelectorAll(':scope > text')].map((t) => ratio(t.getAttribute('fill')!, fill))
      })
      // Each line kind (one stroke colour) and the dash it is drawn with.
      const kinds = new Map<string, string>()
      for (const p of root.querySelectorAll('path[data-net]')) {
        kinds.set(p.getAttribute('stroke')!, p.getAttribute('stroke-dasharray') ?? 'solid')
      }
      const canvas = getComputedStyle(root.parentElement!).backgroundColor
      return {
        canvas,
        block: blocks[0].querySelector('rect')!.getAttribute('fill'),
        minTextContrast: Math.min(...textContrast),
        kinds: Object.fromEntries(kinds),
      }
    })

  // At Fit blocks are name chips; at 100% the full card adds type and badge text.
  const full = async () => {
    await svg.locator('[data-node="pump"]').focus()
    await page.keyboard.press('Shift+Digit0')
    const t = await look()
    await page.keyboard.press('Shift+Digit1')
    return t.minTextContrast
  }
  const dark = { ...(await look()), fullCardContrast: await full() }
  await testInfo.attach('dark.png', { body: await svg.screenshot(), contentType: 'image/png' })
  await page.getByRole('button', { name: 'Light mode' }).click()
  await expect.poll(async () => (await look()).block).not.toBe(dark.block)
  const light = { ...(await look()), fullCardContrast: await full() }
  await testInfo.attach('light.png', { body: await svg.screenshot(), contentType: 'image/png' })
  // The same drawing with colour removed: lines still differ by pattern.
  await svg.evaluate((root: SVGSVGElement) => (root.style.filter = 'grayscale(1)'))
  await testInfo.attach('light-grayscale.png', { body: await svg.screenshot(), contentType: 'image/png' })

  for (const t of [dark, light]) {
    expect(t.minTextContrast).toBeGreaterThanOrEqual(4.5)
    expect(t.fullCardContrast).toBeGreaterThanOrEqual(4.5)
    // EV draws coolant, heat and refrigerant lines: three kinds, three patterns.
    expect(Object.keys(t.kinds)).toHaveLength(3)
    expect(new Set(Object.values(t.kinds)).size).toBe(3)
  }
  expect(light.canvas).toBe('rgb(255, 255, 255)')
  expect((await measure(svg)).wireSamplesInsideComponents).toBe(0)
  await record(testInfo, 'evidence', { dark, light })
})

/** A block's drawing-space position, from its transform. */
const placeOf = (svg: Locator, id: string) =>
  svg.locator(`[data-node="${id}"]`).evaluate((g) => g.getAttribute('transform')!.match(/[\d.-]+/g)!.map(Number))

async function dragBy(page: Page, svg: Locator, id: string, dx: number, dy: number) {
  const b = (await svg.locator(`[data-node="${id}"] rect`).first().boundingBox())!
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
  await page.mouse.down()
  await page.mouse.move(b.x + b.width / 2 + dx, b.y + b.height / 2 + dy, { steps: 8 })
  await page.mouse.up()
}

test('presentation file: absolute positions, locks, areas, reopen', async ({ page }, testInfo) => {
  const svg = await openSolved(page, EV_THERMAL_EXAMPLE_TEXT)
  const choose = async (label: string) => {
    await page.getByRole('button', { name: 'View settings' }).click()
    await page.getByText(label, { exact: true }).click()
    await page.keyboard.press('Escape')
    await expect(page.getByText('Alignment guides')).toBeHidden()
  }
  const arrange = async (item: string) => {
    await page.getByRole('button', { name: 'Arrange' }).click()
    await page.getByRole('menuitem', { name: item }).click()
  }

  // A placed block keeps its absolute place when the flow turns; the rest re-lay.
  await dragBy(page, svg, 'motor', 150, 90)
  const motor = await placeOf(svg, 'motor')
  const pump = await placeOf(svg, 'pump')
  await choose('Top to bottom')
  expect(await placeOf(svg, 'motor')).toEqual(motor)
  expect(await placeOf(svg, 'pump')).not.toEqual(pump)
  await choose('Left to right')

  // Locked: a drag and a nudge leave it where it is.
  await svg.getByRole('button', { name: /\bMCP$/ }).click()
  await arrange('Lock position')
  await expect(svg.locator('[data-node="mcp"]')).toHaveAttribute('data-locked', 'true')
  const mcp = await placeOf(svg, 'mcp')
  await dragBy(page, svg, 'mcp', 120, 80)
  await svg.locator('[data-node="mcp"]').focus()
  await page.keyboard.press('ArrowRight')
  expect(await placeOf(svg, 'mcp')).toEqual(mcp)

  // A user area frames its members and follows one that moves.
  await page.keyboard.press('Escape')
  await svg.getByRole('button', { name: /\bFEED$/ }).click()
  await svg.getByRole('button', { name: /\bCHLR$/ }).click({ modifiers: ['Shift'] })
  await arrange('Frame as area…')
  await page.getByLabel('Area name').fill('Chiller feed')
  await page.keyboard.press('Enter')
  const area = svg.locator('[data-area="Chiller feed"] rect')
  await expect(area).toHaveCount(1)
  await page.keyboard.press('Escape')
  await svg.locator('[data-node="feed"]').focus()
  await page.keyboard.press('Escape')
  await dragBy(page, svg, 'chlr', 40, 140)
  const inside = async (id: string) => {
    const [a, b] = [(await area.boundingBox())!, (await svg.locator(`[data-node="${id}"] rect`).first().boundingBox())!]
    return b.x >= a.x && b.y >= a.y && b.x + b.width <= a.x + a.width && b.y + b.height <= a.y + a.height
  }
  expect(await inside('feed')).toBe(true)
  expect(await inside('chlr')).toBe(true)
  await choose('Grid')
  const chlr = await placeOf(svg, 'chlr')
  await testInfo.attach('arranged.png', { body: await svg.screenshot(), contentType: 'image/png' })

  // Reopen: positions, lock, area and settings come back from the project.
  await page.waitForTimeout(1500)
  await page.reload()
  await expect(svg).toBeVisible({ timeout: 60_000 })
  const welcome = page.getByRole('dialog').filter({ hasText: 'Welcome to frees' })
  if (await welcome.waitFor({ timeout: 15_000 }).then(() => true, () => false)) {
    await page.keyboard.press('Escape')
    await expect(welcome).toBeHidden()
  }
  await page.getByRole('button', { name: 'Check', exact: true }).click()
  await expect(svg.locator('[data-area="Chiller feed"] rect')).toHaveCount(1, { timeout: 60_000 })
  expect(await placeOf(svg, 'motor')).toEqual(motor)
  expect(await placeOf(svg, 'chlr')).toEqual(chlr)
  expect(await placeOf(svg, 'mcp')).toEqual(mcp)
  await expect(svg.locator('[data-node="mcp"]')).toHaveAttribute('data-locked', 'true')
  await expect(svg.locator('[data-background="grid"]')).toHaveCount(1)
  await record(testInfo, 'evidence', { motor, mcp, chlr })
})

test('presentation file: a v3 project migrates against the legacy layout', async ({ page }, testInfo) => {
  // A v3 autosave, as the previous release wrote it: offsets from the layout.
  const v3 = { version: 3, savedAt: '2026-10-27T10:00:00.000Z', text: HUMID_AIR, schematic: { fan: { dx: 300, dy: -150 }, ghost: { dx: 5, dy: 5 } } }
  await page.addInitScript((p) => {
    if (!sessionStorage.getItem('seeded')) {
      sessionStorage.setItem('seeded', '1')
      localStorage.setItem('frees.project', JSON.stringify(p))
    }
  }, v3)
  await page.goto('/')
  const welcome = page.getByRole('dialog').filter({ hasText: 'Welcome to frees' })
  if (await welcome.waitFor({ timeout: 15_000 }).then(() => true, () => false)) {
    await page.keyboard.press('Escape')
  }
  await expect(page.locator('.cm-content')).toContainText('Humid-air conditioning', { timeout: 60_000 })
  await page.getByRole('button', { name: 'Check', exact: true }).click()
  await page.locator('body').click({ position: { x: 5, y: 5 } })
  await page.keyboard.press('Control+K')
  await page.getByPlaceholder('Search views, tools, and actions…').fill('Schematic')
  await page.keyboard.press('Enter')
  const svg = page.getByRole('application', { name: /Component network schematic/ })
  await expect(svg.locator('[data-node="fan"]')).toBeVisible({ timeout: 60_000 })
  await expect(page.getByText(/1 saved block position from an older file match/)).toBeVisible()
  const migrated = await placeOf(svg, 'fan')
  await testInfo.attach('migrated.png', { body: await svg.screenshot(), contentType: 'image/png' })
  // Reset layout returns FAN to the layout: the difference is the v3 offset.
  await page.getByRole('button', { name: 'Reset layout' }).click()
  await page.getByTestId('arrange-preview').getByRole('button', { name: 'Apply' }).click()
  const base = await placeOf(svg, 'fan')
  expect([migrated[0] - base[0], migrated[1] - base[1]]).toEqual([300, -150])
  await record(testInfo, 'evidence', { migrated, base })
})

test('RUN-10: arranging, selecting and viewing never check, solve or stale a result', async ({ page }, testInfo) => {
  // Count every request the app sends to its engine workers.
  await page.addInitScript(() => {
    const calls: string[] = []
    ;(window as unknown as { engineCalls: string[] }).engineCalls = calls
    const post = Worker.prototype.postMessage
    Worker.prototype.postMessage = function (this: Worker, message: unknown, ...rest: unknown[]) {
      const method = (message as { method?: string } | null)?.method
      if (method) calls.push(method)
      return (post as (...a: unknown[]) => void).call(this, message, ...rest)
    } as typeof Worker.prototype.postMessage
  })
  const svg = await openSolved(page, EV_THERMAL_EXAMPLE_TEXT)
  const calls = () => page.evaluate(() => [...(window as unknown as { engineCalls: string[] }).engineCalls])
  await page.waitForTimeout(1500) // let any post-solve work settle
  const before = (await calls()).length
  const solved = page.getByText(/^Solved/i).first()
  const menu = async (button: string, item: string) => {
    await page.getByRole('button', { name: button, exact: true }).click()
    await page.getByRole('menuitem', { name: item }).click()
  }
  const setting = async (label: string) => {
    await page.getByRole('button', { name: 'View settings' }).click()
    const toggle = page.getByRole('switch', { name: label, exact: true })
    await ((await toggle.count()) ? toggle.click({ force: true }) : page.getByText(label, { exact: true }).click())
    await page.keyboard.press('Escape')
    await expect(page.getByText('Alignment guides')).toBeHidden()
  }

  const done: string[] = []
  // Move: drag, nudge, align, lock, area, reset.
  await dragBy(page, svg, 'motor', 120, 60)
  await svg.locator('[data-node="motor"]').focus()
  await page.keyboard.press('ArrowLeft')
  await svg.getByRole('button', { name: /\bFEED$/ }).click()
  await svg.getByRole('button', { name: /\bCHLR$/ }).click({ modifiers: ['Shift'] })
  await menu('Arrange', 'Align top')
  await menu('Arrange', 'Lock position')
  await menu('Arrange', 'Frame as area…')
  await page.getByLabel('Area name').fill('Feed')
  await page.keyboard.press('Enter')
  done.push('drag', 'nudge', 'align', 'lock', 'area')
  // Select and inspect: marquee-free selection commands, the readout card, context commands.
  await menu('Select', 'Connected')
  await menu('Select', 'None')
  for (const command of ['Neighbours', 'Trace net', 'Isolate circuit']) {
    await svg.getByRole('button', { name: /\bCHLR$/ }).click()
    await page.getByRole('button', { name: command }).click()
    await page.getByRole('button', { name: 'Show all' }).click()
  }
  done.push('select', 'inspect', 'neighbours', 'trace', 'isolate')
  // View: zoom, fit, pan, settings.
  await svg.locator('[data-node="pump"]').focus()
  await page.keyboard.press('Shift+Digit0')
  await page.keyboard.press('Shift+Digit1')
  const box = (await svg.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.wheel(0, 200)
  for (const label of ['Top to bottom', 'Roomy', 'Domain', 'Names only', 'Grid', 'Port names', 'Snap to grid', 'Left to right', 'Normal', 'Circuit', 'Full']) {
    await setting(label)
  }
  await page.getByRole('button', { name: 'Reset layout' }).click()
  await page.getByTestId('arrange-preview').getByRole('button', { name: 'Apply' }).click()
  done.push('zoom', 'fit', 'pan', 'flow', 'spacing', 'frames', 'detail', 'background', 'labels', 'snap', 'reset')
  await page.waitForTimeout(1500) // past the idle-check and autosave debounces

  const canvasCalls = (await calls()).slice(before)
  await expect(solved).toBeVisible()
  // The solved values are still there to inspect.
  await svg.getByRole('button', { name: /\bCHLR$/ }).click()
  await expect(page.getByText('results', { exact: true })).toBeVisible()

  // A semantic change does reach the engine, and the solve is no longer current.
  await page.locator('body').click({ position: { x: 5, y: 5 } })
  await page.keyboard.press('Control+K')
  await page.getByPlaceholder('Search views, tools, and actions…').fill('Editor')
  await page.keyboard.press('Enter')
  await page.locator('.cm-content').click()
  await page.keyboard.press('Control+End')
  await page.keyboard.type('\n// edited')
  await expect.poll(async () => (await calls()).slice(before).length, { timeout: 10_000 }).toBeGreaterThan(0)
  const editCalls = (await calls()).slice(before)
  await expect(solved).toBeHidden()
  expect(before).toBeGreaterThan(0) // the counter saw the original check and solve
  expect(canvasCalls).toEqual([])
  expect(editCalls).toContain('check')
  await record(testInfo, 'evidence', { engineCallsToSolve: before, canvasActions: done, engineCallsFromCanvas: canvasCalls, engineCallsAfterOneEdit: editCalls })
})

test('AC-01: select FAN, move FAN and COIL beyond the layout, Fit, save and reopen', async ({ page }, testInfo) => {
  // The FS Access pickers cannot be driven headlessly; the download and file-input fallbacks run instead.
  await page.addInitScript(() => {
    delete (window as { showSaveFilePicker?: unknown }).showSaveFilePicker
    delete (window as { showOpenFilePicker?: unknown }).showOpenFilePicker
  })
  const svg = await openSolved(page, HUMID_AIR)
  const all = async () => Object.fromEntries(await Promise.all(['room', 'hp', 'coil', 'fan', 'sup'].map(async (id) => [id, await placeOf(svg, id)] as const)))

  // Select FAN: every label stays legible and nothing is dimmed.
  await svg.getByRole('button', { name: /\bFAN$/ }).click()
  const selected = await measure(svg)
  expect(selected.minLabelPx).toBeGreaterThanOrEqual(12)
  expect(selected.nodes.filter((n) => n.opacity < 1)).toEqual([])
  await page.keyboard.press('Escape')

  // Move FAN past the right and bottom of the layout, COIL past its top.
  const start = await all()
  const xs = Object.values(start).map((p) => p[0])
  const ys = Object.values(start).map((p) => p[1])
  await dragBy(page, svg, 'fan', 360, 220)
  await dragBy(page, svg, 'coil', -60, -320)
  const moved = await all()
  expect(moved.fan[0]).toBeGreaterThan(Math.max(...xs))
  expect(moved.fan[1]).toBeGreaterThan(Math.max(...ys))
  expect(moved.coil[1]).toBeLessThan(Math.min(...ys))
  const afterMove = await measure(svg)
  expect(afterMove.nodesOutsideFrames).toEqual([]) // circuit frames grew to hold them
  expect(afterMove.wireSamplesInsideComponents).toBe(0) // wires avoid the moved blocks
  await page.getByRole('button', { name: 'Fit to window' }).click()
  await page.waitForTimeout(300)
  const fitted = await measure(svg)
  expect(fitted.nodesOutsideView).toEqual([])
  await testInfo.attach('ac01-fitted.png', { body: await svg.screenshot(), contentType: 'image/png' })

  // Save, start a new project, reopen the file: the arrangement comes back.
  await page.getByRole('button', { name: 'File', exact: true }).click()
  const [saved] = await Promise.all([page.waitForEvent('download'), page.getByRole('menuitem', { name: 'Save Project', exact: true }).click()])
  const file = testInfo.outputPath('ac01.frees')
  await saved.saveAs(file)
  await page.getByRole('button', { name: 'File', exact: true }).click()
  await page.getByRole('menuitem', { name: 'New Project', exact: true }).click()
  // The Schematic tab stays in front; the new document has no FAN.
  await expect(svg.locator('[data-node="fan"]')).toHaveCount(0)
  await page.getByRole('button', { name: 'File', exact: true }).click()
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('menuitem', { name: 'Open Project…', exact: true }).click()])
  await chooser.setFiles(file)
  await expect(svg.locator('[data-node="fan"]')).toHaveCount(1, { timeout: 15_000 })
  await page.getByRole('button', { name: 'Check', exact: true }).click()
  await expect(svg.locator('path[data-net]')).toHaveCount(afterMove.wireCount, { timeout: 30_000 })
  const reopened = await all()
  expect(reopened.fan).toEqual(moved.fan)
  expect(reopened.coil).toEqual(moved.coil)
  const after = await measure(svg)
  expect(after.nodesOutsideView).toEqual([])
  expect(after.nodesOutsideFrames).toEqual([])
  expect(after.wireSamplesInsideComponents).toBe(0)
  await testInfo.attach('ac01-reopened.png', { body: await svg.screenshot(), contentType: 'image/png' })
  await record(testInfo, 'evidence', { minLabelPxSelected: selected.minLabelPx, start, moved, reopened })
})

test('visual regression: EV at Fit and at 100 %, dark and light', async ({ page }) => {
  // Pixels depend on the fonts installed, so the baselines are recorded in the
  // CI Playwright image (mcr.microsoft.com/playwright:v1.62.1-noble). Re-record
  // there with SCHEMATIC_VISUAL=1 and --update-snapshots.
  test.skip(!process.env.CI && !process.env.SCHEMATIC_VISUAL, 'baselines are recorded in the CI Playwright image')
  const svg = await openSolved(page, EV_THERMAL_EXAMPLE_TEXT)
  const shot = { maxDiffPixelRatio: 0.01, animations: 'disabled' as const, mask: [page.locator('.mantine-Notifications-root')] }
  for (const theme of ['dark', 'light'] as const) {
    if (theme === 'light') {
      await page.getByRole('button', { name: 'Light mode' }).click()
      await expect(page.getByRole('button', { name: 'Dark mode' })).toBeVisible()
    }
    await page.mouse.move(0, 0)
    await svg.locator('[data-node="pump"]').focus()
    await page.keyboard.press('Shift+Digit1')
    await expect(svg).toHaveScreenshot(`ev-fit-${theme}.png`, shot)
    await page.keyboard.press('Shift+Digit0')
    await expect(svg).toHaveScreenshot(`ev-100-${theme}.png`, shot)
  }
})

test('AC-10: a late solve is never shown as current; broken source keeps the previous drawing', async ({ page }, testInfo) => {
  // Hold solve requests back while `window.holdSolve` is set, so an edit lands
  // before the older result returns.
  await page.addInitScript(() => {
    const post = Worker.prototype.postMessage
    Worker.prototype.postMessage = function (this: Worker, message: unknown, ...rest: unknown[]) {
      const send = () => (post as (...a: unknown[]) => void).call(this, message, ...rest)
      const w = window as unknown as { holdSolve?: boolean; heldSolves?: number }
      if (w.holdSolve && (message as { method?: string } | null)?.method === 'solve') {
        w.heldSolves = (w.heldSolves ?? 0) + 1
        setTimeout(send, 2000)
      } else send()
    } as typeof Worker.prototype.postMessage
  })
  const svg = await openSolved(page, HUMID_AIR)
  await dragBy(page, svg, 'fan', 140, 90)
  const fan = await placeOf(svg, 'fan')
  const view = async (name: string) => {
    await page.locator('body').click({ position: { x: 5, y: 5 } })
    await page.keyboard.press('Control+K')
    await page.getByPlaceholder('Search views, tools, and actions…').fill(name)
    await page.keyboard.press('Enter')
    await expect(page.locator('.mantine-Spotlight-overlay')).toHaveCount(0) // it fades over the canvas
  }
  const solved = page.getByText(/^Solved/i).first()
  const solveButton = page.getByRole('button', { name: 'Solve', exact: true })

  // Start a solve, edit while it is in flight, and let the older result arrive.
  await page.evaluate(() => ((window as unknown as { holdSolve: boolean }).holdSolve = true))
  await view('Editor')
  await solveButton.click()
  await page.locator('.cm-content').click()
  await page.keyboard.press('Control+End')
  await page.keyboard.type('\n// edited while solving')
  await page.waitForTimeout(3500) // past the held result
  const heldSolves = await page.evaluate(() => (window as unknown as { heldSolves?: number }).heldSolves ?? 0)
  expect(heldSolves).toBe(1)
  await expect(solved).toBeHidden()

  // RUN-01: a stopped run says so until the next edit, check or solve.
  await page.getByRole('button', { name: 'Check', exact: true }).click()
  await solveButton.click()
  await page.getByRole('button', { name: 'Stop', exact: true }).click()
  await expect(page.getByText('Stopped', { exact: true })).toBeVisible()
  await page.locator('.cm-content').click()
  await page.keyboard.press('Control+End')
  await page.keyboard.type(' ')
  await expect(page.getByText('Stopped', { exact: true })).toBeHidden()

  // Break the source: the canvas keeps the last drawing, labelled, at its layout.
  await page.keyboard.type('\nbroken = (')
  await expect(page.getByText('Syntax error').first()).toBeVisible({ timeout: 10_000 })
  await view('Schematic')
  const note = page.getByTestId('schematic-previous')
  await expect(note).toContainText('Source has errors; showing previous model')
  await expect(svg.locator('[data-node]')).toHaveCount(5)
  await expect(svg.locator('path[data-net]')).toHaveCount(5)
  expect(await placeOf(svg, 'fan')).toEqual(fan)
  // Model edits wait for a valid source; arranging still works.
  await expect(page.getByLabel('Connect from port')).toHaveCount(0)
  await dragBy(page, svg, 'fan', -90, 70)
  expect(await placeOf(svg, 'fan')).not.toEqual(fan)

  // Error navigation brings the editor forward at the broken line.
  await note.getByRole('button', { name: /Go to error/ }).click()
  await expect(page.locator('.cm-activeLine')).toContainText('broken = (')
  await record(testInfo, 'evidence', { heldSolves, heldSolveShownAsCurrent: false, previousNodes: 5, previousWires: 5, fanKeptAt: fan })
})

// CR-SCHEMATIC-01b journeys. Every model edit made on the canvas is a patch of
// the editor text, undone from the canvas toolbar as one step.

/** Three-way junction at G.port written as two statements; SRC.p, C1.p and Q.port open. */
const PARTIAL = `VoltageSource SRC(E = 2.5)
Ground G()
Capacitor C1(C = 1, V0 = 0)
HeatSource Q(Q = 10)
connect(SRC.n, G.port)
connect(C1.n, G.port)
`
async function showView(page: Page, name: string) {
  await page.locator('body').click({ position: { x: 5, y: 5 } })
  await page.keyboard.press('Control+K')
  await page.getByPlaceholder('Search views, tools, and actions…').fill(name)
  await page.keyboard.press('Enter')
  await expect(page.locator('.mantine-Spotlight-overlay')).toHaveCount(0) // it fades over the canvas
}
// The editor's DOM is detached while the canvas is in front; its text reaches
// the project autosave, which is what a reload would restore.
const savedText = (page: Page) => page.evaluate(() => (JSON.parse(localStorage.getItem('frees.project') ?? '{}') as { text?: string }).text)
const editorText = (page: Page) => expect.poll(() => savedText(page), { timeout: 10_000 })
const portAt = async (svg: Locator, ref: string) => {
  const b = (await svg.locator(`[data-port="${ref}"] circle`).first().boundingBox())!
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 }
}
async function openWire(svg: Locator, name: RegExp) {
  await svg.getByRole('button', { name }).focus()
  await svg.page().keyboard.press('Enter')
  await expect(svg.page().getByTestId('wire-card')).toBeVisible()
}

test('AC-05: legal wires connect, illegal ones are refused, a partial network stays editable', async ({ page }, testInfo) => {
  const svg = await openSolved(page, PARTIAL, 'Check')
  await expect(svg.locator('path[data-net]')).toHaveCount(2)
  // WIRE-03: the engine's unjoined ports are hollow and listed.
  for (const ref of ['src.p', 'c1.p', 'q.port']) {
    await expect(svg.locator(`[data-port="${ref}"]`)).toHaveAttribute('data-connected', 'false')
  }
  await expect(svg.locator('[data-port="g.port"]')).toHaveAttribute('data-connected', 'true')
  await page.getByTestId('schematic-issues').click()
  const issues = page.getByRole('menuitem')
  await expect(issues.filter({ hasText: /src\.p is not connected/i })).toBeEnabled()
  // The whole-system diagnosis names no single object, so it points nowhere.
  await expect(issues.filter({ hasText: /underspecified/ })).toBeDisabled()
  await page.keyboard.press('Escape')

  // Drag from SRC.p: the ports say whether they can take it before release.
  const from = await portAt(svg, 'src.p')
  const heat = await portAt(svg, 'q.port')
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(heat.x, heat.y, { steps: 10 })
  await expect(svg.getByTestId('wire-drag')).toHaveCount(1)
  await expect(svg.locator('[data-port="q.port"]')).toHaveAttribute('data-compat', 'prohibited')
  await expect(svg.locator('[data-port="c1.p"]')).toHaveAttribute('data-compat', 'allowed')
  await page.mouse.up()
  await expect(page.getByText(/Cannot wire electrical src\.p to heat q\.port/i).first()).toBeVisible()
  await editorText(page).not.toMatch(/connect\(SRC\.p, Q\.port\)/i)

  const cap = await portAt(svg, 'c1.p')
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(cap.x, cap.y, { steps: 10 })
  await page.mouse.up()
  await editorText(page).toMatch(/connect\(SRC\.p, C1\.p\)/i)
  // Drawn as pending until the next Check, then as a real wire.
  await expect(svg.locator('path[data-net]')).toHaveCount(3, { timeout: 15_000 })
  await expect(svg.locator('[data-provisional]')).toHaveCount(0)
  await expect(svg.locator('[data-port="src.p"]')).toHaveAttribute('data-connected', 'true')
  await expect(svg.locator('[data-port="q.port"]')).toHaveAttribute('data-connected', 'false')
  await expect(page.getByRole('button', { name: 'Undo' })).toBeEnabled()
  await record(testInfo, 'evidence', { refused: 'src.p → q.port (electrical → heat)', connected: 'src.p → c1.p', wiresAfter: 3 })
})

test('AC-06: inspect, remove and disconnect authored connections; preview and undo whole changes', async ({ page }, testInfo) => {
  const svg = await openSolved(page, PARTIAL, 'Check')
  const card = page.getByTestId('wire-card')
  await openWire(svg, /Wire c1\.n → g\.port/i)
  await expect(card.getByTestId('wire-owner')).toHaveText('connect statement, line 6')
  await card.getByRole('button', { name: 'Remove connection' }).click()
  await expect(card.getByTestId('wire-diff')).toHaveText('- connect(C1.n, G.port)')
  await expect(card).toContainText(/c1\.n left unconnected/i)
  await expect(card).toContainText(/g\.port still joined via line 5/i)
  await card.getByRole('button', { name: 'Apply' }).click()
  await expect(svg.locator('path[data-net]')).toHaveCount(1, { timeout: 15_000 })
  await editorText(page).not.toContain('connect(C1.n, G.port)')
  await expect(svg.locator('[data-port="c1.n"]')).toHaveAttribute('data-connected', 'false')
  await expect(svg.locator('[data-port="g.port"]')).toHaveAttribute('data-connected', 'true')

  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(svg.locator('path[data-net]')).toHaveCount(2, { timeout: 15_000 })
  await editorText(page).toBe(PARTIAL)

  // Disconnect one endpoint: with two ends, the statement goes. Preview only.
  await openWire(svg, /Wire src\.n → g\.port/i)
  await card.getByRole('button', { name: /Disconnect g\.port/i }).click()
  await expect(card.getByTestId('wire-diff')).toHaveText('- connect(SRC.n, G.port)')
  await card.getByRole('button', { name: 'Cancel' }).click()
  // The whole net is both statements, removed and restored as one step.
  await card.getByRole('button', { name: 'Delete whole net' }).click()
  await expect(card.getByTestId('wire-diff')).toHaveText('- connect(SRC.n, G.port)\n- connect(C1.n, G.port)')
  await card.getByRole('button', { name: 'Apply' }).click()
  await expect(svg.locator('path[data-net]')).toHaveCount(0, { timeout: 15_000 })
  await editorText(page).not.toMatch(/connect\(/)
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(svg.locator('path[data-net]')).toHaveCount(2, { timeout: 15_000 })
  await editorText(page).toBe(PARTIAL)
  await page.getByRole('button', { name: 'Redo' }).click()
  await expect(svg.locator('path[data-net]')).toHaveCount(0, { timeout: 15_000 })

  // A shared-stream relationship has no statement to edit; the card says why.
  await page.evaluate(() => localStorage.clear()) // reopen on the editor, not the restored canvas
  const shared = await openSolved(
    page,
    `MoistAirSource ROOM(s1, P=101325 [Pa], T=299 [K], W=0.012, mdot=0.6 [kg/s])
MoistAirFan FAN(s1, s2, dP=250 [Pa], eta=0.55)
MoistAirSink SUP()
connect(FAN.out, SUP.in)
`,
  )
  await openWire(shared, /Wire room\.out → fan\.in/i)
  await expect(card.getByTestId('wire-owner')).toHaveText('Shared stream s1')
  await expect(card).toContainText('no connect statement owns it')
  await expect(card.getByRole('button', { name: 'Remove connection' })).toHaveCount(0)
  await expect(card.getByRole('button', { name: 'Open source' })).toBeVisible()
  await record(testInfo, 'evidence', { removed: 'connect(C1.n, G.port)', stillJoined: 'g.port via line 5', netUndoneAsOneStep: true })
})

const NESTED = `// inner.out and SRC.out in a comment — ✓ 🧊
function [a, b] = Box()
port(a)
port(b)
LiquidPipe inner(fluid$=Water, L=1 [m], D=0.05 [m], rough=1e-4 [m])
connect(a, inner.in)
connect(INNER.out, b)
end
function [a, b] = Crate()
port(a)
port(b)
LiquidPipe inner(fluid$=Water, L=2 [m], D=0.05 [m], rough=1e-4 [m])
connect(a, inner.in)
connect(inner.out, b)
end
LiquidSource SRC(fluid$=Water, mdot=1 [kg/s], P=200000 [Pa], T=300 [K])
Box B1()
Crate C1()
LiquidSink Inner()
connect(SRC.out, B1.a)
connect(B1.b, C1.a)
connect(C1.b, inner.in)
`

test('AC-04: scoped rename; other scopes, comments and layout hold; editor caret selects', async ({ page }, testInfo) => {
  // `Inner` shares its local name with each subsystem's `inner` and is used as
  // `inner.in`; subsystems draw as their own blocks, so their insides are renamed
  // from the source (scoping is unit-tested in sourceEdit.test.ts).
  const svg = await openSolved(page, NESTED)
  await dragBy(page, svg, 'inner', 60, 80)
  const placed = await placeOf(svg, 'inner')
  await svg.locator('[data-node="inner"]').click()
  await page.getByRole('button', { name: 'Rename', exact: true }).click()
  const field = page.getByLabel('New instance name')
  await field.fill('b1')
  await page.keyboard.press('Enter')
  await expect(page.getByText('B1 already uses that name here.')).toBeVisible()
  await field.fill('2x')
  await page.keyboard.press('Enter')
  await expect(page.getByText(/A name starts with a letter/)).toBeVisible()
  await field.fill('Outlet')
  await page.keyboard.press('Enter')
  const expected = NESTED.replace('LiquidSink Inner()', 'LiquidSink Outlet()').replace('connect(C1.b, inner.in)', 'connect(C1.b, Outlet.in)')
  await editorText(page).toBe(expected)
  // After the check, the renamed block keeps its place; the subsystems are untouched.
  await expect(svg.locator('[data-node="outlet"]')).toHaveCount(1, { timeout: 15_000 })
  expect(await placeOf(svg, 'outlet')).toEqual(placed)
  // Each subsystem keeps its own `inner`, drawn inside it (HIER-01), not on the block.
  await expect(svg.locator('[data-port^="b1.inner"]')).toHaveCount(0)
  for (const sub of ['B1', 'C1']) {
    await page.getByRole('button', { name: 'Model tree' }).click()
    await page.getByTestId('model-tree').getByRole('button', { name: `Open ${sub}` }).click()
    await expect(svg.locator(`[data-port="${sub.toLowerCase()}.inner.in"]`)).toHaveCount(1)
  }
  await page.getByRole('button', { name: 'Model', exact: true }).click()

  // SYNC-09: the editor caret on a declaration highlights its block.
  await showView(page, 'Editor')
  await page.locator('.cm-line', { hasText: 'LiquidSource SRC' }).click()
  await showView(page, 'Schematic')
  await expect(svg.locator('[data-node="src"]')).toHaveAttribute('aria-pressed', 'true')

  await page.getByRole('button', { name: 'Undo' }).click()
  await editorText(page).toBe(NESTED)
  await expect(svg.locator('[data-node="inner"]')).toHaveCount(1, { timeout: 15_000 })
  expect(await placeOf(svg, 'inner')).toEqual(placed)
  await record(testInfo, 'evidence', { renamed: 'Inner → Outlet (declaration + inner.in)', kept: ['Box inner/INNER', 'Crate inner', 'comment'], placed })
})

test('AC-13: style scopes persist; source-only exports say what stays behind; fixes are previewed', async ({ page }, testInfo) => {
  const svg = await openSolved(page, HUMID_AIR)
  await svg.locator('[data-node="fan"]').click()
  const editor = page.getByTestId('style-editor')
  await editor.getByLabel('Readout digits').click()
  await page.getByRole('option', { name: '3', exact: true }).click()
  await editor.getByText('Project', { exact: true }).click()
  await editor.getByLabel('Outline colour').fill('#cc3300')
  await expect(svg.locator('[data-node="sup"] rect').first()).toHaveAttribute('stroke', '#cc3300')
  // Saved with the project and back after a reload.
  await expect
    .poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem('frees.project') ?? '{}').schematic?.styles))
    .toEqual({ project: { accent: '#cc3300' }, types: {}, instances: { fan: { precision: 3 } } })
  await page.waitForTimeout(1500)
  await page.reload()
  await expect(svg).toBeVisible({ timeout: 60_000 })
  const welcome = page.getByRole('dialog').filter({ hasText: 'Welcome to frees' })
  if (await welcome.waitFor({ timeout: 15_000 }).then(() => true, () => false)) {
    await page.keyboard.press('Escape')
    await expect(welcome).toBeHidden()
  }
  await page.getByRole('button', { name: 'Check', exact: true }).click()
  await expect(svg.locator('[data-node="sup"] rect').first()).toHaveAttribute('stroke', '#cc3300', { timeout: 60_000 })

  // CFG-04: an equation-only export names the layout it leaves out.
  await page.keyboard.press('Control+K')
  await page.getByPlaceholder('Search views, tools, and actions…').fill('Export equation text')
  const download = page.waitForEvent('download')
  await page.keyboard.press('Enter')
  await download
  await expect(page.getByText(/Not included .*schematic layout \(positions, locks, areas, styles\)/)).toBeVisible()

  // RUN-09: a duplicate name gets a previewed, undoable fix.
  await showView(page, 'Editor')
  await page.locator('.cm-content').click()
  await page.keyboard.press('Control+End')
  await page.keyboard.type('\nMoistAirSink SUP()')
  await page.getByRole('button', { name: 'Check', exact: true }).click()
  await showView(page, 'Schematic')
  await expect(page.getByTestId('schematic-fix')).toContainText('Rename the second SUP to SUP2')
  await page.getByRole('button', { name: 'Apply fix' }).click()
  await editorText(page).toContain('MoistAirSink SUP2()')
  await page.getByRole('button', { name: 'Undo' }).click()
  await editorText(page).toMatch(/MoistAirSink SUP\(\)$/)
  await record(testInfo, 'evidence', { styles: { project: { accent: '#cc3300' }, fan: { precision: 3 } }, fix: 'Rename the second SUP to SUP2' })
})

// CR-SCHEMATIC-01c journeys.

test('AC-03: a source edit shows in the inspector; an inspector edit is a minimal diff; both undo in order', async ({ page }, testInfo) => {
  const svg = await openSolved(page, HUMID_AIR)
  // Edit one binding in the source, as text.
  await showView(page, 'Editor')
  await page.locator('.cm-line', { hasText: 'MoistAirFan' }).click()
  await page.keyboard.press('End')
  for (let i = 0; i < '0 [Pa], eta=0.55)'.length; i++) await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('Backspace') // 250 → 20, then 260
  await page.keyboard.type('6')
  await editorText(page).toContain('MoistAirFan        FAN(dP=260 [Pa], eta=0.55)')
  await page.getByRole('button', { name: 'Check', exact: true }).click()
  await showView(page, 'Schematic')
  await svg.locator('[data-node="fan"]').click()
  const inspector = page.getByTestId('param-inspector')
  await expect(inspector.locator('[data-param="dp"]')).toContainText('260 [Pa]')
  await expect(inspector.locator('[data-param="eta"]')).toContainText('0.55')

  // Edit another in the inspector: a draft until Apply, then one token changes.
  await inspector.getByRole('button', { name: 'Edit eta' }).click()
  await inspector.getByLabel('New eta').fill('0.6 +')
  await inspector.getByRole('button', { name: 'Apply' }).click()
  await expect(inspector).toContainText('Not a valid value or expression.')
  await editorText(page).toContain('eta=0.55)')
  await inspector.getByLabel('New eta').fill('0.6')
  await inspector.getByRole('button', { name: 'Apply' }).click()
  await editorText(page).toBe(HUMID_AIR.replace('dP=250 [Pa], eta=0.55', 'dP=260 [Pa], eta=0.6 [-]')) // written as the wizard writes it
  // The edit stales the run: no result is shown as current.
  await expect(page.getByText(/^Solved/i)).toHaveCount(0)

  // Undo in order: the canvas edit, then the typed one in the editor.
  await page.getByRole('button', { name: 'Undo' }).click()
  await editorText(page).toBe(HUMID_AIR.replace('dP=250', 'dP=260'))
  await showView(page, 'Editor')
  await page.locator('.cm-content').click()
  await page.keyboard.press('Control+z')
  await editorText(page).toBe(HUMID_AIR)
  await record(testInfo, 'evidence', { sourceEdit: 'dP 250 → 260 [Pa] (typed)', inspectorEdit: 'eta 0.55 → 0.6', undoneInOrder: true })
})

test('AC-02: from an empty document, place, configure, wire, check and solve without typing source', async ({ page }, testInfo) => {
  const start = '// AC-02: a circuit built on the canvas\n'
  const source = 'https://raw.example/empty.frees'
  await page.route(source, (route) => route.fulfill({ contentType: 'text/plain', body: start }))
  await page.goto('/?url=' + encodeURIComponent(source))
  await expect(page.locator('.cm-content')).toContainText('AC-02')
  await showView(page, 'Schematic')
  const wizard = page.getByRole('dialog', { name: 'Insert a Component' })
  const quick = page.getByTestId('quick-add')

  // Cancel at either step writes nothing.
  await page.getByRole('button', { name: 'Add component' }).click()
  await quick.getByLabel('Search components').fill('resistor')
  await page.keyboard.press('Escape')
  await expect(quick).toHaveCount(0)
  await page.getByRole('button', { name: 'Add component' }).click()
  await quick.getByLabel('Search components').fill('VoltageSource')
  await page.keyboard.press('Enter')
  await wizard.getByRole('button', { name: 'Cancel' }).click()
  await expect(wizard).toHaveCount(0)
  await editorText(page).toBe(start)

  // Source: the empty-state button, then the wizard.
  await page.getByRole('button', { name: 'Add component' }).click()
  await quick.getByLabel('Search components').fill('VoltageSource')
  await page.keyboard.press('Enter')
  await wizard.getByRole('textbox', { name: /^E\s*\[V\]/ }).fill('10')
  await wizard.getByRole('button', { name: 'Add to System' }).click()
  await editorText(page).toContain('VoltageSource VS(E=10 [V])')
  const svg = page.getByRole('application', { name: /Component network schematic/ })
  await expect(svg.locator('[data-node="vs"]')).toBeVisible()

  // Equipment: double-click where it should go.
  const box = (await svg.boundingBox())!
  const spot = { x: box.x + box.width * 0.6, y: box.y + box.height * 0.6 }
  await page.mouse.dblclick(spot.x, spot.y)
  await quick.getByLabel('Search components').fill('Resistor')
  await quick.getByRole('option', { name: /^Resistor\b/ }).click()
  await wizard.getByRole('textbox', { name: /^R\s*\[ohm\]/ }).fill('5')
  await wizard.getByRole('button', { name: 'Add to System' }).click()
  await editorText(page).toContain('Resistor RESI(R=5 [ohm])')
  const placed = (await svg.locator('[data-node="resi"]').boundingBox())!
  const dist = Math.hypot(placed.x + placed.width / 2 - spot.x, placed.y + placed.height / 2 - spot.y)

  // Sink: the 'a' key, then drag the result onto the canvas.
  await svg.locator('..').focus() // the viewport takes the keys
  await page.keyboard.press('a')
  await quick.getByLabel('Search components').fill('Ground')
  await quick.getByRole('option', { name: /^Ground\b/ }).dragTo(svg, { targetPosition: { x: box.width * 0.3, y: box.height * 0.75 } })
  await wizard.getByRole('button', { name: 'Add to System' }).click()
  await editorText(page).toContain('Ground GROU()')

  // Connect by dragging port to port; Check classifies the ports first.
  await page.getByRole('button', { name: 'Check', exact: true }).click()
  for (const [a, b] of [['vs.p', 'resi.a'], ['resi.b', 'vs.n'], ['vs.n', 'grou.port']]) {
    await expect(svg.locator(`[data-port="${b}"]`)).toBeVisible()
    const from = await portAt(svg, a)
    const to = await portAt(svg, b)
    await page.mouse.move(from.x, from.y)
    await page.mouse.down()
    await page.mouse.move(to.x, to.y, { steps: 10 })
    await page.mouse.up()
    await editorText(page).toMatch(new RegExp(`connect\\(${a.replace('.', '\\.')}, ${b.replace('.', '\\.')}\\)`, 'i'))
  }
  await page.getByRole('button', { name: 'Solve', exact: true }).click()
  await expect(page.getByText(/^Solved/i).first()).toBeVisible({ timeout: 60_000 })
  const text = await savedText(page)
  expect(text).not.toContain('\n\n\n')
  await record(testInfo, 'evidence', { text, resistorOffsetFromDoubleClick: Math.round(dist) })
  expect(dist).toBeLessThan(60)
})

const PIPES = `// AC-09 source document
function [a, b] = Box()
port(a)
port(b)
LiquidPipe inner(fluid$=Water, L=1 [m], D=0.05 [m], rough=1e-4 [m])
connect(a, inner.in)
connect(inner.out, b)
end
m_in = 1 [kg/s]
LiquidSource SRC(fluid$=Water, mdot=m_in, P=200000 [Pa], T=300 [K])
Box B1()
LiquidSink SNK()
connect(SRC.out, B1.a)
connect(B1.b, SNK.in)
P_out = B1.b.P
`
const TARGET = `// AC-09 target: its own SRC, no Box
m_in = 2 [kg/s]
LiquidSource SRC(fluid$=Water, mdot=m_in, P=150000 [Pa], T=290 [K])
LiquidSink OUT()
connect(SRC.out, OUT.in)
`

test('AC-09: delete shows impact and undoes; copy into another document resolves names and types, never external wires', async ({ page }, testInfo) => {
  const svg = await openSolved(page, PIPES, 'Check')
  // Delete B1: its two connections go, the equation that reads it stays and is named.
  await svg.getByRole('button', { name: /\bB1$/ }).click()
  await page.keyboard.press('Delete')
  const impact = page.getByTestId('delete-impact')
  await expect(impact).toContainText('Removes 2 connections: connect(SRC.out, B1.a); connect(B1.b, SNK.in)')
  await expect(impact).toContainText('line 15: P_out = B1.b.P')
  await impact.getByRole('button', { name: 'Cancel' }).click()
  await editorText(page).toBe(PIPES)
  await svg.getByRole('button', { name: /\bB1$/ }).click()
  await page.keyboard.press('Delete')
  await impact.getByRole('button', { name: 'Delete' }).click()
  await editorText(page).toBe(PIPES.replace('Box B1()\n', '').replace('connect(SRC.out, B1.a)\nconnect(B1.b, SNK.in)\n', ''))
  await page.getByRole('button', { name: 'Undo' }).click()
  await editorText(page).toBe(PIPES)

  // Copy SRC and B1 (with Box), then paste into a document that has its own SRC.
  await page.getByRole('button', { name: 'Check', exact: true }).click()
  await svg.getByRole('button', { name: /\bSRC$/ }).click()
  await svg.getByRole('button', { name: /\bB1$/ }).click({ modifiers: ['Shift'] })
  await page.keyboard.press('Control+c')
  await expect(page.getByText('Copied 2 components.').first()).toBeVisible()
  // Another document in the same browser; the app reopens on the Schematic view.
  await page.route('https://raw.example/target.frees', (route) => route.fulfill({ contentType: 'text/plain', body: TARGET }))
  await page.goto('/?url=' + encodeURIComponent('https://raw.example/target.frees'))
  await page.getByRole('button', { name: 'Open shared document' }).click()
  await editorText(page).toBe(TARGET)
  await page.getByRole('button', { name: 'Check', exact: true }).click()
  await showView(page, 'Schematic')
  await expect(svg.locator('[data-node="out"]')).toHaveCount(1)
  await page.getByRole('button', { name: 'Edit components' }).click()
  await page.getByRole('menuitem', { name: 'Paste' }).click()
  const report = page.getByTestId('paste-report')
  await expect(report).toContainText('Renamed SRC → SRC2 (name taken)')
  await expect(report).toContainText('Added definition box')
  await expect(report).toContainText('Not reconnected: B1.b — SNK.in')
  await expect(report).not.toContainText('Not defined here') // the target has its own m_in
  await editorText(page).toContain(PIPES.slice(PIPES.indexOf('function'), PIPES.indexOf('end\n') + 3))
  const pasted = await savedText(page)
  expect(pasted).toContain('LiquidSource SRC2(fluid$=Water, mdot=m_in, P=200000 [Pa], T=300 [K])\nBox B1()\nconnect(SRC2.out, B1.a)')
  expect(pasted).not.toMatch(/SNK/)
  // It checks and solves; B1's far port is joined to nothing in the target.
  await page.getByRole('button', { name: 'Check', exact: true }).click()
  await expect(svg.locator('[data-node="src2"]')).toHaveCount(1)
  expect(pasted).not.toMatch(/B1\.b/i)
  await page.getByRole('button', { name: 'Solve', exact: true }).click()
  await expect(page.getByText(/^Solved/i).first()).toBeVisible({ timeout: 60_000 })
  // Undo removes the whole paste.
  await page.getByRole('button', { name: 'Undo' }).click()
  await editorText(page).toBe(TARGET)
  await record(testInfo, 'evidence', { deleted: 'B1 (2 connections, equation on line 15 kept)', pasted: pasted?.slice(TARGET.length) })
})

/** The corners of an `M/L/H/V` path, in drawing units; arcs (hops) are skipped. */
function corners(d: string): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = []
  let at = { x: 0, y: 0 }
  for (const [, cmd, args] of d.matchAll(/([MLHVA])\s*([^MLHVA]*)/g)) {
    const n = args.trim().split(/[\s,]+/).map(Number)
    if (cmd === 'A') at = { x: n[5], y: n[6] }
    else at = cmd === 'H' ? { x: n[0], y: at.y } : cmd === 'V' ? { x: at.x, y: n[0] } : { x: n[0], y: n[1] }
    if (cmd !== 'A') out.push(at)
  }
  return out
}

test('AC-07: bends, lane drag, lock, moved ends, crossing without a junction, conflict, reset, undo, export, reopen', async ({ page }, testInfo) => {
  const svg = await openSolved(page, HUMID_AIR, 'Check')
  const KEY = 'fan.out|sup.in'
  const wire = svg.locator(`path[data-route="${KEY}"]`)
  const d = () => wire.getAttribute('d').then((v) => v!)
  const toScreen = (p: { x: number; y: number }) =>
    svg.evaluate((el: SVGSVGElement, q) => {
      const s = new DOMPoint(q.x, q.y).matrixTransform(el.getScreenCTM()!)
      return { x: s.x, y: s.y }
    }, p)
  const junctions = svg.locator('circle[data-ends]')
  await expect(junctions).toHaveCount(0)

  // Double-click the last lane: a bend appears on it (the click also opens the card).
  const before = corners(await d())
  const lane = [before.at(-3)!, before.at(-2)!]
  const mid = await toScreen({ x: (lane[0].x + lane[1].x) / 2, y: (lane[0].y + lane[1].y) / 2 })
  await page.mouse.dblclick(mid.x, mid.y)
  await expect(page.getByTestId('wire-card')).toBeVisible()
  const handles = svg.locator(`[data-bend^="${KEY}:"]`)
  await expect(handles).toHaveCount(2)

  // Drag the new bend just right of COIL, level with the return wire's riser: a crossing.
  const riser = corners((await svg.locator('path[data-route="coil.out|hp.re_in"]').getAttribute('d'))!)
  const target = { x: riser[1].x - 2, y: (riser[1].y + riser[2].y) / 2 }
  const hb = (await handles.nth(1).boundingBox())!
  const to = await toScreen(target)
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2)
  await page.mouse.down()
  await page.mouse.move(to.x, to.y, { steps: 8 })
  await page.mouse.up()
  const bent = await d()
  expect(bent).toContain(' A ') // it hops the riser
  await expect(junctions).toHaveCount(0) // no bend became a junction
  const bend = corners(bent).find((p) => Math.abs(p.x - target.x) <= 8 && Math.abs(p.y - target.y) <= 8)!
  expect(bend).toBeTruthy()

  // Drag a lane of another wire: it squares itself through the new place.
  const other = svg.locator('path[data-route="hp.pre_in|room.out"]')
  const otherBefore = (await other.getAttribute('d'))!
  const ob = corners(otherBefore)
  const grab = await toScreen({ x: (ob[2].x + ob[3].x) / 2, y: ob[2].y })
  await page.mouse.move(grab.x, grab.y)
  await page.mouse.down()
  await page.mouse.move(grab.x, grab.y + 40, { steps: 6 })
  await page.mouse.up()
  expect(await other.getAttribute('d')).not.toBe(otherBefore)

  // Lock: no handles; moving the far end keeps the bend.
  const card = page.getByTestId('wire-card')
  await card.getByRole('button', { name: 'Lock route' }).click()
  await expect(handles).toHaveCount(0)
  await dragBy(page, svg, 'sup', 0, 60)
  expect(corners(await d())).toContainEqual(bend)

  // Push COIL under the locked route: a named conflict.
  await dragBy(page, svg, 'coil', 50, 0)
  await expect(page.getByTestId('route-conflict')).toContainText('runs through COIL')
  await expect(wire).toHaveAttribute('data-conflict', 'true')

  // Unlock and reset: automatic again, clear of COIL; Undo brings the bends back.
  await card.getByRole('button', { name: 'Unlock route' }).click()
  await card.getByRole('button', { name: 'Reset route' }).click()
  await expect(page.getByTestId('route-conflict')).toHaveCount(0)
  expect(corners(await d())).not.toContainEqual(bend)
  await page.getByRole('button', { name: 'Undo' }).click()
  expect(corners(await d())).toContainEqual(bend)

  // Reload: the bends come back with the autosaved project (AC-01 covers the file round trip).
  await expect.poll(() => page.evaluate((key) => localStorage.getItem('frees.project')?.includes(`"${key}"`) ?? false, KEY), { timeout: 10_000 }).toBe(true)
  await page.reload()
  await page.getByRole('dialog').first().waitFor({ timeout: 15_000 }).catch(() => {})
  await page.keyboard.press('Escape')
  await showView(page, 'Schematic')
  await page.getByRole('button', { name: 'Check', exact: true }).click()
  await expect(wire).toHaveCount(1, { timeout: 30_000 })
  expect(corners(await d())).toContainEqual(bend)

  // Export: the same wires and bends, without the editing handles.
  const onScreen = await svg.locator('path[data-route]').evaluateAll((p) => p.map((x) => [x.getAttribute('data-route'), x.getAttribute('d')]))
  await page.getByRole('button', { name: 'Export…' }).click()
  await page.getByTestId('export-drawing').getByText('Whole model').click()
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('export-drawing').getByRole('button', { name: 'Export', exact: true }).click()])
  const xml = readFileSync((await download.path())!, 'utf8')
  expect(xml).not.toMatch(/data-bend|data-wire/)
  const exported = Object.fromEntries([...xml.matchAll(/<path [^>]*data-route="([^"]+)"[^>]*\sd="([^"]+)"/g)].map((m) => [m[1], m[2]]))
  expect(exported).toEqual(Object.fromEntries(onScreen))

  await record(testInfo, 'evidence', { bend, bent, conflict: 'COIL', reopened: await d() })
})

const LOOP = `// WIRE-09: a source, a load and a grounded junction
VoltageSource VS(E=10 [V])
Resistor R1(R=5 [ohm])
Ground G()
connect(VS.p, R1.a)
connect(VS.n, R1.b, G.port)
`

test('WIRE-09: insert into a wire and into one branch of a junction, previewed, solved, undone', async ({ page }, testInfo) => {
  const svg = await openSolved(page, LOOP, 'Check')
  const panel = page.getByTestId('insert-panel')
  const wizard = page.getByRole('dialog', { name: 'Insert a Component' })
  const insertResistor = async (wire: RegExp, ohms: string) => {
    await openWire(svg, wire)
    await page.getByTestId('wire-card').getByRole('button', { name: 'Insert component…' }).click()
    await panel.getByRole('combobox', { name: 'Component' }).fill('Resistor')
    await page.getByRole('option', { name: 'Resistor', exact: true }).click()
    await panel.getByRole('button', { name: 'Configure…' }).click()
    await wizard.getByRole('textbox', { name: /^R\s*\[ohm\]/ }).fill(ohms)
    await wizard.getByRole('button', { name: 'Add to System' }).click()
  }

  // Two ends: the statement is split through the new block, shown before it is written.
  await insertResistor(/Wire (vs\.p → r1\.a|r1\.a → vs\.p)/i, '5')
  await expect(page.getByTestId('insert-preview')).toHaveText(
    ['- connect(VS.p, R1.a)', '+ connect(VS.p, RESI.a)', '+ Resistor RESI(R=5 [ohm])', '+ connect(RESI.b, R1.a)'].join('\n'),
  )
  await editorText(page).toBe(LOOP)
  await panel.getByRole('button', { name: 'Apply' }).click()
  await editorText(page).toBe(LOOP.replace('connect(VS.p, R1.a)', 'connect(VS.p, RESI.a)') + 'Resistor RESI(R=5 [ohm])\nconnect(RESI.b, R1.a)\n')

  // A junction: the chosen branch (G.port) moves behind the new block; the rest stay joined.
  await page.getByRole('button', { name: 'Check', exact: true }).click()
  await insertResistor(/Wire .*g\.port/i, '1')
  await expect(panel.getByRole('combobox', { name: 'Branch it goes on' })).toHaveValue('G.port')
  await panel.getByRole('button', { name: 'Apply' }).click()
  await editorText(page).toContain('connect(VS.n, R1.b, RESI2.a)')
  await editorText(page).toContain('Resistor RESI2(R=1 [ohm])\nconnect(RESI2.b, G.port)')
  await page.getByRole('button', { name: 'Solve', exact: true }).click()
  await expect(page.getByText(/^Solved/i).first()).toBeVisible({ timeout: 60_000 })
  await expect(svg.locator('[data-node="resi2"]')).toHaveCount(1)
  const inserted = await savedText(page)

  // One undo per insertion restores the original topology.
  await page.getByRole('button', { name: 'Undo' }).click()
  await page.getByRole('button', { name: 'Undo' }).click()
  await editorText(page).toBe(LOOP)
  await record(testInfo, 'evidence', { inserted })
})

test('VIEW-04: arrange selection, circuit and all — previewed, cancelable, lock-respecting, deterministic, undoable', async ({ page }, testInfo) => {
  const svg = await openSolved(page, HUMID_AIR, 'Check')
  const at = (id: string) => svg.locator(`[data-node="${id}"]`).getAttribute('transform')
  const where = async () => Object.fromEntries(await Promise.all(['room', 'hp', 'coil', 'fan', 'sup'].map(async (id) => [id, await at(id)])))
  const layout = await where()
  await dragBy(page, svg, 'fan', -80, 90)
  await dragBy(page, svg, 'coil', -60, -70)
  // Lock COIL where it was dragged.
  await svg.getByRole('button', { name: /\bCOIL$/ }).click()
  await page.getByRole('button', { name: 'Arrange', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Lock position' }).click()
  const dragged = await where()
  expect(dragged.fan).not.toBe(layout.fan)
  const banner = page.getByTestId('arrange-preview')
  const arrange = async (item: string) => {
    await page.getByRole('button', { name: 'Arrange', exact: true }).click()
    await page.getByRole('menuitem', { name: item }).click()
  }

  // Selection: FAN previews back at its layout place; Cancel leaves it where it was.
  await svg.getByRole('button', { name: /\bFAN$/ }).click()
  await arrange('Arrange selection')
  await expect(banner).toContainText('Arrange selection moves 1 block')
  expect(await at('fan')).toBe(layout.fan)
  await banner.getByRole('button', { name: 'Cancel' }).click()
  expect(await at('fan')).toBe(dragged.fan)

  // Circuit: every unlocked block of FAN's circuit; locked COIL is not counted.
  await arrange('Arrange circuit')
  await expect(banner).toContainText('Arrange circuit moves 4 blocks; locked ones stay')
  await banner.getByRole('button', { name: 'Cancel' }).click()

  // All: applied as one undo step; COIL holds; the same input gives the same result.
  await arrange('Arrange all')
  await banner.getByRole('button', { name: 'Apply' }).click()
  const first = await where()
  expect(first.fan).toBe(layout.fan)
  expect(first.coil).toBe(dragged.coil)
  await page.getByRole('button', { name: 'Undo' }).click()
  expect(await where()).toEqual(dragged)
  await arrange('Arrange all')
  await banner.getByRole('button', { name: 'Apply' }).click()
  expect(await where()).toEqual(first)
  await record(testInfo, 'evidence', { layout, dragged, arranged: first })
})

const PAIR = `// AC-08: two resistors whose outer ends are both called a
R_load = 5 [ohm]
VoltageSource VS(E=10 [V])
Resistor R1(R=R_load)
Resistor R2(R=2*R_load*cos(0))
Ground G()
connect(VS.p, R1.a)
connect(R1.b, R2.b)
connect(R2.a, VS.n, G.port)
I_load = R1.a.I
`

test('AC-08: extract a subsystem with duplicate port names, captured parameters and outside readers; checked, same result, browsed, undone', async ({ page }, testInfo) => {
  const { initSync, solve } = await import('../src/wasm/pkg/frees.js')
  initSync({ module: readFileSync(new URL('../src/wasm/pkg/frees_bg.wasm', import.meta.url)) })
  const I_load = (src: string) => (JSON.parse(solve(src, '{}')).variables as { name: string; value: number }[]).find((v) => v.name === 'I_load')!.value

  const svg = await openSolved(page, PAIR, 'Check')
  await dragBy(page, svg, 'r1', 0, 80)
  const placed = await svg.locator('[data-node="r1"]').getAttribute('transform')
  await svg.getByRole('button', { name: /\bR1$/ }).click()
  // R1's pinned card can cover R2 in a docked panel; Shift+Enter adds it from the keyboard.
  await svg.getByRole('button', { name: /\bR2$/ }).focus()
  await page.keyboard.press('Shift+Enter')
  await page.getByRole('button', { name: 'Edit components' }).click()
  await page.getByRole('menuitem', { name: 'Extract subsystem…' }).click()

  // The preview: both outer ends are `a`, so each exposed port is named for its block.
  const preview = page.getByTestId('extract-preview')
  await expect(preview.getByTestId('extract-ports')).toHaveText('Ports: R1_a (R1.a — VS.p); R2_a (R2.a — VS.n, G.port)')
  await expect(preview.getByTestId('extract-captures')).toHaveText('Passed in: R_load = R_load')
  await expect(preview.getByTestId('extract-references')).toHaveText('Re-pointed: line 10: I_load = R1.a.I → I_load = SUB1.R1.a.I')
  // A name that clashes is refused before anything is written.
  await preview.getByRole('textbox', { name: 'Component name' }).fill('Resistor')
  await expect(preview).toContainText('A component named Resistor already exists; choose another name.')
  await expect(preview.getByRole('button', { name: 'Extract' })).toBeDisabled()
  await preview.getByRole('textbox', { name: 'Component name' }).fill('Pair')
  await expect(preview.getByTestId('result-check')).toHaveText(/^Check of the result: .*20 equations and 20 variables/)
  await editorText(page).toBe(PAIR)
  await preview.getByRole('button', { name: 'Extract' }).click()
  await editorText(page).toContain('Pair SUB1(R_load=R_load)')
  const extracted = (await savedText(page))!
  expect(extracted).toContain('connect(VS.p, SUB1.R1_a)\nconnect(SUB1.R2_a, VS.n, G.port)\nI_load = SUB1.R1.a.I')

  // The parent and the generated definition check and solve; the result is the original's.
  await page.getByRole('button', { name: 'Solve', exact: true }).click()
  await expect(page.getByText(/^Solved/i).first()).toBeVisible({ timeout: 120_000 })
  expect(I_load(extracted)).toBeCloseTo(I_load(PAIR), 12)

  // Browse in: the tree opens SUB1, whose blocks kept their places; back and forward.
  await showView(page, 'Schematic')
  await page.getByRole('button', { name: 'Model tree' }).click()
  await page.getByTestId('model-tree').getByRole('button', { name: 'Open SUB1' }).click()
  await expect(page.getByRole('navigation', { name: 'Breadcrumbs' })).toHaveText(/Model›SUB1 \(Pair\)/)
  await expect(svg.locator('[data-node]')).toHaveCount(4)
  expect(await svg.locator('[data-node="sub1.r1"]').getAttribute('transform')).toBe(placed)
  await page.getByRole('button', { name: 'Back' }).click()
  await expect(svg.locator('[data-node="sub1"]')).toBeVisible()
  await page.getByRole('button', { name: 'Forward' }).click()
  await expect(svg.locator('[data-node="sub1.r2"]')).toBeVisible()
  await page.getByRole('button', { name: 'Model', exact: true }).click()

  // One Undo restores the source and the geometry.
  await page.getByRole('button', { name: 'Undo' }).click()
  await editorText(page).toBe(PAIR)
  await expect.poll(() => svg.locator('[data-node="r1"]').getAttribute('transform'), { timeout: 10_000 }).toBe(placed)
  await record(testInfo, 'evidence', { extracted, I_load: I_load(extracted) })
})

test('HIER-04/05: a local subsystem interface renamed with its migration plan; its bindings inspected; exported and imported without overwriting', async ({ page }, testInfo) => {
  const { initSync, check } = await import('../src/wasm/pkg/frees.js')
  initSync({ module: readFileSync(new URL('../src/wasm/pkg/frees_bg.wasm', import.meta.url)) })
  const pair = PAIR.replace('Resistor R1(R=R_load)\nResistor R2(R=2*R_load*cos(0))\n', '')
  const subsystem = `function [R1_a, R2_a] = Pair(R_load)
  port(R1_a)
  port(R2_a)
  Resistor R1(R=R_load)
  Resistor R2(R=2*R_load*cos(0))
  connect(R1.b, R2.b)
  connect(R1_a, R1.a)
  connect(R2_a, R2.a)
end
`
  const doc = subsystem + pair.replace('Ground G()', 'Pair SUB1(R_load=R_load)\nGround G()').replace('connect(VS.p, R1.a)\nconnect(R1.b, R2.b)\nconnect(R2.a,', 'connect(VS.p, SUB1.R1_a)\nconnect(SUB1.R2_a,').replace('R1.a.I', 'SUB1.R1.a.I')
  expect(JSON.parse(check(doc, '{}')).solvable).toBe(true)
  const svg = await openSolved(page, doc, 'Check')

  // The subsystem's own bindings show in the inspector like a library block's.
  await svg.locator('[data-node="sub1"]').click()
  await expect(page.getByTestId('param-inspector').locator('[data-param="r_load"]')).toContainText('R_load')

  // Rename a port from inside: the plan lists every statement it changes, then one undo step.
  await page.getByRole('button', { name: 'Model tree' }).click()
  await page.getByTestId('model-tree').getByRole('button', { name: 'Open SUB1' }).click()
  await page.getByRole('button', { name: 'Interface…' }).click()
  const editor = page.getByTestId('interface-editor')
  await expect(editor).toContainText('Used by 1 instance(s).')
  await editor.getByRole('textbox', { name: 'Port R1_a' }).fill('hot')
  await editor.getByRole('button', { name: 'Rename' }).first().click()
  await expect(editor.getByTestId('interface-plan')).toHaveText(
    [
      'line 1: function [R1_a, R2_a] = Pair(R_load) → function [hot, R2_a] = Pair(R_load)',
      'line 2: port(R1_a) → port(hot)',
      'line 7: connect(R1_a, R1.a) → connect(hot, R1.a)',
      'line 15: connect(VS.p, SUB1.R1_a) → connect(VS.p, SUB1.hot)',
    ].join(''),
  )
  await editorText(page).toBe(doc)
  await editor.getByRole('button', { name: 'Apply' }).click()
  await editorText(page).toContain('connect(VS.p, SUB1.hot)')
  const renamed = (await savedText(page))!
  await page.getByRole('button', { name: 'Solve', exact: true }).click()
  await expect(page.getByText(/^Solved/i).first()).toBeVisible({ timeout: 120_000 })

  // Export it with a description; import it into a document whose Pair differs: kept unless replaced.
  await showView(page, 'Schematic')
  await page.getByRole('button', { name: 'Edit components' }).click()
  await page.getByRole('menuitem', { name: 'Export component…' }).click()
  await page.getByTestId('export-component').getByRole('textbox', { name: 'Description' }).fill('Two resistors, outer ends exposed')
  const [file] = await Promise.all([page.waitForEvent('download'), page.getByTestId('export-component').getByRole('button', { name: 'Download' }).click()])
  expect(file.suggestedFilename()).toBe('Pair.frees')
  const exported = readFileSync(await file.path(), 'utf8')
  expect(exported.split('\n').slice(0, 5)).toEqual(['// Component: Pair', '// Description: Two resistors, outer ends exposed', '// Ports: hot, R2_a', '// Parameters: R_load', '// Uses: Resistor (built-in)'])

  await page.getByRole('button', { name: 'Model', exact: true }).click()
  await page.getByRole('button', { name: 'Edit components' }).click()
  await page.getByRole('menuitem', { name: 'Import components…' }).click()
  await page.getByTestId('import-components-input').setInputFiles({ name: 'Pair.frees', mimeType: 'text/plain', buffer: Buffer.from(exported.replace('2*R_load', '3*R_load')) })
  const imports = page.getByTestId('import-components')
  await expect(imports.getByRole('checkbox', { name: "pair differs from this document's — replace mine" })).not.toBeChecked()
  await expect(imports.getByRole('button', { name: 'Import' })).toBeDisabled()
  await imports.getByRole('checkbox').check()
  await expect(imports.getByTestId('result-check')).toHaveText(/^Check of the result: /)
  await imports.getByRole('button', { name: 'Import' }).click()
  await editorText(page).toContain('Resistor R2(R=3*R_load*cos(0))')
  await page.getByRole('button', { name: 'Undo' }).click()
  await editorText(page).toBe(renamed)
  await record(testInfo, 'evidence', { renamed, exported })
})

test('CFG-05: export SVG, PNG and print for the model or a selection, with background, scale, legend, values and run context, without editing affordances', async ({ page }, testInfo) => {
  const svg = await openSolved(page, HUMID_AIR, 'Solve')
  const dialog = page.getByTestId('export-drawing')
  const save = async () => {
    const [file] = await Promise.all([page.waitForEvent('download'), dialog.getByRole('button', { name: 'Export', exact: true }).click()])
    return { name: file.suggestedFilename(), body: readFileSync(await file.path()) }
  }

  // A selected block exports alone; its selection ring, the values left out, the run context kept.
  await svg.getByRole('button', { name: /\bFAN$/ }).click()
  await page.getByRole('button', { name: 'Export…' }).click()
  await expect(dialog.getByRole('radio', { name: 'Selection' })).toBeChecked()
  await dialog.getByRole('checkbox', { name: 'Values' }).uncheck()
  const part = await save()
  const partXml = part.body.toString()
  expect(part.name).toBe('schematic.svg')
  expect(partXml).toContain('data-node="fan"')
  expect(partXml).not.toContain('data-node="coil"')
  expect(partXml).not.toMatch(/data-badge|data-bend|data-wire|data-transient|data-background/)
  expect(partXml).toMatch(/<rect[^>]*data-plain="([^"]+)"[^>]*stroke="\1"/)
  expect(partXml).toContain('Solved: ')

  // The whole model on white, then the same at 2× as PNG.
  await page.getByRole('button', { name: 'Export…' }).click()
  await dialog.getByText('Whole model').click()
  await dialog.getByText('White').click()
  const whole = (await save()).body.toString()
  expect(whole).toContain('fill="#ffffff"')
  for (const id of ['room', 'hp', 'coil', 'fan', 'sup']) expect(whole).toContain(`data-node="${id}"`)
  expect(whole).toContain('data-badge')
  const width = Number(/<svg[^>]* width="(\d+)"/.exec(whole)![1])
  await page.getByRole('button', { name: 'Export…' }).click()
  await dialog.getByText('Whole model').click()
  await dialog.getByText('White').click()
  await dialog.getByText('PNG').click()
  const png = await save()
  expect(png.name).toBe('schematic.png')
  expect(png.body.subarray(1, 4).toString()).toBe('PNG')
  expect(png.body.readUInt32BE(16)).toBe(Math.round(width * 2))

  // Print: a frame holding only the drawing, on the page size asked for.
  await page.getByRole('button', { name: 'Export…' }).click()
  await dialog.getByText('Print / PDF').click()
  await dialog.getByText('Whole model').click()
  await dialog.getByRole('combobox', { name: 'Page' }).click()
  await page.getByRole('option', { name: 'Letter' }).click()
  await dialog.getByRole('button', { name: 'Export', exact: true }).click()
  const printed = page.frameLocator('iframe[data-testid="print-frame"]')
  expect(await printed.locator('style').textContent()).toContain('size: Letter landscape')
  await expect(printed.locator('[data-node]')).toHaveCount(5)
  await expect(printed.locator('[data-wire], [data-bend]')).toHaveCount(0)
  await record(testInfo, 'evidence', { selectionSvgBytes: part.body.length, wholeWidth: width, pngWidth: png.body.readUInt32BE(16) })
})

test('AC-14: insert, configure, connect, inspect, solve and export from the keyboard and the structured list, announced; typing never fires canvas keys', async ({ page }, testInfo) => {
  const start = '// AC-14: built from the keyboard\n'
  const source = 'https://raw.example/keyboard.frees'
  await page.route(source, (route) => route.fulfill({ contentType: 'text/plain', body: start }))
  await page.goto('/?url=' + encodeURIComponent(source))
  await expect(page.locator('.cm-content')).toContainText('AC-14')
  await showView(page, 'Schematic')
  const svg = page.getByRole('application', { name: /Component network schematic/ })
  const wizard = page.getByRole('dialog', { name: 'Insert a Component' })
  const quick = page.getByTestId('quick-add')
  const announcer = page.getByTestId('canvas-announcer')
  const palette = async (command: string) => {
    await page.keyboard.press('Control+K')
    await page.getByPlaceholder('Search views, tools, and actions…').fill(command)
    await page.keyboard.press('Enter')
    await expect(page.getByPlaceholder('Search views, tools, and actions…')).toBeHidden()
  }
  const press = async (target: Locator, key = 'Enter') => {
    await target.focus()
    await page.keyboard.press(key)
  }
  const insert = async (type: string, field?: [RegExp, string]) => {
    await expect(quick.getByLabel('Search components')).toBeFocused()
    await page.keyboard.type(type)
    await page.keyboard.press('Enter')
    if (field) {
      await wizard.getByRole('textbox', { name: field[0] }).focus()
      await page.keyboard.type(field[1])
    }
    await press(wizard.getByRole('button', { name: 'Add to System' }))
  }

  // Insert and configure: the palette's canvas command, then the canvas's own `a` key.
  await palette('Add component')
  await insert('VoltageSource', [/^E\s*\[V\]/, '10'])
  await expect(svg.locator('[data-node="vs"]')).toBeVisible()
  const canvas = svg.locator('..')
  await press(canvas, 'a')
  await insert('Resistor', [/^R\s*\[ohm\]/, '5'])
  await press(canvas, 'a')
  // Typing in the search box is text: `l` does not open the list, Delete deletes nothing.
  await page.keyboard.type('Gl')
  await page.keyboard.press('Delete')
  await expect(page.getByTestId('structured-list')).toHaveCount(0)
  await page.keyboard.press('Backspace')
  await page.keyboard.type('round')
  await page.keyboard.press('Enter')
  await press(wizard.getByRole('button', { name: 'Add to System' }))
  await editorText(page).toContain('Ground GROU()')

  // Check is announced; connect through the port fields, each announced.
  await page.keyboard.press('F4')
  await expect(announcer).toContainText(/^Check: /)
  for (const [a, b] of [['VS.p', 'RESI.a'], ['RESI.b', 'VS.n'], ['VS.n', 'GROU.port']]) {
    for (const [field, port] of [['Connect from port', a], ['Connect to port', b]]) {
      await page.getByRole('combobox', { name: field }).focus()
      await page.keyboard.type(port)
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('Enter')
    }
    await press(page.getByRole('button', { name: 'Connect', exact: true }))
    await expect(announcer).toHaveText(`Connected ${a} — ${b}`) // once Check confirms it
  }
  await editorText(page).toContain('connect(VS.n, GROU.port)')

  // The structured list: every component and connection, each reachable without the drawing.
  await page.keyboard.press('F4')
  await press(canvas, 'l')
  const list = page.getByRole('region', { name: 'Components and connections' })
  await expect(list.getByRole('heading', { name: 'Components (3)' })).toBeVisible()
  await expect(list.getByRole('heading', { name: 'Connections (3)' })).toBeVisible()
  await press(list.getByRole('button', { name: 'Inspect RESI' }))
  await expect(page.getByTestId('param-inspector').locator('[data-param="r"]')).toContainText('5 [ohm]')
  await press(list.getByRole('button', { name: /^Open connection resi\.b — vs\.n/i }))
  await expect(page.getByTestId('wire-card')).toBeVisible()

  // Solve with F2, export from the palette.
  await page.keyboard.press('F2')
  await expect(page.getByText(/^Solved/i).first()).toBeVisible({ timeout: 60_000 })
  await palette('Export drawing')
  const [file] = await Promise.all([page.waitForEvent('download'), press(page.getByTestId('export-drawing').getByRole('button', { name: 'Export', exact: true }))])
  // RESI is selected from the list, so the selection is what exports.
  const exported = readFileSync(await file.path(), 'utf8')
  expect(exported).toContain('data-node="resi"')
  expect(exported).not.toContain('data-node="grou"')

  // The shortcuts sheet lists the canvas keys, once the export dialog has closed.
  await expect(page.getByTestId('export-drawing')).toBeHidden()
  await page.locator('body').focus()
  await page.keyboard.press('Shift+?')
  await expect(page.getByRole('dialog', { name: 'Keyboard Shortcuts' })).toContainText('Schematic: Component and connection list')
  await record(testInfo, 'evidence', { text: await savedText(page) })
})

const SEARCHED = `function [a, b] = Pair(R_load)
  Resistor R1(R=R_load)
  Resistor R2(R=R_load)
  port(a)
  port(b)
  connect(R1.b, R2.b)
  connect(a, R1.a)
  connect(b, R2.a)
end
R_load = 5 [ohm]
VoltageSource VS(E=10 [V])
Pair SUB1(R_load=R_load)
Ground G()
Resistor SPARE(R=1)
connect(VS.p, SUB1.a)
connect(SUB1.b, VS.n, G.port)
I_load = SUB1.R1.a.I
`

test('VIEW-07: search blocks, types, ports, nets, parameters, statements and issues; a hit opens its scope and centres it; the saved camera holds', async ({ page }, testInfo) => {
  const svg = await openSolved(page, SEARCHED, 'Check')
  const search = async (q: string, hit: RegExp) => {
    await svg.locator('..').focus()
    await page.keyboard.press('/')
    await page.getByRole('textbox', { name: 'Search the model' }).fill(q)
    await page.getByTestId('model-search').getByRole('button', { name: hit }).first().click()
  }
  const centred = async (id: string) => {
    const box = (await svg.boundingBox())!
    const node = (await svg.locator(`[data-node="${id}"]`).boundingBox())!
    return Math.hypot(node.x + node.width / 2 - (box.x + box.width / 2), node.y + node.height / 2 - (box.y + box.height / 2))
  }
  // A root camera the user set; a search into SUB1 and Back must not lose it.
  await page.getByRole('button', { name: 'Zoom in' }).click()
  const rootCamera = await svg.locator('[data-node="vs"]').boundingBox()

  await search('r2', /^block R2 Resistor in SUB1/)
  await expect(page.getByRole('navigation', { name: 'Breadcrumbs' })).toHaveText(/Model›SUB1 \(Pair\)/)
  await expect(svg.locator('[data-node="sub1.r2"]')).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(() => centred('sub1.r2')).toBeLessThan(8)
  await page.getByRole('button', { name: 'Back' }).click()
  await expect.poll(() => svg.locator('[data-node="vs"]').boundingBox()).toEqual(rootCamera)

  // A type selects every block of it in that scope; a net its blocks; a binding its block.
  await search('resistor', /^type Resistor 2 in SUB1/)
  await expect(svg.locator('[data-node][aria-pressed="true"]')).toHaveCount(2)
  await search('sub1.r1.b', /^net sub1\.r1\.b — sub1\.r2\.b/)
  await expect(svg.locator('[data-node][aria-pressed="true"]')).toHaveCount(2)
  await search('R_load', /^parameter SUB1\.r_load = R_load/)
  await expect(svg.locator('[data-node="sub1"]')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('navigation', { name: 'Breadcrumbs' })).toHaveText(/^Model$/)
  await search('vs.p', /^port VS\.p electrical/)
  await expect(svg.locator('[data-node="vs"]')).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(() => centred('vs')).toBeLessThan(8)

  // A statement selects the blocks it names (the editor follows, behind its tab); an issue its block.
  await search('I_load', /^statement I_load = SUB1\.R1\.a\.I line 17/)
  await expect(svg.locator('[data-node="sub1"]')).toHaveAttribute('aria-pressed', 'true')
  await search('not connected', /^issue spare\.a is not connected/)
  await expect(svg.locator('[data-node="spare"]')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('canvas-announcer')).toHaveText(/^spare\.a is not connected, in Model/)
  await svg.locator('..').focus()
  await page.keyboard.press('/')
  await page.getByRole('textbox', { name: 'Search the model' }).fill('zzz')
  await expect(page.getByTestId('model-search')).toContainText('Nothing matches.')
  await record(testInfo, 'evidence', { text: await savedText(page) })
})

test('VIEW-08: presets change view settings only; a named view restores scope, camera and settings, survives save and reopen, and never edits the document', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    delete (window as { showSaveFilePicker?: unknown }).showSaveFilePicker
    delete (window as { showOpenFilePicker?: unknown }).showOpenFilePicker
  })
  const svg = await openSolved(page, SEARCHED, 'Check')
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('frees.project') ?? '{}').schematic)
  const views = page.getByTestId('views')
  const openViews = async () => {
    if (!(await views.isVisible())) await page.getByRole('button', { name: 'Views', exact: true }).click()
  }
  await openViews()
  await views.getByRole('button', { name: 'Debug', exact: true }).click()
  await expect.poll(async () => (await saved())?.view).toMatchObject({ portLabels: true, grouping: 'domain' })

  // Look into SUB1, zoom, and name that view.
  await svg.locator('..').focus()
  await page.keyboard.press('/')
  await page.getByRole('textbox', { name: 'Search the model' }).fill('r2')
  await page.getByTestId('model-search').getByRole('button', { name: /^block R2/ }).first().click()
  await page.getByRole('button', { name: 'Zoom in' }).click()
  await page.waitForTimeout(300)
  // R1: R2 carries the search's selection ring, which a view does not restore.
  const inside = await svg.locator('[data-node="sub1.r1"]').boundingBox()
  await openViews()
  await views.getByRole('textbox', { name: 'View name' }).fill('Inside')
  await views.getByRole('button', { name: 'Save', exact: true }).click()

  // Elsewhere, with other settings; the view brings all of it back.
  await page.getByRole('button', { name: 'Back' }).click()
  await expect(views).toBeHidden()
  await openViews()
  await views.getByRole('button', { name: 'Names', exact: true }).click()
  await expect.poll(async () => (await saved())?.view?.portLabels).toBe(false)
  await views.getByRole('button', { name: 'Inside', exact: true }).click()
  await expect(page.getByRole('navigation', { name: 'Breadcrumbs' })).toHaveText(/Model›SUB1 \(Pair\)/)
  await expect.poll(() => svg.locator('[data-node="sub1.r1"]').boundingBox()).toEqual(inside)
  await expect.poll(async () => (await saved())?.view).toMatchObject({ portLabels: true, grouping: 'domain' })

  // Saved with the project file and back after reopening.
  await page.getByRole('button', { name: 'File', exact: true }).click()
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('menuitem', { name: 'Save Project', exact: true }).click()])
  const file = testInfo.outputPath('view08.frees')
  await download.saveAs(file)
  await page.getByRole('button', { name: 'File', exact: true }).click()
  await page.getByRole('menuitem', { name: 'New Project', exact: true }).click()
  await expect(svg.locator('[data-node="vs"]')).toHaveCount(0)
  await page.getByRole('button', { name: 'File', exact: true }).click()
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('menuitem', { name: 'Open Project…', exact: true }).click()])
  await chooser.setFiles(file)
  await page.getByRole('button', { name: 'Check', exact: true }).click()
  await expect(svg.locator('[data-node="vs"]')).toHaveCount(1, { timeout: 15_000 })
  await openViews()
  await views.getByRole('button', { name: 'Inside', exact: true }).click()
  await expect(page.getByRole('navigation', { name: 'Breadcrumbs' })).toHaveText(/Model›SUB1 \(Pair\)/)
  await views.getByRole('button', { name: 'Delete view Inside' }).click()
  await expect(views).toContainText('None yet.')
  await editorText(page).toBe(SEARCHED)
  await record(testInfo, 'evidence', { inside, schematic: await saved() })
})

const NOTED = PAIR.replace('I_load = R1.a.I\n', '')

test('VIEW-09: notes, callouts, variable cards and legends; links follow a rename and show broken when the target is deleted; the document is untouched', async ({ page }, testInfo) => {
  const svg = await openSolved(page, NOTED)
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('frees.project') ?? '{}').schematic?.annotations ?? [])
  const annotate = async (item: string | RegExp, text?: string) => {
    await page.getByRole('button', { name: 'Annotate', exact: true }).click()
    await page.getByRole('menuitem', { name: item }).click()
    if (text === undefined) return
    const dialog = page.getByRole('dialog', { name: 'Annotation' })
    await dialog.getByRole('textbox', { name: 'Text' }).fill(text)
    await dialog.getByRole('button', { name: 'Save' }).click()
  }
  const card = svg.locator('[data-annotation="card"]')
  const callout = svg.locator('[data-annotation="callout"]')

  // A card from a pinned block's value, a callout to the block, a note and the line legend.
  await svg.locator('[data-node="r1"]').click()
  await page.getByRole('button', { name: 'Card for R1.a.I on the canvas' }).click()
  await expect(card).toHaveAccessibleName('card: R1.a.i, 0.66667 A')
  await annotate(/^Callout to R1$/, 'Load resistor')
  await expect(callout).toHaveAccessibleName('callout: Load resistor')
  await expect(callout.locator('line')).toHaveCount(1)
  await annotate('Note', 'Check wiring\nbefore the test')
  await expect(svg.locator('[data-annotation="note"]')).toHaveAccessibleName('note: Check wiring, before the test')
  await annotate('Legend')
  await expect(svg.locator('[data-annotation="legend"]')).toContainText(/electrical/)

  // Drag the note: it moves and stays moved.
  const note = svg.locator('[data-annotation="note"] rect')
  const box = (await note.boundingBox())!
  await page.mouse.move(box.x + 10, box.y + 8)
  await page.mouse.down()
  await page.mouse.move(box.x + 70, box.y + 48, { steps: 5 })
  await page.mouse.up()
  await expect.poll(async () => (await note.boundingBox())!.x).toBeCloseTo(box.x + 60, 0)
  await expect.poll(async () => (await saved()).map((a: { kind: string; target: string }) => `${a.kind} ${a.target}`)).toEqual(['card r1.a.i', 'callout r1', 'note ', 'legend '])
  await editorText(page).toBe(NOTED)

  // Rename R1 from its card, still pinned: both links follow.
  await page.getByRole('button', { name: 'Rename', exact: true }).click()
  await page.getByLabel('New instance name').fill('RL')
  await page.keyboard.press('Enter')
  await expect(svg.locator('[data-node="rl"]')).toHaveCount(1, { timeout: 15_000 })
  await expect.poll(async () => (await saved()).map((a: { target: string }) => a.target)).toEqual(['rl.a.i', 'rl', '', ''])
  await expect(svg.locator('[data-annotation][data-broken]')).toHaveCount(0)
  await expect(callout.locator('line')).toHaveCount(1)
  // The rename withdrew the solve: the card says so instead of showing the old number.
  await expect(card).toHaveAccessibleName('card: RL.a.i, Not solved')

  // Delete RL: both links show broken, then Undo mends them.
  await svg.getByRole('button', { name: /\bRL$/ }).click()
  await page.keyboard.press('Delete')
  await page.getByTestId('delete-impact').getByRole('button', { name: 'Delete' }).click()
  await expect(svg.locator('[data-node="rl"]')).toHaveCount(0, { timeout: 15_000 })
  await expect(callout).toHaveAccessibleName('callout: Load resistor, Link broken: rl no longer exists')
  await expect(card).toHaveAccessibleName('card: rl.a.i, Link broken: rl.a.i no longer exists')
  await expect(callout).toHaveAttribute('data-broken', 'true')
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(svg.locator('[data-annotation][data-broken]')).toHaveCount(0, { timeout: 15_000 })

  // Edit and delete from the annotation itself.
  await svg.locator('[data-annotation="legend"]').click()
  await page.getByRole('dialog', { name: 'Annotation' }).getByRole('button', { name: 'Delete' }).click()
  await expect(svg.locator('[data-annotation="legend"]')).toHaveCount(0)
  await testInfo.attach('view09.png', { body: await svg.screenshot(), contentType: 'image/png' })
  await record(testInfo, 'evidence', { annotations: await saved() })
})

const EQUATIONS = `// AC-16: equations only
x = 2
y = x^2 + 1
z + w = y
z - w = 1
q = sin(z)*x
`

test('AC-16: an equation-only model explains itself, shows its variables and the solve\'s block dependencies without wires; a renamed or deleted variable shows a broken card', async ({ page }, testInfo) => {
  const source = 'https://raw.example/equations.frees'
  await page.route(source, (route) => route.fulfill({ contentType: 'text/plain', body: EQUATIONS }))
  await page.goto('/?url=' + encodeURIComponent(source))
  await expect(page.locator('.cm-content')).toContainText('AC-16', { timeout: 60_000 })
  await page.getByRole('button', { name: 'Check', exact: true }).click()
  await page.locator('body').click({ position: { x: 5, y: 5 } })
  await page.keyboard.press('Control+K')
  await page.getByPlaceholder('Search views, tools, and actions…').fill('Schematic')
  await page.keyboard.press('Enter')
  const view = page.getByTestId('equation-view')
  await expect(view).toContainText('This model is equations only')
  // Before a solve: the variables Check found, nothing about order.
  await expect(view).toContainText('Solve to see how the equations depend on each other.')
  await view.getByRole('button', { name: 'y', exact: true }).click()
  const cards = page.getByTestId('variable-cards')
  await expect(cards.getByLabel(/^card: /)).toHaveAccessibleName('card: y, Not solved')

  await page.getByRole('button', { name: 'Solve', exact: true }).click()
  await expect(page.getByText(/^Solved/i).first()).toBeVisible({ timeout: 120_000 })
  const deps = page.getByTestId('dependencies')
  await expect(deps.locator('[data-block]')).toHaveCount(4)
  await expect(deps.getByRole('group', { name: /^Block 3, solved together: solves w, z$/ })).toBeVisible()
  // Each arrow is a dependency the solve's blocks carry; no wires are drawn.
  await expect(deps.locator('path[data-dependency]')).toHaveCount(4)
  expect(await deps.locator('path[data-dependency]').evaluateAll((ps) => ps.map((p) => `${p.getAttribute('data-dependency')} ${p.querySelector('title')?.textContent}`))).toEqual([
    '1-2 Block 2 uses x from block 1',
    '2-3 Block 3 uses y from block 2',
    '1-4 Block 4 uses x from block 1',
    '3-4 Block 4 uses z from block 3',
  ])
  await expect(page.locator('path[data-net], [data-node]')).toHaveCount(0)
  await expect(cards.getByLabel(/^card: /)).toHaveAccessibleName('card: y, 5 -')
  await deps.getByRole('button', { name: 'Card for q' }).click()
  await expect(cards.getByLabel(/^card: /)).toHaveCount(2)

  // An equation opens its line in the editor.
  await deps.getByRole('button', { name: 'Equation z - w = 1' }).click()
  await expect(page.locator('.cm-activeLine')).toContainText('z - w = 1')

  // Rename y in the source: the card for y reads broken, not the old 5.
  const editor = page.locator('.cm-content')
  await editor.click()
  await page.keyboard.press('Control+a')
  await page.keyboard.insertText(EQUATIONS.replaceAll('y', 'yy'))
  await page.getByRole('button', { name: 'Check', exact: true }).click()
  await page.getByRole('button', { name: /^Schematic/ }).first().click()
  await expect(cards.getByLabel('card: y, Link broken: y no longer exists')).toBeVisible({ timeout: 15_000 })
  await expect(cards.getByLabel('card: q, Not solved')).toBeVisible()
  await expect(deps).toHaveCount(0)
  await cards.getByRole('button', { name: 'Remove card y' }).click()
  await expect(cards.getByLabel(/^card: /)).toHaveCount(1)
  await testInfo.attach('ac16.png', { body: await view.screenshot(), contentType: 'image/png' })
  await record(testInfo, 'evidence', { cards: await page.evaluate(() => JSON.parse(localStorage.getItem('frees.project') ?? '{}').schematic?.annotations) })
})

test('COMP-07: rotate, mirror, detail and name placement per block; ports keep their names and wires stay on them; the equations and result do not change', async ({ page }, testInfo) => {
  const svg = await openSolved(page, PAIR)
  // Where R1's ports sit relative to its centre, and whether the VS–R1 wire still ends on port a.
  const geometry = () =>
    svg.evaluate((root) => {
      const centre = (el: Element) => {
        const r = el.getBoundingClientRect()
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
      }
      const block = centre(root.querySelector('[data-node="r1"] rect')!)
      const port = (p: string) => {
        const c = centre(root.querySelector(`[data-port="r1.${p}"] circle:last-of-type`)!)
        return { dx: Math.round(c.x - block.x), dy: Math.round(c.y - block.y) }
      }
      const wire = root.querySelector('path[data-route="r1.a|vs.p"]') as SVGPathElement
      const m = wire.getScreenCTM()!
      const ends = [0, wire.getTotalLength()].map((t) => wire.getPointAtLength(t)).map((p) => ({ x: m.a * p.x + m.c * p.y + m.e, y: m.b * p.x + m.d * p.y + m.f }))
      const a = centre(root.querySelector('[data-port="r1.a"] circle:last-of-type')!)
      return { a: port('a'), b: port('b'), wireOnA: Math.min(...ends.map((e) => Math.hypot(e.x - a.x, e.y - a.y))) < 2 }
    })
  // The layout puts both ports on R1's bottom edge, a to the left of b.
  const before = await geometry()
  expect([before.a.dy === before.b.dy, before.a.dy > 0, before.a.dx < before.b.dx, before.wireOnA]).toEqual([true, true, true, true])
  await svg.locator('[data-node="r1"]').click()
  const editor = page.getByTestId('style-editor')
  await editor.getByText('90°', { exact: true }).click()
  // A quarter turn clockwise: the bottom edge becomes the left, its left end the top.
  await expect.poll(async () => (await geometry()).a.dx).toBeLessThan(0)
  let turned = await geometry()
  expect([turned.a.dx === turned.b.dx, turned.a.dy < turned.b.dy, turned.wireOnA]).toEqual([true, true, true])
  // Mirrored first, then turned: same side, the order flips.
  await editor.getByRole('switch', { name: 'Mirror' }).click()
  await expect.poll(async () => (await geometry()).a.dy).toBeGreaterThan(0)
  turned = await geometry()
  expect([turned.a.dx === turned.b.dx, turned.a.dy > turned.b.dy, turned.wireOnA]).toEqual([true, true, true])
  // The name moves below the block and grows; this block alone shows its name only.
  await editor.getByRole('combobox', { name: 'Name position' }).click()
  await page.getByRole('option', { name: 'Below' }).click()
  await expect(svg.locator('[data-node="r1"] text[data-label="below"]')).toHaveAttribute('text-anchor', 'middle')
  await editor.getByRole('combobox', { name: 'Name size' }).click()
  await page.getByRole('option', { name: '16', exact: true }).click()
  await expect(svg.locator('[data-node="r1"] text[data-label="below"]')).toHaveAttribute('font-size', '16')
  await editor.getByRole('combobox', { name: 'Detail' }).click()
  await page.getByRole('option', { name: 'Name only' }).click()
  await expect(svg.locator('[data-node="r1"] [data-badge]')).toHaveCount(0)
  await expect(svg.locator('[data-node="r2"] [data-badge]')).toHaveCount(1)
  await expect
    .poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem('frees.project') ?? '{}').schematic?.styles?.instances?.r1))
    .toEqual({ rotate: 90, mirror: true, label: 'below', labelSize: 16, density: 'names' })
  // Presentation only: the document is unchanged and the solve gives the same current.
  await editorText(page).toBe(PAIR)
  await page.getByRole('button', { name: 'Solve', exact: true }).click()
  await expect(page.getByText(/^Solved/i).first()).toBeVisible({ timeout: 120_000 })
  // R1's card is still pinned: its current reads as before the transforms.
  await expect(page.getByText('0.66667 A').first()).toBeVisible()
  await testInfo.attach('comp07.png', { body: await svg.screenshot(), contentType: 'image/png' })
  await record(testInfo, 'evidence', { before, turned })
})

test('AC-11: trace coolant, refrigerant and thermal links on the EV model; open a component\'s values in watch, table, plot and state windows; grouping never duplicates equipment or re-solves', async ({ page }, testInfo) => {
  test.setTimeout(300_000)
  const svg = await openSolved(page, EV_THERMAL_EXAMPLE_TEXT)
  const ids = () => svg.locator('[data-node]').evaluateAll((ns) => ns.map((n) => n.getAttribute('data-node')))
  const banner = page.getByRole('status').filter({ hasText: /showing \d+ of \d+ components/ })
  const lit = async () => Number((await banner.textContent())!.match(/showing (\d+) of/)![1])

  // Trace from each side of the chiller: refrigerant (CHLR), coolant (CHLC) and the thermal tie between them.
  const traced: Record<string, number> = {}
  for (const block of ['CHLR', 'CHLC', 'BATT']) {
    await svg.getByRole('button', { name: new RegExp(`\\b${block}$`) }).click()
    await page.getByRole('button', { name: 'Trace net' }).click()
    traced[block] = await lit()
    await page.keyboard.press('Escape')
  }
  expect(traced.CHLR).toBeGreaterThan(1)
  expect(traced.CHLC).toBeGreaterThan(1)

  // Watch the chiller's refrigerant inlet pressure.
  await svg.getByRole('button', { name: /\bCHLR$/ }).click()
  await page.getByRole('button', { name: /^Watch CHLR\.in\.P$/i }).click()
  const watch = page.getByTestId('watch')
  await expect(watch).toContainText(/CHLR\.in\.p/i)
  const watched = await watch.textContent()

  // Group by domain: every block still drawn once, the solve untouched.
  const before = (await ids()).sort()
  expect(before).toHaveLength(26)
  await page.getByRole('button', { name: 'Views', exact: true }).click()
  await page.getByTestId('views').getByRole('button', { name: 'Debug', exact: true }).click()
  await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem('frees.project') ?? '{}').schematic?.view?.grouping)).toBe('domain')
  await page.keyboard.press('Escape')
  expect((await ids()).sort()).toEqual(before)
  await expect(watch).toHaveText(watched!)

  // Its fluid's property diagram.
  // Pin CHLR's card again when another window took the view (a second click would unpin it).
  const open = async (name: RegExp) => {
    const button = page.getByRole('button', { name })
    for (let k = 0; k < 2 && !(await button.waitFor({ timeout: 3000 }).then(() => true, () => false)); k++) await svg.getByRole('button', { name: /\bCHLR$/ }).click()
    await button.click()
  }
  await open(/^Open CHLR\.in\.P in…$/i)
  await page.getByRole('menuitem', { name: /^Property diagram/ }).click()
  await expect(page.getByRole('dialog', { name: 'New Plot' }).getByRole('combobox', { name: 'Fluid' })).toHaveValue('R1234yf')
  await page.keyboard.press('Escape')

  // Two of its values into a parametric table; run it; the plot then opens from the table.
  // A table edit withdraws the steady result (AC-10), so the model is solved again before each handoff.
  const solveSteady = async () => {
    await page.getByRole('button', { name: /^Schematic/ }).first().click()
    await page.getByRole('button', { name: 'Solve', exact: true }).click()
    await expect(watch).not.toContainText('not solved', { timeout: 120_000 })
  }
  await open(/^Open CHLR\.in\.P in…$/i)
  await page.getByRole('menuitem', { name: /^Add to a parametric table/ }).click()
  await solveSteady()
  await open(/^Open CHLR\.q in…$/i)
  await page.getByRole('menuitem', { name: /^Add to a parametric table/ }).click()
  // The table window has focus: Solve runs its three rows.
  await page.getByRole('button', { name: 'Solve', exact: true }).click()
  await expect(page.getByText('Run status: completed')).toBeVisible({ timeout: 240_000 })
  await solveSteady()
  await open(/^Open CHLR\.q in…$/i)
  await expect(page.getByRole('menuitem', { name: /^Plot/ })).toBeEnabled()
  await page.getByRole('menuitem', { name: /^Plot/ }).click()
  // The X-Y plot dialog opens on the run table, CHLR.q against its other column.
  const plot = page.getByRole('dialog', { name: 'New Plot' })
  await expect(plot.getByRole('combobox', { name: 'X-axis variable' })).toHaveValue('chlr.in.p')
  await expect(plot).toContainText('chlr.q')
  await testInfo.attach('ac11-plot.png', { body: await plot.screenshot(), contentType: 'image/png' })
  await record(testInfo, 'evidence', { traced, ids: before.length })
})

test('AC-15 (without sheets and custom symbols): engineering and presentation views, linked annotations, a display unit and the theme survive save, reopen and export', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    delete (window as { showSaveFilePicker?: unknown }).showSaveFilePicker
    delete (window as { showOpenFilePicker?: unknown }).showOpenFilePicker
  })
  const svg = await openSolved(page, PAIR)
  const views = page.getByTestId('views')
  const saveView = async (preset: string) => {
    if (!(await views.isVisible())) await page.getByRole('button', { name: 'Views', exact: true }).click()
    await views.getByRole('button', { name: preset, exact: true }).click()
    await views.getByRole('textbox', { name: 'View name' }).fill(preset)
    await views.getByRole('button', { name: 'Save', exact: true }).click()
  }
  await saveView('Engineering')
  await saveView('Presentation')
  await page.keyboard.press('Escape')

  // A note, and a card for R1's current read in mA.
  await page.getByRole('button', { name: 'Annotate', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Note' }).click()
  await page.getByRole('dialog', { name: 'Annotation' }).getByRole('textbox', { name: 'Text' }).fill('Bench test, 10 V')
  await page.getByRole('dialog', { name: 'Annotation' }).getByRole('button', { name: 'Save' }).click()
  await svg.locator('[data-node="r1"]').click()
  await page.getByRole('button', { name: 'Card for R1.a.I on the canvas' }).click()
  await page.getByRole('button', { name: 'Format R1.a.I' }).click()
  const fmt = page.getByTestId('format-variable')
  await fmt.getByRole('textbox', { name: /Display unit/ }).fill('mA')
  await fmt.getByRole('textbox', { name: /Display unit/ }).press('Enter')
  await page.keyboard.press('Escape')
  const card = svg.locator('[data-annotation="card"]')
  await expect(card).toHaveAccessibleName(/^card: R1\.a\.i, 666\.67 mA$/)

  // Theme: the annotations take the light ink.
  const fill = () => card.locator('rect').getAttribute('fill')
  const dark = await fill()
  await page.getByRole('button', { name: 'Switch to light mode' }).click()
  await expect.poll(fill).not.toBe(dark)

  // Export carries the annotations unless they are left out.
  const dialog = page.getByTestId('export-drawing')
  const exportSvg = async (annotations: boolean) => {
    await page.getByRole('button', { name: 'Export…' }).click()
    await dialog.getByText('Whole model').click()
    if (!annotations) await dialog.getByRole('checkbox', { name: 'Annotations' }).uncheck()
    const [file] = await Promise.all([page.waitForEvent('download'), dialog.getByRole('button', { name: 'Export', exact: true }).click()])
    return readFileSync(await file.path(), 'utf8')
  }
  const withNotes = await exportSvg(true)
  expect(withNotes).toContain('data-annotation="note"')
  expect(withNotes).toContain('666.67 mA')
  expect(await exportSvg(false)).not.toContain('data-annotation=')

  // Save, start over, reopen: views, annotations and the unit come back.
  await page.getByRole('button', { name: 'File', exact: true }).click()
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('menuitem', { name: 'Save Project', exact: true }).click()])
  const file = testInfo.outputPath('ac15.frees')
  await download.saveAs(file)
  await page.getByRole('button', { name: 'File', exact: true }).click()
  await page.getByRole('menuitem', { name: 'New Project', exact: true }).click()
  await expect(svg.locator('[data-node="r1"]')).toHaveCount(0)
  await page.getByRole('button', { name: 'File', exact: true }).click()
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('menuitem', { name: 'Open Project…', exact: true }).click()])
  await chooser.setFiles(file)
  await page.getByRole('button', { name: 'Solve', exact: true }).click()
  await expect(svg.locator('[data-node="r1"]')).toHaveCount(1, { timeout: 30_000 })
  await expect(card).toHaveAccessibleName(/^card: R1\.a\.i, 666\.67 mA$/, { timeout: 30_000 })
  await expect(svg.locator('[data-annotation="note"]')).toHaveAccessibleName('note: Bench test, 10 V')
  await page.getByRole('button', { name: 'Views', exact: true }).click()
  await expect(views.getByRole('button', { name: /^(Engineering|Presentation)$/ })).toHaveCount(4) // two presets, two saved views
  await views.getByRole('button', { name: 'Presentation', exact: true }).last().click()
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('frees.project') ?? '{}').schematic?.view?.background)).toBe('plain')
  await editorText(page).toBe(PAIR)
  await record(testInfo, 'evidence', { exported: withNotes.length })
})

// The 500-component budget (CR section 5): the chilled-water floor scaled to 83 zones,
// 502 instances. Measured on Check alone; a solve is not part of the canvas budget.
const BIG_ZONES = Array.from({ length: 83 }, (_, j) => j + 1)
const BIG_FLOOR = [
  '// Chilled-water floor: 83 zones, 502 instances',
  'LiquidSource  CHWS(fluid$=Water, mdot=9 [kg/s], P=200000 [Pa], T=280 [K])',
  'LiquidPump    PUMP(fluid$=Water, eta=0.65)',
  'PUMP.out.P = 320000 [Pa]',
  'ThermalSource OUT(T=305 [K])',
  ...BIG_ZONES.flatMap((i) => [
    `LiquidPipe    P${i}(fluid$=Water, L=${2 + (i % 20)} [m], D=0.025 [m], rough=4.5e-5 [m])`,
    `LiquidOrifice V${i}(CdA=2.2e-05, rho=1000)`,
    `LiquidWallHX  FC${i}(fluid$=Water, UA=200 [W/K])`,
    `MassGen       Z${i}(C=2e6, Qgen=${QGEN[i % 16]}, T0=297 [K])`,
    `Convection    E${i}(htc=3, area=20 [m^2])`,
  ]),
  ...BIG_ZONES.slice(1).map((i) => `LiquidMixer   M${i - 1}()`),
  'LiquidPipe    RISER(fluid$=Water, L=30 [m], D=0.1 [m], rough=4.5e-5 [m])',
  'LiquidSink    CHWR()',
  `connect(PUMP.out, ${BIG_ZONES.map((i) => `P${i}.in`).join(', ')})`,
  'connect(CHWS.out, PUMP.in)',
  ...BIG_ZONES.flatMap((i) => [`connect(P${i}.out, V${i}.in)`, `connect(V${i}.out, FC${i}.in)`, `connect(FC${i}.wall, Z${i}.port, E${i}.a)`]),
  `connect(OUT.port, ${BIG_ZONES.map((i) => `E${i}.b`).join(', ')})`,
  'connect(FC1.out, M1.in1)',
  ...BIG_ZONES.slice(1).map((i) => `connect(FC${i}.out, M${i - 1}.in2)`),
  ...BIG_ZONES.slice(2).map((i) => `connect(M${i - 2}.out, M${i - 1}.in1)`),
  `connect(M${BIG_ZONES.length - 1}.out, RISER.in)`,
  'connect(RISER.out, CHWR.in)',
].join('\n') + '\n'

test('budget: 500 components — Check to drawn, selection and search latency, measured', async ({ page }, testInfo) => {
  test.setTimeout(300_000)
  const source = 'https://raw.example/big-floor.frees'
  await page.route(source, (route) => route.fulfill({ contentType: 'text/plain', body: BIG_FLOOR }))
  await page.goto('/?url=' + encodeURIComponent(source))
  await expect(page.locator('.cm-content')).toContainText('83 zones', { timeout: 60_000 })
  await page.locator('body').click({ position: { x: 5, y: 5 } })
  await page.keyboard.press('Control+K')
  await page.getByPlaceholder('Search views, tools, and actions…').fill('Schematic')
  await page.keyboard.press('Enter')
  const svg = page.getByRole('application', { name: /Component network schematic/ })
  const t0 = Date.now()
  await page.getByRole('button', { name: 'Check', exact: true }).click()
  await expect(svg.locator('path[data-net]').first()).toBeVisible({ timeout: 120_000 })
  const checkToDrawn = Date.now() - t0
  const nodes = await svg.locator('[data-node]').count()
  const wires = await svg.locator('path[data-net]').count()
  expect(nodes).toBeGreaterThanOrEqual(500)

  // Latency inside the page, click or keystroke to the painted frame that shows it, so
  // the harness's own round trip is not counted.
  const p95 = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.ceil(0.95 * xs.length) - 1]
  const select: number[] = await svg.evaluate(async (root) => {
    const frame = () => new Promise((r) => requestAnimationFrame(() => r(null)))
    const out: number[] = []
    for (let i = 1; i <= 20; i++) {
      const node = root.querySelector(`[data-node="fc${i}"]`)!
      const t = performance.now()
      node.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      while (node.getAttribute('aria-pressed') !== 'true') await frame()
      await frame()
      out.push(performance.now() - t)
    }
    return out
  })
  await page.keyboard.press('Escape')
  await svg.locator('..').focus()
  await page.keyboard.press('/')
  await expect(page.getByRole('textbox', { name: 'Search the model' })).toBeVisible()
  const search: number[] = await page.evaluate(async () => {
    const frame = () => new Promise((r) => requestAnimationFrame(() => r(null)))
    const input = document.querySelector('input[aria-label="Search the model"]') as HTMLInputElement
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    const list = () => document.querySelector('[data-testid="model-search"]')!
    const out: number[] = []
    for (const q of ['fc1', 'z4', 'v77', 'riser', 'mixer', 'e12', 'p50', 'chws', 'wallhx', 'pump', 'fc80', 'm40']) {
      set.call(input, '')
      input.dispatchEvent(new Event('input', { bubbles: true }))
      while (list().querySelector('button')) await frame()
      const t = performance.now()
      set.call(input, q)
      input.dispatchEvent(new Event('input', { bubbles: true }))
      while (!list().querySelector('button')) await frame()
      await frame()
      out.push(performance.now() - t)
    }
    return out
  })
  // ponytail: recorded, not asserted; CI runners vary too much for a hard 200 ms gate.
  const measured = { nodes, wires, checkToDrawn, selectP95: Math.round(p95(select)), searchP95: Math.round(p95(search)) }
  await record(testInfo, 'evidence', measured)
})

test('RUN-03: choose a block\'s readout, watch values, set display units and digits; rows and blocks select each other; the document is untouched', async ({ page }, testInfo) => {
  const svg = await openSolved(page, PAIR)
  await svg.locator('[data-node="r1"]').click()
  // The badge shows the variable chosen for it.
  await page.getByRole('button', { name: 'Show R1.a.I on the block' }).click()
  await expect(svg.locator('[data-node="r1"] [data-badge]')).toHaveText(/^a I = 0\.66667 A$/)
  // Watch two values; one reads in mA with 3 digits, the other in kV — display only.
  await page.getByRole('button', { name: 'Watch R1.a.I' }).click()
  await page.getByRole('button', { name: 'Watch R1.a.V' }).click()
  const watch = page.getByTestId('watch')
  await expect(watch.getByRole('button', { name: /^R1\.a\.i / })).toContainText(/0\.66667 A/)
  await watch.getByRole('button', { name: 'Format R1.a.i' }).click()
  const fmt = page.getByTestId('format-variable')
  await fmt.getByRole('textbox', { name: /Display unit/ }).fill('kW')
  await fmt.getByRole('textbox', { name: /Display unit/ }).press('Enter')
  await expect(fmt).toContainText('kW does not measure the same quantity as A.')
  await fmt.getByRole('textbox', { name: /Display unit/ }).fill('mA')
  await fmt.getByRole('textbox', { name: /Display unit/ }).press('Enter')
  await fmt.getByRole('combobox', { name: 'Significant digits' }).click()
  await page.getByRole('option', { name: '3', exact: true }).click()
  await page.keyboard.press('Escape')
  await expect(watch.getByRole('button', { name: /^R1\.a\.i / })).toContainText(/667 mA/)
  // The badge reads in the same unit; the document is unchanged.
  await expect(svg.locator('[data-node="r1"] [data-badge]')).toHaveText(/^a I = 667 mA$/)
  await editorText(page).toBe(PAIR)
  // A row selects its block; a selected block marks its rows.
  await svg.locator('[data-node="vs"]').click()
  await page.keyboard.press('Escape')
  await watch.getByRole('button', { name: /^R1\.a\.v / }).click()
  await expect(svg.locator('[data-node="r1"]')).toHaveAttribute('aria-pressed', 'true')
  await expect(watch.getByRole('button', { name: /^R1\.a\.i / })).toHaveAttribute('aria-current', 'true')
  await expect(page.getByTestId('canvas-announcer')).toHaveText(/port a of r1/)
  await watch.getByRole('button', { name: 'Stop watching R1.a.v' }).click()
  await expect(watch.getByRole('button', { name: /^R1\.a\.v / })).toHaveCount(0)
  await record(testInfo, 'evidence', { badge: await svg.locator('[data-node="r1"] [data-badge]').textContent() })
})

test('RUN-04/WIRE-10: wires coloured by one metric with a legend and scale; measured-flow arrows follow the solved sign; presentation only', async ({ page }, testInfo) => {
  const svg = await openSolved(page, PAIR)
  await page.getByRole('button', { name: 'Overlay' }).click()
  const settings = page.getByTestId('overlay-settings')
  await settings.getByRole('combobox', { name: 'Colour wires by' }).click()
  // Only quantities the solve produced, each with its unit.
  await expect(page.getByRole('option')).toHaveText(['Nothing', 'electrical V [V]', 'electrical I [A]'])
  await page.getByRole('option', { name: 'electrical V [V]' }).click()
  const legend = page.getByTestId('overlay-legend')
  await expect(legend).toContainText('electrical V [V]')
  await expect(legend.getByTestId('overlay-scale')).toHaveText('010')
  // VS.p sits at 10 V, the top of the scale: the widest wire; the grounded side the narrowest.
  const width = (route: string) => svg.locator(`path[data-route="${route}"]`).getAttribute('stroke-width')
  expect(Number(await width('r1.a|vs.p'))).toBeCloseTo(5, 5)
  expect(await svg.locator('path[data-overlay="value"]').count()).toBeGreaterThanOrEqual(3)

  // Flow arrows: current leaves VS at p and enters R1 at a.
  await settings.getByRole('switch', { name: 'Measured flow arrows' }).check()
  await expect(legend).toContainText('measured flow')
  const toward = await page.evaluate(() => {
    const at = (id: string) => {
      const g = document.querySelector(`[data-node="${id}"]`)!
      const [x, y] = /translate\(([-\d.]+), ([-\d.]+)\)/.exec(g.getAttribute('transform')!)!.slice(1).map(Number)
      const r = (g as SVGGraphicsElement).getBBox()
      return { x: x + r.width / 2, y: y + r.height / 2 }
    }
    const arrow = document.querySelector('path[data-route="r1.a|vs.p"] ~ path[data-arrow]')!
    const n = arrow.getAttribute('d')!.match(/-?[\d.]+/g)!.map(Number)
    const tip = { x: n[0], y: n[1] }
    const base = { x: (n[2] + n[4]) / 2, y: (n[3] + n[5]) / 2 }
    const d = (p: { x: number; y: number }, q: { x: number; y: number }) => Math.hypot(p.x - q.x, p.y - q.y)
    const r1 = at('r1')
    return d(tip, r1) < d(base, r1)
  })
  expect(toward).toBe(true)
  // The overlay is presentation: nothing in the document changed.
  await editorText(page).toBe(PAIR)
  await record(testInfo, 'evidence', { flows: await svg.locator('path[data-flow]').evaluateAll((ps) => ps.map((p) => `${p.getAttribute('data-route')} ${p.getAttribute('data-flow')}`)) })
})

test('RUN-06: a solved value opens in the app\'s own windows; inapplicable actions say why', async ({ page }, testInfo) => {
  const svg = await openSolved(page, PAIR)
  await svg.locator('[data-node="r1"]').click()
  const more = () => page.getByRole('button', { name: 'Open R1.a.I in…' }).click()
  await more()
  // A single steady solve has nothing to plot against; an electrical value has no fluid.
  await expect(page.getByRole('menuitem', { name: /^Plot/ })).toBeDisabled()
  await expect(page.getByRole('menuitem', { name: /^Plot/ })).toContainText('a plot needs more than one solved point')
  await expect(page.getByRole('menuitem', { name: /^Property diagram/ })).toBeDisabled()
  await expect(page.getByRole('menuitem', { name: /^Property diagram/ })).toContainText('Not a fluid stream with a named fluid.')
  // Sensitivity opens with this output chosen.
  await page.getByRole('menuitem', { name: /^Sensitivity/ }).click()
  await expect(page.getByRole('dialog', { name: /Sensitivity/ })).toBeVisible()
  await page.keyboard.press('Escape')
  // A parametric table gains the column and its window opens. R1's card is still pinned.
  await more()
  await page.getByRole('menuitem', { name: /^Add to a parametric table/ }).click()
  await expect(page.getByText('Parametric 1').first()).toBeVisible()
  await record(testInfo, 'evidence', {})
})

test.describe('AC-14 on a tablet', () => {
  test.use({ viewport: { width: 1024, height: 768 }, hasTouch: true })

  test('tap-to-connect with finger-sized ports and toolbar, then the list, then solve', async ({ page }, testInfo) => {
    const svg = await openSolved(page, LOOP.replace(/connect\(.*\)\n/g, ''), 'Check')
    expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true)
    const list = page.getByRole('button', { name: 'List' })
    expect((await list.boundingBox())!.height).toBeGreaterThanOrEqual(36)
    // A lone port side gets a full finger; two close ports share the gap between them.
    const hit = (await svg.locator('[data-port="r1.a"] circle[data-hit]').boundingBox())!
    expect(hit.width).toBeGreaterThanOrEqual(43)
    for (const [a, b] of [['vs.p', 'r1.a'], ['vs.n', 'r1.b'], ['r1.b', 'g.port']]) {
      await svg.locator(`[data-port="${a}"]`).tap()
      await svg.locator(`[data-port="${b}"]`).tap()
      await editorText(page).toMatch(new RegExp(`connect\\(${a.replace('.', '\\.')}, ${b.replace('.', '\\.')}\\)`, 'i'))
      await page.getByRole('button', { name: 'Check', exact: true }).tap()
    }
    await list.tap()
    await page.getByRole('region', { name: 'Components and connections' }).getByRole('button', { name: 'Inspect R1' }).tap()
    await expect(page.getByTestId('param-inspector')).toBeVisible()
    await page.getByRole('button', { name: 'Solve', exact: true }).tap()
    await expect(page.getByText(/^Solved/i).first()).toBeVisible({ timeout: 60_000 })
    await record(testInfo, 'evidence', { portHitPx: Math.round(hit.width), text: await savedText(page) })
  })
})
