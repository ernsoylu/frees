export interface VariableResult {
  name: string
  value: number
  units: string
  uncertainty?: number | null
}

export interface BlockResult {
  index: number
  equations: string[]
  variables: string[]
}

export interface ResidualResult {
  equation: string
  value: number
}

export interface SolveStats {
  equations: number
  unknowns: number
  blocks: number
  iterations: number
  elapsedMillis: number
  maxResidual: number
}

export interface StopCriteria {
  maxIterations: number
  relativeResiduals: number
  changeInVariables: number
  elapsedTimeSeconds: number
  complexMode?: boolean
}

export const DEFAULT_STOP_CRITERIA: StopCriteria = {
  maxIterations: 250,
  relativeResiduals: 1e-12,
  changeInVariables: 1e-15,
  elapsedTimeSeconds: 3600,
}

export interface TableRowResult {
  success: boolean
  values: Record<string, number>
  error: string | null
}

export type UnitSystem = 'SI' | 'ENG_SI' | 'ENGLISH'

export const UNIT_SYSTEM_OPTIONS: { value: UnitSystem; label: string }[] = [
  { value: 'SI', label: 'SI base (Pa, J, W, K)' },
  { value: 'ENG_SI', label: 'Engineering SI (kPa, kJ, kW, °C)' },
  { value: 'ENGLISH', label: 'US / English (psi, Btu, hp, °F)' },
]

export interface SolutionResult {
  variables: VariableResult[]
  maxResidual: number
}

export interface SolveResponse {
  success: boolean
  variables: VariableResult[]
  blocks: BlockResult[]
  residuals: ResidualResult[]
  stats: SolveStats | null
  solutions: SolutionResult[]
  unitWarnings: string[]
  error: string | null
  formattedEquations: string[]
  cyclePath?: Record<string, number>[]
  formattedReport?: string
  /** Function tables parsed from TABLE ... END blocks in the editor text. */
  codeTables?: FunctionTableDto[]
  /** Parametric run-tables parsed from PARAMETRIC ... END blocks. */
  parametricTables?: ParametricTableDto[]
  /** Plots declared in the editor text with PLOT 'name' ... END blocks. */
  definedPlots?: PlotDefDto[]
}

export interface CheckResponse {
  solvable: boolean
  equations: number
  unknowns: number
  variables: string[]
  unitWarnings: string[]
  inferredUnits: Record<string, string>
  message: string
  formattedEquations: string[]
  formattedReport?: string
  /** Function tables parsed from TABLE ... END blocks in the editor text. */
  codeTables?: FunctionTableDto[]
  /** Parametric run-tables parsed from PARAMETRIC ... END blocks. */
  parametricTables?: ParametricTableDto[]
  /** Plots declared in the editor text with PLOT 'name' ... END blocks. */
  definedPlots?: PlotDefDto[]
}

/** A parametric run-table parsed from a PARAMETRIC ... END block: the declared
 * variables and a row-major value grid (null cells where a column is short). */
export interface ParametricTableDto {
  name: string
  vars: string[]
  rows: (number | null)[][]
}

/** A plot parsed from a PLOT 'name' ... END block: the plot name and a raw
 * attribute map (lowercased keys → string values) the frontend maps onto a
 * PlotSpec via plotDefToSpec. */
export interface PlotDefDto {
  name: string
  attributes: Record<string, string[]>
}

export interface VariableInfo {
  name: string
  guess: number | null
  lower: number | null
  upper: number | null
  units: string | null
  uncertainty: number | null
}

const API_BASE = import.meta.env.VITE_API_BASE || '';

/** A Function Table in solver wire format (Epic 8): the table name is the
 * function name callable from equations; argNames lists the column names
 * (lookup argument first, then the family parameter, if any). */
export interface FunctionTableDto {
  name: string
  argNames: string[]
  xLog: boolean
  yLog: boolean
  curves: { param: number | null; points: number[][] }[]
}

