// Phase Q acceptance (AC-11, AC-05): an analysis draft and the terminal's
// scrollback survive closing their view, and a new project starts them over.
//
// Run:  npm run build && npx playwright test e2e/kept-state.spec.ts --project=chromium
import { expect, test } from '@playwright/test'
import { runCommand } from './journey'

test.use({ serviceWorkers: 'block' })
test.skip(({ browserName }) => browserName !== 'chromium', 'One engine is enough for this journey.')

const DOC = 'L = 4 [m]\nW = 3 [m]\nA = L*W\n'

test('Q: a closed dialog keeps its draft, a closed terminal its scrollback, until the project changes', async ({ page }) => {
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

  // An optimization draft.
  await runCommand(page, 'Optimization…')
  const constraints = page.getByRole('textbox', { name: 'Constraints (optional)' })
  await constraints.fill('L + W <= 20')
  await page.keyboard.press('Escape')
  await expect(constraints).toHaveCount(0)
  await runCommand(page, 'Optimization…')
  await expect(constraints).toHaveValue('L + W <= 20')
  await page.keyboard.press('Escape')

  // The terminal's scrollback.
  await runCommand(page, 'Terminal')
  const output = page.getByLabel('Terminal output')
  await page.getByPlaceholder(/Evaluate an expression/).fill('L*2')
  await page.keyboard.press('Enter')
  await expect(output).toContainText('L*2')
  await expect(output).toContainText('8')
  await runCommand(page, 'Close View')
  await expect(output).toHaveCount(0)
  await runCommand(page, 'Terminal')
  await expect(output).toContainText('L*2')
  await expect(output).toContainText('8')

  // A new project starts both over: a draft names the old project's variables.
  await page.getByRole('button', { name: 'File', exact: true }).click()
  await page.getByRole('menuitem', { name: 'New Project' }).click()
  await page.getByRole('dialog', { name: 'Unsaved Changes' }).getByRole('button', { name: "Don't Save" }).click()
  await expect(page.locator('.cm-content')).not.toContainText('L = 4')
  await runCommand(page, 'Terminal')
  await expect(page.getByLabel('Terminal output')).not.toContainText('L*2')
  await runCommand(page, 'Optimization…')
  await expect(page.getByRole('textbox', { name: 'Constraints (optional)' })).toHaveValue('')
})
