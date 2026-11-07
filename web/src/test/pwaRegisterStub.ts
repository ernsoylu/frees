// Stand-in for vite-plugin-pwa's `virtual:pwa-register`, which exists only
// when the PWA plugin runs (the app build, not vitest). Tests vi.mock it.
export function registerSW(): (reloadPage?: boolean) => Promise<void> {
  return async () => {}
}
