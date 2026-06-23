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
  /** 1-based editor line a syntax error points at, or null for whole-system errors. */
  errorLine?: number | null
  formattedEquations: string[]
  cyclePath?: Record<string, number>[]
  formattedReport?: string
  /** Function tables parsed from TABLE ... END blocks in the editor text. */
  codeTables?: FunctionTableDto[]
  /** Parametric run-tables parsed from PARAMETRIC ... END blocks. */
  parametricTables?: ParametricTableDto[]
  /** Plots declared in the editor text with PLOT 'name' ... END blocks. */
  definedPlots?: PlotDefDto[]
  /** Fluid state tables declared with STATE TABLE ... END blocks. */
  stateTableDefs?: StateTableDto[]
  /** ODE Tables produced by solved DYNAMIC ... END blocks. */
  odeTables?: OdeTableDto[]
}

export interface CheckResponse {
  solvable: boolean
  equations: number
  unknowns: number
  variables: string[]
  unitWarnings: string[]
  inferredUnits: Record<string, string>
  message: string
  /** 1-based editor line a syntax error points at, or null for whole-system errors. */
  errorLine?: number | null
  formattedEquations: string[]
  formattedReport?: string
  /** Function tables parsed from TABLE ... END blocks in the editor text. */
  codeTables?: FunctionTableDto[]
  /** Parametric run-tables parsed from PARAMETRIC ... END blocks. */
  parametricTables?: ParametricTableDto[]
  /** Plots declared in the editor text with PLOT 'name' ... END blocks. */
  definedPlots?: PlotDefDto[]
  /** Fluid state tables declared with STATE TABLE ... END blocks. */
  stateTableDefs?: StateTableDto[]
}

/** A fluid state table parsed from a STATE TABLE name(...) ... END block: the
 * declared state-point variables and the fluid every state in the block uses
 * (null when no FLUID = ... line was given). */
export interface StateTableDto {
  name: string
  variables: string[]
  fluid: string | null
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

/** An ODE Table produced by a solved DYNAMIC ... END block: columns are
 * [time, states…, auxiliaries…] and rows are the sampled trajectory. Shaped
 * like a parametric table so it renders in the Tables window and feeds the
 * Plots window through the same path. */
export interface OdeTableDto {
  name: string
  vars: string[]
  rows: (number | null)[][]
  events: { name: string; time: number }[]
  method: string
  stopped: boolean
  endTime: number
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

// ── Asynchronous compute client (Epic 15) ────────────────────────────────
// When VITE_ASYNC_API is set, solve/optimize/curve-fit are submitted as jobs:
// the POST returns 202 Accepted { jobId, status: "PENDING" } and the client
// polls GET /api/jobs/{jobId} until the compute node reports COMPLETED (with
// the response DTO in `result`) or FAILED (with `error`). Synchronous 4xx
// validation rejections (e.g. syntax errors) still return an error body
// immediately. When the flag is unset, the original synchronous 200 path runs.

const ASYNC_API = Boolean(import.meta.env.VITE_ASYNC_API);

interface JobState {
  jobId: string
  status: 'PENDING' | 'COMPLETED' | 'FAILED'
  error: string | null
  result: unknown
}

/** Normalized outcome of an async compute request: either the solver result
 *  DTO (COMPLETED) or an error message (FAILED / rejected / unreachable). */
type ComputeOutcome =
  | { kind: 'completed'; result: any }
  | { kind: 'failed'; error: string }

/** Extracts a human-readable error message from a non-ok response body. */
async function extractErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const data = await response.json()
    if (data && typeof data === 'object') {
      const msg = (data as Record<string, unknown>).error ?? (data as Record<string, unknown>).message
      if (typeof msg === 'string' && msg) return msg
    }
  } catch {
    try {
      const textBody = await response.text()
      if (textBody) return textBody
    } catch {}
  }
  return fallback
}

