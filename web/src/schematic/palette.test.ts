import { describe, expect, it } from 'vitest'
import { buildLineStyles, contrast, fits, lineId, lineLabel, SCHEMATIC_INK, type LineKey } from './palette'

const fluid = (connector: string, f: string): LineKey => ({ domain: 'fluid', connector, fluid: f })

describe('lineId', () => {
  it('separates fluid lines by connector and working fluid', () => {
    // The identity a domain-only payload cannot express.
    expect(lineId(fluid('liquid', 'eg50'))).not.toEqual(lineId(fluid('twophase', 'r1234yf')))
    expect(lineId(fluid('liquid', 'eg50'))).not.toEqual(lineId(fluid('liquid', 'water')))
  })

  it('collapses a non-fluid domain to the domain itself', () => {
    expect(lineId({ domain: 'heat', connector: 'liquid', fluid: 'eg50' })).toBe('heat')
  })

  it('is case-insensitive, like the language', () => {
    expect(lineId(fluid('LIQUID', 'EG50'))).toBe(lineId(fluid('liquid', 'eg50')))
  })
})

describe('buildLineStyles', () => {
  it('takes a chosen colour only where it still reads, leads a ramp with it, and scales widths (CFG-02)', () => {
    const keys: LineKey[] = [{ domain: 'electrical' }, { domain: 'fluid', connector: 'liquid', fluid: 'a' }, { domain: 'fluid', connector: 'liquid', fluid: 'b' }]
    // Dark grey reads on the light canvas, not on the dark one.
    const custom = { width: 'bold' as const, colors: { electrical: '#5c5f66', liquid: '#000000' } }
    const light = buildLineStyles(keys, 'light', custom)
    expect(light.get('electrical')).toMatchObject({ color: '#5c5f66', width: 3 })
    expect(light.get('fluid:liquid:a')?.color).toBe('#000000')
    expect(light.get('fluid:liquid:b')?.color).toBe('#0b4a85') // the second fluid keeps its own shade
    const dark = buildLineStyles(keys, 'dark', custom)
    expect(dark.get('electrical')?.color).toBe('#ffd43b')
    expect(dark.get('fluid:liquid:a')?.color).toBe('#4dabf7')
    expect(buildLineStyles(keys, 'dark', { width: 'thin', colors: {} }).get('fluid:liquid:a')?.width).toBeCloseTo(1.68)
    expect(fits('#5c5f66', 'dark')).toBe(false)
    expect(fits('red', 'light')).toBe(false)
  })
  it('gives every fluid family its own colour', () => {
    // These are the connector types the expander can report; each has to be
    // visually distinct or two circuits read as one.
    const keys = [
      fluid('liquid', 'eg50'),
      fluid('twophase', 'r1234yf'),
      fluid('gas', 'air'),
      fluid('oil', 'iso vg46'),
      fluid('moistair', 'airh2o'),
      fluid('fluid', 'water'),
      { domain: 'heat' },
      { domain: 'electrical' },
      { domain: 'mechanical' },
      { domain: 'signal' },
    ]
    const styles = buildLineStyles(keys)
    const colours = keys.map((k) => styles.get(lineId(k))?.color)
    expect(colours.every(Boolean)).toBe(true)
    expect(new Set(colours).size).toBe(colours.length)
  })

  it('keeps rotational and translational mechanics in one family', () => {
    // They are the same physics in two coordinate systems; a reader should not
    // have to learn two colours for it.
    const styles = buildLineStyles([{ domain: 'mechanical' }, { domain: 'translational' }])
    expect(styles.get('mechanical')?.color).toEqual(styles.get('translational')?.color)
  })

  it('separates two fluids that share one connector', () => {
    const styles = buildLineStyles([fluid('liquid', 'eg50'), fluid('liquid', 'water')])
    expect(styles.get(lineId(fluid('liquid', 'eg50')))?.color).not.toEqual(
      styles.get(lineId(fluid('liquid', 'water')))?.color,
    )
  })

  it('assigns colours by sorted fluid name, not discovery order', () => {
    // Otherwise the same document recolours itself when an edge is re-ordered.
    const a = buildLineStyles([fluid('liquid', 'eg50'), fluid('liquid', 'water')])
    const b = buildLineStyles([fluid('liquid', 'water'), fluid('liquid', 'eg50')])
    expect(a.get(lineId(fluid('liquid', 'eg50')))).toEqual(b.get(lineId(fluid('liquid', 'eg50'))))
  })

  it('draws a causal signal thin and dashed — it is not a physical flow', () => {
    const style = buildLineStyles([{ domain: 'signal' }]).get('signal')
    expect(style?.dash).toBeTruthy()
    expect(style?.width).toBeLessThan(2)
  })

  // CFG-02: colour plus a dash cue, readable in both themes.
  const every: LineKey[] = [
    ...['liquid', 'twophase', 'fluid', 'gas', 'oil', 'moistair'].flatMap((c) => [fluid(c, 'a'), fluid(c, 'b'), fluid(c, 'c')]),
    ...['heat', 'electrical', 'mechanical', 'signal'].map((domain) => ({ domain })),
  ]

  it('tells every domain and connector apart without colour', () => {
    const patterns = new Map<string, string>()
    for (const key of every) {
      const s = buildLineStyles(every).get(lineId(key))!
      const family = key.domain === 'fluid' ? key.connector! : key.domain
      patterns.set(family, `${s.dash ?? 'solid'} ${s.width} ${s.cap ?? ''}`)
    }
    expect(new Set(patterns.values()).size).toBe(patterns.size)
  })

  it('keeps every line readable as text on both canvases', () => {
    for (const scheme of ['dark', 'light'] as const) {
      const styles = buildLineStyles(every, scheme)
      for (const [id, s] of styles) {
        expect(contrast(s.color, SCHEMATIC_INK[scheme].canvas), `${scheme} ${id}`).toBeGreaterThanOrEqual(4.5)
      }
      // A second fluid on a connector is a different colour from the first.
      expect(new Set([...styles.values()].map((s) => s.color)).size).toBe(styles.size)
    }
  })

  it('keeps block text at 4.5:1 and outlines at 3:1 in both themes', () => {
    for (const ink of Object.values(SCHEMATIC_INK)) {
      for (const text of [ink.text, ink.subtext, ink.badge]) {
        expect(contrast(text, ink.block)).toBeGreaterThanOrEqual(4.5)
      }
      expect(contrast(ink.portName, ink.canvas)).toBeGreaterThanOrEqual(4.5)
      for (const mark of [ink.border, ink.highlight, ink.active]) {
        expect(contrast(mark, ink.canvas)).toBeGreaterThanOrEqual(3)
      }
    }
  })
})

describe('lineLabel', () => {
  it('leads with the working fluid, qualified by the connector', () => {
    expect(lineLabel(fluid('twophase', 'r1234yf'))).toBe('r1234yf · two-phase')
    expect(lineLabel(fluid('gas', 'air'))).toBe('air · pneumatic')
    expect(lineLabel(fluid('oil', 'oil'))).toBe('oil · hydraulic')
    expect(lineLabel(fluid('moistair', 'airh2o'))).toBe('airh2o · humid air')
  })

  it('uses the spelling the document wrote', () => {
    const spelling = new Map([['r1234yf', 'R1234yf']])
    expect(lineLabel(fluid('twophase', 'r1234yf'), spelling)).toBe('R1234yf · two-phase')
  })

  it('names a fluid-less line by its connector, and a coupling by its domain', () => {
    expect(lineLabel({ domain: 'fluid', connector: 'moistair' })).toBe('humid air')
    expect(lineLabel({ domain: 'heat' })).toBe('heat')
  })
})
