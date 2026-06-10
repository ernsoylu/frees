export interface VariableResult {
  name: string
  value: number
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
  elapsedMillis: number
  maxResidual: number
}

export interface SolveResponse {
  success: boolean
  variables: VariableResult[]
  blocks: BlockResult[]
  residuals: ResidualResult[]
  stats: SolveStats | null
  error: string | null
}

export interface CheckResponse {
  solvable: boolean
  equations: number
  unknowns: number
  message: string
}

export async function check(text: string): Promise<CheckResponse> {
  const response = await fetch('/api/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  return (await response.json()) as CheckResponse
}

export async function solve(text: string): Promise<SolveResponse> {
  const response = await fetch('/api/solve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  return (await response.json()) as SolveResponse
}