/** Polls GET /api/jobs/{jobId} until the job reaches a terminal state. */
async function pollJob(jobId: string, timeoutMs = 120_000): Promise<JobState> {
  const deadline = Date.now() + timeoutMs
  const url = `${API_BASE}/api/jobs/${encodeURIComponent(jobId)}`

  if (typeof EventSource !== 'undefined') {
    try {
      return await new Promise<JobState>((resolve, reject) => {
        const sse = new EventSource(`${url}/stream`)
        const timeout = setTimeout(() => {
          sse.close()
          reject(new Error('Job timed out waiting for completion via SSE'))
        }, timeoutMs)

        sse.onmessage = (event) => {
          try {
            const state = JSON.parse(event.data) as JobState
            if (state.status === 'COMPLETED' || state.status === 'FAILED') {
              clearTimeout(timeout)
              sse.close()
              resolve(state)
            }
          } catch (e) {
            // ignore malformed
          }
        }

        sse.onerror = () => {
          clearTimeout(timeout)
          sse.close()
          reject(new Error('SSE connection failed'))
        }
      })
    } catch (e) {
      // Fall through to polling
    }
  }

  // Fallback to polling
  while (Date.now() < deadline) {
    let response: Response
    try {
      response = await fetch(url)
    } catch (e) {
      throw new Error(`Could not reach the solver backend: ${String(e)}`)
    }
    if (response.status === 404) {
      throw new Error('Job not found')
    }
    if (!response.ok) {
      throw new Error(`Job poll failed (${response.status})`)
    }
    const state = await response.json() as JobState
    if (state.status === 'COMPLETED' || state.status === 'FAILED') {
      return state
    }
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  throw new Error('Job timed out waiting for completion')
}

/** Submits a compute request and, in async mode, polls for its result.
 *  Returns the terminal outcome (completed result DTO or failure message).
 *  @param endpoint the POST URL (e.g. "/api/solve")
 *  @param init the fetch init (method/body/headers) for the submit POST
 */
export async function runCompute(endpoint: string, init: RequestInit): Promise<ComputeOutcome> {
  let response: Response
  try {
    response = await fetch(`${API_BASE}${endpoint}`, init)
  } catch (e) {
    return { kind: 'failed', error: `Could not reach the solver backend: ${String(e)}` }
  }

  // Synchronous validation rejection (4xx): the body carries the error.
  if (!response.ok && response.status !== 202) {
    return { kind: 'failed', error: await extractErrorMessage(response, `Server error (${response.status})`) }
  }

  // Asynchronous path: 202 + jobId, then poll.
  if (response.status === 202) {
    let ticket: { jobId?: string }
    try {
      ticket = await response.json()
    } catch {
      return { kind: 'failed', error: 'Malformed job submission response' }
    }
    const jobId = ticket?.jobId
    if (!jobId) {
      return { kind: 'failed', error: 'Job submission did not return a jobId' }
    }
    try {
      const state = await pollJob(jobId)
      if (state.status === 'COMPLETED') {
        return { kind: 'completed', result: state.result }
      }
      return { kind: 'failed', error: state.error ?? 'Job failed' }
    } catch (e) {
      return { kind: 'failed', error: e instanceof Error ? e.message : String(e) }
    }
  }

  // Defensive: a 200 in async mode (e.g. a backend not yet switched over) —
  // treat the body as the completed result DTO.
  const data = await response.json().catch(() => null)
  return { kind: 'completed', result: data }
}

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
  overrides: string[] = [],
): Promise<CheckResponse> {
  try {
    const response = await fetch(`${API_BASE}/api/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, variableInfo, stopCriteria: { complexMode }, functionTables, overrides }),
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
      stateTableDefs: data.stateTableDefs ?? [],
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

/** The empty solve response returned on any failure (network, server, FAILED job). */
const SOLVE_FAILURE: Omit<SolveResponse, 'error'> = {
  success: false,
  variables: [],
  blocks: [],
  residuals: [],
  stats: null,
  solutions: [],
  unitWarnings: [],
  formattedEquations: [],
  formattedReport: undefined,
}

/** Maps a solve result DTO (from a sync 200 body or an async COMPLETED `result`)
 *  to the typed SolveResponse. */
function mapSolveData(data: any): SolveResponse {
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
    stateTableDefs: data.stateTableDefs ?? [],
    odeTables: data.odeTables ?? [],
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
  sessionId?: string,
  overrides: string[] = [],
): Promise<SolveResponse> {
  const init: RequestInit = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Tags this solve so its result is cached for the REPL/Workspace of
      // this document. Omitted-id requests fall back to a shared "default".
      ...(sessionId ? { 'X-Frees-Session': sessionId } : {}),
    },
    body: JSON.stringify({
      text,
      stopCriteria,
      variableInfo,
      findAllSolutions,
      displayUnitSystem,
      fillMissing,
      functionTables,
      // REPL overrides ("eta = 0.75") take priority over the editor's value.
      overrides,
    }),
  }

  if (ASYNC_API) {
    const outcome = await runCompute('/api/solve', init)
    if (outcome.kind === 'completed') {
      return mapSolveData(outcome.result)
    }
    return { ...SOLVE_FAILURE, error: outcome.error }
  }

  try {
    const response = await fetch(`${API_BASE}/api/solve`, init)
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
      return { ...SOLVE_FAILURE, error: errorMessage }
    }
    const data = await response.json()
    return mapSolveData(data)
  } catch (e) {
    return { ...SOLVE_FAILURE, error: `Could not reach the solver backend: ${String(e)}` }
  }
}

/** Result of evaluating one REPL line against the cached solved workspace. */
export interface ReplResponse {
  success: boolean
  /** Numeric result (SI for compound expressions, display value for a bare variable). */
  value: number | null
  /** Print-ready rendering, e.g. "600" or "300 ± 0.5 [K]". */
  text: string | null
  units: string | null
  uncertainty: number | null
  error: string | null
  /** Set (display spelling) when the line defined a variable, so the UI can reflect it. */
  name: string | null
  assignedVariables?: VariableResult[]
}

/** Evaluates a single REPL expression against the session's last solve. */
export async function replEvaluate(
  sessionId: string,
  expression: string,
  unitSystem?: UnitSystem,
): Promise<ReplResponse> {
  try {
    const response = await fetch(`${API_BASE}/api/repl/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, expression, unitSystem: unitSystem ?? null }),
    })
    if (!response.ok) {
      return { success: false, value: null, text: null, units: null, uncertainty: null, error: `Server error (${response.status})`, name: null }
    }
    const data = await response.json()
    return {
      success: data.success ?? false,
      value: data.value ?? null,
      text: data.text ?? null,
      units: data.unit ?? null,
      uncertainty: data.uncertainty ?? null,
      error: data.error ?? null,
      name: data.name ?? null,
      assignedVariables: data.assignedVariables ?? null,
    }
  } catch (e) {
    return { success: false, value: null, text: null, units: null, uncertainty: null, error: `Could not reach the solver backend: ${String(e)}`, name: null }
  }
}

