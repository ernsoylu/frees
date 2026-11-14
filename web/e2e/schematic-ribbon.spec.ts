// Phase P acceptance: with the ribbon on, the schematic's commands live on the
// contextual Schematic tab (Sheets · Model · Edit · Arrange · Overlay · Annotate ·
// Drawing Views · Zoom), the canvas keeps a compact strip (sheet, breadcrumb,
// zoom and fit, selection and issue counts), View settings sit in View ›
// Schematic, and every canvas command is reachable from the tab, the palette
// and its key. With the ribbon off the toolbar is unchanged
// (e2e/schematic-baseline.spec.ts).
//
// Run:  npm run build && npx playwright test e2e/schematic-ribbon.spec.ts --project=chromium
import { expect, test, type Page } from '@playwright/test'

test.use({ serviceWorkers: 'block', viewport: { width: 1440, height: 960 } })
test.skip(({ browserName }) => browserName !== 'chromium', 'One engine is enough for this journey.')

const HUMID_AIR = `// Humid-air conditioning
MoistAirSource     ROOM(P=101325 [Pa], T=299 [K], W=0.012, mdot=0.6 [kg/s])
HeatPipeWrapAround HP(eff=0.5)
CoolingCoil        COIL(Tout=286 [K])
MoistAirFan        FAN(dP=250 [Pa], eta=0.55)
MoistAirSink       SUP()

connect(ROOM.out, HP.pre_in)
connect(HP.pre_out, COIL.in)
connect(COIL.out, HP.re_in)
connect(HP.re_out, FAN.in)
connect(FAN.out, SUP.in)
`

const ribbon = (page: Page) => page.getByTestId('ribbon')
const tab = (page: Page, name: string) => ribbon(page).getByRole('tab', { name, exact: true })
const group = (page: Page, name: string) => ribbon(page).getByRole('group', { name, exact: true })
const strip = (page: Page) => page.locator('[data-schematic-toolbar]')

async function openSchematic(page: Page) {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return
    localStorage.setItem('frees.ribbon', '1')
    sessionStorage.setItem('seeded', '1')
  })
  const source = 'https://raw.example/schematic-ribbon.frees'
  await page.route(source, (route) => route.fulfill({ contentType: 'text/plain', body: HUMID_AIR }))
  await page.goto('/?url=' + encodeURIComponent(source))
  await expect(page.locator('.cm-content')).toContainText('Humid-air', { timeout: 60_000 })
  await page.getByRole('button', { name: 'Check', exact: true }).click()
  await tab(page, 'View').click()
  await ribbon(page).getByRole('button', { name: 'Schematic', exact: true }).click()
  const svg = page.getByRole('application', { name: /Component network schematic/ })
  await expect(svg.locator('[data-node]').first()).toBeVisible({ timeout: 120_000 })
  return svg
}

