// Phase R acceptance, part 5: "Where Is a Command?" names a command's place,
// brings its ribbon tab forward and marks the control without running it.
//
// Run:  npm run build && npx playwright test e2e/where-is.spec.ts --project=chromium
import { expect, test, type Page } from '@playwright/test'
import { runCommand } from './journey'

test.use({ serviceWorkers: 'block' })
test.skip(({ browserName }) => browserName !== 'chromium', 'One engine is enough for this journey.')

async function open(page: Page, ribbon: boolean) {
  await page.setViewportSize({ width: 1440, height: 960 })
  await page.addInitScript((on) => {
    if (sessionStorage.getItem('seeded')) return
    localStorage.setItem('frees.ribbon', on ? '1' : '0')
    localStorage.setItem('frees.project', JSON.stringify({ text: 'L = 4 [m]\n', tables: [] }))
    sessionStorage.setItem('seeded', '1')
  }, ribbon)
  await page.goto('/')
  const welcome = page.getByRole('dialog').filter({ hasText: 'Welcome to frees' })
  if (await welcome.waitFor({ timeout: 10_000 }).then(() => true, () => false)) await page.keyboard.press('Escape')
  await expect(page.locator('.cm-content')).toContainText('L = 4')
}

test('R: with the ribbon on, Show opens the tab and marks Optimization without opening it', async ({ page }) => {
  await open(page, true)
  await runCommand(page, 'Where Is a Command?')
  const dialog = page.getByRole('dialog', { name: 'Where Is a Command?' })
  await dialog.getByLabel('Search commands').fill('optimization')
  const row = dialog.locator('[data-where="tool.minMax"]')
  await expect(row).toContainText('Ribbon ▸ Analysis ▸ Optimize & Fit')
  await row.getByRole('button', { name: 'Show Optimization… on the ribbon' }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByTestId('ribbon').getByRole('tab', { name: 'Analysis', exact: true })).toHaveAttribute('aria-selected', 'true')
  const control = page.getByTestId('ribbon').locator('[data-command="tool.minMax"]')
  await expect(control).toHaveAttribute('data-located', '')
  await expect(control).toBeFocused()
  // It was not run.
  await expect(page.getByRole('dialog', { name: /Optimization/ })).toHaveCount(0)
})

test('R: with the ribbon off, it names the menu and offers nothing to show', async ({ page }) => {
  await open(page, false)
  await runCommand(page, 'Where Is a Command?')
  const dialog = page.getByRole('dialog', { name: 'Where Is a Command?' })
  await dialog.getByLabel('Search commands').fill('optimization')
  const row = dialog.locator('[data-where="tool.minMax"]')
  await expect(row).toContainText('Tools ▸ Analysis')
  await expect(row.getByRole('button')).toHaveCount(0)
})
