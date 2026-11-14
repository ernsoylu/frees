// Phase Q acceptance, window part: every drag has a command (AC-06), the tab
// menu acts on the tab it was opened on, the Window List matches the dock, and
// closing a view keeps its data (AC-05).
//
// Run:  npm run build && npx playwright test e2e/windows.spec.ts --project=chromium
import { expect, test, type Page } from '@playwright/test'
import { runCommand } from './journey'

test.use({ serviceWorkers: 'block' })
test.skip(({ browserName }) => browserName !== 'chromium', 'One engine is enough for this journey.')

const DOC = 'L = 4 [m]\nW = 3 [m]\nA = L*W\n'

async function open(page: Page) {
  await page.setViewportSize({ width: 1440, height: 960 })
  await page.addInitScript((doc) => {
    if (sessionStorage.getItem('seeded')) return
    localStorage.setItem('frees.project', JSON.stringify({ text: doc, tables: [] }))
    sessionStorage.setItem('seeded', '1')
  }, DOC)
  await page.goto('/')
  const welcome = page.getByRole('dialog').filter({ hasText: 'Welcome to frees' })
  if (await welcome.waitFor({ timeout: 10_000 }).then(() => true, () => false)) await page.keyboard.press('Escape')
  await expect(page.locator('.cm-content')).toContainText('L = 4')
}

interface Win { id: string; group: string; place: string; maximized: boolean }
/** The dock's own state, read from dockview. */
const dock = (page: Page) => page.evaluate(() => {
  const api = (window as unknown as { __freesTest: { dockviewApi: { panels: { id: string; group: { id: string; api: { location: { type: string } } }; api: { isMaximized(): boolean } }[]; activePanel?: { id: string } } } }).__freesTest.dockviewApi
  return {
    active: api.activePanel?.id,
    windows: api.panels.map((p): Win => ({ id: p.id, group: p.group.id, place: p.group.api.location.type, maximized: p.api.isMaximized() })),
  }
})
const win = async (page: Page, id: string) => (await dock(page)).windows.find((w) => w.id === id)
const tabOf = (page: Page, title: string) => page.getByTestId('dockview-dv-default-tab').filter({ hasText: title }).first()

