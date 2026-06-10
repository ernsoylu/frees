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
}

export const DEFAULT_STOP_CRITERIA: StopCriteria = {
  maxIterations: 250,
  relativeResiduals: 1e-6,
  changeInVariables: 1e-9,
  elapsedTimeSeconds: 3600,
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
}

export interface CheckResponse {
  solvable: boolean
  equations: number
  unknowns: number
  variables: string[]
  unitWarnings: string[]
  inferredUnits: Record<string, string>
  message: string
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
): Promise<CheckResponse> {
  const response = await fetch('/api/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, variableInfo }),
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
