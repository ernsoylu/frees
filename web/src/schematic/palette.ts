// Line colors for the rendered schematic. Deliberately a separate palette from
// the plots' series colors (categorical, assigned by slot) and their property
// colors (isobars/isotherms): here the color carries MEANING — it
// names WHAT FLOWS in a line, so the same hue must always mean the same thing.
// Each colour has a dark-theme and a light-theme value, both readable as text
// (4.5:1) on that theme's canvas; they are literal hex rather than CSS
// variables because a serialized SVG has to keep its colors outside the app.
// Colour is never the only cue (CFG-02): every domain and fluid connector also
// has its own dash pattern, so the drawing still reads in grayscale.
//
// The bond-graph DOMAIN is too coarse to color by on its own: a coolant loop
// and a refrigerant loop are both `domain=fluid`, so a domain-colored drawing
// paints two independent circuits the same blue and they read as one tangle.
// Fluid lines are therefore colored by their CONNECTOR TYPE (liquid, two-phase,
// pneumatic, hydraulic, humid air), and a second fluid sharing a connector
// takes the next shade in that connector's ramp.

export type Scheme = 'dark' | 'light'

/** Non-fluid bond-graph domains keep one fixed, semantic color each. */
const DOMAIN_COLORS: Record<Scheme, Record<string, string>> = {
  dark: {
    heat: '#ff6b6b', // red — heat flow
    electrical: '#ffd43b', // yellow — current
    mechanical: '#a9e34b', // lime — torque
    translational: '#a9e34b', // same family as rotational mechanics
    signal: '#3bc9db', // cyan — causal control values, drawn dashed
  },
  light: {
    heat: '#c92a2a',
    electrical: '#8f6a00',
    mechanical: '#4c7a0b',
    translational: '#4c7a0b',
    signal: '#1a5f8f',
  },
}

/** Grayscale cue per domain and per fluid connector; undefined is solid. */
const DASHES: Record<string, string | undefined> = {
  liquid: undefined,
  twophase: '10 3 2 3',
  fluid: '14 5',
  gas: '8 4',
  oil: '10 3 2 3 2 3',
  moistair: '4 3',
  heat: '1 4', // dotted, with round caps
  electrical: '14 3 6 3',
  mechanical: '24 4',
  translational: '24 4',
  signal: '5 3',
}

/**
 * Fluid connector ramps. The first entry is the connector's canonical color;
 * later entries only come into play when one model runs two different working
 * fluids over the same connector type (two coolant loops, say), so they stay
 * within the same hue family and the circuits still read as "both coolant".
 */
const CONNECTOR_RAMPS: Record<Scheme, Record<string, string[]>> = {
  dark: {
    liquid: ['#4dabf7', '#339af0', '#74c0fc'], // blue — coolant / water-glycol
    twophase: ['#e599f7', '#cc5de8', '#f3d9fa'], // violet — refrigerant
    fluid: ['#38d9a9', '#0ca678', '#96f2d7'], // teal — generic thermofluid / steam
    gas: ['#ffa94d', '#f76707', '#ffd8a8'], // orange — pneumatic
    oil: ['#f08c00', '#e67700', '#ffec99'], // amber — hydraulic
    moistair: ['#99e9f2', '#22b8cf', '#c5f6fa'], // pale cyan — humid air
  },
  light: {
    liquid: ['#1971c2', '#0b4a85', '#3b5bdb'],
    twophase: ['#9c36b5', '#6b1f7c', '#ae3ec9'],
    fluid: ['#087f5b', '#05523b', '#237032'],
    gas: ['#c2410c', '#8a2e06', '#a8501a'],
    oil: ['#a35d00', '#6e3f00', '#94580a'],
    moistair: ['#0a7480', '#064c58', '#0b6e99'],
  },
}

const UNKNOWN: Record<Scheme, string> = { dark: '#adb5bd', light: '#6c757d' }

/**
 * Everything else the schematic paints, per theme. Text pairs (name, type,
 * badge on a block; port names on the canvas) hold 4.5:1; outlines, ports and
 * highlights hold 3:1 against what they sit on.
 */
export const SCHEMATIC_INK = {
  dark: {
    canvas: '#242424',
    block: '#25292e',
    blockActive: '#2b3138',
    text: '#e9ecef',
    subtext: '#a6a7ab',
    badge: '#63e6be',
    glyph: '#12b886',
    halo: '#1a1b1e',
    border: '#70757d',
    borderTerminal: '#868e96',
    highlight: '#fab005',
    active: '#12b886',
    portIdle: '#5c5f66',
    portName: '#a6a7ab',
    dot: '#5c5f66',
    gridLine: '#2c2e33',
    guide: '#f06595',
    marquee: '#4dabf7',
    marqueeFill: 'rgba(77, 171, 247, 0.1)',
    minimap: 'rgba(26, 27, 30, 0.85)',
    minimapNode: '#868e96',
  },
  light: {
    canvas: '#ffffff',
    block: '#f8f9fa',
    blockActive: '#e7f5ff',
    text: '#212529',
    subtext: '#495057',
    badge: '#087f5b',
    glyph: '#087f5b',
    halo: '#ffffff',
    border: '#868e96',
    borderTerminal: '#6c757d',
    highlight: '#e8590c',
    active: '#087f5b',
    portIdle: '#868e96',
    portName: '#495057',
    dot: '#ced4da',
    gridLine: '#e9ecef',
    guide: '#c2255c',
    marquee: '#1c7ed6',
    marqueeFill: 'rgba(28, 126, 214, 0.08)',
    minimap: 'rgba(248, 249, 250, 0.92)',
    minimapNode: '#adb5bd',
  },
} as const
export type SchematicInk = (typeof SCHEMATIC_INK)[Scheme]

