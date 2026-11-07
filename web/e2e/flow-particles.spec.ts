// Phase H1: flow particles on the schematic. Their direction is the engine's
// flow-into rule applied to the solved (or recorded) sign, they follow the
// playback sample, freeze on pause, honour reduced motion, and never call the
// engine.
//
// Run:  npm run build && npx playwright test e2e/flow-particles.spec.ts --project=chromium
import { expect, test, type Page } from '@playwright/test'
import { EV_THERMAL_EXAMPLE_TEXT } from '../src/defaultExample'

// A hot mass A feeds a light mass B through w1, while a hotter ambient heats B
// through w2. B overtakes A within the first 50 s, so the heat in w1 reverses.
const REVERSE = `// frees-language: 2
ThermalMass   A(C=5000 [J/K], T0=400 [K])
ThermalMass   B(C=500 [J/K], T0=300 [K])
ThermalSource amb(T=500 [K])
Conduction    w1(k=2 [W/m-K], area=1 [m^2], L=0.1 [m])
Conduction    w2(k=2 [W/m-K], area=1 [m^2], L=0.1 [m])
connect(A.port, w1.a)
connect(w1.b, B.port)
connect(B.port, w2.a)
connect(w2.b, amb.port)
DYNAMIC heat (method = ida, time = 0 .. 600, points = 13)
END
`

test.use({ serviceWorkers: 'block', viewport: { width: 1440, height: 960 } })
test.skip(({ browserName }) => browserName !== 'chromium', 'One engine is enough for this journey.')

async function openSchematic(page: Page, text: string) {
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
  const source = 'https://raw.example/flow-particles.frees'
  await page.route(source, (route) => route.fulfill({ contentType: 'text/plain', body: text }))
  await page.goto('/?url=' + encodeURIComponent(source))
  await expect(page.locator('.cm-content')).toContainText(text.split('\n')[0], { timeout: 60_000 })
  await page.getByRole('button', { name: 'Solve', exact: true }).click()
  await expect(page.getByText(/^Solved/i).first()).toBeVisible({ timeout: 120_000 })
  await page.locator('body').click({ position: { x: 5, y: 5 } })
  await page.keyboard.press('Control+K')
  await page.getByPlaceholder('Search views, tools, and actions…').fill('Schematic')
  await page.keyboard.press('Enter')
  const svg = page.getByRole('application', { name: /Component network schematic/ })
  await expect(svg.locator('[data-node]').first()).toBeVisible({ timeout: 120_000 })
  return svg
}

const calls = (page: Page) => page.evaluate(() => [...(window as unknown as { engineCalls: string[] }).engineCalls])

async function overlay(page: Page, label: string) {
  await page.getByRole('button', { name: 'Overlay', exact: true }).click()
  await page.getByTestId('overlay-settings').getByRole('switch', { name: label }).check()
  await page.keyboard.press('Escape')
}

test.setTimeout(120_000)
test('H1: particles reverse with the recorded sign, follow playback, freeze on pause, honour reduced motion, and never solve', async ({ page }) => {
  const svg = await openSchematic(page, REVERSE)
  await page.waitForTimeout(1000)
  const before = (await calls(page)).length
  await overlay(page, 'Flow particles')
  await overlay(page, 'Measured flow arrows')
  const w1 = svg.locator('g:has(> path[data-net="c0"])')
  const particles = w1.locator('[data-particles]')

  // A late recorded sample, paused: the heat now runs from B back into A.
  const bar = page.getByTestId('playback-bar')
  await bar.getByRole('button', { name: 'Step back' }).click()
  await expect(bar.getByTestId('playback-time')).toHaveText('time = 550 s · sample 12 of 13')
  await expect(particles).toHaveAttribute('data-particles', 'reverse')
  await expect(w1.locator('[data-flow]')).toHaveAttribute('data-flow', 'reverse')
  await expect(particles).toHaveCSS('animation-play-state', 'paused')
  await expect(page.getByTestId('particles-legend')).toContainText('heat flow (energy, not matter)')

  // At t = 0 the hot mass heats B: the particles run the other way.
  for (let k = 0; k < 11; k++) await bar.getByRole('button', { name: 'Step back' }).click()
  await expect(bar.getByTestId('playback-time')).toHaveText('time = 0 s · sample 1 of 13')
  await expect(particles).toHaveAttribute('data-particles', 'forward')
  await expect(w1.locator('[data-flow]')).toHaveAttribute('data-flow', 'forward')

  // Playing moves them; the run ends paused again.
  await bar.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(particles).toHaveCSS('animation-play-state', 'running')
  await expect(bar.getByTestId('playback-time')).toHaveText('time = 600 s · sample 13 of 13', { timeout: 30_000 })
  await expect(particles).toHaveAttribute('data-particles', 'reverse')
  await expect(particles).toHaveCSS('animation-play-state', 'paused')

  // A slower schematic speed lengthens every period; it is not a velocity.
  const period = async () => parseFloat(await particles.evaluate((p) => getComputedStyle(p).animationDuration))
  const at1 = await period()
  await page.getByRole('button', { name: 'Overlay', exact: true }).click()
  await page.getByTestId('overlay-settings').getByRole('combobox', { name: 'Schematic speed (not a physical velocity)' }).click()
  await page.getByRole('option', { name: '×0.5' }).click()
  await page.keyboard.press('Escape')
  expect(await period()).toBeCloseTo(at1 * 2, 4)

  // Reduced motion: no moving particles, arrows still show the flow.
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(svg.locator('[data-particles]')).toHaveCount(0)
  await expect(w1.locator('[data-flow]')).toHaveAttribute('data-flow', 'reverse')
  await page.getByRole('button', { name: 'Overlay', exact: true }).click()
  await expect(page.getByTestId('particles-reduced')).toBeVisible()
  await page.keyboard.press('Escape')

  const during = (await calls(page)).slice(before)
  expect(during.filter((m) => m === 'solve' || m === 'check')).toEqual([])
})

test('H1: on the EV model, every wire with a known flow carries particles in the direction of its measured-flow arrow', async ({ page }) => {
  const svg = await openSchematic(page, EV_THERMAL_EXAMPLE_TEXT)
  await overlay(page, 'Flow particles')
  await overlay(page, 'Measured flow arrows')
  const wires = await svg.locator('g:has(> path[data-flow])').evaluateAll((gs) =>
    gs.map((g) => ({
      flow: g.querySelector('[data-flow]')!.getAttribute('data-flow'),
      particles: g.querySelector('[data-particles]')?.getAttribute('data-particles') ?? null,
    })),
  )
  const moving = wires.filter((w) => w.flow === 'forward' || w.flow === 'reverse')
  expect(moving.length).toBeGreaterThan(20)
  for (const w of wires) expect(w.particles).toBe(w.flow === 'forward' || w.flow === 'reverse' ? w.flow : null)
})
