// The update check must start when main.tsx evaluates, not after the user has
// solved a few times (pwa.tsx). These tests pin the three things that make the
// "Reload to update" prompt prompt: a controlled page registers without
// waiting for `load`, the registration asks for a new sw.js at once and on
// every return to the tab, and an install already in flight when Workbox
// attached its listener still surfaces the prompt.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RegisterSWOptions } from 'vite-plugin-pwa/types'

const registerSW = vi.fn((_options: RegisterSWOptions) => vi.fn())
const show = vi.fn()
vi.mock('virtual:pwa-register', () => ({ registerSW }))
vi.mock('@mantine/notifications', () => ({ notifications: { show } }))

const { setupPwa, watchForUpdates } = await import('./pwa')

function fakeController(controller: object | null) {
  Object.defineProperty(navigator, 'serviceWorker', {
    value: { controller, addEventListener: vi.fn() },
    configurable: true,
  })
}

function fakeRegistration(installing: EventTarget & { state?: string } | null = null) {
  return {
    installing,
    waiting: null,
    update: vi.fn(() => Promise.resolve()),
  } as unknown as ServiceWorkerRegistration & { update: ReturnType<typeof vi.fn> }
}

beforeEach(() => {
  localStorage.clear()
  registerSW.mockClear()
  show.mockClear()
})

afterEach(() => {
  delete (navigator as { serviceWorker?: unknown }).serviceWorker
})

describe('setupPwa', () => {
  it('registers immediately on a controlled page, and checks as soon as it is registered', () => {
    fakeController({})
    setupPwa()
    expect(registerSW).toHaveBeenCalledTimes(1)
    const options = registerSW.mock.calls[0][0]
    expect(options.immediate).toBe(true)

    const registration = fakeRegistration()
    options.onRegisteredSW?.('/sw.js', registration)
    expect(registration.update).toHaveBeenCalledTimes(1)
  })

  it('still waits for load on a first visit, where the install pulls the whole precache', () => {
    fakeController(null)
    setupPwa()
    expect(registerSW.mock.calls[0][0].immediate).toBe(false)
  })
})

describe('watchForUpdates', () => {
  it('re-checks whenever the tab becomes visible again', () => {
    fakeController({})
    const registration = fakeRegistration()
    watchForUpdates(registration)
    expect(registration.update).toHaveBeenCalledTimes(1)

    const visibility = vi.spyOn(document, 'visibilityState', 'get')
    visibility.mockReturnValue('hidden')
    document.dispatchEvent(new Event('visibilitychange'))
    expect(registration.update).toHaveBeenCalledTimes(1)
    visibility.mockReturnValue('visible')
    document.dispatchEvent(new Event('visibilitychange'))
    expect(registration.update).toHaveBeenCalledTimes(2)
    visibility.mockRestore()
  })

  it('prompts for an update that was already installing before registration', () => {
    fakeController({})
    const installing = Object.assign(new EventTarget(), { state: 'installing' })
    watchForUpdates(fakeRegistration(installing))
    expect(show).not.toHaveBeenCalled()

    installing.state = 'installed'
    installing.dispatchEvent(new Event('statechange'))
    expect(show).toHaveBeenCalledWith(expect.objectContaining({ id: 'pwa-update-ready' }))
  })
})