test('P: the Schematic tab holds the canvas commands and the canvas keeps its strip', async ({ page }) => {
  await openSchematic(page)
  await expect(tab(page, 'Schematic')).toBeVisible()
  // Focusing the drawing never switches tabs on its own.
  await expect(tab(page, 'View')).toHaveAttribute('aria-selected', 'true')
  await tab(page, 'Schematic').click()
  for (const g of ['Sheets', 'Model', 'Edit', 'Arrange', 'Overlay', 'Annotate', 'Drawing Views', 'Zoom']) await expect(group(page, g), g).toBeVisible()

  // The strip keeps the sheet, the counts, Search, and zoom and fit; the rest moved.
  await expect(strip(page).getByTestId('sheet-menu')).toBeVisible()
  await expect(strip(page).getByText('5 components')).toBeVisible()
  for (const name of ['Zoom out', 'Zoom in', 'Zoom level', 'Fit to window']) await expect(strip(page).getByRole('button', { name }), name).toBeVisible()
  for (const name of ['Edit components', 'Select', 'Arrange', 'Overlay', 'Annotate', 'Views', 'View settings', 'Undo', 'Reset layout', 'Export…']) {
    await expect(strip(page).getByRole('button', { name, exact: true }), name).toHaveCount(0)
  }

  // Every canvas command is reachable from the tab.
  const button = (g: string, name: string) => group(page, g).getByRole('button', { name, exact: true })
  for (const [g, name] of [['Model', 'Add component'], ['Model', 'List'], ['Model', 'Search'], ['Edit', 'Undo'], ['Edit', 'Redo'], ['Arrange', 'Reset layout'], ['Drawing Views', 'Export…'], ['Zoom', 'Fit to window']]) {
    await expect(button(g, name), `${g} ▸ ${name}`).toBeVisible()
  }
  const menu = async (g: string, target: string, items: string[]) => {
    await button(g, target).click()
    for (const item of items) await expect(page.getByRole('menuitem', { name: new RegExp(`^${item}`) }), `${g} ▸ ${target} ▸ ${item}`).toBeVisible()
    await button(g, target).click()
    await expect(page.getByRole('menu')).toHaveCount(0)
  }
  await menu('Edit', 'Edit components', ['Duplicate', 'Copy', 'Cut', 'Paste', 'Extract subsystem…', 'Delete…'])
  await menu('Edit', 'Select', ['All', 'Connected', 'Same domain', 'None'])
  await menu('Arrange', 'Arrange', ['Arrange all', 'Arrange selection'])
  await menu('Zoom', 'Zoom level', ['Fit all', 'Fit selection'])

  // A command run from the tab acts on the drawing: Select › All counts on the strip.
  await button('Edit', 'Select').click()
  await page.getByRole('menuitem', { name: /^All/ }).click()
  await expect(strip(page).getByText('5 selected')).toBeVisible()
  // Search from the tab opens the strip's search.
  await button('Model', 'Search').click()
  await expect(page.getByTestId('model-search')).toBeVisible()
  await page.keyboard.press('Escape')

  // The palette names the tab group; the key still works on the drawing.
  await page.locator('body').click({ position: { x: 5, y: 5 } })
  await page.keyboard.press('Control+K')
  await page.getByPlaceholder('Search views, tools, and actions…').fill('Component and connection list')
  await expect(page.getByText('Schematic ▸ Model · L on the drawing')).toBeVisible()
  await page.keyboard.press('Escape')
})

test('P: View settings move to View › Schematic, and a peeked tab keeps its menus working', async ({ page }) => {
  const svg = await openSchematic(page)
  await svg.click({ position: { x: 5, y: 5 } })
  await tab(page, 'View').click()
  await group(page, 'Schematic').getByRole('button', { name: 'View settings' }).click()
  await page.locator('label', { hasText: /^Grid$/ }).click()
  await expect(page.getByRole('radio', { name: 'Grid' }).first()).toBeChecked()
  await page.keyboard.press('Escape')

  // Collapsed: a tab click peeks the panel; a menu opened from it still runs its item.
  await page.locator('body').click({ position: { x: 5, y: 5 } })
  await page.keyboard.press('Control+F1')
  await expect(ribbon(page)).toHaveAttribute('data-density', 'collapsed')
  await tab(page, 'Schematic').click()
  await group(page, 'Edit').getByRole('button', { name: 'Select', exact: true }).click()
  await page.getByRole('menuitem', { name: /^All/ }).click()
  await expect(strip(page).getByText('5 selected')).toBeVisible()
})

test('P: with the ribbon off the canvas toolbar keeps every control', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('frees.ribbon', '0'))
  const source = 'https://raw.example/schematic-ribbon-off.frees'
  await page.route(source, (route) => route.fulfill({ contentType: 'text/plain', body: HUMID_AIR }))
  await page.goto('/?url=' + encodeURIComponent(source))
  await expect(page.locator('.cm-content')).toContainText('Humid-air', { timeout: 60_000 })
  await page.getByRole('button', { name: 'Check', exact: true }).click()
  await page.locator('body').click({ position: { x: 5, y: 5 } })
  await page.keyboard.press('Control+K')
  await page.getByPlaceholder('Search views, tools, and actions…').fill('Schematic')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('application', { name: /Component network schematic/ }).locator('[data-node]').first()).toBeVisible({ timeout: 120_000 })
  for (const name of ['Edit components', 'Select', 'Arrange', 'Overlay', 'Annotate', 'Views', 'View settings', 'Undo', 'Reset layout', 'Export…', 'Fit to window', 'Zoom level']) {
    await expect(strip(page).getByRole('button', { name, exact: true }), name).toBeVisible()
  }
})
