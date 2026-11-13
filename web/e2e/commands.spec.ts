// Phase N acceptance: one run target. The toolbar, F2 and the palette act on
// the focused parametric table, else the model, and utility panels (the
// Inspector) keep that target.
//
// Run:  npm run build && npx playwright test e2e/commands.spec.ts --project=chromium
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
})
