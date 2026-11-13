// Phase O acceptance: the ribbon, behind its Preferences flag. Every File,
// Functions and Tools entry is one click from a tab (AC-02), the contextual
// Table tab acts on the focused table, Quick Access undoes the Editor, the
// Function Browser inserts at the caret, the ribbon collapses and peeks, the
// keyboard reaches it, and nothing required is clipped (AC-09).
//
// Run:  npm run build && npx playwright test e2e/ribbon.spec.ts --project=chromium
import { expect, test, type Page } from '@playwright/test'

test.use({ serviceWorkers: 'block' })
test.skip(({ browserName }) => browserName !== 'chromium', 'One engine is enough for this journey.')

const DOC = 'L = 4 [m]\nW = 3 [m]\nA = L*W\n'

async function open(page: Page, ribbon: boolean, size = { width: 1440, height: 960 }) {
  await page.setViewportSize(size)
  await page.addInitScript(([on, doc]) => {
    if (sessionStorage.getItem('seeded')) return
    localStorage.setItem('frees.ribbon', on ? '1' : '0')
    localStorage.setItem('frees.project', JSON.stringify({ text: doc, tables: [] }))
    sessionStorage.setItem('seeded', '1')
  }, [ribbon, DOC] as const)
  await page.goto('/')
  const welcome = page.getByRole('dialog').filter({ hasText: 'Welcome to frees' })
  if (await welcome.waitFor({ timeout: 10_000 }).then(() => true, () => false)) await page.keyboard.press('Escape')
}

const ribbon = (page: Page) => page.getByTestId('ribbon')
const tab = (page: Page, name: string) => ribbon(page).getByRole('tab', { name, exact: true })

test('O: the Preferences switch turns the ribbon and status bar on, and every menu entry is one click from a tab', async ({ page }) => {
  await open(page, false)
  await expect(ribbon(page)).toHaveCount(0)
  await page.getByRole('button', { name: 'Preferences' }).click()
  await page.getByRole('switch', { name: 'Ribbon (preview)' }).check({ force: true })
  await page.getByRole('button', { name: 'OK' }).click()
  await expect(ribbon(page)).toBeVisible()
  await expect(page.getByTestId('status-bar')).toContainText('Units: SI base')
  // The classic Functions and Tools menus give way to the tabs.
  await expect(page.getByRole('button', { name: 'Functions' })).toHaveCount(0)

  // AC-02: each tab holds its entries, one click away.
  const reach: [string, string[]][] = [
    ['Home', ['New Project', 'Open Project…', 'Save Project', 'Save Project As…', 'Browser Projects…', 'Copy Share Link', 'Print Report…', 'Check Model', 'Solve Model', 'Find All Solutions', 'Complex Mode', 'Stop Criteria…']],
    ['Insert', ['New Parametric Table', 'New Function Table (one input)', 'New Function Table (curve family)', 'Import CSV as Function Table', 'New Fluid State Table', 'New X-Y Plot', 'Component Wizard', 'Insert Function…', 'Graph Digitizer']],
    ['Data', ['Export Equation Text…', 'Open URL…', 'Table Operations…']],
    ['Analysis', ['Optimization…', 'Curve Fit…', 'Parameter Estimation…', 'Monte Carlo…', 'Global Sensitivity…', 'PID Tuner…', 'Variable Settings…']],
    ['View', ['Variable Explorer', 'Terminal', 'Inspector', 'Default View', 'Toggle Light/Dark Theme', 'Preferences']],
    ['Help', ['Getting Started…', 'Open Example…', 'Documentation', 'Keyboard Shortcuts', 'About']],
  ]
  for (const [name, buttons] of reach) {
    await tab(page, name).click()
    for (const b of buttons) await expect(ribbon(page).getByRole('button', { name: b, exact: true }), `${name} ▸ ${b}`).toBeVisible()
  }

  // A toggle shows its state; Print Report says why it waits.
  await tab(page, 'Home').click()
  const findAll = ribbon(page).getByRole('button', { name: 'Find All Solutions' })
  await expect(findAll).toHaveAttribute('aria-pressed', 'false')
  await findAll.click()
  await expect(findAll).toHaveAttribute('aria-pressed', 'true')
  const print = ribbon(page).getByRole('button', { name: 'Print Report…' })
  await expect(print).toHaveAttribute('aria-disabled', 'true')
  await expect(print).toHaveAccessibleDescription(/Unavailable: Solve first/)
})

test('O: the contextual Table tab acts on the focused table, and Quick Access undoes the Editor', async ({ page }) => {
  await open(page, true)
  await tab(page, 'Insert').click()
  await ribbon(page).getByRole('button', { name: 'New Parametric Table' }).click()
  await expect(tab(page, 'Table')).toBeVisible()
  // Focusing a table never switches tabs on its own.
  await expect(tab(page, 'Insert')).toHaveAttribute('aria-selected', 'true')
  await tab(page, 'Table').click()
  await expect(page.getByText('Run status:')).toBeVisible()
  const undo = ribbon(page).getByRole('button', { name: 'Undo' })
  const redo = ribbon(page).getByRole('button', { name: 'Redo' })
  await expect(undo).toHaveAttribute('aria-disabled', 'true')
  // Add Row runs in the workbook, so its own history can take it back.
  await ribbon(page).getByRole('button', { name: 'Add Row' }).click()
  await expect(undo).not.toHaveAttribute('aria-disabled', 'true')
  await expect(undo).toHaveAccessibleDescription(/Tables workbook/)
  await undo.click()
  await expect(redo).not.toHaveAttribute('aria-disabled', 'true')
  await redo.click()
  await expect(redo).toHaveAttribute('aria-disabled', 'true')

  // In the Editor, Quick Access undoes the Editor's own history.
  await page.locator('.dv-tab', { hasText: 'Editor' }).click()
  await expect(tab(page, 'Table')).toHaveCount(0)
  const editor = page.locator('.cm-content')
  await editor.click()
  await page.keyboard.press('Control+End')
  await page.keyboard.type('\nP = 2*(L+W)')
  await expect(editor).toContainText('P = 2*(L+W)')
  const quick = page.getByRole('toolbar', { name: 'Quick Access' })
  await quick.getByRole('button', { name: 'Undo' }).click()
  await expect(editor).not.toContainText('P = 2*(L+W)')
  await expect(quick.getByRole('button', { name: 'Redo' })).not.toHaveAttribute('aria-disabled', 'true')
})

