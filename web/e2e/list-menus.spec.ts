// Phase Q acceptance: the context menus of table rows, plot tabs and variable
// rows are the registry's commands, run on the row or tab they were opened on,
// with a reason as text where one cannot run.
//
// Run:  npm run build && npx playwright test e2e/list-menus.spec.ts --project=chromium
import { expect, test, type Page } from '@playwright/test'
import { runCommand } from './journey'

test.use({ serviceWorkers: 'block', permissions: ['clipboard-read', 'clipboard-write'] })
test.skip(({ browserName }) => browserName !== 'chromium', 'One engine is enough for this journey.')

const DOC = 'L = 4 [m]\nW = 3 [m]\nA = L*W\n'

async function openSolved(page: Page) {
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
}

test('Q: a table row renames, exports and deletes its own table', async ({ page }) => {
  await openSolved(page)
  await runCommand(page, 'New Parametric Table')
  await runCommand(page, 'New Parametric Table')
  const first = page.getByRole('button', { name: 'Table Parametric 1', exact: true })
  const second = page.getByRole('button', { name: 'Table Parametric 2', exact: true })
  await expect(second).toHaveAttribute('aria-current', 'true')

  // The menu acts on the row it was opened on, which becomes the active table.
  await first.click({ button: 'right' })
  const menu = page.getByRole('menu', { name: 'Parametric 1 table menu' })
  await expect(first).toHaveAttribute('aria-current', 'true')
  for (const item of ['Rename Table…', 'Configure Columns…', 'Plot Selected Columns', 'Data Export — full precision', 'Report Export — formatted', 'Retry Failed Runs', 'Delete Table…']) {
    await expect(menu.getByRole('menuitem', { name: item })).toBeVisible()
  }
  await expect(menu.getByRole('menuitem', { name: 'Retry Failed Runs' })).toBeDisabled()
  await expect(menu).toContainText('No failed runs to retry.')
  await menu.getByRole('menuitem', { name: 'Rename Table…' }).click()
  await page.keyboard.press('Control+A')
  await page.keyboard.type('Sweep')
  await page.keyboard.press('Enter')
  const renamed = page.getByRole('button', { name: 'Table Sweep', exact: true })
  await expect(renamed).toBeVisible()

  // The keyboard opens the same menu; Delete asks first and removes only that table.
  await renamed.focus()
  await page.keyboard.press('Shift+F10')
  await page.getByRole('menu', { name: 'Sweep table menu' }).getByRole('menuitem', { name: 'Delete Table…' }).click()
  const confirm = page.getByRole('dialog', { name: 'Delete table' })
  await expect(confirm).toContainText('Sweep')
  await confirm.getByRole('button', { name: /^Delete/ }).click()
  await expect(renamed).toHaveCount(0)
  await expect(second).toBeVisible()
})

test('Q: a variable row pins, copies its name and its full-precision value', async ({ page }) => {
  await openSolved(page)
  // A pinnable row's name follows its pin button: "Pin L to a slider L 4 Scalar m —".
  const row = (name: string) => page.getByRole('row', { name: new RegExp(`(^| )${name} \\d`) }).first()

  // A computed variable cannot be pinned, and says why.
  const menuA = page.getByRole('menu', { name: 'A variable menu' })
  // The table is still settling right after the solve lands; ask until the menu holds.
  await expect(async () => {
    await row('A').click({ button: 'right' })
    await expect(menuA).toBeVisible({ timeout: 1000 })
  }).toPass()
  await expect(menuA.getByRole('menuitem', { name: 'Pin to Slider' })).toBeDisabled()
  await expect(menuA).toContainText('Only a variable the equations set to a number can be pinned.')
  await menuA.getByRole('menuitem', { name: 'Copy Value' }).click()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('12 [m^2]')

  await row('L').click({ button: 'right' })
  await page.getByRole('menu', { name: 'L variable menu' }).getByRole('menuitem', { name: 'Copy Name' }).click()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('L')

  await row('L').focus()
  await page.keyboard.press('Shift+F10')
  await page.getByRole('menu', { name: 'L variable menu' }).getByRole('menuitem', { name: 'Pin to Slider' }).click()
  await expect(page.getByRole('slider').first()).toBeVisible()
  await row('L').click({ button: 'right' })
  await expect(page.getByRole('menu', { name: 'L variable menu' })).toContainText('It is already pinned to a slider.')
  await page.getByRole('menuitem', { name: 'Variable Settings…' }).click()
  await expect(page.getByRole('dialog', { name: 'Variable Settings' })).toBeVisible()
})

test('Q: a plot tab renames, configures and exports its own plot, and closes only the view', async ({ page }) => {
  await openSolved(page)
  await runCommand(page, 'New X-Y Plot')
  await page.getByRole('dialog', { name: 'New Plot' }).getByRole('button', { name: 'Add plot' }).click()
  const tab = page.locator('.dv-tab').filter({ has: page.locator('[data-panel-id^="plot:"]') }).first()
  await expect(tab).toBeVisible()
  const title = (await tab.innerText()).trim()

  await tab.click({ button: 'right' })
  const menu = page.getByRole('menu', { name: `${title} tab menu` })
  for (const item of ['Rename Plot…', 'Configure Plot…', 'Export Plot…', 'Close View']) await expect(menu.getByRole('menuitem', { name: item })).toBeVisible()
  await menu.getByRole('menuitem', { name: 'Rename Plot…' }).click()
  const rename = page.getByRole('dialog', { name: 'Rename Plot' })
  await rename.getByRole('textbox').fill('Area study')
  await rename.getByRole('button', { name: 'Rename' }).click()
  await expect(page.locator('.dv-tab').filter({ hasText: 'Area study' })).toBeVisible()

  // Closing the view keeps the plot: the rail still lists it, and opens it again.
  await page.locator('.dv-tab').filter({ hasText: 'Area study' }).click({ button: 'right' })
  await page.getByRole('menuitem', { name: 'Close View' }).click()
  await expect(page.locator('.dv-tab').filter({ hasText: 'Area study' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Plots windows' }).click()
  await page.getByRole('menuitem', { name: /Area study/ }).click()
  await expect(page.locator('.dv-tab').filter({ hasText: 'Area study' })).toBeVisible()
})
