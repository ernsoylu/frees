export interface SearchEntry {
  title: string
  path: string
  kind: string
  blurb: string
  keywords: string
  text: string
  concepts?: string[]
  domains?: string[]
  prerequisites?: string[]
}
export interface SearchFilters {
  concepts?: string
  domains?: string
  prerequisites?: string
}
export function matchEntries(entries: SearchEntry[], query: string, filters: SearchFilters): SearchEntry[]
