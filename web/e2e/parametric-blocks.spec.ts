// A code-defined PARAMETRIC block reaches the Tables window: Solve on a model
// that leaves the swept column free runs the block's table instead.
//
// Run:  npm run build && npx playwright test e2e/parametric-blocks.spec.ts --project=chromium
import { expect, test } from '@playwright/test'
import { EXAMPLES } from '../src/examples'

const TEXT = EXAMPLES.find((e) => e.id === 'projectile-trajectory')!.text

test.use({ serviceWorkers: 'block', viewport: { width: 1440, height: 960 } })
test.skip(({ browserName }) => browserName !== 'chromium', 'One engine is enough for this journey.')

test('Solve on an underspecified model runs its PARAMETRIC table', async ({ page }) => {
  const source = 'https://raw.example/projectile.frees'
  await page.route(source, (route) => route.fulfill({ contentType: 'text/plain', body: TEXT }))
  await page.goto('/?url=' + encodeURIComponent(source))
  await expect(page.locator('.cm-content')).toContainText('Projectile Trajectory', { timeout: 60_000 })
  const welcome = page.getByRole('dialog').filter({ hasText: 'Welcome to frees' })
  if (await welcome.waitFor({ timeout: 5_000 }).then(() => true, () => false)) await page.keyboard.press('Escape')

  await page.getByRole('button', { name: 'Solve', exact: true }).click()
  // Before the boundary carried the block, this stopped at "Underspecified".
  // t = 0:0.05:4 is 81 runs.
  await expect(page.getByRole('button', { name: 'Status details' })).toHaveText('81/81 runs solved', { timeout: 120_000 })
  await expect(page.getByTestId('run-target')).toHaveText('Table: trajectory')

  await page.getByRole('button', { name: 'Tables windows' }).click()
  await expect(page.getByRole('menuitem', { name: 'trajectory' })).toBeVisible()
  await page.keyboard.press('Escape')
})
