// Phase Q acceptance, layout part: a named layout survives reload, a project
// switch and corrupt storage (AC-07, AC-08), a layout change can be undone, and
// a layout that names a window the project no longer has says so.
//
// Run:  npm run build && npx playwright test e2e/layouts.spec.ts --project=chromium
import { expect, test, type Page } from '@playwright/test'
import { runCommand } from './journey'

test.use({ serviceWorkers: 'block' })
test.skip(({ browserName }) => browserName !== 'chromium', 'One engine is enough for this journey.')

const DOC = 'L = 4 [m]\nW = 3 [m]\nA = L*W\n'

async function open(page: Page, seed: Record<string, string> = {}) {
  await page.setViewportSize({ width: 1440, height: 960 })
  await page.addInitScript(([doc, extra]) => {
    if (sessionStorage.getItem('seeded')) return
    localStorage.setItem('frees.project', JSON.stringify({ text: doc, tables: [] }))
    for (const [k, v] of Object.entries(extra)) localStorage.setItem(k, v)
    sessionStorage.setItem('seeded', '1')
  }, [DOC, seed] as const)
  await page.goto('/')
  await dismissWelcome(page)
}
async function dismissWelcome(page: Page) {
  const welcome = page.getByRole('dialog').filter({ hasText: 'Welcome to frees' })
  if (await welcome.waitFor({ timeout: 10_000 }).then(() => true, () => false)) await page.keyboard.press('Escape')
  await expect(page.locator('.cm-content')).toContainText('L = 4')
}

/** Each dockview group's panel ids, groups sorted, read from dockview. */
const groups = (page: Page) => page.evaluate(() => {
  const api = (window as unknown as { __freesTest: { dockviewApi: { panels: { id: string; group: { id: string } }[] } } }).__freesTest.dockviewApi
  const by = new Map<string, string[]>()
  for (const p of api.panels) by.set(p.group.id, [...(by.get(p.group.id) ?? []), p.id])
  return [...by.values()].map((g) => g.sort().join('+')).sort()
})

test('Q: a named layout is saved, undone, applied, and survives reload and a new project', async ({ page }) => {
  await open(page)
  const initial = await groups(page)
  await runCommand(page, 'Graph Digitizer')
  await runCommand(page, 'Move Right')
  await expect.poll(() => groups(page)).toContain('digitizer')
  const review = await groups(page)

  await runCommand(page, 'Save Layout As…')
  const save = page.getByRole('dialog', { name: 'Save Layout As' })
  await save.getByRole('textbox').fill('Review')
  await save.getByRole('button', { name: 'Save layout' }).click()
  await expect(save).toHaveCount(0)

  // Reset, then undo the reset, then undo the undo.
  await runCommand(page, 'Reset Workspace Layout')
  await expect.poll(() => groups(page)).toEqual(initial)
  await runCommand(page, 'Undo Layout Change')
  await expect.poll(() => groups(page)).toEqual(review)
  await runCommand(page, 'Undo Layout Change')
  await expect.poll(() => groups(page)).toEqual(initial)

  await runCommand(page, 'Manage Layouts…')
  await page.getByRole('group', { name: 'Review' }).getByRole('button', { name: 'Apply' }).click()
  await expect.poll(() => groups(page)).toEqual(review)
  // The document came through every rebuild of the dock.
  await expect(page.locator('.cm-content')).toContainText('A = L*W')

  // Reload: the live layout and the saved one are both still there.
  await page.reload()
  await dismissWelcome(page)
  await expect.poll(() => groups(page)).toEqual(review)

  // A new project starts from the default windows and keeps the device's layouts.
  await page.getByRole('button', { name: 'File', exact: true }).click()
  await page.getByRole('menuitem', { name: 'New Project' }).click()
  await page.getByRole('dialog', { name: 'Unsaved Changes' }).getByRole('button', { name: "Don't Save" }).click()
  await expect.poll(() => groups(page)).toEqual(initial)
  await runCommand(page, 'Manage Layouts…')
  const manage = page.getByRole('dialog', { name: 'Manage Layouts' })
  await expect(manage.getByRole('group', { name: 'Review' })).toBeVisible()

  // Rename refuses an empty name, then renames; delete asks first.
  await manage.getByRole('button', { name: 'Rename…' }).click()
  await manage.getByRole('textbox', { name: 'New name for Review' }).fill('  ')
  await manage.getByRole('button', { name: 'Save name' }).click()
  await expect(manage).toContainText('Give it a name no other layout has.')
  await manage.getByRole('textbox', { name: 'New name for Review' }).fill('Digitizing')
  await manage.getByRole('button', { name: 'Save name' }).click()
  await expect(manage.getByRole('group', { name: 'Digitizing' })).toBeVisible()
  await manage.getByRole('button', { name: 'Delete…' }).click()
  await manage.getByRole('button', { name: 'Keep' }).click()
  await expect(manage.getByRole('group', { name: 'Digitizing' })).toBeVisible()
  await manage.getByRole('button', { name: 'Delete…' }).click()
  await manage.getByRole('button', { name: 'Delete layout' }).click()
  await expect(manage).toContainText('No saved layouts yet')
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('frees-layouts-v1')!).desktop)).toEqual([])
})

