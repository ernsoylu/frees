// RUN-05: recorded playback of a dynamic run, linked to the diagram and plot.
// With RUN-07 this is AC-12: play, scrub to an event, compare a compatible
// baseline, export the values at the selected time.
//
// Run:  npm run build && npx playwright test e2e/playback.spec.ts --project=chromium
import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

// A 5 kJ/K mass cooling through a wall to 300 K: T = 300 + 100·exp(-t/250 s).
// The event fires at 250·ln 2 = 173.3 s, between the recorded 100 s samples.
const COOL = `// frees-language: 2
ThermalMass   M(C=5000 [J/K], T0=400 [K])
ThermalSource amb(T=300 [K])
Conduction    wall(k=2 [W/m-K], area=1 [m^2], L=0.1 [m])
connect(M.port, wall.a)
connect(wall.b, amb.port)
DYNAMIC cool (method = ida, time = 0 .. 1000, points = 11)
  EVENT warm: M.port.T = 350 | falling -> record
END
PLOT 'Cooling'
  kind = xy
  x = time
  y = 'M.port.T'
END
`

test.use({ serviceWorkers: 'block', viewport: { width: 1440, height: 960 } })
test.skip(({ browserName }) => browserName !== 'chromium', 'One engine is enough for this journey.')

test('RUN-05: play, step and scrub a recorded run; an event reads at the sample after it; diagram, plot, run identity and export agree; reduced motion steps; nothing solves', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    const calls: string[] = []
    ;(window as unknown as { engineCalls: string[] }).engineCalls = calls
    const post = Worker.prototype.postMessage
    Worker.prototype.postMessage = function (this: Worker, message: unknown, ...rest: unknown[]) {
      const method = (message as { method?: string } | null)?.method
      if (method) calls.push(method)
      return (post as (...a: unknown[]) => void).call(this, message, ...rest)
    } as typeof Worker.prototype.postMessage
  })
  const source = 'https://raw.example/playback.frees'
  await page.route(source, (route) => route.fulfill({ contentType: 'text/plain', body: COOL }))
  await page.goto('/?url=' + encodeURIComponent(source))
  await expect(page.locator('.cm-content')).toContainText('frees-language', { timeout: 60_000 })
  await page.getByRole('button', { name: 'Solve', exact: true }).click()
  await expect(page.getByText(/^Solved/i).first()).toBeVisible({ timeout: 120_000 })
  const calls = () => page.evaluate(() => [...(window as unknown as { engineCalls: string[] }).engineCalls])

  const bar = page.getByTestId('playback-bar')
  const time = bar.getByTestId('playback-time')
  await expect(time).toHaveText('time = 1000 s · sample 11 of 11')
  await expect(bar).toContainText('end of run')
  const run = Number((await page.getByTestId('run-identity').textContent())!.match(/run (\d+)/)![1])
  await page.waitForTimeout(1000)
  const before = (await calls()).length

  // The event: no sample is recorded at 173.3 s, so it reads at the next one, 200 s.
  await bar.getByRole('button', { name: 'Previous event' }).click()
  await expect(time).toHaveText('time = 200 s · sample 3 of 11')
  await expect(bar.getByTestId('playback-event')).toHaveText('event warm · time = 173.288 s')
  await expect(page.getByTestId('run-identity')).toHaveText(`run ${run} · Document inputs · time = 200 s (sample 3 of 11) · solved`)

  // The plot draws the same sample.
  await page.getByRole('button', { name: 'Plots windows' }).click()
  await page.getByRole('menuitem', { name: /Cooling/ }).click()
  await expect(page.locator('[data-playhead]')).toHaveAttribute('data-playhead', '200')

  // The diagram reads the recorded value at that sample, with the run and time. The engine
  // infers no unit for a component's trajectory column, so no view invents one.
  await page.locator('body').click({ position: { x: 5, y: 5 } })
  await page.keyboard.press('Control+K')
  await page.getByPlaceholder('Search views, tools, and actions…').fill('Schematic')
  await page.keyboard.press('Enter')
  const svg = page.getByRole('application', { name: /Component network schematic/ })
  await expect(svg.locator('[data-node="m"]')).toBeVisible({ timeout: 60_000 })
  await expect(page.getByTestId('schematic-sample')).toHaveText(`Playback: run ${run} · time = 200 s (sample 3 of 11)`)
  await svg.locator('[data-node="m"]').click()
  await page.getByRole('button', { name: /^Show m\.port\.t on the block$/i }).click()
  await expect(svg.locator('[data-node="m"] [data-badge]')).toHaveText('port T = 344.93 K')

  // Step and scrub move every view together.
  await bar.getByRole('button', { name: 'Step forward' }).click()
  await expect(time).toHaveText('time = 300 s · sample 4 of 11')
  await expect(svg.locator('[data-node="m"] [data-badge]')).toHaveText('port T = 330.12 K')
  const slider = bar.getByRole('slider', { name: 'Recorded time' })
  await slider.focus()
  await page.keyboard.press('Home')
  await expect(time).toHaveText('time = 0 s · sample 1 of 11')
  await expect(svg.locator('[data-node="m"] [data-badge]')).toHaveText('port T = 400 K')
  await bar.getByRole('button', { name: 'Next event' }).click()
  await expect(time).toHaveText('time = 200 s · sample 3 of 11')
  await expect(svg.locator('[data-node="m"] [data-badge]')).toHaveText('port T = 344.93 K')
  // The plot shares the schematic's dock group: brought back, it is at the same sample.
  await page.getByRole('button', { name: 'Plots windows' }).click()
  await page.getByRole('menuitem', { name: /Cooling/ }).click()
  await expect(page.locator('[data-playhead]')).toHaveAttribute('data-playhead', '200')

  // A baseline at 200 s compares at 200 s only; elsewhere the pair is unavailable, not wrong.
  const runs = page.getByTestId('runs-panel')
  await runs.getByRole('button', { name: 'Set as baseline' }).click()
  const row = runs.getByTestId('run-comparison').locator('[data-variable="m.port.t"]')
  await expect(row.locator('[data-change]')).toHaveText('same')
  await bar.getByRole('button', { name: 'Step forward' }).click()
  await expect(row.locator('[data-unavailable]')).toHaveText('unavailable: different samples (time = 200 s (sample 3 of 11) vs time = 300 s (sample 4 of 11))')
  await bar.getByRole('button', { name: 'Step back' }).click()
  await expect(row.locator('[data-change]')).toHaveText('same')

  // Export the values at the selected time: the file names the run and the time.
  const [download] = await Promise.all([page.waitForEvent('download'), bar.getByRole('button', { name: 'Export values at time = 200 s' }).click()])
  const csvPath = testInfo.outputPath('values.csv')
  await download.saveAs(csvPath)
  const csv = readFileSync(csvPath, 'utf-8').split('\n')
  expect(csv[0]).toBe(`# run ${run} · Document inputs · time = 200 s (sample 3 of 11) · solved`)
  expect(csv[1]).toBe('variable,value,unit')
  expect(csv.find((l) => l.startsWith('m.port.t,'))).toMatch(/^m\.port\.t,344\.93\d*,K$/)

  // Play runs to the end and stops there.
  await bar.getByRole('combobox', { name: 'Speed' }).click()
  await page.getByRole('option', { name: '4×' }).click()
  await bar.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(time).toHaveText('time = 1000 s · sample 11 of 11', { timeout: 10_000 })
  await expect(bar.getByRole('button', { name: 'Play', exact: true })).toBeVisible()

  await expect(page.locator('[data-playhead]')).toHaveAttribute('data-playhead', '1000')

  // Exit shows the run's end without playback: no sample, no playhead.
  await bar.getByRole('button', { name: 'Exit playback' }).click()
  await expect(page.getByTestId('run-identity')).toHaveText(`run ${run} · Document inputs · steady solution · solved`)
  await expect(page.locator('[data-playhead]')).toHaveCount(0)

  await page.waitForTimeout(1000)
  const playbackCalls = (await calls()).slice(before)
  expect(playbackCalls.filter((m) => m === 'solve' || m === 'check')).toEqual([])

  // Reduced motion: Play is unavailable; stepping still works.
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(bar.getByRole('button', { name: 'Play', exact: true })).toBeDisabled()
  await expect(bar).toContainText('Reduced motion is on')
  await bar.getByRole('button', { name: 'Step back' }).click()
  await expect(time).toHaveText('time = 900 s · sample 10 of 11')
  await test.info().attach('evidence.json', { body: JSON.stringify({ run, playbackCalls }, null, 2), contentType: 'application/json' })
})
