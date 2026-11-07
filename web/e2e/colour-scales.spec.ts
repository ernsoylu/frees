// Phase H2: domain colour scales on the schematic — the engine's phase of each
// refrigerant stream, pressure diverging about atmospheric, and a fixed lesson
// range that clips with a visible mark. Nothing solves while scales change.
//
// Run:  npm run build && npx playwright test e2e/colour-scales.spec.ts --project=chromium
import { expect, test } from '@playwright/test'

// The gallery's ideal R134a cycle, wired from components.
const CYCLE = `// frees-language: 2
P_L = 0.14 [MPa]
P_H = 0.8 [MPa]
Compressor comp(eta=1, fluid$=R134a)
Condenser  cond()
Throttle   valve()
Boiler     evap()
connect(comp.out, cond.in)
connect(cond.out, valve.in)
connect(valve.out, evap.in)
connect(evap.out, comp.in)
comp.in.mdot = 0.05 [kg/s]
comp.in.P = P_L
comp.in.h = Enthalpy(R134a, P=P_L, x=1)
comp.out.P = P_H
cond.out.h = Enthalpy(R134a, P=P_H, x=0)
`

test.use({ serviceWorkers: 'block', viewport: { width: 1440, height: 960 } })
test.skip(({ browserName }) => browserName !== 'chromium', 'One engine is enough for this journey.')

test('H2: phase from the engine, pressure about atmospheric, a fixed range clips with a mark, and nothing solves', async ({ page }) => {
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
  const source = 'https://raw.example/colour-scales.frees'
  await page.route(source, (route) => route.fulfill({ contentType: 'text/plain', body: CYCLE }))
  await page.goto('/?url=' + encodeURIComponent(source))
  await expect(page.locator('.cm-content')).toContainText('frees-language', { timeout: 60_000 })
  await page.getByRole('button', { name: 'Solve', exact: true }).click()
  await expect(page.getByText(/^Solved/i).first()).toBeVisible({ timeout: 120_000 })
  await page.locator('body').click({ position: { x: 5, y: 5 } })
  await page.keyboard.press('Control+K')
  await page.getByPlaceholder('Search views, tools, and actions…').fill('Schematic')
  await page.keyboard.press('Enter')
  const svg = page.getByRole('application', { name: /Component network schematic/ })
  await expect(svg.locator('[data-node]').first()).toBeVisible({ timeout: 120_000 })
  await page.waitForTimeout(1000)
  const before = await page.evaluate(() => (window as unknown as { engineCalls: string[] }).engineCalls.length)
  const wire = (net: string) => svg.locator(`path[data-net="${net}"]`)

  await page.getByRole('button', { name: 'Overlay', exact: true }).click()
  const settings = page.getByTestId('overlay-settings')
  const colourBy = settings.getByRole('combobox', { name: 'Colour wires by' })

  // Phase: superheated after the compressor, inside the dome after the throttle.
  await colourBy.click()
  await page.getByRole('option', { name: 'fluid phase' }).click()
  await expect(wire('c0')).toHaveAttribute('data-overlay', 'superheated')
  await expect(wire('c2')).toHaveAttribute('data-overlay', 'two-phase')
  await expect(wire('c0')).toHaveAttribute('stroke', '#b2182b')
  await expect(page.getByTestId('phase-legend')).toContainText('x = −1 says single phase, not which')

  // Pressure in Pa diverges about atmospheric: the reference is the scale's middle.
  await colourBy.click()
  await page.getByRole('option', { name: /^fluid P \[Pa\]$/ }).click()
  await expect(page.getByTestId('overlay-reference')).toHaveText('101330')
  await expect(page.getByTestId('overlay-legend')).toContainText('Diverging about 101330 Pa')

  // A fixed lesson range from 200 kPa: the low side of the cycle is beyond it, marked.
  await settings.getByRole('switch', { name: 'Fixed range' }).check()
  await expect(svg.locator('[data-clip-mark]')).toHaveCount(0)
  const from = settings.getByRole('textbox', { name: 'From' })
  await from.fill('200000')
  await from.blur()
  await expect(wire('c2')).toHaveAttribute('data-clipped', 'low')
  await expect(wire('c3')).toHaveAttribute('data-clipped', 'low')
  await expect(wire('c0')).not.toHaveAttribute('data-clipped', /.+/)
  await expect(svg.locator('[data-clip-mark]')).toHaveCount(2)
  await expect(page.getByTestId('overlay-legend')).toContainText('◇ marks a wire beyond the fixed range')

  const during = await page.evaluate((n) => (window as unknown as { engineCalls: string[] }).engineCalls.slice(n), before)
  expect(during.filter((m) => m === 'solve' || m === 'check')).toEqual([])
})
