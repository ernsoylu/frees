// Phase O: search over the function catalogue for the Function Browser.
import { FUNCTION_CATEGORIES, type FunctionItem } from './functionCatalog'
import { REFERENCE_SLUGS } from './docsTopics'

const SLUGS = new Set(REFERENCE_SLUGS)
export const ALL_CATEGORIES = 'All categories'

/** The reference page for a catalogue entry: its call name, when documented. */
export function referenceSlug(item: FunctionItem): string | null {
  const name = /^[A-Za-z_$#][\w$#]*/.exec(item.snippet)?.[0]?.toLowerCase()
  return name && SLUGS.has(name) ? name : null
}

/** Entries matching every word of `query` in their label, description, usage or category. */
export function searchFunctions(query: string, category: string) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  return FUNCTION_CATEGORIES.filter((c) => category === ALL_CATEGORIES || c.category === category).flatMap((c) =>
    c.items
      .filter((item) => {
        const hay = `${item.label} ${item.description ?? ''} ${item.usage ?? ''} ${c.category}`.toLowerCase()
        return words.every((w) => hay.includes(w))
      })
      .map((item) => ({ category: c.category, item })),
  )
}

