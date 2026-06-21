import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Inject the runtime build-info.js script into the production HTML.
// This classic (non-module) script sets window.__BUILD_COMMIT__ and is written
// at container start by the nginx entrypoint (see docker-entrypoint.d/).
// Injecting it via transformIndexHtml avoids Vite's "can't be bundled without
// type=module" warning that occurs when the tag is in the static index.html.
function buildInfoPlugin() {
  return {
    name: 'inject-build-info',
    transformIndexHtml(html: string) {
      return html.replace(
        '</head>',
        '  <script src="/build-info.js"></script>\n  </head>',
      )
    },
  }
}

export default defineConfig({
  plugins: [react(), buildInfoPlugin()],
  build: {
    // The editor core ("App" chunk) sits around ~260 kB gzipped after the
    // feature tabs (Diagram, Digitizer, Plots, formatted report), modals, the
    // Help page and Plotly are all code-split into their own lazily-loaded
    // chunks. Bump the warning limit above the core so the build only flags a
    // genuine regression there; the one chunk that still exceeds it is Plotly
    // (~4.8 MB), which is intentionally isolated and dynamically imported in
    // PlotlyChart, so it never blocks first paint.
    chunkSizeWarningLimit: 1000,
    // Split the big shared libraries into their own cached vendor chunks so the
    // editor and Help-page chunks stay small.
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('@mantine')) return 'mantine'
          if (id.includes('katex')) return 'katex'
          if (id.includes('ag-grid')) return 'ag-grid'
          if (id.includes('/react-dom/') || id.includes('/react/') || id.includes('/scheduler/')) {
            return 'react'
          }
          return undefined
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
