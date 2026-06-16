import React from 'react'
import ReactDOM from 'react-dom/client'
import '@mantine/core/styles.css'
import '@mantine/spotlight/styles.css'
import 'katex/dist/katex.min.css'
import { createTheme, MantineProvider } from '@mantine/core'
import App from './App'
import HelpPage from './HelpPage'
import ErrorBoundary from './ErrorBoundary'
import './index.css'

const theme = createTheme({
  primaryColor: 'teal',
  fontFamilyMonospace:
    "'Cascadia Code', 'Fira Code', ui-monospace, 'SF Mono', monospace",
  defaultRadius: 'md',
})

const isHelpPage = globalThis.location.pathname === '/help';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <ErrorBoundary>{isHelpPage ? <HelpPage /> : <App />}</ErrorBoundary>
    </MantineProvider>
  </React.StrictMode>,
)
