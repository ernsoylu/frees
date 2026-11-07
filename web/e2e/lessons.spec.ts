// Phases I2–I3: a lesson beside a gallery example. Opening the example opens
// its lesson with the approved sliders pinned; predict → change one input →
// observe → explain → check runs on the model's own solves; Reset returns to
// the baseline; the paired lesson in another domain opens from the panel and
// works from the keyboard; chart lessons open on their chart.
//
// Run:  npm run build && npx playwright test e2e/lessons.spec.ts --project=chromium
import { expect, test, type Locator, type Page } from '@playwright/test'
import { runCommand } from './journey'

test.use({ serviceWorkers: 'block', viewport: { width: 1440, height: 960 } })
test.skip(({ browserName }) => browserName !== 'chromium', 'One engine is enough for this journey.')
test.setTimeout(180_000)

/** Opening an example over the current document asks to save it first. */
async function discardIfAsked(page: Page) {
  const ask = page.getByRole('dialog', { name: 'Unsaved Changes' })
  await ask.waitFor({ timeout: 3000 }).then(() => ask.getByRole('button', { name: "Don't Save" }).click(), () => {})
}

/** Opens a gallery example by title and returns its lesson panel, solved. */
async function openLesson(page: Page, example: string, lesson: string) {
  await runCommand(page, 'Open Example')
  await page.getByRole('dialog', { name: 'Open an Example' }).getByRole('button', { name: new RegExp(`^${example}`) }).click()
  await discardIfAsked(page)
  return solvedLesson(page, lesson)
}

async function solvedLesson(page: Page, lesson: string) {
  const panel = page.getByRole('region', { name: `Lesson: ${lesson}` })
  await expect(panel).toBeVisible()
  await page.getByRole('button', { name: 'Solve', exact: true }).click()
  await expect(page.getByText(/^Solved/i).first()).toBeVisible({ timeout: 120_000 })
  return panel
}

/** Predicts by mouse, makes the change, and checks the observed move and the ✓. */
async function predictAndChange(panel: Locator, prediction: string, change: string, observed: string | RegExp) {
  const button = panel.getByRole('button', { name: change })
  await expect(button).toBeDisabled()
  await panel.getByText(prediction, { exact: true }).click()
  await button.click()
  await expect(panel.getByTestId('lesson-observe')).toHaveText(observed, { timeout: 60_000 })
  await expect(panel.getByTestId('lesson-check')).toHaveText(`✓ You predicted it ${prediction}.`)
  await expect(panel.getByTestId('lesson-unexpected')).toHaveCount(0)
}

async function openPair(page: Page, panel: Locator, lesson: string) {
  await panel.getByRole('button', { name: new RegExp(`The same idea in another domain: ${lesson}`) }).click()
  await discardIfAsked(page)
  return solvedLesson(page, lesson)
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.cm-content')).toBeVisible({ timeout: 60_000 })
})

test('I2: RC charging lesson — predict, change, observe, check, reset; then the paired thermal lesson by keyboard', async ({ page }) => {
  const panel = await openLesson(page, 'Lesson — RC charging', 'RC charging')
  await expect(panel.getByTestId('lesson-observe')).toHaveText('Watch the capacitor voltage at 1 ms, now 6.3212.')
  await predictAndChange(panel, 'falls', 'Double the resistance to 2000 Ω', 'The capacitor voltage at 1 ms went from 6.3212 to 3.9347: it falls.')
  await expect(panel).toContainText('Doubling R doubles τ to 2 ms')

  // Reset returns the slider and the solution to the baseline.
  await panel.getByRole('button', { name: 'Reset lesson' }).click()
  await expect(panel.getByTestId('lesson-observe')).toHaveText('Watch the capacitor voltage at 1 ms, now 6.3212.', { timeout: 60_000 })
  await expect(panel.getByTestId('lesson-check')).toHaveCount(0)

  // The same mathematics in heat, driven from the keyboard.
  const heat = await openPair(page, panel, 'A cooling thermal mass')
  await expect(heat.getByTestId('lesson-observe')).toHaveText(/^Watch the block temperature at 250 s, now 336\.79\.$/)
  await heat.getByRole('radio', { name: 'rises' }).focus()
  await page.keyboard.press('ArrowRight') // → falls
  await expect(heat.getByRole('radio', { name: 'falls' })).toBeChecked()
  await heat.getByRole('button', { name: 'Double the convection coefficient to 40 W/m²·K' }).focus()
  await page.keyboard.press('Enter')
  await expect(heat.getByTestId('lesson-observe')).toHaveText(/^The block temperature at 250 s went from 336\.79 to 313\.5\d*: it falls\.$/, { timeout: 60_000 })
  await expect(heat.getByTestId('lesson-check')).toHaveText('✓ You predicted it falls.')
})

test('I3: the ringing RLC circuit and its mass-spring-damper pair overshoot by the same law', async ({ page }) => {
  const rlc = await openLesson(page, 'Lesson — a ringing RLC circuit', 'A ringing RLC circuit')
  await predictAndChange(rlc, 'falls', 'Double the resistance to 8 Ω', /^The overshoot past the step went from 0\.5266\d* to 0\.2538\d*: it falls\.$/)
  const msd = await openPair(page, rlc, 'A mass on a spring and damper')
  await predictAndChange(msd, 'falls', 'Double the damping to 8 N·s/m', /^The overshoot past F\/k went from 0\.5266\d* to 0\.2538\d*: it falls\.$/)
})

test('I3: a wrong prediction is marked, and the throttling lesson opens on its P-h chart', async ({ page }) => {
  const lesson = await openLesson(page, 'Lesson — throttling on the P-h chart', 'Throttling on the P-h chart')
  const chart = page.locator('.js-plotly-plot').first()
  await expect(chart).toBeVisible({ timeout: 60_000 })
  // The dome and the overlaid inlet and exit states, one h apart by nothing.
  await expect.poll(() => chart.evaluate((gd) => ((gd as unknown as { data?: unknown[] }).data ?? []).length)).toBeGreaterThan(1)
  await lesson.getByText('rises', { exact: true }).click()
  await lesson.getByRole('button', { name: 'Double the evaporator pressure to 0.24 MPa' }).click()
  await expect(lesson.getByTestId('lesson-observe')).toHaveText(/^The exit quality went from 0\.3403\d* to 0\.2508\d*: it falls\.$/, { timeout: 60_000 })
  await expect(lesson.getByTestId('lesson-check')).toHaveText('✗ You predicted it rises; the model shows it falls.')
})
