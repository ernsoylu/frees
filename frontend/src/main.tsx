import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import '@mantine/core/styles.css'
import '@mantine/spotlight/styles.css'
import 'katex/dist/katex.min.css'
import { Center, createTheme, Loader, MantineProvider } from '@mantine/core'
import ErrorBoundary from './ErrorBoundary'
import './index.css'

// The editor app and the (separate /help route) Help page are split into their
// own chunks and loaded on demand, so visiting the editor never downloads the
// large docs catalog and example library that only the Help page needs.
const App = lazy(() => import('./App'))
const HelpPage = lazy(() => import('./HelpPage'))

const theme = createTheme({
  primaryColor: 'teal',
  fontFamilyMonospace:
    "'Cascadia Code', 'Fira Code', ui-monospace, 'SF Mono', monospace",
  defaultRadius: 'md',
})

const isHelpPage = globalThis.location.pathname === '/help'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <ErrorBoundary>
        <Suspense
          fallback={
            <Center h="100vh">
              <Loader color="teal" />
            </Center>
          }
        >
          {isHelpPage ? <HelpPage /> : <App />}
        </Suspense>
      </ErrorBoundary>
    </MantineProvider>
  </React.StrictMode>,
)
