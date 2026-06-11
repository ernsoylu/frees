export interface VariableResult {
  name: string
  value: number
  units: string
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
}

export interface VariableInfo {
  name: string
  guess: number | null
  lower: number | null
  upper: number | null
  units: string | null
}

export async function check(
  text: string,
  variableInfo: VariableInfo[],
  complexMode: boolean,
): Promise<CheckResponse> {
  const response = await fetch('/api/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, variableInfo, stopCriteria: { complexMode } }),
  })
  return (await response.json()) as CheckResponse
}

export async function solve(
  text: string,
  stopCriteria: StopCriteria,
  variableInfo: VariableInfo[],
  findAllSolutions: boolean,
  displayUnitSystem: UnitSystem,
): Promise<SolveResponse> {
  const response = await fetch('/api/solve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      stopCriteria,
      variableInfo,
      findAllSolutions,
      displayUnitSystem,
    }),
  })
  return (await response.json()) as SolveResponse
}

export interface OptimizeParams {
  objective: string
  decision: string
  lower: number
  upper: number
  maximize: boolean
}

export interface OptimizeResponse {
  success: boolean
  error: string | null
  objective: VariableResult | null
  decision: VariableResult | null
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
  const response = await fetch('/api/optimize', {
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
    throw new Error(`Optimization failed with status ${response.status}`)
  }
  return (await response.json()) as OptimizeResponse
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
  const response = await fetch('/api/fluids')
  if (!response.ok) return []
  const body = (await response.json()) as { available: boolean; fluids: string[] }
  return body.available ? body.fluids : []
}

export async function getPropertyDiagram(
  fluid: string,
  type: string,
): Promise<DiagramResponse> {
  const response = await fetch('/api/propplot', {
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
  const response = await fetch('/api/psychart', {
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
  const response = await fetch('/api/export', {
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
): Promise<SolveTableResponse> {
  const response = await fetch('/api/solve/table', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      stopCriteria,
      variableInfo,
      displayUnitSystem,
      table: { variables, rows },
    }),
  })
  if (!response.ok) {
    throw new Error(`Table solve failed with status ${response.status}`)
  }
  return (await response.json()) as SolveTableResponse
}
