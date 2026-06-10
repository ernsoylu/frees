import React from 'react'
import ReactDOM from 'react-dom/client'
import '@mantine/core/styles.css'
import 'katex/dist/katex.min.css'
import { createTheme, MantineProvider } from '@mantine/core'
import App from './App'
import './index.css'

const theme = createTheme({
  primaryColor: 'blue',
  fontFamilyMonospace:
    "'Cascadia Code', 'Fira Code', ui-monospace, 'SF Mono', monospace",
  defaultRadius: 'md',
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <App />
    </MantineProvider>
  </React.StrictMode>,
)
