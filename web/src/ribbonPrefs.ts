// Phase O: the ribbon is a device preference, behind a flag until command
// parity and the acceptance criteria are met (NEXT_STEPS, Phase O). Like data
// saver it never enters a .frees project. Unavailable storage reads as off.

export const RIBBON_KEY = 'frees.ribbon'
export const RIBBON_DENSITY_KEY = 'frees.ribbonDensity'

export type RibbonDensity = 'expanded' | 'compact' | 'collapsed'

export function readRibbon(): boolean {
  try {
    return localStorage.getItem(RIBBON_KEY) === '1'
  } catch {
    return false
  }
}

export function writeRibbon(on: boolean) {
  try {
    localStorage.setItem(RIBBON_KEY, on ? '1' : '0')
  } catch {
    // storage unavailable: the choice lasts for this page only
  }
}

/** The stored density, else collapsed on a short window (< 900 px) and expanded otherwise. */
export function readRibbonDensity(height = globalThis.innerHeight ?? 900): RibbonDensity {
  try {
    const v = localStorage.getItem(RIBBON_DENSITY_KEY)
    if (v === 'expanded' || v === 'compact' || v === 'collapsed') return v
  } catch {
    // fall through to the default
  }
  return height < 900 ? 'collapsed' : 'expanded'
}

export function writeRibbonDensity(d: RibbonDensity) {
  try {
    localStorage.setItem(RIBBON_DENSITY_KEY, d)
  } catch {
    // storage unavailable
  }
}