/** Clears all (or a specific) REPL-defined/overridden variables for the session. */
export async function replClear(sessionId: string, variableName?: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/repl/clear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, expression: variableName ?? '' }),
    })
  } catch {
    /* best-effort */
  }
}

/** Variable names currently in the workspace, for REPL tab-completion. */
export async function replVariables(sessionId: string): Promise<string[]> {
  try {
    const response = await fetch(`${API_BASE}/api/repl/variables?sessionId=${encodeURIComponent(sessionId)}`)
    if (!response.ok) return []
    const data = await response.json()
    return Array.isArray(data) ? data : []
  } catch {
    return []
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

/** The empty optimize response returned on any failure. */
const OPTIMIZE_FAILURE: Omit<OptimizeResponse, 'error'> = {
  success: false,
  warning: null,
  objective: null,
  decision: null,
  decisions: [],
  evaluations: 0,
  variables: [],
}

/** Maps an optimize result DTO to the typed OptimizeResponse. */
function mapOptimizeData(data: any): OptimizeResponse {
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
}

export async function optimize(
  text: string,
  stopCriteria: StopCriteria,
  variableInfo: VariableInfo[],
  displayUnitSystem: UnitSystem,
  params: OptimizeParams,
): Promise<OptimizeResponse> {
  const init: RequestInit = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      stopCriteria,
      variableInfo,
      displayUnitSystem,
      ...params,
    }),
  }

  if (ASYNC_API) {
    const outcome = await runCompute('/api/optimize', init)
    if (outcome.kind === 'completed') {
      return mapOptimizeData(outcome.result)
    }
    return { ...OPTIMIZE_FAILURE, error: outcome.error }
  }

  try {
    const response = await fetch(`${API_BASE}/api/optimize`, init)
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
      return { ...OPTIMIZE_FAILURE, error: errorMessage }
    }
    const data = await response.json()
    return mapOptimizeData(data)
  } catch (e) {
    return { ...OPTIMIZE_FAILURE, error: `Could not reach the solver backend: ${String(e)}` }
  }
}

