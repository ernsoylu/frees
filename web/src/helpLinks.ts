import { createContext, useContext } from 'react'
import type React from 'react'

const appId = (id: string) => (id.startsWith('example:') ? 'examples' : id)

/** Maps a Help page id (topic id, `refpage:slug`, `example:id`) to a link
 *  target: the app's hash route by default, a file path in the static book. */
export const HelpHref = createContext<(id: string) => string>((id) => '#' + appId(id))

/** Link props for a Help id: a real href (so links open in a new tab and work
 *  in the static book), with plain clicks routed through `onNavigate`. */
export function useHelpLink(onNavigate?: (id: string) => void) {
  const href = useContext(HelpHref)
  return (id: string) => ({
    href: href(id),
    onClick: (e: React.MouseEvent) => {
      if (!onNavigate || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      e.preventDefault()
      onNavigate(appId(id))
    },
  })
}

/** Set when rendering the static book: there is no JS, so folded sections
 *  render open and runnable code links to the app at `appUrl` instead. */
export const StaticHelp = createContext<{ appUrl: string } | null>(null)
