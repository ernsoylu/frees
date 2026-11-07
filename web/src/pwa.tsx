import { Button, Stack, Text } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { registerSW } from 'virtual:pwa-register'
import { decidePrecache, dropPrecache, readDataSaver } from './dataSaver'

// Phase 11: service-worker registration and the update flow.
//
// The worker is built with `registerType: 'prompt'` (vite.config.ts): a new
// deploy installs in the background but does NOT activate until the user opts
// in. Activating under a running tab would purge the old hashed chunks the tab
// is still lazy-loading — the exact stale-chunk failure main.tsx's
// vite:preloadError handler exists to paper over — so instead the new worker
// waits, and this notification hands the choice to the user. `updateSW(true)`
// tells the waiting worker to skipWaiting and reloads the page onto the new
// precache in one motion.
//
// The update check starts the moment main.tsx evaluates (2026-11-07). On a
// controlled page `immediate` registers without waiting for window `load`, and
// `watchForUpdates` asks the server for a new sw.js as soon as the
// registration exists and again whenever the tab becomes visible. Before,
// nothing called `registration.update()`: the only check was the browser's
// own post-navigation soft update, which runs once per navigation on the
// browser's schedule and never again in a long-lived tab, so the prompt
// surfaced late in a session or only on the next visit.
//
// Data saver (see dataSaver.ts for why this is the only honest lever) gates
// the whole thing: on, and nothing is registered — the app is downloaded as it
// is used and there is no offline guarantee. Off is the default and is
// byte-for-byte the behaviour that shipped before the switch existed, which is
// what keeps the offline e2e gate meaningful.

function showUpdateReady(apply: () => void) {
  notifications.show({
    id: 'pwa-update-ready',
    color: 'teal',
    autoClose: false,
    title: 'Update ready',
    message: (
      <Stack gap="xs">
        <Text size="sm">A new version of frees has been downloaded.</Text>
        <Button size="xs" onClick={apply}>
          Reload to update
        </Button>
      </Stack>
    ),
  })
}

// Check now, and on every return to the tab. Also covers an update the
// browser's navigation check had already started installing before Workbox
// attached its `updatefound` listener: Workbox only reports a worker that is
// already `waiting` at registration, so that install would otherwise finish
// silently and wait for the next visit.
export function watchForUpdates(registration: ServiceWorkerRegistration) {
  const installing = registration.installing
  if (installing && navigator.serviceWorker.controller) {
    installing.addEventListener('statechange', () => {
      if (installing.state !== 'installed') return
      showUpdateReady(() => {
        navigator.serviceWorker.addEventListener('controllerchange', () => globalThis.location.reload(), {
          once: true,
        })
        registration.waiting?.postMessage({ type: 'SKIP_WAITING' })
      })
    })
  }
  // Offline or a flaky network: the next visibility change retries.
  const check = () => void registration.update().catch(() => {})
  check()
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') check()
  })
}

export function setupPwa() {
  const decision = decidePrecache(readDataSaver(), 'serviceWorker' in navigator)

  if (decision === 'unsupported') return

  if (decision === 'drop') {
    // Fire-and-forget: reclaims the storage this browser already spent and,
    // more to the point, stops the next deploy precaching in the background.
    void dropPrecache({ serviceWorker: navigator.serviceWorker, caches: globalThis.caches })
    return
  }

  const updateSW = registerSW({
    // A controlled page boots from the precache, so registering now costs the
    // boot nothing. A first visit still waits for `load`: its install pulls
    // the whole precache and would compete with the boot's own downloads.
    immediate: navigator.serviceWorker.controller !== null,
    onNeedRefresh() {
      showUpdateReady(() => void updateSW(true))
    },
    onOfflineReady() {
      notifications.show({
        color: 'teal',
        title: 'Ready to work offline',
        message: 'frees is fully cached — the whole app now works without a network connection.',
      })
    },
    onRegisteredSW(_url, registration) {
      if (registration) watchForUpdates(registration)
    },
    onRegisterError() {
      // Registration failing (e.g. an insecure context) leaves a plain web
      // app, which is exactly what shipped before this phase. Nothing to say.
    },
  })
}
