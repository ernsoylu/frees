// Phase E: the browser module links four fluids (Water, R134a, R1234yf, Air).
// A model naming any other fluid makes the worker fetch that fluid's packed
// data, and the mixture tables for a blend, before it solves. The values
// equal the native CLI's, which links every fluid.
//
// Run:  npm run build && npx playwright test e2e/lazy-fluids.spec.ts --project=chromium
import { expect, test } from '@playwright/test'

const MODEL = `// frees-language: 2
rho = Density(Oxygen, T=300 [K], P=101325 [Pa])
h = Enthalpy(R454B, T=273.15 [K], x=0)
h_w = Enthalpy(Water, T=300 [K], P=101325 [Pa])
`
const SOURCE = 'https://raw.example/lazy-fluids.frees'

test.use({ serviceWorkers: 'block' })

const open = async (page: import('@playwright/test').Page) => {
  await page.route(SOURCE, (route) => route.fulfill({ contentType: 'text/plain', body: MODEL }))
  await page.goto('/?url=' + encodeURIComponent(SOURCE))
  await expect(page.locator('.cm-content')).toContainText('R454B', { timeout: 60_000 })
}

test('a fluid the module does not link is fetched once, installed and solved to the native value', async ({ page, context }) => {
  const fetched: string[] = []
  context.on('request', (r) => {
    const name = new URL(r.url()).pathname.split('/').pop() ?? ''
    if (name.endsWith('.rpf')) fetched.push(name.replace(/-[\w-]+\.rpf$/, ''))
  })
  await open(page)
  await page.getByRole('button', { name: 'Solve', exact: true }).click()
  await expect(page.getByText(/^Solved/i).first()).toBeVisible({ timeout: 120_000 })
  // Native CLI: rho = 1.3006898082601743, h = 206526.1244312285.
  await expect(page.getByRole('row', { name: /^rho 1\.3006898 / })).toBeVisible()
  await expect(page.getByRole('row', { name: /^h 206526\.12 / })).toBeVisible()
  // R454B is R32 + R1234yf; R1234yf and Water are linked. R32's transport is an
  // ECS model with n-Propane as its reference fluid, so that comes too.
  expect([...new Set(fetched)].sort()).toEqual(['Oxygen', 'R32', 'mixtures', 'n_Propane'])

  // Solving again installs nothing more.
  const before = fetched.length
  await page.getByRole('button', { name: 'Solve', exact: true }).click()
  await expect(page.getByText(/^Solved/i).first()).toBeVisible({ timeout: 60_000 })
  expect(fetched.length).toBe(before)
})

test('a fluid that cannot be downloaded says so instead of calling it unknown', async ({ page }) => {
  await page.route('**/*.rpf', (route) => route.abort())
  await open(page)
  await page.getByRole('button', { name: 'Solve', exact: true }).click()
  const status = page.getByRole('button', { name: 'Status details' })
  await expect(status).not.toHaveText(/^Solved/, { timeout: 60_000 })
  await status.click()
  await expect(page.getByText(/property data for (Oxygen|R32|the mixture tables) could not be downloaded/).first()).toBeVisible({ timeout: 60_000 })
  await expect(page.getByText(/Unknown fluid/)).toHaveCount(0)
})
