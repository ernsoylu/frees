import { SolutionResult, VariableResult } from './api'

export function formatValue(value: number | null | undefined, decimals?: number): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  if (!Number.isFinite(value)) return String(value)
  // An explicit decimal-place count (e.g. a Diagram output element's setting)
  // overrides the adaptive formatter below.
  if (decimals !== undefined && decimals >= 0) return value.toFixed(decimals)
  if (value === 0) return '0'
  const abs = Math.abs(value)
  if (abs >= 1e7 || abs < 1e-4) return value.toExponential(6)
  return Number(value.toPrecision(8)).toString()
}

/**
 * Suppresses numerical round-off noise in one component of a complex value:
 * magnitudes below 1e-12, and components that are negligible relative to the
 * other component.
 */
function suppressRoundoff(value: number, reference: number): number {
  const cleaned = Math.abs(value) < 1e-12 ? 0 : value
  if (cleaned === 0 || Math.abs(reference) === 0) return cleaned
  const relativeRatio = Math.abs(cleaned) / Math.abs(reference)
  if (relativeRatio < 1e-6 && Math.abs(cleaned) < 1e-5) return 0
  return cleaned
}

function imagSign(cleanReal: number, cleanImag: number): string {
  if (cleanImag > 0) return cleanReal === 0 ? '' : ' + '
  return cleanReal === 0 ? '-' : ' - '
}

function formatComplex(real = 0, imag = 0): string {
  const cleanImag = suppressRoundoff(imag, real)
  const cleanReal = suppressRoundoff(real, cleanImag)
  if (cleanImag === 0) return formatValue(cleanReal)
  const formattedReal = cleanReal === 0 ? '' : formatValue(cleanReal)
  const formattedImag =
    Math.abs(cleanImag) === 1 ? '' : formatValue(Math.abs(cleanImag))
  return `${formattedReal}${imagSign(cleanReal, cleanImag)}${formattedImag}i`
}

/**
 * One row of the Solution window. With multiple solutions, the display cell
 * shows the set of values across solutions: {2.7016, -3.7016}.
 */
export interface SolutionRow {
  name: string
  units: string
  display: string
  isSet: boolean
}

/** Values of one variable across all solutions (or just the base value). */
function valuesAcrossSolutions(
  name: string,
  fallback: number,
  solutions: SolutionResult[],
): number[] {
  if (solutions.length <= 1) return [fallback]
  return solutions.map(
    (s) => s.variables.find((x) => x.name === name)?.value ?? Number.NaN,
  )
}

function toRow(name: string, units: string, formatted: string[]): SolutionRow {
  const isSet = new Set(formatted).size > 1
  return {
    name,
    units,
    display: isSet ? `{${formatted.join(', ')}}` : formatted[0],
    isSet,
  }
}

export function buildRealSolutionRows(
  variables: VariableResult[],
  solutions: SolutionResult[],
): SolutionRow[] {
  return variables.map((v) => {
    const unc = v.uncertainty
    const formattedVals = valuesAcrossSolutions(v.name, v.value, solutions).map((val) => formatValue(val))
    if (unc !== undefined && unc !== null && unc > 0) {
      const formattedUnc = formatValue(unc)
      return toRow(
        v.name,
        v.units,
        formattedVals.map((val) => `${val} ± ${formattedUnc}`),
      )
    }
    return toRow(
      v.name,
      v.units,
      formattedVals,
    )
  })
}

function isComplexComponent(name: string): boolean {
  return name.endsWith('_r') || name.endsWith('_i')
}

function baseNameOf(name: string): string {
  return isComplexComponent(name) ? name.slice(0, -2) : name
}

/** Units per base variable; the _r component carries the units of the pair. */
function complexUnitsMap(variables: VariableResult[]): Map<string, string> {
  const unitsMap = new Map<string, string>()
  for (const v of variables) {
    if (v.name.endsWith('_r') || !v.name.endsWith('_i')) {
      unitsMap.set(baseNameOf(v.name), v.units)
    }
  }
  return unitsMap
}

