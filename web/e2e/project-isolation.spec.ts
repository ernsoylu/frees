// Audit F01: a new project must solve with its own inputs. Terminal (REPL)
// assignments are overrides the next solve applies on top of the document, so
// one left over from the previous project would silently replace the fresh
// editor's `P_in = 350 [kPa]` — a solved, plausible-looking, wrong answer.
import { expect, test, type Page } from '@playwright/test'

test.use({ serviceWorkers: 'block' })

async function dismissWelcomeIfOpen(page: Page) {
  const welcome = page.getByRole('dialog').filter({ hasText: 'Welcome to frees' })
  if (await welcome.isVisible({ timeout: 1500 }).catch(() => false)) {
    await page.keyboard.press('Escape')
    await expect(welcome).toBeHidden()
  }
}

async function solve(page: Page) {
  await page.getByRole('button', { name: 'Solve', exact: true }).click()
  await expect(page.getByText(/^Solved/i).first()).toBeVisible({ timeout: 30_000 })
}

async function terminalInput(page: Page) {
  const input = page.getByLabel('REPL expression input')
  if (!(await input.isVisible().catch(() => false))) {
    await page.getByRole('button', { name: 'Tools' }).click()
    await page.getByRole('menuitem', { name: 'Terminal' }).click()
  }
  await expect(input).toBeVisible()
  return input
}

/** Evaluate `expression` in the terminal and return the output it appended. */
async function evaluate(page: Page, expression: string): Promise<string> {
  const input = await terminalInput(page)
  const output = page.getByLabel('Terminal output')
  const before = (await output.textContent()) ?? ''
  await input.fill(expression)
  await input.press('Enter')
  await expect.poll(async () => ((await output.textContent()) ?? '').length).toBeGreaterThan(before.length)
  return ((await output.textContent()) ?? '').slice(before.length)
}

test('a terminal override does not leak into a new project', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Solve', exact: true })).toBeVisible({ timeout: 60_000 })
  await dismissWelcomeIfOpen(page)
  await expect(page.locator('.cm-content')).toContainText('P_in   = 350 [kPa]')

  await solve(page)
  await evaluate(page, 'P_in = 999 [Pa]')
  await solve(page)
  // The override is live in this project…
  expect(await evaluate(page, 'P_in')).toContain('999')

  await page.getByRole('button', { name: 'File' }).click()
  await page.getByRole('menuitem', { name: 'New Project' }).click()
  const dontSave = page.getByRole('button', { name: "Don't Save" })
  if (await dontSave.isVisible({ timeout: 1500 }).catch(() => false)) await dontSave.click()
  await expect(page.locator('.cm-content')).toContainText('P_in   = 350 [kPa]')

  // …and gone from the next one, which solves with its own declaration.
  await solve(page)
  const pIn = await evaluate(page, 'P_in')
  expect(pIn).not.toContain('999')
  expect(pIn).toMatch(/350/)
})