test('Q: corrupt layout storage boots the default, and every panel can still be opened', async ({ page }) => {
  await open(page, { 'frees-layouts-v1': '{not json', 'frees-dock-layout-v3': '{"grid":' })
  await expect.poll(() => groups(page)).toContain('equations')
  await runCommand(page, 'Manage Layouts…')
  await expect(page.getByRole('dialog', { name: 'Manage Layouts' })).toContainText('No saved layouts yet')
  await page.keyboard.press('Escape')
  for (const [command, id] of [['Terminal', 'terminal'], ['Graph Digitizer', 'digitizer'], ['Inspector', 'inspector'], ['Variable Explorer', 'workspace'], ['Editor', 'equations']]) {
    await runCommand(page, command)
    await expect.poll(async () => (await groups(page)).join('+'), { message: command }).toContain(id)
  }
})

test('Q: a layout naming a window the project no longer has leaves it out and says so', async ({ page }) => {
  await open(page)
  // A layout saved while a plot window was open; the plot has since gone.
  await page.evaluate(() => {
    const api = (window as unknown as { __freesTest: { dockviewApi: { addPanel(o: unknown): void; toJSON(): unknown } } }).__freesTest.dockviewApi
    api.addPanel({ id: 'plot:ghost', component: 'panel', title: 'Ghost plot', params: { kind: 'plot' } })
    localStorage.setItem('frees-layouts-v1', JSON.stringify({ version: 1, desktop: [{ name: 'With plot', dock: api.toJSON() }, { name: 'Broken', dock: { grid: 1 } }], compact: [] }))
  })
  await page.reload()
  await dismissWelcome(page)
  await runCommand(page, 'Graph Digitizer')
  await expect.poll(async () => (await groups(page)).join('+')).toContain('digitizer')
  const before = await groups(page)
  await runCommand(page, 'Manage Layouts…')
  await page.getByRole('group', { name: 'With plot' }).getByRole('button', { name: 'Apply' }).click()
  await expect(page.getByText('Layout restored without some windows')).toBeVisible()
  await expect(page.getByText(/Ghost plot: no longer in this project/)).toBeVisible()
  await expect.poll(async () => (await groups(page)).join('+')).not.toContain('plot:ghost')
  await expect.poll(async () => (await groups(page)).join('+')).toContain('equations')
  // Leaving the window out is part of applying the layout: one Undo returns to the windows before it.
  expect((await groups(page)).join('+')).not.toContain('digitizer')
  await runCommand(page, 'Undo Layout Change')
  await expect.poll(() => groups(page)).toEqual(before)

  // A layout dockview cannot read builds the default and says so.
  await runCommand(page, 'Manage Layouts…')
  await page.getByRole('group', { name: 'Broken' }).getByRole('button', { name: 'Apply' }).click()
  await expect(page.getByText('Layout "Broken" could not be read')).toBeVisible()
  await expect.poll(async () => (await groups(page)).join('+')).toContain('equations')
})

test('Q: Close All is one change to undo, and a layout with every view closed stays so on reload', async ({ page }) => {
  await open(page)
  for (let i = 0; i < 2; i++) {
    await runCommand(page, 'New X-Y Plot')
    await page.getByRole('dialog', { name: 'New Plot' }).getByRole('button', { name: 'Add plot' }).click()
  }
  const plots = async () => (await groups(page)).join('+').split('+').filter((id) => id.startsWith('plot:')).length
  await expect.poll(plots).toBe(2)
  const before = await groups(page)
  await page.getByRole('button', { name: 'Plots windows' }).click()
  await page.getByRole('menuitem', { name: 'Close All' }).click()
  await expect.poll(plots).toBe(0)
  await runCommand(page, 'Undo Layout Change')
  await expect.poll(() => groups(page)).toEqual(before)

  // Every view closed is a layout too: it is what comes back, not the default.
  await page.evaluate(() => (window as unknown as { __freesTest: { dockviewApi: { clear(): void } } }).__freesTest.dockviewApi.clear())
  await expect.poll(() => groups(page)).toEqual([])
  await page.reload()
  await expect(page.getByRole('button', { name: 'Plots windows' })).toBeVisible()
  await expect.poll(() => groups(page)).toEqual([])
  // And any view opens again from the rail or the palette.
  await runCommand(page, 'Editor')
  await expect(page.locator('.cm-content')).toContainText('L = 4')
})
