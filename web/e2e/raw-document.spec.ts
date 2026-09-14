import { expect, test } from '@playwright/test'

const source = 'https://raw.example/model.frees?version=2&kind=example'
const link = '/?url=' + encodeURIComponent(source)
const document = 'remote_length = 42 [m]'

test.use({ serviceWorkers: 'block' })

test('raw links open, preserve existing work, and are consumed before refresh', async ({ page }) => {
  await page.route(source, route => route.fulfill({ contentType: 'text/plain', body: document }))
  await page.goto(link)
  await expect(page.locator('.cm-content')).toContainText(document)
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('dialog')).toHaveCount(0)

  // Wait for autosave before visiting a different raw document.
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('frees.project') ?? '{}').text)).toBe(document)
  await page.unroute(source)
  await page.route(source, route => route.fulfill({ contentType: 'text/plain', body: 'other_length = 7 [m]' }))
  await page.goto(link)
  const dialog = page.getByRole('dialog', { name: 'Open shared document' })
  await expect(dialog).toBeVisible()
  await expect(page.locator('.cm-content')).toContainText(document)
  await dialog.getByRole('button', { name: 'Keep my workspace' }).click()
  await expect(dialog).toBeHidden()
  await page.reload()
  await expect(page.locator('.cm-content')).toContainText(document)
  await expect(dialog).toBeHidden()

  await page.goto(link)
  await dialog.getByRole('button', { name: 'Open shared document', exact: true }).click()
  await expect(page.locator('.cm-content')).toContainText('other_length = 7 [m]')
})

test('failed downloads leave the editor available and explain the error', async ({ page }) => {
  await page.route(source, route => route.fulfill({ status: 404, body: 'missing' }))
  await page.goto(link)
  await expect(page.getByText('The raw file server returned HTTP 404.')).toBeVisible()
  await expect(page.locator('.cm-content')).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('edits during a pending download are not overwritten', async ({ page }) => {
  let release!: () => void
  const pending = new Promise<void>(resolve => { release = resolve })
  await page.route(source, async route => {
    await pending
    await route.fulfill({ contentType: 'text/plain', body: document })
  })
  await page.goto(link)
  const editor = page.locator('.cm-content')
  await expect(editor).toBeVisible()
  await editor.fill('my_length = 5 [m]')
  release()
  await expect(page.getByRole('dialog', { name: 'Open shared document' })).toBeVisible()
  await expect(editor).toContainText('my_length = 5 [m]')
})