function formatComplexPerSolution(
  baseName: string,
  variables: VariableResult[],
  solutions: SolutionResult[],
): string[] {
  const rName = `${baseName}_r`
  const iName = `${baseName}_i`
  const sources =
    solutions.length > 1 ? solutions.map((s) => s.variables) : [variables]
  return sources.map((vars) => formatComplexEntry(vars, rName, iName))
}

function isZeroUnc(u: number | null | undefined): boolean {
  return u === undefined || u === null || u === 0
}

/** Formats one complex value (a_r + a_i·i) for one solution, with optional
 *  per-component uncertainties. */
function formatComplexEntry(vars: VariableResult[], rName: string, iName: string): string {
  const rVar = vars.find((x) => x.name === rName)
  const iVar = vars.find((x) => x.name === iName)
  const rVal = rVar?.value ?? 0
  const iVal = iVar?.value ?? 0
  const rUnc = rVar?.uncertainty
  const iUnc = iVar?.uncertainty
  if (isZeroUnc(rUnc) && isZeroUnc(iUnc)) {
    return formatComplex(rVal, iVal)
  }
  const cleanImag = suppressRoundoff(iVal, rVal)
  const cleanReal = suppressRoundoff(rVal, cleanImag)
  const real = formatRealWithUnc(cleanReal, cleanImag, rUnc)
  return appendImagWithUnc(real, cleanImag, iUnc)
}

/** The real part string (empty when the value is purely imaginary), with optional uncertainty. */
function formatRealWithUnc(cleanReal: number, cleanImag: number, rUnc: number | null | undefined): string {
  if (cleanReal === 0 && cleanImag !== 0) {
    return ''
  }
  const out = formatValue(cleanReal)
  return rUnc !== undefined && rUnc !== null && rUnc > 0 ? `(${out} ± ${formatValue(rUnc)})` : out
}

/** Appends the imaginary part (with optional uncertainty and the correct sign) to {@code real}. */
function appendImagWithUnc(real: string, cleanImag: number, iUnc: number | null | undefined): string {
  if (cleanImag === 0) {
    return real
  }
  const formattedImag = Math.abs(cleanImag) === 1 ? '' : formatValue(Math.abs(cleanImag))
  let imagPart = `${formattedImag}i`
  if (iUnc !== undefined && iUnc !== null && iUnc > 0) {
    imagPart = `(${formatValue(Math.abs(cleanImag))} ± ${formatValue(iUnc)})i`
  }
  if (real !== '') {
    return real + (cleanImag > 0 ? ` + ${imagPart}` : ` - ${imagPart}`)
  }
  return cleanImag > 0 ? imagPart : `-${imagPart}`
}

export function buildComplexSolutionRows(
  variables: VariableResult[],
  solutions: SolutionResult[],
): SolutionRow[] {
  const unitsMap = complexUnitsMap(variables)
  const processed = new Set<string>()
  const rows: SolutionRow[] = []
  for (const v of variables) {
    const baseName = baseNameOf(v.name)
    if (processed.has(baseName)) continue
    processed.add(baseName)
    if (isComplexComponent(v.name)) {
      rows.push(
        toRow(
          baseName,
          unitsMap.get(baseName) ?? '',
          formatComplexPerSolution(baseName, variables, solutions),
        ),
      )
    } else {
      const unc = v.uncertainty
      const formattedVals = valuesAcrossSolutions(v.name, v.value, solutions).map((val) => formatValue(val))
      if (unc !== undefined && unc !== null && unc > 0) {
        const formattedUnc = formatValue(unc)
        rows.push(
          toRow(
            v.name,
            v.units,
            formattedVals.map((val) => `${val} ± ${formattedUnc}`),
          ),
        )
      } else {
        rows.push(
          toRow(
            v.name,
            v.units,
            formattedVals,
          ),
        )
      }
    }
  }
  return rows
}

/**
 * Stable React keys for lists of possibly-duplicated strings: the value
 * itself plus its occurrence number.
 */
export function withStableKeys(
  items: string[],
): { key: string; value: string }[] {
  const counts = new Map<string, number>()
  return items.map((value) => {
    const occurrence = (counts.get(value) ?? 0) + 1
    counts.set(value, occurrence)
    return { key: `${value}#${occurrence}`, value }
  })
}
