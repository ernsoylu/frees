// Phase R acceptance, part 4: an analysis tool docks as a window with the same
// sections a dialog has, keeps its result when its view closes mid-run, follows
// its tab, and goes back to being a dialog.
//
// Run:  npm run build && npx playwright test e2e/tool-windows.spec.ts --project=chromium
import { expect, test } from '@playwright/test'
import { runCommand } from './journey'

test.use({ serviceWorkers: 'block' })
test.skip(({ browserName }) => browserName !== 'chromium', 'One engine is enough for this journey.')

const DOC = 'L = 4 [m]\nW = 3 [m]\nA = L*W\n'

test('R: Optimization docks, runs, keeps its result across a close, and returns to a dialog', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 })
  await page.addInitScript((doc) => {
    if (sessionStorage.getItem('seeded')) return
    localStorage.setItem('frees.project', JSON.stringify({ text: doc, tables: [] }))
    sessionStorage.setItem('seeded', '1')
  }, DOC)
  await page.goto('/')
  const welcome = page.getByRole('dialog').filter({ hasText: 'Welcome to frees' })
  if (await welcome.waitFor({ timeout: 10_000 }).then(() => true, () => false)) await page.keyboard.press('Escape')
  await expect(page.locator('.cm-content')).toContainText('L = 4')
  await page.getByRole('button', { name: 'Solve', exact: true }).click()
  await expect(page.getByText(/^Solved/i).first()).toBeVisible({ timeout: 120_000 })

  // The dialog has the fixed sections, in order.
  await runCommand(page, 'Optimization…')
  const dialog = page.getByRole('dialog', { name: /Optimization/ })
  const steps = () => dialog.locator('[data-tool-step]').evaluateAll((els) => els.map((e) => e.getAttribute('data-tool-step')))
  await expect(dialog.getByRole('button', { name: 'Dock as Window' })).toBeVisible()
  expect(await steps()).toEqual(['Target', 'Inputs', 'Method', 'Advanced', 'Run'])

  // Dock it: the same tool, now a tab of the centre group.
  await dialog.getByRole('button', { name: 'Dock as Window' }).click()
  await expect(dialog).toHaveCount(0)
  const tab = page.locator('.dv-tab').filter({ has: page.locator('[data-panel-id="tool:minMax"]') })
  await expect(tab).toBeVisible()
  const win = page.getByRole('region', { name: 'Min/Max — Optimization' })
  await expect(win).toBeVisible()

  await win.getByRole('textbox', { name: 'Objective variable' }).or(win.getByLabel('Objective variable', { exact: true })).first().click()
  await page.getByRole('option', { name: 'A', exact: true }).click()
  await win.getByLabel('Independent (varied) variables', { exact: true }).first().click()
  await page.getByRole('option', { name: 'L', exact: true }).click()
  await page.keyboard.press('Escape')
  await win.getByLabel('Lower bound of L').fill('1')
  await win.getByLabel('Upper bound of L').fill('5')
  await win.getByRole('button', { name: 'Minimize', exact: true }).click()

  // Closing the view mid-run keeps the run: opened again, the result is there.
  await runCommand(page, 'Close View')
  await expect(tab).toHaveCount(0)
  await runCommand(page, 'Optimization…')
  await expect(tab).toBeVisible()
  await expect(win.locator('[data-tool-step="Results"]')).toBeVisible({ timeout: 60_000 })
  await expect(win.getByLabel('Lower bound of L')).toHaveValue('1')

  // Back to a dialog, with the same draft and result; the tab goes.
  await win.getByRole('button', { name: 'Open as Dialog' }).click()
  await expect(tab).toHaveCount(0)
  await expect(dialog).toBeVisible()
  await expect(dialog.locator('[data-tool-step="Results"]')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await runCommand(page, 'Optimization…')
  await expect(dialog).toBeVisible()
})

test('R: on a phone a docked tool is a dialog with no docking, and scenarios stay in Variables', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.addInitScript((doc) => {
    if (sessionStorage.getItem('seeded')) return
    localStorage.setItem('frees.project', JSON.stringify({ text: doc, tables: [] }))
    localStorage.setItem('frees-tools-docked-v1', JSON.stringify(['minMax']))
    sessionStorage.setItem('seeded', '1')
  }, DOC)
  await page.goto('/')
  await expect(page.locator('.cm-content')).toContainText('L = 4', { timeout: 60_000 })
  await runCommand(page, 'Optimization…')
  const dialog = page.getByRole('dialog', { name: /Optimization/ })
  await expect(dialog.locator('[data-tool-step="Target"]')).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Dock as Window' })).toHaveCount(0)
  await page.keyboard.press('Escape')
  // As before Phase R, scenarios sit with the solved values.
  await page.getByRole('button', { name: 'Solve', exact: true }).first().click()
  await page.getByRole('button', { name: 'Variables', exact: true }).click()
  await expect(page.getByTestId('runs-panel')).toBeVisible({ timeout: 120_000 })
})