export async function check(
  text: string,
  variableInfo: VariableInfo[],
  complexMode: boolean,
  functionTables: FunctionTableDto[] = [],
): Promise<CheckResponse> {
  try {
    const response = await fetch(`${API_BASE}/api/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, variableInfo, stopCriteria: { complexMode }, functionTables }),
    })
    if (!response.ok) {
      let errorMessage = `Server error (${response.status})`
      try {
        const errJson = await response.json()
        if (errJson && typeof errJson === 'object') {
          errorMessage = errJson.message || errJson.error || errorMessage
        }
      } catch {
        try {
          const textBody = await response.text()
          if (textBody) errorMessage = textBody
        } catch {}
      }
      return {
        solvable: false,
        equations: 0,
        unknowns: 0,
        variables: [],
        unitWarnings: [],
        inferredUnits: {},
        message: errorMessage,
        formattedEquations: [],
        formattedReport: undefined,
      }
    }
    const data = await response.json()
    return {
      solvable: data.solvable ?? false,
      equations: data.equations ?? 0,
      unknowns: data.unknowns ?? 0,
      variables: data.variables ?? [],
      unitWarnings: data.unitWarnings ?? [],
      inferredUnits: data.inferredUnits ?? {},
      message: data.message ?? '',
      formattedEquations: data.formattedEquations ?? [],
      formattedReport: data.formattedReport ?? undefined,
      codeTables: data.codeTables ?? [],
      parametricTables: data.parametricTables ?? [],
      definedPlots: data.definedPlots ?? [],
    }
  } catch (e) {
    return {
      solvable: false,
      equations: 0,
      unknowns: 0,
      variables: [],
      unitWarnings: [],
      inferredUnits: {},
      message: `Could not reach the solver backend: ${String(e)}`,
      formattedEquations: [],
      formattedReport: undefined,
    }
  }
}

export async function solve(
  text: string,
  stopCriteria: StopCriteria,
  variableInfo: VariableInfo[],
  findAllSolutions: boolean,
  displayUnitSystem: UnitSystem,
  fillMissing: boolean,
  functionTables: FunctionTableDto[] = [],
): Promise<SolveResponse> {
  try {
    const response = await fetch(`${API_BASE}/api/solve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        stopCriteria,
        variableInfo,
        findAllSolutions,
        displayUnitSystem,
        fillMissing,
        functionTables,
      }),
    })
    if (!response.ok) {
      let errorMessage = `Server error (${response.status})`
      try {
        const errJson = await response.json()
        if (errJson && typeof errJson === 'object') {
          errorMessage = errJson.message || errJson.error || errorMessage
        }
      } catch {
        try {
          const textBody = await response.text()
          if (textBody) errorMessage = textBody
        } catch {}
      }
      return {
        success: false,
        variables: [],
        blocks: [],
        residuals: [],
        stats: null,
        solutions: [],
        unitWarnings: [],
        error: errorMessage,
        formattedEquations: [],
        formattedReport: undefined,
      }
    }
    const data = await response.json()
    return {
      success: data.success ?? false,
      variables: data.variables ?? [],
      blocks: data.blocks ?? [],
      residuals: data.residuals ?? [],
      stats: data.stats ?? null,
      solutions: data.solutions ?? [],
      unitWarnings: data.unitWarnings ?? [],
      error: data.error ?? null,
      formattedEquations: data.formattedEquations ?? [],
      cyclePath: data.cyclePath ?? [],
      formattedReport: data.formattedReport ?? undefined,
      codeTables: data.codeTables ?? [],
      parametricTables: data.parametricTables ?? [],
      definedPlots: data.definedPlots ?? [],
    }
  } catch (e) {
    return {
      success: false,
      variables: [],
      blocks: [],
      residuals: [],
      stats: null,
      solutions: [],
      unitWarnings: [],
      error: `Could not reach the solver backend: ${String(e)}`,
      formattedEquations: [],
      formattedReport: undefined,
    }
  }
}

export type OptimizeMethod = 'brent' | 'nelder-mead' | 'bobyqa'

export interface OptimizeParams {
  objective: string
  decisions: string[]
  lowers: number[]
  uppers: number[]
  method: OptimizeMethod
  maximize: boolean
  constraints?: string[]
}

export interface OptimizeResponse {
  success: boolean
  error: string | null
  warning: string | null
  objective: VariableResult | null
  decision: VariableResult | null
  decisions: VariableResult[]
  evaluations: number
  variables: VariableResult[]
}

export async function optimize(
  text: string,
  stopCriteria: StopCriteria,
  variableInfo: VariableInfo[],
  displayUnitSystem: UnitSystem,
  params: OptimizeParams,
): Promise<OptimizeResponse> {
  try {
    const response = await fetch(`${API_BASE}/api/optimize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        stopCriteria,
        variableInfo,
        displayUnitSystem,
        ...params,
      }),
    })
    if (!response.ok) {
      let errorMessage = `Server error (${response.status})`
      try {
        const errJson = await response.json()
        if (errJson && typeof errJson === 'object') {
          errorMessage = errJson.message || errJson.error || errorMessage
        }
      } catch {
        try {
          const textBody = await response.text()
          if (textBody) errorMessage = textBody
        } catch {}
      }
      return {
        success: false,
        error: errorMessage,
        warning: null,
        objective: null,
        decision: null,
        decisions: [],
        evaluations: 0,
        variables: [],
      }
    }
    const data = await response.json()
    return {
      success: data.success ?? false,
      error: data.error ?? null,
      warning: data.warning ?? null,
      objective: data.objective ?? null,
      decision: data.decision ?? null,
      decisions: data.decisions ?? [],
      evaluations: data.evaluations ?? 0,
      variables: data.variables ?? [],
    }
  } catch (e) {
    return {
      success: false,
      error: `Could not reach the solver backend: ${String(e)}`,
      warning: null,
      objective: null,
      decision: null,
      decisions: [],
      evaluations: 0,
      variables: [],
    }
  }
}

export interface CurveFitParams {
  model: string
  yVariable: string
  xVariable: string
  parameters: string[]
  xData: number[]
  yData: number[]
  initialGuess?: number[]
}

export interface CurveFitResponse {
  success: boolean
  error: string | null
  fittedParameters: number[]
  parameterNames: string[]
  rSquared: number
  rmse: number
  iterations: number
  residuals: number[]
  fittedValues: number[]
}

const CURVE_FIT_FAILURE: Omit<CurveFitResponse, 'error'> = {
  success: false,
  fittedParameters: [],
  parameterNames: [],
  rSquared: 0,
  rmse: 0,
  iterations: 0,
  residuals: [],
  fittedValues: [],
}

export async function curveFit(params: CurveFitParams): Promise<CurveFitResponse> {
  try {
    const response = await fetch(`${API_BASE}/api/curve-fit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
      return {
        ...CURVE_FIT_FAILURE,
        error: data?.error || data?.message || `Server error (${response.status})`,
      }
    }
    return {
      success: data?.success ?? false,
      error: data?.error ?? null,
      fittedParameters: data?.fittedParameters ?? [],
      parameterNames: data?.parameterNames ?? [],
      rSquared: data?.rSquared ?? 0,
      rmse: data?.rmse ?? 0,
      iterations: data?.iterations ?? 0,
      residuals: data?.residuals ?? [],
      fittedValues: data?.fittedValues ?? [],
    }
  } catch (e) {
    return {
      ...CURVE_FIT_FAILURE,
      error: `Could not reach the solver backend: ${String(e)}`,
    }
  }
}

