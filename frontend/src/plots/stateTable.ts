import { VariableResult } from '../api'

/**
 * Thermodynamic state detection: solved variables named like h1, s[2] or
 * T_3 are grouped into numbered states (rows) by property (columns), the
 * the usual convention for cycle analyses. All values are SI.
 */

/** Canonical property columns, in display order. */
const STATE_PROPERTIES = ['T', 'P', 'v', 'u', 'h', 's', 'x', 'rho', 'w', 'Twb', 'Tdp', 'rh']

const PROPERTY_ALIASES: Record<string, string> = {
  t: 'T',
  drybulb: 'T',
  tdrybulb: 'T',
  p: 'P',
  pressure: 'P',
  v: 'v',
  volume: 'v',
  u: 'u',
  internalenergy: 'u',
  h: 'h',
  enthalpy: 'h',
  s: 's',
  entropy: 's',
  x: 'x',
  quality: 'x',
  rho: 'rho',
  density: 'rho',
  w: 'w',
  humrat: 'w',
  omega: 'w',
  humidityratio: 'w',
  twb: 'Twb',
  twetbulb: 'Twb',
  wetbulb: 'Twb',
  tdp: 'Tdp',
  tdew: 'Tdp',
  tdewpoint: 'Tdp',
  dewpoint: 'Tdp',
  rh: 'rh',
  relhum: 'rh',
  phi: 'rh',
  relativehumidity: 'rh',
}

export interface StateTable {
  /** State indices in ascending numeric order. */
  indices: number[]
  /** Properties (subset of STATE_PROPERTIES) that occur in any state. */
  columns: string[]
  /** values[index][property] = SI value. */
  values: Record<number, Record<string, number>>
}

function matchStateVariable(name: string): { property: string; index: number } | null {
  const m = /^([a-z]+(?:_[a-z]+)*?)_?(\d+)$|^([a-z]+)\[(\d+)\]$/i.exec(name)
  if (!m) return null
  const base = (m[1] ?? m[3]).replace(/_/g, '').toLowerCase()
  const property = PROPERTY_ALIASES[base]
  if (!property) return null
  return { property, index: Number(m[2] ?? m[4]) }
}

export function detectStates(variables: VariableResult[]): StateTable {
  const values: Record<number, Record<string, number>> = {}
  const columnSet = new Set<string>()
  for (const variable of variables) {
    const match = matchStateVariable(variable.name)
    if (!match || !Number.isFinite(variable.value)) continue
    values[match.index] = values[match.index] ?? {}
    values[match.index][match.property] = variable.value
    columnSet.add(match.property)
  }
  const indices = Object.keys(values)
    .map(Number)
    .sort((a, b) => a - b)
  const columns = STATE_PROPERTIES.filter((p) => columnSet.has(p))
  return { indices, columns, values }
}

/**
 * States that have both axis properties needed by a diagram, in index
 * order — these can be overlaid as points on the diagram.
 */
export function statesForAxes(
  table: StateTable,
  xProperty: string,
  yProperty: string,
): { index: number; x: number; y: number }[] {
  const points: { index: number; x: number; y: number }[] = []
  for (const index of table.indices) {
    const x = table.values[index][xProperty]
    const y = table.values[index][yProperty]
    if (x !== undefined && y !== undefined) {
      points.push({ index, x, y })
    }
  }
  return points
}
