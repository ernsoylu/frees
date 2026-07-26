// Domain colors for the rendered schematic. Deliberately a separate palette
// from the analyzer's signal colors (categorical, assigned by slot) and the
// plots' property colors (isobars/isotherms): here the color carries MEANING —
// it names the physical domain a connection belongs to, so the same hue must
// always mean the same physics. Hues are Mantine-scale *-4/*-5 values, tuned
// to stay legible on the dark theme, and are literal hex rather than CSS
// variables because a serialized SVG has to keep its colors outside the app.

/** Backend connection domains (ComponentExpander's own classification). */
export const DOMAIN_COLORS: Record<string, string> = {
  fluid: '#4dabf7', // blue — mass flow
  heat: '#ff6b6b', // red — heat flow
  electrical: '#ffd43b', // yellow — current
  mechanical: '#a9e34b', // lime — torque/force
  translational: '#a9e34b', // same family as rotational mechanics
  signal: '#3bc9db', // cyan — causal control values
}

const UNKNOWN_DOMAIN = '#adb5bd'

export function domainColor(domain: string): string {
  return DOMAIN_COLORS[domain?.toLowerCase()] ?? UNKNOWN_DOMAIN
}

/** Domains present in a set of connections, in palette order, for the legend. */
export function legendDomains(domains: readonly string[]): string[] {
  const seen = new Set(domains.map((d) => d.toLowerCase()))
  const known = Object.keys(DOMAIN_COLORS).filter((d) => seen.has(d))
  const unknown = [...seen].filter((d) => !(d in DOMAIN_COLORS)).sort((a, b) => a.localeCompare(b))
  return [...known, ...unknown]
}