export interface DiagramCurve {
  family: string
  label: string
  x: (number | null)[]
  y: (number | null)[]
}

export interface DiagramMarker {
  label: string
  x: number
  y: number
}

export interface DiagramResponse {
  fluid: string
  kind: string
  xProperty: string
  yProperty: string
  xLog: boolean
  yLog: boolean
  dome: DiagramCurve[]
  isolines: DiagramCurve[]
  markers: DiagramMarker[]
}

export interface PsychartResponse {
  pressure: number
  tMin: number
  tMax: number
  curves: DiagramCurve[]
}

export async function getFluids(): Promise<string[]> {
  const response = await fetch(`${API_BASE}/api/fluids`)
  if (!response.ok) return []
  const body = (await response.json()) as { available: boolean; fluids: string[] }
  return body.available ? body.fluids : []
}

export async function getPropertyDiagram(
  fluid: string,
  type: string,
): Promise<DiagramResponse> {
  const response = await fetch(`${API_BASE}/api/propplot`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fluid, type }),
  })
  if (!response.ok) {
    const body = (await response.json()) as { error?: string }
    throw new Error(body.error ?? `Diagram request failed (${response.status})`)
  }
  return (await response.json()) as DiagramResponse
}

export async function getPsychrometricChart(
  pressure: number,
  tMin: number,
  tMax: number,
): Promise<PsychartResponse> {
  const response = await fetch(`${API_BASE}/api/psychart`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pressure, tMin, tMax }),
  })
  if (!response.ok) {
    const body = (await response.json()) as { error?: string }
    throw new Error(body.error ?? `Chart request failed (${response.status})`)
  }
  return (await response.json()) as PsychartResponse
}

/** Converts a plot SVG to a vector PDF or EPS on the backend. */
export async function exportVector(
  svg: string,
  format: 'pdf' | 'eps',
): Promise<Blob> {
  const response = await fetch(`${API_BASE}/api/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ svg, format }),
  })
  if (!response.ok) {
    throw new Error(`Vector export failed (${response.status})`)
  }
  return await response.blob()
}

export interface TableStats {
  runs: number
  solved: number
  failed: number
  equations: number
  unknowns: number
  iterations: number
  elapsedMillis: number
  maxResidual: number
}

export interface SolveTableResponse {
  results: TableRowResult[]
  stats: TableStats | null
}

export async function solveTable(
  text: string,
  stopCriteria: StopCriteria,
  variableInfo: VariableInfo[],
  displayUnitSystem: UnitSystem,
  variables: string[],
  rows: Record<string, number>[],
  functionTables: FunctionTableDto[] = [],
): Promise<SolveTableResponse> {
  try {
    const response = await fetch(`${API_BASE}/api/solve/table`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        stopCriteria,
        variableInfo,
        displayUnitSystem,
        table: { variables, rows },
        functionTables,
      }),
    })
    if (!response.ok) {
      let errorMessage = `Table solve failed with status ${response.status}`
      try {
        const errJson = await response.json()
        if (errJson && typeof errJson === 'object') {
          errorMessage = errJson.message || errJson.error || errorMessage
        }
      } catch {
        try {
          const textBody = await response.text()
          if (textBody) errorMessage = textBody
        } catch {}
      }
      throw new Error(errorMessage)
    }
    const data = await response.json()
    return {
      results: data.results ?? [],
      stats: data.stats ?? null,
    }
  } catch (e) {
    throw e instanceof Error ? e : new Error(String(e))
  }
}
