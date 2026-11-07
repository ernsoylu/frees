// Phase I4: embed and kiosk mode. `?embed=1` shows one view, the approved
// sliders, Solve, Reset and "Open in full frees" — and never reads or writes
// the visitor's own autosaved workspace. `?example=` opens a gallery example.
//
// Run:  npm run build && npx playwright test e2e/embed.spec.ts --project=chromium
import { expect, test } from '@playwright/test'

test.use({ serviceWorkers: 'block', viewport: { width: 1000, height: 700 } })
test.skip(({ browserName }) => browserName !== 'chromium', 'One engine is enough for this journey.')
test.setTimeout(180_000)

const MINE = JSON.stringify({ text: 'my_own_work = 42' })

test('I4: a kiosk embed of the RC lesson — one plot, its approved slider, Solve and Reset, and the visitor’s workspace untouched', async ({ page }) => {
  await page.addInitScript((mine) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('frees.project', mine)
      sessionStorage.setItem('seeded', '1')
    }
  }, MINE)
  await page.goto('/?embed=1&example=lesson-rc-charging&view=plot&sliders=R_s&theme=light&readonly')
  const embed = page.getByTestId('embed')
  await expect(embed).toBeVisible({ timeout: 60_000 })
  await expect(page.locator('html')).toHaveAttribute('data-mantine-color-scheme', 'light')
  await expect(page.getByRole('navigation', { name: 'Workspace navigation' })).toHaveCount(0)
  await expect(page.locator('.cm-content')).toHaveCount(0)
  await expect(embed.getByText('Lesson — RC charging')).toBeVisible()

  // The way out keeps the example and drops the kiosk parameters.
  const out = embed.getByRole('link', { name: 'Open in full frees' })
  await expect(out).toHaveAttribute('href', /\/\?example=lesson-rc-charging$/)
  await expect(out).toHaveAttribute('target', '_blank')

  await embed.getByRole('button', { name: 'Solve', exact: true }).click()
  await expect(embed.getByText('Solved', { exact: true })).toBeVisible({ timeout: 120_000 })
  await expect(page.locator('.js-plotly-plot').first()).toBeVisible({ timeout: 60_000 })
  // Only the slider the URL names is shown, and it has no unpin button.
  await expect(embed.getByRole('slider')).toHaveCount(1)
  await expect(embed.getByRole('button', { name: /^Unpin/ })).toHaveCount(0)

  // Read-only keeps the lesson's slider change working.
  const lesson = page.getByRole('region', { name: 'Lesson: RC charging' })
  await lesson.getByText('falls', { exact: true }).click()
  await lesson.getByRole('button', { name: 'Double the resistance to 2000 Ω' }).click()
  await expect(lesson.getByTestId('lesson-observe')).toHaveText('The capacitor voltage at 1 ms went from 6.3212 to 3.9347: it falls.', { timeout: 60_000 })

  // Reset returns to the example as it opened: nothing solved, baseline slider.
  await embed.getByRole('button', { name: 'Reset', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Lesson: RC charging' }).getByTestId('lesson-observe')).toHaveText('Watch the capacitor voltage at 1 ms.')
  await expect(embed.getByText('Solved', { exact: true })).toHaveCount(0)

  // Autosave would have run by now; the visitor's own work is as it was.
  await page.waitForTimeout(1500)
  expect(await page.evaluate(() => localStorage.getItem('frees.project'))).toBe(MINE)
})

test('I4: ?example= opens a gallery example in the full app and leaves the address bar', async ({ page }) => {
  await page.goto('/?example=lesson-diode')
  // The usual guard: opening a document over the current one asks first.
  const ask = page.getByRole('dialog', { name: 'Unsaved Changes' })
  await expect(ask).toBeVisible({ timeout: 60_000 })
  await ask.getByRole('button', { name: "Don't Save" }).click()
  await expect(page.getByRole('region', { name: 'Lesson: A diode lets current one way' })).toBeVisible({ timeout: 60_000 })
  await expect(page.getByRole('button', { name: /currently Lesson — a diode lets current one way/ })).toBeVisible()
  expect(new URL(page.url()).searchParams.has('example')).toBe(false)
  // Nothing ran: the model waits for Solve, which checks it first.
  await expect(page.getByText(/^Solved/)).toHaveCount(0)
})