test('O: the Function Browser searches the catalogue and inserts at the caret', async ({ page }) => {
  await open(page, true)
  await expect(page.locator('.cm-content')).toContainText('A = L*W', { timeout: 60_000 })
  await page.locator('.cm-content').click()
  await page.keyboard.press('Control+End')
  await tab(page, 'Insert').click()
  await ribbon(page).getByRole('button', { name: 'Insert Function…' }).click()
  const browser = page.getByRole('dialog', { name: 'Insert Function' })
  await browser.getByRole('textbox', { name: 'Search functions' }).fill('specific enthalpy')
  await expect(browser.getByRole('link', { name: 'Open Reference' }).first()).toBeVisible()
  await browser.getByRole('button', { name: 'Insert Enthalpy' }).click()
  await expect(browser).toHaveCount(0)
  await expect(page.locator('.cm-content')).toContainText('Enthalpy(Water, P=')
})

test('O: Ctrl+F1 collapses the ribbon, a tab click peeks it, and the keyboard walks the tabs and the panel', async ({ page }) => {
  await open(page, true)
  await expect(ribbon(page)).toHaveAttribute('data-density', 'expanded')
  await page.locator('body').click({ position: { x: 5, y: 5 } })
  await page.keyboard.press('Control+F1')
  await expect(ribbon(page)).toHaveAttribute('data-density', 'collapsed')
  await expect(ribbon(page).getByRole('button', { name: 'Curve Fit…' })).toHaveCount(0)
  await tab(page, 'Analysis').click()
  await expect(ribbon(page).getByRole('button', { name: 'Curve Fit…' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(ribbon(page).getByRole('button', { name: 'Curve Fit…' })).toHaveCount(0)
  await tab(page, 'Analysis').dblclick()
  await expect(ribbon(page)).toHaveAttribute('data-density', 'expanded')

  // Arrow keys move between tabs, Tab enters the panel, arrows move within it.
  await tab(page, 'Home').focus()
  await page.keyboard.press('ArrowRight')
  await expect(tab(page, 'Insert')).toBeFocused()
  await expect(tab(page, 'Insert')).toHaveAttribute('aria-selected', 'true')
  const first = ribbon(page).getByRole('button', { name: 'New Parametric Table' })
  await first.focus()
  await page.keyboard.press('ArrowRight')
  await expect(ribbon(page).getByRole('button', { name: 'New Function Table (one input)' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(tab(page, 'Table')).toBeVisible()
})

for (const size of [
  { width: 1440, height: 900 },
  { width: 1280, height: 720 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
  // 200 % zoom of 1280×720.
  { width: 640, height: 360 },
]) {
  test(`O: nothing required is clipped at ${size.width}×${size.height} (AC-09)`, async ({ page }, testInfo) => {
    await open(page, true, size)
    await expect(page.getByRole('button', { name: 'Solve', exact: true })).toBeInViewport()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    if (size.width > 768) {
      // Collapsed below 900 px of height; every tab stays on screen either way.
      await expect(ribbon(page)).toHaveAttribute('data-density', size.height < 900 ? 'collapsed' : 'expanded')
      for (const name of ['Home', 'Insert', 'Data', 'Analysis', 'View', 'Help']) await expect(tab(page, name)).toBeInViewport({ ratio: 1 })
      await expect(page.getByRole('button', { name: 'Check', exact: true })).toBeInViewport()
    } else {
      // Mobile keeps its own pattern; the menu gains Insert and Analysis from the registry.
      await page.getByRole('button', { name: 'Menu' }).click()
      await expect(page.getByRole('menuitem', { name: 'Insert Function…' })).toBeVisible()
      await expect(page.getByRole('menuitem', { name: 'Optimization…' })).toBeVisible()
    }
    await page.screenshot({ path: testInfo.outputPath(`ribbon-${size.width}x${size.height}.png`) })
  })
}

test('O: the theme is unchanged in light and dark (AC-01, screenshots for review)', async ({ page }, testInfo) => {
  await open(page, true, { width: 1440, height: 900 })
  for (const scheme of ['dark', 'light'] as const) {
    await page.emulateMedia({ colorScheme: scheme })
    await page.evaluate((s) => localStorage.setItem('mantine-color-scheme-value', s), scheme)
    await page.reload()
    await expect(ribbon(page)).toBeVisible()
    await expect(page.locator('.cm-content')).toContainText('A = L*W', { timeout: 60_000 })
    await expect(page.locator('html')).toHaveAttribute('data-mantine-color-scheme', scheme)
    await page.screenshot({ path: testInfo.outputPath(`ribbon-${scheme}.png`) })
  }
})
