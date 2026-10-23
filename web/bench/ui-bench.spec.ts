// UI-level solve latency: what a user waits for, from the Solve click to the
// button leaving its busy state, through the built app (dist) — editor
// state, worker postMessage, engine, result mapping and React commit. The
// sibling wasm-bench.spec.ts times the engine alone; the gap between the two
// is the product overhead.
//
// Cold: the first solve of a freshly loaded page (worker spawn and wasm
// instantiation included), over COLD_RUNS page loads. Warm: WARM_RUNS repeat
// solves in one page. Median and p95 are printed and attached; nothing is
// asserted beyond completion, for the reason playwright.bench.config.ts gives.
//
// Run: npm run build && npx playwright test -c playwright.bench.config.ts ui-bench
import { test, expect, type Page } from '@playwright/test'

const APP = 'http://127.0.0.1:8934/'
const COLD_RUNS = Number(process.env.COLD_RUNS ?? 5)
const WARM_RUNS = Number(process.env.WARM_RUNS ?? 30)

// The documentation's DYNAMIC example, with a code plot: a solve that carries
// a trajectory and a figure through the result path, not just scalars.
const DOC = `k = 0.05 [1/s]
T_amb = 20 [C]
DYNAMIC cooldown (time = 0 .. 60, points = 61)
  der(T) = -k * (T - T_amb)
  T(0) = 90 [C]
END
PLOT 'Cooling curve'
  kind = xy
  x = time
  y = T
END
T_end = FinalValue('T')
`

async function openWithDocument(page: Page) {
  await page.goto(APP)
  const solve = page.getByRole('button', { name: 'Solve', exact: true })
  await expect(solve).toBeVisible({ timeout: 60_000 })
  const welcome = page.getByRole('dialog').filter({ hasText: 'Welcome to frees' })
  if (await welcome.isVisible({ timeout: 1500 }).catch(() => false)) await page.keyboard.press('Escape')
  const content = page.locator('.cm-content')
  await content.click()
  await page.keyboard.press('Control+a')
  await page.keyboard.press('Backspace')
  await page.keyboard.insertText(DOC)
  await expect(content).toContainText('Cooling curve')
}

/** Milliseconds from the Solve click to the button's aria-busy clearing. */
async function timedSolve(page: Page): Promise<number> {
  const ms = await page.evaluate(() => new Promise<number>((resolve, reject) => {
    const buttons = [...document.querySelectorAll<HTMLButtonElement>('button[aria-busy]')]
      .filter((b) => b.textContent?.trim() === 'Solve' && b.offsetParent !== null)
    if (buttons.length !== 1) return reject(new Error(`expected one visible Solve button, found ${buttons.length}`))
    const button = buttons[0]
    const timer = setTimeout(() => reject(new Error('Solve never reported busy then idle')), 60_000)
    let started = false
    const t0 = performance.now()
    const observer = new MutationObserver(() => {
      const busy = button.getAttribute('aria-busy') === 'true'
      if (busy) started = true
      else if (started) {
        observer.disconnect()
        clearTimeout(timer)
        resolve(performance.now() - t0)
      }
    })
    observer.observe(button, { attributes: true, attributeFilter: ['aria-busy'] })
    button.click()
  }))
  await expect(page.getByText(/^Solved/).first()).toBeVisible()
  return ms
}

function quantile(sorted: number[], q: number): number {
  const i = Math.min(sorted.length - 1, Math.ceil(q * sorted.length) - 1)
  return sorted[Math.max(0, i)]
}

function summary(label: string, samples: number[]): string {
  const s = [...samples].sort((a, b) => a - b)
  return `${label}: median ${quantile(s, 0.5).toFixed(1)} ms, p95 ${quantile(s, 0.95).toFixed(1)} ms, n=${s.length}`
}

test('UI solve latency, cold and warm', async ({ browser }, testInfo) => {
  const cold: number[] = []
  for (let i = 0; i < COLD_RUNS; i++) {
    const context = await browser.newContext()
    const page = await context.newPage()
    await openWithDocument(page)
    cold.push(await timedSolve(page))
    await context.close()
  }

  const context = await browser.newContext()
  const page = await context.newPage()
  await openWithDocument(page)
  await timedSolve(page)
  const warm: number[] = []
  for (let i = 0; i < WARM_RUNS; i++) warm.push(await timedSolve(page))
  await context.close()

  const report = [summary('cold', cold), summary('warm', warm)].join('\n')
  console.log(`\n${report}`)
  await testInfo.attach('ui-solve-latency', { body: report, contentType: 'text/plain' })
})
