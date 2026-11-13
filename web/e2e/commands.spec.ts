// Phase N acceptance: one run target. The toolbar, F2 and the palette act on
// the focused parametric table, else the model, and utility panels (the
// Inspector) keep that target.
//
// Run:  npm run build && npx playwright test e2e/commands.spec.ts --project=chromium
import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

test.use({ serviceWorkers: 'block', viewport: { width: 1440, height: 960 } })
test.skip(({ browserName }) => browserName !== 'chromium', 'One engine is enough for this journey.')

const DOC = 'V_dot = 0.002\nv = V_dot / (pi# * D^2 / 4)'
const sweep = (id: string, name: string, ds: number[]) => ({
  id, kind: 'parametric', name, vars: ['D', 'v'],
  rows: ds.map((d, k) => ({ id: `${id}-${k}`, values: { D: String(d) } })),
  results: [], stats: null, checkResult: null, checkMessage: '',
})

test('N2: F2 from the Inspector solves the focused table, and the palette names both targets', async ({ page }) => {
  await page.addInitScript((project) => {
    if (sessionStorage.getItem('seeded')) return
    localStorage.setItem('frees.project', project)
    sessionStorage.setItem('seeded', '1')
  }, JSON.stringify({ text: DOC, tables: [sweep('ta', 'sweep_a', [0.02, 0.04, 0.06]), sweep('tb', 'sweep_b', [0.1, 0.2, 0.3])] }))
  await page.goto('/')
  await expect(page.locator('.cm-content')).toContainText('V_dot = 0.002', { timeout: 60_000 })
  await expect(page.getByTestId('run-target')).toHaveText('Model')
  const welcome = page.getByRole('dialog').filter({ hasText: 'Welcome to frees' })
  if (await welcome.waitFor({ timeout: 10_000 }).then(() => true, () => false)) await page.keyboard.press('Escape')

  await page.getByRole('button', { name: 'Tables windows' }).click()
  await page.getByRole('menuitem', { name: 'sweep_b' }).click()
  await expect(page.getByTestId('run-target')).toHaveText('Table: sweep_b')

  // A utility panel keeps the target.
  await page.locator('.dv-tab', { hasText: 'Inspector' }).click()
  await expect(page.getByTestId('run-target')).toHaveText('Table: sweep_b')
  await page.keyboard.press('F2')
  // The table, not the model, ran.
  await expect(page.getByText('Run status: completed')).toBeVisible({ timeout: 120_000 })
  // Before N2, F2 here checked the model, which D leaves underspecified, and nothing ran.

  await page.locator('body').click({ position: { x: 5, y: 5 } })
  await page.keyboard.press('Control+K')
  await page.getByPlaceholder('Search views, tools, and actions…').fill('Solve')
  for (const name of ['Solve Model', 'Solve Table: sweep_a', 'Solve Table: sweep_b']) {
    await expect(page.getByRole('button', { name: new RegExp(`^${name}`) })).toBeVisible()
  }
  // The palette's table solve shows its table in the workbook, not an empty window of its own.
  await page.getByRole('button', { name: /^Solve Table: sweep_a/ }).click()
  await expect(page.getByTestId('run-target')).toHaveText('Table: sweep_a')
  await expect(page.locator('.dv-tab', { hasText: 'sweep_a' })).toHaveCount(0)
  await expect(page.getByText('Run status: completed')).toBeVisible({ timeout: 120_000 })
})

test('N1/N4: palette rows name their place, an unavailable command says why, and the ? sheet comes from the registry', async ({ page }) => {
  await page.goto('/')
  const welcome = page.getByRole('dialog').filter({ hasText: 'Welcome to frees' })
  if (await welcome.waitFor({ timeout: 10_000 }).then(() => true, () => false)) await page.keyboard.press('Escape')
  await page.locator('body').click({ position: { x: 5, y: 5 } })

  // Commands once missing from the palette are there, with their location.
  await page.keyboard.press('Control+K')
  const search = page.getByPlaceholder('Search views, tools, and actions…')
  await search.fill('Curve Fit')
  await expect(page.getByRole('button', { name: /^Curve Fit/ })).toContainText('Tools ▸ Analysis')
  // Nothing solved yet: Print Report stays listed, greyed, with its reason as text.
  await search.fill('Print Report')
  const print = page.getByRole('button', { name: /^Print Report/ })
  await expect(print).toBeDisabled()
  await expect(print).toContainText('Solve first: the report prints the last successful solve.')
  await page.keyboard.press('Escape')

  // `?` is a typed character in the editor, so it opens the sheet only from outside a text field.
  await page.locator('body').click({ position: { x: 5, y: 5 } })
  await page.keyboard.press('?')
  const sheet = page.getByRole('dialog', { name: 'Keyboard Shortcuts' })
  for (const row of ['Save Project', 'Save Project As…', 'Open Project…', 'Print Report…', 'Autocomplete functions & variables']) {
    await expect(sheet.getByText(row, { exact: false }).first()).toBeVisible()
  }
  await page.keyboard.press('Escape')

  // N3: with the Editor closed, New Fluid State Table opens it and the block lands once it has loaded.
  await page.locator('[aria-label="Close Editor"]').first().click()
  await expect(page.locator('.cm-content')).toHaveCount(0)
  await page.locator('body').click({ position: { x: 5, y: 5 } })
  await page.keyboard.press('Control+K')
  await search.fill('New Fluid State Table')
  await page.getByRole('button', { name: /^New Fluid State Table/ }).click()
  await expect(page.locator('.cm-content')).toContainText('STATE TABLE Circuit1', { timeout: 30_000 })

  // Last, since the browser's print preview may take the page: with nothing to report, Ctrl+P is left to the browser.
  await page.locator('body').click({ position: { x: 5, y: 5 } })
  await page.keyboard.press('Control+P').catch(() => {})
  await expect(page.getByRole('dialog', { name: /report/i })).toHaveCount(0)
})

test('N4: Ctrl+S from inside a scenario value saves the value being typed', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    delete (window as { showSaveFilePicker?: unknown }).showSaveFilePicker
  })
  const source = 'https://raw.example/room.frees'
  await page.route(source, (route) => route.fulfill({ contentType: 'text/plain', body: 'L = 4 [m]\nW = 3 [m]\nA = L*W\n' }))
  await page.goto('/?url=' + encodeURIComponent(source))
  await expect(page.locator('.cm-content')).toContainText('A = L*W', { timeout: 60_000 })
  await page.getByRole('button', { name: 'Solve', exact: true }).click()
  await expect(page.getByText(/^Solved/i).first()).toBeVisible({ timeout: 60_000 })
  const panel = page.getByTestId('runs-panel')
  await panel.getByRole('button', { name: 'New', exact: true }).click()
  await panel.getByLabel('Scenario name').fill('Wide room')
  await page.keyboard.press('Enter')
  await panel.getByRole('combobox', { name: 'Add input' }).click()
  await page.getByRole('option', { name: 'W', exact: true }).click()
  // Typed, not yet committed (the field commits on blur or Enter), then saved from the keyboard.
  await panel.getByLabel('Value of W').fill('7')
  const [saved] = await Promise.all([page.waitForEvent('download'), page.keyboard.press('Control+S')])
  const path = testInfo.outputPath('room.frees')
  await saved.saveAs(path)
  expect(readFileSync(path, 'utf-8')).toMatch(/"name":\s*"W"[^}]*"value":\s*7\b/)
})