test('Q: the tab menu floats, docks, maximizes, moves and closes the tab it was opened on', async ({ page }) => {
  await open(page)
  await runCommand(page, 'Terminal')
  await runCommand(page, 'Graph Digitizer')
  await expect.poll(async () => (await win(page, 'digitizer'))?.place).toBe('grid')
  const editorGroup = (await win(page, 'equations'))!.group
  expect((await win(page, 'digitizer'))!.group).toBe(editorGroup)

  // The menu belongs to the tab under the pointer, not to the active window.
  await tabOf(page, 'Editor').click({ button: 'right' })
  const menu = page.getByRole('menu', { name: 'Editor tab menu' })
  await expect(menu.getByRole('menuitem', { name: 'Close View' })).toBeEnabled()
  // A reason is text in the menu, not a hover.
  await expect(menu.getByRole('menuitem', { name: 'Move to Centre' })).toBeDisabled()
  await expect(menu).toContainText('It is already docked in the centre.')
  await menu.getByRole('menuitem', { name: 'Move Right' }).click()
  await expect.poll(async () => (await win(page, 'equations'))?.group).not.toBe(editorGroup)
  expect((await win(page, 'equations'))!.place).toBe('grid')

  await tabOf(page, 'Editor').click({ button: 'right' })
  await page.getByRole('menuitem', { name: 'Float or Dock Back' }).click()
  await expect.poll(async () => (await win(page, 'equations'))?.place).toBe('floating')
  // The document is still there, and still editable, while floating.
  await expect(page.locator('.cm-content')).toContainText('A = L*W')
  await tabOf(page, 'Editor').click({ button: 'right' })
  await expect(page.getByRole('menu', { name: 'Editor tab menu' })).toContainText('Only a window docked in the centre can be maximized')
  await page.getByRole('menuitem', { name: 'Float or Dock Back' }).click()
  await expect.poll(async () => (await win(page, 'equations'))?.place).toBe('grid')

  await tabOf(page, 'Editor').click({ button: 'right' })
  await page.getByRole('menuitem', { name: 'Maximize or Restore' }).click()
  await expect.poll(async () => (await win(page, 'equations'))?.maximized).toBe(true)
  await tabOf(page, 'Editor').click({ button: 'right' })
  await page.getByRole('menuitem', { name: 'Maximize or Restore' }).click()
  await expect.poll(async () => (await win(page, 'equations'))?.maximized).toBe(false)

  await tabOf(page, 'Editor').click({ button: 'right' })
  await page.getByRole('menuitem', { name: 'Move to Edge' }).click()
  await expect.poll(async () => (await win(page, 'equations'))?.place).toBe('edge')
  await tabOf(page, 'Editor').click({ button: 'right' })
  await page.getByRole('menuitem', { name: 'Move to Centre' }).click()
  await expect.poll(async () => (await win(page, 'equations'))?.place).toBe('grid')

  // The keyboard opens the same menu on the focused tab.
  await page.locator('.dv-tab').filter({ hasText: 'Editor' }).first().focus()
  await page.keyboard.press('Shift+F10')
  await expect(page.getByRole('menu', { name: 'Editor tab menu' })).toBeVisible()
  await page.keyboard.press('Escape')

  // Close Others leaves the tab's group to it; Close View keeps the document (AC-05).
  await tabOf(page, 'Editor').click({ button: 'right' })
  await page.getByRole('menuitem', { name: 'Close Others' }).click()
  const group = (await win(page, 'equations'))!.group
  await expect.poll(async () => (await dock(page)).windows.filter((w) => w.group === group).map((w) => w.id)).toEqual(['equations'])
  await tabOf(page, 'Editor').click({ button: 'right' })
  await page.getByRole('menuitem', { name: 'Close View' }).click()
  await expect.poll(async () => await win(page, 'equations')).toBeUndefined()
  await runCommand(page, 'Editor')
  await expect(page.locator('.cm-content')).toContainText('A = L*W')
})

test('Q: the palette runs window commands on the active window, and the Window List matches the dock', async ({ page }) => {
  await open(page)
  await runCommand(page, 'Graph Digitizer')
  await runCommand(page, 'Terminal')
  await expect.poll(async () => await win(page, 'terminal')).toBeDefined()

  await runCommand(page, 'Graph Digitizer')
  await expect.poll(async () => (await dock(page)).active).toBe('digitizer')
  await runCommand(page, 'Float or Dock Back')
  await expect.poll(async () => (await win(page, 'digitizer'))?.place).toBe('floating')

  await runCommand(page, 'Window List…')
  const list = page.getByRole('dialog', { name: 'Window List' })
  const state = await dock(page)
  // One row per dockview panel, no more and no fewer; the active one is marked.
  await expect(list.locator('button[title]')).toHaveCount(state.windows.length)
  await expect(list.locator('[aria-current="true"]')).toHaveCount(1)
  await expect(list.getByRole('group', { name: 'Digitizer' })).toContainText('floating')

  await list.getByRole('textbox', { name: 'Search windows' }).fill('edit')
  await expect(list.locator('button[title]')).toHaveCount(1)
  await page.keyboard.press('Enter')
  await expect(list).toHaveCount(0)
  await expect.poll(async () => (await dock(page)).active).toBe('equations')

  // Closing a view from the list removes exactly that panel.
  await runCommand(page, 'Window List…')
  await page.getByRole('button', { name: 'Close view Digitizer' }).click()
  await expect.poll(async () => await win(page, 'digitizer')).toBeUndefined()
  await expect(page.getByRole('dialog', { name: 'Window List' }).locator('button[title]')).toHaveCount(state.windows.length - 1)
})
