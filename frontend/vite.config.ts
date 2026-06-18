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
