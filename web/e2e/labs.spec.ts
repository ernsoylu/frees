// Phase M acceptance: graded live labs and shared experiments. A lab is graded
// against its references and runs from the keyboard; under reduced motion it
// opens paused and steps; a shared lesson opens unsolved at the sliders its
// run started from and replays its experiment; an embed autoruns an approved
// lab only after the visitor solves, and never touches their workspace. M3:
// blocks fill by the net power at their ports, and the Sankey balances them.
// M4: a pump and a valve draw their curve with the operating point on it.
//
// Run:  npm run build && npx playwright test e2e/labs.spec.ts --project=chromium
import { expect, test, type Page } from '@playwright/test'
import { runCommand } from './journey'

test.use({ serviceWorkers: 'block', viewport: { width: 1440, height: 960 } })
test.skip(({ browserName }) => browserName !== 'chromium', 'One engine is enough for this journey.')
test.setTimeout(240_000)

/** Opens a gallery lab by `?example=` and solves it; returns its lesson panel. */
async function solvedLab(page: Page, example: string, lesson: string) {
  await page.goto(`/?example=${example}`)
  const ask = page.getByRole('dialog', { name: 'Unsaved Changes' })
  await ask.waitFor({ timeout: 5000 }).then(() => ask.getByRole('button', { name: "Don't Save" }).click(), () => {})
  const panel = page.getByRole('region', { name: `Lesson: ${lesson}` })
  await expect(panel).toBeVisible({ timeout: 60_000 })
  await page.keyboard.press('F2')
  await expect(panel.getByRole('button', { name: 'Run the lab live' })).toBeEnabled({ timeout: 120_000 })
  return panel
}

async function expectAllGradesPass(page: Page, count: number) {
  const grades = page.getByRole('list', { name: 'Lab grades' }).getByRole('listitem')
  await expect(grades).toHaveCount(count, { timeout: 60_000 })
  for (const g of await grades.all()) await expect(g).toHaveText(/^✓ /)
}

test('M1: a lab from the keyboard — graded against its references, and its timeline reaches the bar and the slider', async ({ page }) => {
  const panel = await solvedLab(page, 'lab-thermostat', 'A thermostat limit cycle')
  await panel.getByRole('button', { name: 'Run the lab live' }).focus()
  await page.keyboard.press('Enter')
  await expectAllGradesPass(page, 2)
  // The bar plays the lab at its own speed, and the band change at 3000 s arrives.
  const bar = page.getByTestId('live-bar')
  await expect(bar.getByTestId('live-speed')).toHaveText('100 s/s')
  await expect(bar.getByTestId('live-input')).toHaveText('dt_band = 4 from t = 3000', { timeout: 60_000 })
  await expect(page.getByRole('slider', { name: 'dT_band value' })).toHaveAttribute('aria-valuenow', '4')
})

test('M acceptance: under reduced motion a lab opens paused, steps, and is still graded', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const panel = await solvedLab(page, 'lab-accumulator', 'Charging a hydraulic accumulator')
  await panel.getByRole('button', { name: 'Run the lab live' }).click()
  await expectAllGradesPass(page, 2)
  const bar = page.getByTestId('live-bar')
  await expect(bar.getByRole('button', { name: 'Run live' })).toBeVisible()
  await expect(bar.getByRole('button', { name: 'Pause' })).toHaveCount(0)
  // The lesson panel floats over the bar; the keyboard reaches it either way.
  await bar.getByRole('button', { name: 'Next sample' }).focus()
  await page.keyboard.press('Enter')
  await expect(bar.getByText(/^[1-9]\d* rows?$/)).toBeVisible({ timeout: 30_000 })
})

test('M2: a shared experiment opens unsolved at the sliders its run started from, and replays its input changes', async ({ page, context }) => {
  const panel = await solvedLab(page, 'lab-battery-windup', 'A battery load step and PID anti-windup')
  await panel.getByRole('button', { name: 'Run the lab live' }).click()
  const bar = page.getByTestId('live-bar')
  await expect(bar.getByTestId('live-input')).toHaveText('q_load = 1500 from t = 1600', { timeout: 90_000 })
  await bar.getByRole('button', { name: 'Pause' }).click()
  // The slider followed the lab to 1500 W, back where the run started.
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (t: string) => { (globalThis as { shared?: string }).shared = t } }, configurable: true })
  })
  await runCommand(page, 'Copy Share Link')
  await expect(page.getByText('Share link copied')).toBeVisible()
  const url = await page.evaluate(() => (globalThis as { shared?: string }).shared!)
  expect(url).toContain('#share=2.')

  const other = await context.newPage()
  await other.goto(url)
  await expect(other.getByText(/with a live experiment: 2 input changes from t = 100 s to 1600 s/)).toBeVisible({ timeout: 60_000 })
  const lesson = other.getByRole('region', { name: 'Lesson: A battery load step and PID anti-windup' })
  await expect(lesson).toBeVisible()
  // The same safe initial state: nothing solved, and once solved the sliders the run opened with.
  await expect(other.getByText(/^Solved/)).toHaveCount(0)
  await expect(lesson.getByRole('button', { name: 'Run the lab live' })).toBeDisabled()
  await other.keyboard.press('F2')
  const otherBar = other.getByTestId('live-bar')
  await expect(otherBar).toBeVisible({ timeout: 120_000 })
  await expect(other.getByRole('slider', { name: 'Q_load value' })).toHaveAttribute('aria-valuenow', '1500')
  await expect(other.getByRole('slider', { name: 'T_t value' })).toHaveAttribute('aria-valuenow', '20')
  // A plain live run replays the experiment.
  await otherBar.getByRole('slider').focus()
  await other.keyboard.press('End')
  await otherBar.getByRole('button', { name: 'Run live' }).focus()
  await other.keyboard.press('Enter')
  await expect(otherBar.getByTestId('live-input')).toHaveText(/^q_load = (4000 from t = 100|1500 from t = 1600)$/, { timeout: 60_000 })
  await other.close()
})

