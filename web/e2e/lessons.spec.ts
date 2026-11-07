// Phase I2: a lesson beside a gallery example. Opening the example opens its
// lesson with the approved sliders pinned; predict → change one input →
// observe → explain → check runs on the model's own solves; Reset returns to
// the baseline; the paired lesson in another domain opens from the panel and
// works from the keyboard.
//
// Run:  npm run build && npx playwright test e2e/lessons.spec.ts --project=chromium
import { expect, test, type Page } from '@playwright/test'

test.use({ serviceWorkers: 'block', viewport: { width: 1440, height: 960 } })
test.skip(({ browserName }) => browserName !== 'chromium', 'One engine is enough for this journey.')

async function openExample(page: Page, title: string) {
  await page.locator('body').click({ position: { x: 5, y: 5 } })
  await page.keyboard.press('Control+K')
  await page.getByPlaceholder('Search views, tools, and actions…').fill('Open Example')
  await page.keyboard.press('Enter')
  await page.getByRole('dialog', { name: 'Open an Example' }).getByRole('button', { name: new RegExp(`^${title}`) }).click()
  await discardIfAsked(page)
}

/** Opening an example over the current document asks to save it first. */
async function discardIfAsked(page: Page) {
  const ask = page.getByRole('dialog', { name: 'Unsaved Changes' })
  await ask.waitFor({ timeout: 3000 }).then(() => ask.getByRole('button', { name: "Don't Save" }).click(), () => {})
}

const solve = async (page: Page) => {
  await page.getByRole('button', { name: 'Solve', exact: true }).click()
  await expect(page.getByText(/^Solved/i).first()).toBeVisible({ timeout: 120_000 })
}

test.setTimeout(180_000)
test('I2: RC charging lesson — predict, change, observe, check, reset; then the paired thermal lesson by keyboard', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.cm-content')).toBeVisible({ timeout: 60_000 })
  await openExample(page, 'Lesson — RC charging')
  const panel = page.getByRole('region', { name: 'Lesson: RC charging' })
  await expect(panel).toBeVisible()
  await solve(page)
  await expect(panel.getByTestId('lesson-observe')).toHaveText('Watch the capacitor voltage at 1 ms, now 6.3212.')

  // The change waits for a prediction.
  const change = panel.getByRole('button', { name: 'Double the resistance to 2000 Ω' })
  await expect(change).toBeDisabled()
  await panel.getByText('falls', { exact: true }).click()
  await change.click()
  await expect(panel.getByTestId('lesson-observe')).toHaveText('The capacitor voltage at 1 ms went from 6.3212 to 3.9347: it falls.', { timeout: 60_000 })
  await expect(panel.getByTestId('lesson-check')).toHaveText('✓ You predicted it falls.')
  await expect(panel.getByTestId('lesson-unexpected')).toHaveCount(0)
  await expect(panel).toContainText('Doubling R doubles τ to 2 ms')

  // Reset returns the slider and the solution to the baseline.
  await panel.getByRole('button', { name: 'Reset lesson' }).click()
  await expect(panel.getByTestId('lesson-observe')).toHaveText('Watch the capacitor voltage at 1 ms, now 6.3212.', { timeout: 60_000 })
  await expect(panel.getByTestId('lesson-check')).toHaveCount(0)

  // The same mathematics in heat, driven from the keyboard.
  await panel.getByRole('button', { name: /The same idea in another domain: A cooling thermal mass/ }).click()
  await discardIfAsked(page)
  const heat = page.getByRole('region', { name: 'Lesson: A cooling thermal mass' })
  await expect(heat).toBeVisible()
  await solve(page)
  await expect(heat.getByTestId('lesson-observe')).toHaveText(/^Watch the block temperature at 250 s, now 336\.79\.$/)
  await heat.getByRole('radio', { name: 'rises' }).focus()
  await page.keyboard.press('ArrowRight') // → falls
  await expect(heat.getByRole('radio', { name: 'falls' })).toBeChecked()
  await heat.getByRole('button', { name: 'Double the convection coefficient to 40 W/m²·K' }).focus()
  await page.keyboard.press('Enter')
  await expect(heat.getByTestId('lesson-observe')).toHaveText(/^The block temperature at 250 s went from 336\.79 to 313\.5\d*: it falls\.$/, { timeout: 60_000 })
  await expect(heat.getByTestId('lesson-check')).toHaveText('✓ You predicted it falls.')
})
