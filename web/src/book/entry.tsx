/* eslint-disable react-refresh/only-export-components -- an SSR entry, never hot-reloaded */
// SSR entry for the static frees Book (D14): the Help's own renderers, run
// through react-dom/server by scripts/build-book.mjs. Never imported by the app.
import '@mantine/core/styles.css'
import type { ReactNode } from 'react'
import { renderToString } from 'react-dom/server'
import { MantineProvider } from '@mantine/core'
import { ALL_CATEGORIES, MarkdownRenderer, NAV_LABELS, ReferencePageView } from '../HelpPage'
import { HelpHref, StaticHelp } from '../helpLinks'
import { DOCS_CATALOG } from '../docsCatalog'
import { REFERENCE_PAGES } from '../referenceCatalog'
import { theme } from '../theme'

export { ALL_CATEGORIES, NAV_LABELS, DOCS_CATALOG, REFERENCE_PAGES }
export { EXAMPLES } from '../examples'
export { buildShareUrl } from '../share'

let appUrl = 'https://frees.softncon.com/'
/** The deployed app that "Open in frees" links open. */
export function setAppUrl(url: string): void { appUrl = url }

function render(node: ReactNode, href: (id: string) => string): string {
  return renderToString(
    <MantineProvider theme={theme} withCssVariables={false}>
      <StaticHelp.Provider value={{ appUrl }}>
        <HelpHref.Provider value={href}>{node}</HelpHref.Provider>
      </StaticHelp.Provider>
    </MantineProvider>,
  )
}

/** The CSS custom properties MantineProvider would inject, emitted once for the book's stylesheet. */
export function themeVariables(): string {
  const html = renderToString(<MantineProvider theme={theme}><span /></MantineProvider>)
  return [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n')
}

export function renderGuide(id: string, href: (id: string) => string): string {
  return render(<MarkdownRenderer content={DOCS_CATALOG[id]} />, href)
}

export function renderReference(slug: string, href: (id: string) => string): string {
  const page = REFERENCE_PAGES.find((p) => p.slug === slug)!
  return render(<ReferencePageView page={page} onNavigate={() => {}} />, href)
}

export function renderMarkdown(markdown: string, href: (id: string) => string): string {
  return render(<MarkdownRenderer content={markdown} />, href)
}
