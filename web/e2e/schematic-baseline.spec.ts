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
// an unchecked document is not reported as broken. The remaining defects are MEASURED, not asserted. Each test attaches its numbers
// as `evidence.json` and annotates the run, so the same spec stays green before
// and after the 01a fixes and its attachments show what changed.
//
// Run:  npm run build && npx playwright test e2e/schematic-baseline.spec.ts --project=chromium
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

async function openSolved(page: Page, text: string) {
  const source = 'https://raw.example/schematic-baseline.frees'
  await page.route(source, (route) => route.fulfill({ contentType: 'text/plain', body: text }))
  await page.goto('/?url=' + encodeURIComponent(source))
  // CodeMirror renders only visible lines, so wait on the first one.
  await expect(page.locator('.cm-content')).toContainText(text.split('\n')[0], { timeout: 60_000 })
  await page.getByRole('button', { name: 'Solve', exact: true }).click()
  await expect(page.getByText(/^Solved/i).first()).toBeVisible({ timeout: 120_000 })
  await page.locator('body').click({ position: { x: 5, y: 5 } })
  await page.keyboard.press('Control+K')
  await page.getByPlaceholder('Search views, tools, and actions…').fill('Schematic')
  await page.keyboard.press('Enter')
  const svg = page.getByRole('application', { name: /Component network schematic/ })
  await expect(svg).toBeVisible()
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
    const wires = [...root.querySelectorAll(':scope > g:nth-of-type(2) > path')] as SVGPathElement[]
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
