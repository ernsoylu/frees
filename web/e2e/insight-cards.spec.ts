// Phase I1: insight cards. Selecting a thermal mass and its wall offers the
// thermal time constant, computed from the blocks' own parameters, attached
// to the blocks, saved with the project, and broken (never stale) once a
// block is gone.
//
// Run:  npm run build && npx playwright test e2e/insight-cards.spec.ts --project=chromium
import { expect, test } from '@playwright/test'
import { engineCalls, openAndSolve, openSchematic } from './journey'

// τ = C / (k·A/L) = 5000 / (2·1/0.1) = 250 s; the run is T = 300 + 100·exp(-t/250 s).
const COOL = `// frees-language: 2
ThermalMass   M(C=5000 [J/K], T0=400 [K])
ThermalSource amb(T=300 [K])
Conduction    wall(k=2 [W/m-K], area=1 [m^2], L=0.1 [m])
connect(M.port, wall.a)
connect(wall.b, amb.port)
DYNAMIC cool (method = ida, time = 0 .. 1000, points = 11)
END
`

test.use({ serviceWorkers: 'block', viewport: { width: 1440, height: 960 } })
test.skip(({ browserName }) => browserName !== 'chromium', 'One engine is enough for this journey.')

test.setTimeout(150_000)
test('I1: a thermal time-constant card from the blocks’ own parameters, offered only where it fits, without solving', async ({ page }) => {
  await openAndSolve(page, 'insight-cards', COOL)
  const svg = await openSchematic(page, 'm')
  await page.waitForTimeout(1000)
  const before = (await engineCalls(page)).length

  // The mass alone fits no insight.
  await svg.locator('[data-node="m"]').click()
  await page.getByRole('button', { name: 'Annotate', exact: true }).click()
  await expect(page.getByRole('menuitem', { name: 'None fits these blocks' })).toBeDisabled()
  await page.keyboard.press('Escape')

  // With its wall it carries τ = C/UA.
  await svg.locator('[data-node="wall"]').click({ modifiers: ['Shift'] })
  await page.getByRole('button', { name: 'Annotate', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Thermal time constant τ = C/UA' }).click()
  const card = svg.locator('[data-annotation="insight"]')
  await expect(card).toHaveAttribute('aria-label', 'insight: τ = C / UA, 250 s, C = 5000 J/K, UA = 20 W/K')

  const during = (await engineCalls(page)).slice(before)
  expect(during.filter((m) => m === 'solve' || m === 'check')).toEqual([])
})

// The ideal R134a cycle between 0.14 and 0.8 MPa: COP_R = 3.97 (Cengel Example 11-1).
const CYCLE = `// frees-language: 2
P_L = 0.14 [MPa]
P_H = 0.8 [MPa]
Compressor comp(eta=1, fluid$=R134a)
Condenser  cond()
Throttle   valve()
Boiler     evap()
connect(comp.out, cond.in)
connect(cond.out, valve.in)
connect(valve.out, evap.in)
connect(evap.out, comp.in)
comp.in.mdot = 0.05 [kg/s]
comp.in.P = P_L
comp.in.h = Enthalpy(R134a, P=P_L, x=1)
comp.out.P = P_H
cond.out.h = Enthalpy(R134a, P=P_H, x=0)
`

test('I1: the refrigeration COP card takes Q and W from the solve and Carnot from the engine’s saturation temperatures', async ({ page }) => {
  await openAndSolve(page, 'insight-cop', CYCLE)
  const svg = await openSchematic(page, 'comp')
  // The style editor opens over the canvas once a block is selected, so add the others by event.
  await svg.locator('[data-node="comp"]').click()
  for (const id of ['evap', 'cond']) await svg.locator(`[data-node="${id}"]`).dispatchEvent('click', { shiftKey: true })
  await page.getByRole('button', { name: 'Annotate', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Refrigeration COP, actual and Carnot' }).click()
  const label = await svg.locator('[data-annotation="insight"]').getAttribute('aria-label')
  const [cop, carnot] = label!.match(/COP = ([\d.]+), Carnot = ([\d.]+)/)!.slice(1).map(Number)
  expect(cop).toBeCloseTo(3.97, 1)
  expect(carnot).toBeCloseTo(254.38 / (304.46 - 254.38), 1)
  expect(carnot).toBeGreaterThan(cop)
})
