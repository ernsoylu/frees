// RUN-07: named scenarios and baseline/current run comparison.
//
// Run:  npm run build && npx playwright test e2e/runs.spec.ts --project=chromium
import { expect, test } from '@playwright/test'

const ROOM = `// A room's floor area for two widths
L = 4 [m]
W = 3 [m]
A = L*W
`

test.use({ serviceWorkers: 'block', viewport: { width: 1440, height: 960 } })
test.skip(({ browserName }) => browserName !== 'chromium', 'One engine is enough for this journey.')

test('RUN-07: a named scenario solves without editing the document; the run says which; baseline and current compare; scenario edits undo and mark the result stale; reload keeps them', async ({ page }) => {
  // Count every request the app sends to its engine workers.
  await page.addInitScript(() => {
    const calls: string[] = []
    ;(window as unknown as { engineCalls: string[] }).engineCalls = calls
    const post = Worker.prototype.postMessage
    Worker.prototype.postMessage = function (this: Worker, message: unknown, ...rest: unknown[]) {
      const method = (message as { method?: string } | null)?.method
      if (method) calls.push(method)
      return (post as (...a: unknown[]) => void).call(this, message, ...rest)
    } as typeof Worker.prototype.postMessage
  })
  const source = 'https://raw.example/runs.frees'
  await page.route(source, (route) => route.fulfill({ contentType: 'text/plain', body: ROOM }))
  await page.goto('/?url=' + encodeURIComponent(source))
  await expect(page.locator('.cm-content')).toContainText('floor area', { timeout: 60_000 })
  const solve = async () => {
    await page.getByRole('button', { name: 'Solve', exact: true }).click()
    await expect(page.getByText(/^Solved/i).first()).toBeVisible({ timeout: 60_000 })
  }
  await solve()
  const calls = () => page.evaluate(() => [...(window as unknown as { engineCalls: string[] }).engineCalls])
  const panel = page.getByTestId('runs-panel')
  const identity = panel.getByTestId('run-identity')
  await expect(identity).toHaveText(/^run \d+ · Document inputs · steady solution · solved$/)
  const first = Number((await identity.textContent())!.match(/run (\d+)/)![1])

  // The document's own run becomes the baseline.
  await panel.getByRole('button', { name: 'Set as baseline' }).click()
  await expect(panel.getByTestId('baseline-identity')).toHaveText(`Baseline: run ${first} · Document inputs · steady solution · solved`)
  await page.waitForTimeout(1000)
  const before = (await calls()).length

  // A new scenario sets W = 5 m; the result on screen is kept, marked stale, and nothing solves.
  await panel.getByRole('button', { name: 'New', exact: true }).click()
  await panel.getByLabel('Scenario name').fill('Wide room')
  await page.keyboard.press('Enter')
  await panel.getByRole('combobox', { name: 'Add input' }).click()
  await page.getByRole('option', { name: 'W', exact: true }).click()
  const width = panel.getByLabel('Value of W')
  await expect(width).toHaveValue('3')
  await width.fill('5')
  await page.keyboard.press('Enter')
  await expect(panel.getByTestId('run-stale')).toBeVisible()
  await expect(identity).toContainText(`run ${first} · Document inputs`)

  // Scenario edits undo and redo, one step each.
  await panel.getByRole('button', { name: 'Revert scenario change' }).click()
  await expect(panel.getByLabel('Value of W')).toHaveValue('3')
  await panel.getByRole('button', { name: 'Reapply scenario change' }).click()
  await expect(panel.getByLabel('Value of W')).toHaveValue('5')
  await page.waitForTimeout(1000)
  const scenarioCalls = (await calls()).slice(before)
  expect(scenarioCalls.filter((m) => m === 'solve' || m === 'check')).toEqual([])

  // Solving the scenario: the run names it, the document is unchanged, and the comparison reads.
  await solve()
  await expect(identity).toHaveText(/^run \d+ · Wide room · steady solution · solved$/)
  await expect(panel.getByTestId('run-stale')).toBeHidden()
  const table = panel.getByTestId('run-comparison')
  await expect(table.locator('[data-variable="A"]')).toContainText('A12 m^2')
  await expect(table.locator('[data-variable="A"]')).toContainText('20 m^2')
  await expect(table.locator('[data-variable="A"] [data-change]')).toHaveText('+8 m^2 (+66.7 %)')
  await expect(table.locator('[data-variable="L"] [data-change]')).toHaveText('same')
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('frees.project') ?? '{}'))
  expect(saved.text).toBe(ROOM)
  expect(saved.version).toBeGreaterThanOrEqual(7) // v7 added scenarios
  expect(saved.scenarios).toEqual({ list: [{ name: 'Wide room', inputs: [{ name: 'W', value: 5, unit: 'm' }] }], active: 'Wide room' })

  // Back to the document's inputs: stale until solved, then the same as the baseline.
  await panel.getByRole('combobox', { name: 'Scenario' }).click()
  await page.getByRole('option', { name: 'Document inputs' }).click()
  await expect(panel.getByTestId('run-stale')).toBeVisible()
  await solve()
  await expect(table.locator('[data-variable="A"] [data-change]')).toHaveText('same')

  // Reload: the scenarios come back with the project (the baseline is the session's).
  await page.waitForTimeout(1500)
  await page.reload()
  const welcome = page.getByRole('dialog').filter({ hasText: 'Welcome to frees' })
  if (await welcome.waitFor({ timeout: 15_000 }).then(() => true, () => false)) await page.keyboard.press('Escape')
  await solve()
  await panel.getByRole('combobox', { name: 'Scenario' }).click()
  await expect(page.getByRole('option', { name: 'Wide room' })).toBeVisible()
  await test.info().attach('evidence.json', { body: JSON.stringify({ firstRun: first, scenarioCalls }, null, 2), contentType: 'application/json' })
})
