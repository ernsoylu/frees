import { VariableResult } from '../api'

/**
 * Thermodynamic state detection: solved variables named like h1, s[2] or
 * T_3 are grouped into numbered states (rows) by property (columns), the
 * EES convention for cycle analyses. All values are SI.
 */

const STATE_PROPERTIES = ['T', 'P', 'v', 'u', 'h', 's', 'x', 'rho', 'w']

export interface StateTable {
  /** State indices in ascending numeric order. */
  indices: number[]
  /** Properties (subset of STATE_PROPERTIES) that occur in any state. */
  columns: string[]
  /** values[index][property] = SI value. */
  values: Record<number, Record<string, number>>
}

function matchStateVariable(name: string): { property: string; index: number } | null {
  const m = /^([a-z]+)(?:_?(\d+)|\[(\d+)\])$/i.exec(name)
  if (!m) return null
  const property = STATE_PROPERTIES.find(
    (p) => p.toLowerCase() === m[1].toLowerCase(),
  )
  if (!property) return null
  return { property, index: Number(m[2] ?? m[3]) }
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
