import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Vitest runs separately from the Vite build. jsdom provides a DOM for
// React Testing Library; setup.ts wires in @testing-library/jest-dom matchers.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./src/test/setup.ts'],
    // scripts/ carries the documentation-gate tests. They spawn the generator
    // as a subprocess in a temp tree, so they need no DOM — but running them
    // here is what puts the gate in CI without a second workflow step.
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'scripts/**/*.{test,spec}.mjs'],
    css: false,
    // The PWA plugin (vite.config.ts) is not loaded here, so its virtual
    // module needs a stand-in for src/pwa.tsx to resolve under test.
    alias: {
      'virtual:pwa-register': fileURLToPath(new URL('./src/test/pwaRegisterStub.ts', import.meta.url)),
    },
  },
})
