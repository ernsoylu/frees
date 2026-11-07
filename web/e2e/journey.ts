// Shared steps of the playback journeys: record every engine call the page
// makes, open a model from a routed URL and solve it.
import { expect, type Page } from '@playwright/test'

/** Records each worker request's method on `window.engineCalls`, then opens `text` and solves it. */
export async function openAndSolve(page: Page, name: string, text: string, solveTimeout = 120_000) {
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
  const source = `https://raw.example/${name}.frees`
  await page.route(source, (route) => route.fulfill({ contentType: 'text/plain', body: text }))
  await page.goto('/?url=' + encodeURIComponent(source))
  await expect(page.locator('.cm-content')).toContainText(text.split('\n')[0], { timeout: 60_000 })
  await page.getByRole('button', { name: 'Solve', exact: true }).click()
  await expect(page.getByText(/^Solved/i).first()).toBeVisible({ timeout: solveTimeout })
}

/** The engine calls made so far. */
export const engineCalls = (page: Page) => page.evaluate(() => [...(window as unknown as { engineCalls: string[] }).engineCalls])

/** Runs a command-palette entry by its label. */
export async function runCommand(page: Page, label: string) {
  await page.locator('body').click({ position: { x: 5, y: 5 } })
  await page.keyboard.press('Control+K')
  await page.getByPlaceholder('Search views, tools, and actions…').fill(label)
  await page.keyboard.press('Enter')
}

/** Opens the schematic and waits until block `node` is drawn; returns the canvas. */
export async function openSchematic(page: Page, node: string) {
  await runCommand(page, 'Schematic')
  const svg = page.getByRole('application', { name: /Component network schematic/ })
  await expect(svg.locator(`[data-node="${node}"]`)).toBeVisible({ timeout: 60_000 })
  return svg
}
