// Pinned sliders and saved scenarios belong to their document: New Project
// and Load Example both start without the last document's, and a lesson
// example pins its own. The strip renders only beside solved values, so each
// check solves first.
//
// Run:  npm run build && npx playwright test e2e/new-document-state.spec.ts --project=chromium
import { expect, Page, test } from '@playwright/test'
import { runCommand } from './journey'

test.use({ serviceWorkers: 'block', viewport: { width: 1440, height: 960 } })
test.skip(({ browserName }) => browserName !== 'chromium', 'One engine is enough for this journey.')

const PROJECT = {
  text: 'L = 4 [m]\nA = L*L\n',
  tables: [],
  sliders: [{ name: 'L', value: 4, units: 'm', min: 1, max: 10 }],
  scenarios: { list: [{ name: 'Wide room', inputs: [{ name: 'L', value: 5, unit: 'm' }] }], active: null },
}

async function bootWithSlider(page: Page, path: string) {
  await page.addInitScript((project) => {
    if (sessionStorage.getItem('seeded')) return
    localStorage.setItem('frees.project', JSON.stringify(project))
    sessionStorage.setItem('seeded', '1')
  }, PROJECT)
  await page.goto(path)
  const welcome = page.getByRole('dialog').filter({ hasText: 'Welcome to frees' })
  if (await welcome.waitFor({ timeout: 10_000 }).then(() => true, () => false)) await page.keyboard.press('Escape')
}

/** The seeded document may count as unsaved; discard it when asked. */
async function dontSave(page: Page) {
  const unsaved = page.getByRole('dialog', { name: 'Unsaved Changes' })
  if (await unsaved.waitFor({ timeout: 5_000 }).then(() => true, () => false)) {
    await unsaved.getByRole('button', { name: "Don't Save" }).click()
  }
}

/** Solves and shows the Variable Explorer, where a pinned slider would render. */
async function solveAndShowVariables(page: Page) {
  await page.getByRole('button', { name: 'Solve', exact: true }).click()
  await expect(page.getByText(/^Solved/i).first()).toBeVisible({ timeout: 120_000 })
  await runCommand(page, 'Variable Explorer')
  await expect(page.getByPlaceholder('Filter variables…')).toBeVisible()
}

/** The scenario names the Runs & Scenarios picker offers. */
async function scenarioOptions(page: Page) {
  await runCommand(page, 'Runs & Scenarios')
  await page.getByTestId('runs-panel').getByRole('combobox', { name: 'Scenario' }).click()
  const names = await page.getByRole('option').allTextContents()
  await page.keyboard.press('Escape')
  return names
}

test('New Project drops the last document\'s sliders and scenarios', async ({ page }) => {
  await bootWithSlider(page, '/')
  await solveAndShowVariables(page)
  await expect(page.getByRole('button', { name: 'Unpin L' })).toBeVisible()
  expect(await scenarioOptions(page)).toContain('Wide room')

  await page.getByRole('button', { name: 'File', exact: true }).click()
  await page.getByRole('menuitem', { name: 'New Project' }).click()
  await dontSave(page)
  await expect(page.locator('.cm-content')).toContainText('Welcome to frees')
  await solveAndShowVariables(page)
  await expect(page.getByRole('button', { name: 'Unpin L' })).toHaveCount(0)
  expect(await scenarioOptions(page)).not.toContain('Wide room')
})

test('Load Example drops the last document\'s sliders and scenarios', async ({ page }) => {
  // `rankine-ideal-cycle` carries no lesson, so nothing re-pins sliders.
  await bootWithSlider(page, '/?example=rankine-ideal-cycle')
  await dontSave(page)
  await expect(page.locator('.cm-content')).not.toContainText('A = L*L', { timeout: 60_000 })
  await solveAndShowVariables(page)
  await expect(page.getByRole('button', { name: 'Unpin L' })).toHaveCount(0)
  expect(await scenarioOptions(page)).not.toContain('Wide room')
})

test('A lesson example pins its own sliders, not the last document\'s', async ({ page }) => {
  await bootWithSlider(page, '/?example=lesson-rc-charging')
  await dontSave(page)
  await expect(page.locator('.cm-content')).not.toContainText('A = L*L', { timeout: 60_000 })
  await solveAndShowVariables(page)
  await expect(page.getByRole('button', { name: 'Unpin R_s' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Unpin L' })).toHaveCount(0)
})