export interface MultiObjectiveParams {
  objectives: string[]
  maximize: boolean[]
  decisions: string[]
  lowers: number[]
  uppers: number[]
  populationSize?: number
  generations?: number
  constraints?: string[]
}

export interface ParetoPoint {
  decisions: number[]
  objectives: number[]
}

export interface ParetoResponse {
  success: boolean
  error: string | null
  decisionNames: string[]
  objectiveNames: string[]
  front: ParetoPoint[]
  evaluations: number
}

/** The empty Pareto response returned on any failure. */
const PARETO_FAILURE: Omit<ParetoResponse, 'error'> = {
  success: false,
  decisionNames: [],
  objectiveNames: [],
  front: [],
  evaluations: 0,
}

/** Maps a multi-objective result DTO to the typed ParetoResponse. */
function mapParetoData(data: any): ParetoResponse {
  return {
    success: data.success ?? false,
    error: data.error ?? null,
    decisionNames: data.decisionNames ?? [],
    objectiveNames: data.objectiveNames ?? [],
    front: data.front ?? [],
    evaluations: data.evaluations ?? 0,
  }
}

export async function optimizeMulti(
  text: string,
  stopCriteria: StopCriteria,
  variableInfo: VariableInfo[],
  params: MultiObjectiveParams,
): Promise<ParetoResponse> {
  const init: RequestInit = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, stopCriteria, variableInfo, ...params }),
  }

  if (ASYNC_API) {
    const outcome = await runCompute('/api/optimize/multi', init)
    if (outcome.kind === 'completed') {
      return mapParetoData(outcome.result)
    }
    return { ...PARETO_FAILURE, error: outcome.error }
  }

  const empty = (error: string): ParetoResponse => ({ ...PARETO_FAILURE, error })
  try {
    const response = await fetch(`${API_BASE}/api/optimize/multi`, init)
    if (!response.ok) {
      let message = `Server error (${response.status})`
      try {
        const errJson = await response.json()
        if (errJson && typeof errJson === 'object') {
          message = errJson.error || errJson.message || message
        }
      } catch {}
      return empty(message)
    }
    const data = await response.json()
    return mapParetoData(data)
  } catch (e) {
    return empty(`Could not reach the solver backend: ${String(e)}`)
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

/** Maps a curve-fit result DTO to the typed CurveFitResponse. */
function mapCurveFitData(data: any): CurveFitResponse {
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
}

export async function curveFit(params: CurveFitParams): Promise<CurveFitResponse> {
  const init: RequestInit = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  }

  if (ASYNC_API) {
    const outcome = await runCompute('/api/curve-fit', init)
    if (outcome.kind === 'completed') {
      return mapCurveFitData(outcome.result)
    }
    return { ...CURVE_FIT_FAILURE, error: outcome.error }
  }

  try {
    const response = await fetch(`${API_BASE}/api/curve-fit`, init)
    const data = await response.json().catch(() => null)
    if (!response.ok) {
      return {
        ...CURVE_FIT_FAILURE,
        error: data?.error || data?.message || `Server error (${response.status})`,
      }
    }
    return mapCurveFitData(data)
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

export interface UnitInfo {
  symbol: string
  dimension: string
  siFactor: number
}

export interface ConstantInfo {
  name: string
  value: number
  unit: string
  description: string
}

export interface LanguageReference {
  units: UnitInfo[]
  constants: ConstantInfo[]
}

/** Supported units and built-in constants, sourced live from the backend. */
export async function getReference(): Promise<LanguageReference> {
  const response = await fetch(`${API_BASE}/api/reference`)
  if (!response.ok) return { units: [], constants: [] }
  return (await response.json()) as LanguageReference
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

/** Maps a solve-table result DTO to the typed SolveTableResponse. */
function mapSolveTableData(data: any): SolveTableResponse {
  return {
    results: data?.results ?? [],
    stats: data?.stats ?? null,
  }
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
  const init: RequestInit = {
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
  }

  if (ASYNC_API) {
    const outcome = await runCompute('/api/solve/table', init)
    if (outcome.kind === 'completed') {
      return mapSolveTableData(outcome.result)
    }
    throw new Error(outcome.error)
  }

  try {
    const response = await fetch(`${API_BASE}/api/solve/table`, init)
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
    return mapSolveTableData(data)
  } catch (e) {
    throw e instanceof Error ? e : new Error(String(e))
  }
}