test('M2: an embed autoruns an approved lab once the visitor solves, and leaves their workspace alone', async ({ page }) => {
  const mine = JSON.stringify({ text: 'my_own_work = 42' })
  await page.addInitScript((m) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('frees.project', m)
      sessionStorage.setItem('seeded', '1')
    }
  }, mine)
  await page.goto('/?embed=1&example=lab-accumulator&view=plot&autorun')
  const embed = page.getByTestId('embed')
  await expect(embed).toBeVisible({ timeout: 60_000 })
  // Nothing runs before the visitor asks.
  await expect(page.getByTestId('live-bar')).toHaveCount(0)
  await embed.getByRole('button', { name: 'Solve', exact: true }).click()
  const bar = page.getByTestId('live-bar')
  await expect(bar.getByRole('button', { name: 'Pause' })).toBeVisible({ timeout: 120_000 })
  await expect(page.getByText('A newer autosave exists in browser storage')).toHaveCount(0)
  await page.waitForTimeout(1500)
  expect(await page.evaluate(() => localStorage.getItem('frees.project'))).toBe(mine)
})

test('M3: blocks fill by net port power, and the power flow balances suppliers against the blocks taking power in', async ({ page }) => {
  await page.goto('/?example=rankine-ideal-cycle')
  const ask = page.getByRole('dialog', { name: 'Unsaved Changes' })
  await ask.waitFor({ timeout: 5000 }).then(() => ask.getByRole('button', { name: "Don't Save" }).click(), () => {})
  await page.keyboard.press('F2')
  await expect(page.getByText('Solved', { exact: true })).toBeVisible({ timeout: 120_000 })
  await page.getByRole('button', { name: /^Schematic/ }).first().click()
  await page.getByRole('button', { name: 'Overlay', exact: true }).click()
  await page.getByRole('switch', { name: 'Fill blocks by power' }).check({ force: true })
  await page.keyboard.press('Escape')
  const net = async (block: string) => Number(await page.locator(`[data-node="${block}"] [data-power]`).getAttribute('data-power'))
  // The boiler's heat and the pump's work go in; the turbine's work and the condenser's heat come out, and they balance.
  const [pump, boiler, turb, cond] = [await net('pump'), await net('boiler'), await net('turb'), await net('cond')]
  expect(boiler).toBeCloseTo(-2728592, -1)
  expect(pump).toBeCloseTo(-3033.89, 0)
  expect(turb).toBeCloseTo(713042.4, -1)
  expect(cond).toBeCloseTo(2018583.5, -1)
  expect(Math.abs(pump + boiler + turb + cond)).toBeLessThan(1)
  await page.getByTestId('power-legend').getByRole('button', { name: 'Power flow' }).click()
  const flow = page.getByRole('dialog', { name: 'Power flow' })
  await expect(flow.locator('.node-label')).toHaveText(['pump', 'turb', 'cond', 'boiler'], { timeout: 30_000 })
})

test('M4: a pump and a valve each draw their curve with the operating point on it', async ({ page }) => {
  await page.goto('/?example=pump-valve-operating-point')
  const ask = page.getByRole('dialog', { name: 'Unsaved Changes' })
  await ask.waitFor({ timeout: 5000 }).then(() => ask.getByRole('button', { name: "Don't Save" }).click(), () => {})
  await page.keyboard.press('F2')
  await expect(page.getByText('Solved', { exact: true })).toBeVisible({ timeout: 120_000 })
  await page.getByRole('button', { name: /^Schematic/ }).first().click()
  const card = page.getByTestId('operating-point')
  // The pump's map table is evaluated through the engine; the point is the solve's.
  await page.locator('[data-node="p1"]').focus()
  await page.keyboard.press('Enter')
  await expect(card.getByRole('img')).toHaveAttribute('aria-label', 'Pump curve: Q = 0.011906 m^3/s, head = 26.094 m')
  await expect(card.locator('[data-curve]')).toHaveAttribute('data-curve', '41', { timeout: 30_000 })
  await page.locator('[data-node="v1"]').focus()
  await page.keyboard.press('Enter')
  await expect(card.getByRole('img')).toHaveAttribute('aria-label', 'Valve at u = 0.6: ṁ = 11.882 kg/s, ΔP = 174650 Pa')
})
