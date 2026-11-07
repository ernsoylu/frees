// Phase H4: further playback views. An X-Y phase portrait draws a fading
// trail to the recorded sample, the block an event reads flashes at the
// sample the event recorded at, and hovering a wire or port summarises every
// member of its stream at that sample. Nothing solves.
//
// Run:  npm run build && npx playwright test e2e/playback-views.spec.ts --project=chromium
import { expect, test, type Page } from '@playwright/test'
import { engineCalls, openAndSolve } from './journey'

// T = 300 + 100·exp(-t/250 s); the event fires at 173.3 s and records at 200 s.
const COOL = `// frees-language: 2
ThermalMass   M(C=5000 [J/K], T0=400 [K])
ThermalSource amb(T=300 [K])
Conduction    wall(k=2 [W/m-K], area=1 [m^2], L=0.1 [m])
connect(M.port, wall.a)
connect(wall.b, amb.port)
DYNAMIC cool (method = ida, time = 0 .. 1000, points = 11)
  EVENT warm: M.port.T = 350 | falling -> record
END
PLOT 'Portrait'
  kind = xy
  x = 'M.port.T'
  y = 'wall.q'
END
`

test.use({ serviceWorkers: 'block', viewport: { width: 1440, height: 960 } })
test.skip(({ browserName }) => browserName !== 'chromium', 'One engine is enough for this journey.')

interface Trace { uid?: string; x: (number | null)[]; y: (number | null)[] }
const traces = (page: Page) =>
  page.evaluate(() => ((document.querySelector('.js-plotly-plot') as unknown as { data?: Trace[] } | null)?.data ?? [])
    .filter((t) => t.uid?.startsWith('trail_') || t.uid?.startsWith('playback_'))
    .map((t) => ({ uid: t.uid, x: [...t.x], y: [...t.y] })))

test.setTimeout(150_000)
test('H4: a phase-portrait trail, an event flash on the block it reads, and hover summaries follow playback without solving', async ({ page }) => {
  await openAndSolve(page, 'playback-views', COOL)
  await page.waitForTimeout(1000)
  const before = (await engineCalls(page)).length
  const bar = page.getByTestId('playback-bar')
  const time = bar.getByTestId('playback-time')

  // The phase portrait: no trail at end of run; at the event's sample, three samples ending at the cursor.
  await page.getByRole('button', { name: 'Plots windows' }).click()
  await page.getByRole('menuitem', { name: /Portrait/ }).click()
  await expect(page.locator('.js-plotly-plot')).toBeVisible({ timeout: 60_000 })
  expect(await traces(page)).toEqual([])
  await bar.getByRole('button', { name: 'Previous event' }).click()
  await expect(time).toHaveText('time = 200 s · sample 3 of 11')
  await expect.poll(async () => (await traces(page)).find((t) => t.uid === 'trail_wall.q')?.x.length).toBe(3)
  const [trail, cursor] = [(await traces(page)).find((t) => t.uid === 'trail_wall.q')!, (await traces(page)).find((t) => t.uid === 'playback_wall.q')!]
  expect(trail.x[0]).toBe(400)
  expect([trail.x.at(-1), trail.y.at(-1)]).toEqual([cursor.x[0], cursor.y[0]])
  // Heat leaves at k·A/L·(T − 300 K): the portrait is the recorded pair, not a fit.
  expect(cursor.y[0]! / (cursor.x[0]! - 300)).toBeCloseTo(20, 6)

  // The schematic: the mass the event reads flashes at that sample, the wall does not.
  await page.locator('body').click({ position: { x: 5, y: 5 } })
  await page.keyboard.press('Control+K')
  await page.getByPlaceholder('Search views, tools, and actions…').fill('Schematic')
  await page.keyboard.press('Enter')
  const svg = page.getByRole('application', { name: /Component network schematic/ })
  await expect(svg.locator('[data-node="m"]')).toBeVisible({ timeout: 60_000 })
  await expect(svg.locator('[data-node="m"]')).toHaveAttribute('data-flash', 'true')
  await expect(svg.locator('[data-node="wall"]')).not.toHaveAttribute('data-flash', /.+/)
  await expect(svg.locator('[data-node="m"] > title')).toContainText('event at this sample')

  // Hover summaries read the same sample: t = 344.93 K at 200 s, 330.12 K one sample later.
  await expect(svg.locator('[data-node="m"] > title')).toContainText('t = 344.93 K')
  await expect(svg.locator('path[data-net="c0"] > title')).toContainText('t = 344.93 K')
  await bar.getByRole('button', { name: 'Step forward' }).click()
  await expect(time).toHaveText('time = 300 s · sample 4 of 11')
  await expect(svg.locator('[data-node="m"]')).not.toHaveAttribute('data-flash', /.+/)
  await expect(svg.locator('path[data-net="c0"] > title')).toContainText('t = 330.12 K')

  // Reduced motion: the block still marks the event, without the pulse.
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await bar.getByRole('button', { name: 'Previous event' }).click()
  await expect(svg.locator('[data-node="m"] rect.event-flash')).toHaveCSS('animation-name', 'none')

  const during = (await engineCalls(page)).slice(before)
  expect(during.filter((m) => m === 'solve' || m === 'check')).toEqual([])
})
