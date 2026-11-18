// Phase R acceptance, part 1: the Problems panel lists what Check reported with
// its source and takes the reader to the line; the Inspector names its target
// and reads a variable and a schematic selection as well as a window.
//
// Run:  npm run build && npx playwright test e2e/inspection.spec.ts --project=chromium
import { expect, test, type Page } from '@playwright/test'
import { openSchematic, runCommand } from './journey'

test.use({ serviceWorkers: 'block' })
test.skip(({ browserName }) => browserName !== 'chromium', 'One engine is enough for this journey.')

async function open(page: Page, name: string, text: string, run: 'Solve' | 'Check') {
  await page.setViewportSize({ width: 1440, height: 960 })
  const source = `https://raw.example/${name}.frees`
  await page.route(source, (route) => route.fulfill({ contentType: 'text/plain', body: text }))
  await page.goto('/?url=' + encodeURIComponent(source))
  await expect(page.locator('.cm-content')).toContainText(text.split('\n')[0], { timeout: 60_000 })
  await page.getByRole('button', { name: run, exact: true }).click()
  if (run === 'Solve') await expect(page.getByText(/^Solved/i).first()).toBeVisible({ timeout: 120_000 })
}

test('R: the Problems panel lists a Check error and goes to its line, under the Editor', async ({ page }) => {
  await open(page, 'problems', 'L = 4 [m]\nW = = 3\nA = L*W\n', 'Check')
  await runCommand(page, 'Problems')
  const panel = page.getByTestId('problems-panel')
  await expect(panel).toContainText(/Model: \d+ errors?/)
  const row = panel.getByRole('row').filter({ hasText: 'Check' }).first()
  await expect(row).toContainText('error')
  // It opened under the Editor, which is still on screen.
  await expect(page.locator('.cm-content')).toBeVisible()
  await page.locator('.cm-content').click()
  await page.keyboard.press('Control+Home')
  await row.getByRole('button', { name: /Go to source, line 2/ }).click()
  await expect(page.locator('.cm-activeLine')).toContainText('W = = 3')

  // The filter keeps the count and says when nothing of a severity is listed.
  await panel.getByText('Warnings', { exact: true }).click()
  await expect(panel).toContainText('None of this severity.')
})

test('R: the Inspector names a variable, runs its commands and goes to where it is written', async ({ page }) => {
  await open(page, 'inspect', 'L = 4 [m]\nW = 3 [m]\nA = L*W\n', 'Solve')
  await expect(async () => {
    await page.getByRole('row', { name: /(^| )W \d/ }).first().click()
    await runCommand(page, 'Inspector')
    await expect(page.getByTestId('inspector-target')).toHaveText(/Variable\s*W/, { timeout: 1000 })
  }).toPass()
  const inspector = page.getByTestId('inspector-target').locator('..')
  await expect(inspector).toContainText('3 [m]')
  await expect(inspector.getByRole('button', { name: 'Pin to Slider' })).toBeEnabled()
  await inspector.getByRole('button', { name: /^3: A = L\*W/ }).click()
  await expect(page.locator('.cm-activeLine')).toContainText('A = L*W')
  // Focusing a main window hands the Inspector back to it, by name.
  await page.locator('.cm-content').click()
  await expect(page.getByTestId('inspector-target')).toContainText('Editor')
})

test('R: the Inspector reads the block selected on the schematic', async ({ page }) => {
  await open(page, 'blocks', 'VoltageSource SRC(E = 2.5)\nGround G()\nResistor R1(R = 5)\nconnect(SRC.p, R1.a)\nconnect(R1.b, SRC.n, G.port)\n', 'Solve')
  const svg = await openSchematic(page, 'r1')
  await runCommand(page, 'Inspector')
  await expect(page.getByTestId('inspector-target')).toContainText('Schematic')
  await svg.locator('[data-node="r1"]').click()
  await expect(page.getByTestId('inspector-target')).toHaveText(/Block\s*R1/)
  const inspector = page.getByTestId('inspector-target').locator('..')
  await expect(inspector).toContainText('Resistor')
  await expect(inspector.getByRole('table', { name: 'R1 parameters' })).toContainText('5')
  await expect(inspector.getByRole('button', { name: 'Go to Source (line 3)' })).toBeVisible()
})
