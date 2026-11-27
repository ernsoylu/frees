// A document TABLE reaches the workbook, so the Curve Fit dialog can fit it.
// Before the boundary carried code tables, the dropdown never listed one.
//
// Run:  npm run build && npx playwright test e2e/code-tables.spec.ts --project=chromium
import { expect, test } from '@playwright/test'
import { EXAMPLES } from '../src/examples'
import { openAndSolve, runCommand } from './journey'

const TEXT = EXAMPLES.find((e) => e.id === 'linear-regression-diagnostics')!.text

test.use({ serviceWorkers: 'block', viewport: { width: 1440, height: 960 } })
test.skip(({ browserName }) => browserName !== 'chromium', 'One engine is enough for this journey.')
test.setTimeout(180_000)

test("Curve Fit fits a document TABLE and agrees with the model's linfit", async ({ page }) => {
  await openAndSolve(page, 'linear-regression', TEXT)
  const welcome = page.getByRole('dialog').filter({ hasText: 'Welcome to frees' })
  if (await welcome.isVisible()) await page.keyboard.press('Escape')

  await runCommand(page, 'Curve Fit')
  const fit = page.getByRole('dialog').filter({ hasText: 'Curve Fit' })
  await fit.getByText('Select from table').click()
  await fit.getByLabel('Select Table').click()
  await page.getByRole('option', { name: 'regression_data (Function)' }).click()
  await fit.getByLabel('Model equation template').click()
  await page.getByRole('option', { name: 'Linear (y = a * x + b)' }).click()
  await expect(fit).not.toContainText(/0\.83928/)
  await fit.getByRole('button', { name: 'Fit', exact: true }).click()

  // linfit's a_1 = 0.8392857 and a_0 = 0.0714286, as the example's CHECKs say.
  await expect(fit).toContainText(/0\.83928/, { timeout: 60_000 })
  await expect(fit).toContainText(/0\.071428/)
})

test('after Check alone, the siyavula-correlation steps reach its published R²', async ({ page }) => {
  const text = EXAMPLES.find((e) => e.id === 'siyavula-correlation')!.text
  const source = 'https://raw.example/siyavula.frees'
  await page.route(source, (route) => route.fulfill({ contentType: 'text/plain', body: text }))
  await page.goto('/?url=' + encodeURIComponent(source))
  await expect(page.locator('.cm-content')).toContainText('Linear Correlation', { timeout: 60_000 })
  const welcome = page.getByRole('dialog').filter({ hasText: 'Welcome to frees' })
  if (await welcome.waitFor({ timeout: 5_000 }).then(() => true, () => false)) await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Check', exact: true }).click()

  await runCommand(page, 'Curve Fit')
  const fit = page.getByRole('dialog').filter({ hasText: 'Curve Fit' })
  await fit.getByText('Select from table').click()
  await fit.getByLabel('Select Table').click()
  await page.getByRole('option', { name: 'siyavula_data (Function)' }).click()
  await fit.getByLabel('Model equation template').click()
  await page.getByRole('option', { name: 'Linear (y = a * x + b)' }).click()
  await fit.getByRole('button', { name: 'Fit', exact: true }).click()
  await expect(fit).toContainText(/0\.992/, { timeout: 60_000 })
})
