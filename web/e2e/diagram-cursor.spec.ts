// Phase H3: the playback cursor on a P-h diagram. Each water node is drawn at
// the recorded sample (never interpolated, never the end-of-run value), with
// a bounded trail of the samples before it, and nothing solves while it moves.
//
// Run:  npm run build && npx playwright test e2e/diagram-cursor.spec.ts --project=chromium
import { expect, test, type Page } from '@playwright/test'
import { engineCalls, openAndSolve } from './journey'

// The gallery's pressure cooker, shortened, with its P-h diagram declared.
const COOKER = `// frees-language: 2
VoltageSource   SUP(E=220 [V])
HeatingResistor HTR(R=32.2667 [ohm])
Ground          GND()
ThermalMass STEEL(C=750 [J/K], T0=293.15 [K])
Convection  S2W(htc=333.33 [W/m^2-K], area=1 [m^2])
BoilingVessel   COOK(fluid$=Water, V=0.005 [m^3], m0=2.994 [kg], T0=293.15 [K])
ProportionalReliefValve PRV(fluid$=Water, Pcrack=202600 [Pa], grad=6e-7 [kg/s-Pa], eps=2000 [Pa])
TwoPhasePressureSink ATM(P=101300 [Pa])
connect(SUP.p, HTR.p)
connect(SUP.n, HTR.n, GND.port)
connect(HTR.heat, STEEL.port, S2W.a)
connect(S2W.b, COOK.wall)
connect(COOK.vent, PRV.in)
connect(PRV.out, ATM.in)
DYNAMIC cooker (method = ida, time = 0 .. 1200, points = 41, rtol = 1e-5, atol = 1e-4)
END
PLOT 'Cooker P-h'
  kind = property
  fluid = Water
  diagram = 'P-h'
END
`

test.use({ serviceWorkers: 'block', viewport: { width: 1440, height: 960 } })
test.skip(({ browserName }) => browserName !== 'chromium', 'One engine is enough for this journey.')

interface Trace { uid?: string; x: (number | null)[]; y: (number | null)[]; text?: string[] }
const traces = (page: Page) =>
  page.evaluate(() => ((document.querySelector('.js-plotly-plot') as unknown as { data?: Trace[] } | null)?.data ?? [])
    .filter((t) => t.uid === 'playback_cursor' || t.uid?.startsWith('trail_'))
    .map((t) => ({ uid: t.uid, x: [...t.x], y: [...t.y], text: t.text ? [...t.text] : undefined })))

test.setTimeout(180_000)
test('H3: the P-h cursor follows the recorded sample with a bounded trail, and nothing solves', async ({ page }) => {
  await openAndSolve(page, 'diagram-cursor', COOKER, 150_000)
  await page.getByRole('button', { name: 'Plots windows' }).click()
  await page.getByRole('menuitem', { name: /Cooker P-h/ }).click()

  // End of run with no playback: the diagram has no cursor.
  await expect(page.locator('.js-plotly-plot')).toBeVisible({ timeout: 60_000 })
  await page.waitForTimeout(1000)
  expect(await traces(page)).toEqual([])
  const before = (await engineCalls(page)).length

  // The first recorded sample: both water nodes, a one-sample trail, cold and near atmospheric.
  const bar = page.getByTestId('playback-bar')
  const slider = bar.getByRole('slider', { name: 'Recorded time' })
  await slider.focus()
  await page.keyboard.press('Home')
  await expect(bar.getByTestId('playback-time')).toHaveText('time = 0 s · sample 1 of 41')
  await expect.poll(async () => (await traces(page)).find((t) => t.uid === 'playback_cursor')?.text).toEqual(['cook.vent', 'prv.out'])
  const first = await traces(page)
  const cursor0 = first.find((t) => t.uid === 'playback_cursor')!
  for (const t of first.filter((t) => t.uid !== 'playback_cursor')) expect(t.x).toHaveLength(1)

  // Stepping moves it to the next recorded sample and lengthens the trail.
  for (let k = 0; k < 3; k++) await bar.getByRole('button', { name: 'Step forward' }).click()
  await expect(bar.getByTestId('playback-time')).toHaveText('time = 90 s · sample 4 of 41')
  await expect.poll(async () => (await traces(page)).find((t) => t.uid === 'trail_cook.vent')?.x.length).toBe(4)
  const later = (await traces(page)).find((t) => t.uid === 'playback_cursor')!
  expect(later.x[0]).not.toBe(cursor0.x[0])
  // The trail ends at the cursor: the same recorded sample, not an interpolation.
  const trail = (await traces(page)).find((t) => t.uid === 'trail_cook.vent')!
  expect([trail.x.at(-1), trail.y.at(-1)]).toEqual([later.x[0], later.y[0]])

  // At the last sample the cooker holds near its 2 atm setpoint, and the trail stays bounded.
  await slider.focus()
  await page.keyboard.press('End')
  await expect(bar.getByTestId('playback-time')).toHaveText('time = 1200 s · sample 41 of 41')
  await expect.poll(async () => (await traces(page)).find((t) => t.uid === 'trail_cook.vent')?.x.length).toBe(30)
  const end = (await traces(page)).find((t) => t.uid === 'playback_cursor')!
  expect(end.y[0]).toBeGreaterThan(195)
  expect(end.y[0]).toBeLessThan(215)

  const during = (await engineCalls(page)).slice(before)
  expect(during.filter((m) => m === 'solve' || m === 'check')).toEqual([])
})
