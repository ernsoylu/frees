import { createTheme } from '@mantine/core'

/** The Mantine theme shared by the app and the static book. */
export const theme = createTheme({
  primaryColor: 'teal',
  fontFamilyMonospace:
    "'Cascadia Code', 'Fira Code', ui-monospace, 'SF Mono', monospace",
  defaultRadius: 'md',
})
