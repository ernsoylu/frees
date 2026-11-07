// Phase H5: stateful symbols. A project symbol's part binds one approved
// attribute to one of its block's outputs, declared in the SVG and kept by the
// COMP-08 sanitiser. It moves with the playback sample, and only from a value
// the model outputs: unrecorded or unknown members leave the part as drawn.
//
// Run:  npm run build && npx playwright test e2e/stateful-symbols.spec.ts --project=chromium
import { expect, test } from '@playwright/test'
import { engineCalls, openAndSolve } from './journey'

// T = 300 + 100·exp(-t/250 s), recorded every 100 s.
const COOL = `// frees-language: 2
ThermalMass   M(C=5000 [J/K], T0=400 [K])
ThermalSource amb(T=300 [K])
Conduction    wall(k=2 [W/m-K], area=1 [m^2], L=0.1 [m])
connect(M.port, wall.a)
connect(wall.b, amb.port)
DYNAMIC cool (method = ida, time = 0 .. 1000, points = 11)
END
`

// A tank whose fill scales with the mass's temperature from 300 K (empty) to 400 K (full).
const GAUGE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
  <rect x="2" y="2" width="16" height="16" fill="none" stroke="currentColor"/>
  <rect x="3" y="3" width="14" height="14" fill="#e8590c" data-bind="port.t" data-bind-attr="scale-y" data-bind-range="300 400 0 1" data-bind-about="10 17"/>
  <circle cx="10" cy="10" r="1" data-bind="nope" data-bind-attr="opacity" data-bind-range="0 1 0 1"/>
  <line x1="0" y1="10" x2="2" y2="10" stroke="currentColor" data-bind="port.t" data-bind-attr="href" data-bind-range="0 1 0 1"/>
</svg>`

test.use({ serviceWorkers: 'block', viewport: { width: 1440, height: 960 } })
test.skip(({ browserName }) => browserName !== 'chromium', 'One engine is enough for this journey.')

test.setTimeout(150_000)
test('H5: a bound symbol part follows the recorded sample, only from a value the model outputs, and nothing solves', async ({ page }) => {
  await openAndSolve(page, 'stateful-symbols', COOL)
  await page.locator('body').click({ position: { x: 5, y: 5 } })
  await page.keyboard.press('Control+K')
  await page.getByPlaceholder('Search views, tools, and actions…').fill('Schematic')
  await page.keyboard.press('Enter')
  const svg = page.getByRole('application', { name: /Component network schematic/ })
  await expect(svg.locator('[data-node="m"]')).toBeVisible({ timeout: 60_000 })
  await page.waitForTimeout(1000)
  const before = (await engineCalls(page)).length

  await svg.locator('[data-node="m"]').click()
  const editor = page.getByTestId('style-editor')
  const chooser = page.waitForEvent('filechooser')
  await editor.getByRole('button', { name: 'Import SVG…' }).click()
  await (await chooser).setFiles({ name: 'gauge.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(GAUGE) })
  // A binding to an attribute outside the allowlist is removed and named, like any other.
  await expect(page.getByTestId('symbol-import-note')).toContainText('data-bind-attr')
  const fill = svg.locator('[data-node="m"] svg[data-symbol="custom"] rect[data-bind]')
  const dot = svg.locator('[data-node="m"] svg[data-symbol="custom"] circle')

  // End of run: an ODE-only model has no end-of-run values, so the part stays as drawn.
  await expect(fill).toHaveAttribute('data-bound', 'missing')
  await expect(fill).not.toHaveAttribute('transform', /.+/)

  // Playback: full at 400 K, then the recorded 344.93 K at 200 s.
  const bar = page.getByTestId('playback-bar')
  const slider = bar.getByRole('slider', { name: 'Recorded time' })
  await slider.focus()
  await page.keyboard.press('Home')
  await expect(bar.getByTestId('playback-time')).toHaveText('time = 0 s · sample 1 of 11')
  await expect(fill).toHaveAttribute('data-bound', '1')
  await expect(fill).toHaveAttribute('transform', 'translate(10 17) scale(1 1) translate(-10 -17)')
  for (let k = 0; k < 2; k++) await bar.getByRole('button', { name: 'Step forward' }).click()
  await expect(bar.getByTestId('playback-time')).toHaveText('time = 200 s · sample 3 of 11')
  expect(Number(await fill.getAttribute('data-bound'))).toBeCloseTo(0.4493, 3)

  // A member the block does not output never moves its part.
  await expect(dot).toHaveAttribute('data-bound', 'missing')
  await expect(dot).not.toHaveAttribute('opacity', /.+/)

  const during = (await engineCalls(page)).slice(before)
  expect(during.filter((m) => m === 'solve' || m === 'check')).toEqual([])
})