/** WCAG relative-luminance contrast ratio of two #rrggbb colours. */
export function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const v = parseInt(hex.slice(i, i + 2), 16) / 255
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl
  }
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** How a line is drawn, beyond its color. A causal SIGNAL is not a physical
 *  flow — block-diagram convention draws it thin and dashed, which also keeps
 *  it from competing with the pipework it supervises. */
export interface LineStyle {
  color: string
  width: number
  dash?: string
  /** Round caps turn a dotted pattern into dots. */
  cap?: 'round'
}

/** Identity of one line in the drawing: what physics it obeys and, for a fluid
 *  line, which circuit it belongs to. */
export interface LineKey {
  domain: string
  /** Fluid connector type (`liquid`, `twophase`, …); absent outside fluid. */
  connector?: string | null
  /** Working fluid (`eg50`, `r1234yf`); absent when the model never named one. */
  fluid?: string | null
}

/** Stable key for "same kind of line" — the unit the legend lists and the
 *  circuit grouping partitions on. */
export function lineId(key: LineKey): string {
  const domain = key.domain?.toLowerCase() ?? ''
  if (domain !== 'fluid') {
    return domain
  }
  return `fluid:${key.connector?.toLowerCase() ?? 'fluid'}:${key.fluid?.toLowerCase() ?? ''}`
}

/**
 * Resolves every line in a drawing at once, so a fluid's color depends on the
 * whole set (a second fluid on one connector has to differ from the first) and
 * stays stable for a given document: assignment walks the fluids of each
 * connector in sorted order, never in discovery order.
 */
export function buildLineStyles(keys: readonly LineKey[], scheme: Scheme = 'dark'): Map<string, LineStyle> {
  const out = new Map<string, LineStyle>()
  const fluidsByConnector = new Map<string, Set<string>>()

  for (const key of keys) {
    const id = lineId(key)
    if ((key.domain?.toLowerCase() ?? '') !== 'fluid') {
      const domain = key.domain?.toLowerCase() ?? ''
      out.set(id, {
        color: DOMAIN_COLORS[scheme][domain] ?? UNKNOWN[scheme],
        width: domain === 'signal' ? 1.4 : 2,
        dash: DASHES[domain],
        cap: domain === 'heat' ? 'round' : undefined,
      })
      continue
    }
    const connector = key.connector?.toLowerCase() ?? 'fluid'
    const fluid = key.fluid?.toLowerCase() ?? ''
    let set = fluidsByConnector.get(connector)
    if (!set) {
      set = new Set()
      fluidsByConnector.set(connector, set)
    }
    set.add(fluid)
  }

  for (const [connector, fluids] of fluidsByConnector) {
    const ramp = CONNECTOR_RAMPS[scheme][connector] ?? [UNKNOWN[scheme]]
    ;[...fluids].sort((a, b) => a.localeCompare(b)).forEach((fluid, i) => {
      out.set(`fluid:${connector}:${fluid}`, { color: ramp[i % ramp.length], width: 2.4, dash: DASHES[connector] })
    })
  }
  return out
}

/** Human-readable connector names for the legend — `twophase` is not a word. */
const CONNECTOR_LABELS: Record<string, string> = {
  liquid: 'liquid',
  twophase: 'two-phase',
  fluid: 'fluid',
  gas: 'pneumatic',
  oil: 'hydraulic',
  moistair: 'humid air',
}

/**
 * The legend entry for a line: the working fluid leads, because that is what
 * the reader is tracing ("where does the R1234yf go?"), with the connector type
 * as the qualifier. Non-fluid lines are named by their domain.
 */
export function lineLabel(key: LineKey, fluidSpelling?: ReadonlyMap<string, string>): string {
  const domain = key.domain?.toLowerCase() ?? ''
  if (domain !== 'fluid') {
    return domain || 'unknown'
  }
  const connector = CONNECTOR_LABELS[key.connector?.toLowerCase() ?? 'fluid'] ?? key.connector ?? 'fluid'
  const raw = key.fluid?.toLowerCase()
  if (!raw) {
    return connector
  }
  return `${fluidSpelling?.get(raw) ?? key.fluid} · ${connector}`
}
