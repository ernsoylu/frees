// web/src/tablesGrid/tableOperations.ts
//
// Pure table data wrangling and transformation operations for Phase 2.1:
//   1. Row Filtering        — predicate expressions, operator conditions, policy controls
//   2. Column Transform     — derived column calculations, math expressions, unit tracking
//   3. Grouped Summaries    — group-by with aggregations (mean, std, median, min, max, sum, count)
//   4. Rolling Statistics   — moving window statistics (mean, std, median)
//   5. Joins & Alignment    — exact match joins and temporal interpolation across time grids
//
// All operations are purely functional (data in -> data out), preserve unit metadata
// and data provenance, and produce valid ParamTableSpec entities for direct pipeline feeding.

import {
  FunctionTableSpec,
  ParamRow,
  ParamTableSpec,
  TableOperationProvenance,
  TableSpec,
  newParamRow,
  newTableId,
  uniqueTableName,
} from '../tables'

/** Converts a FunctionTableSpec to a ParamTableSpec representation for wrangling. */
export function functionTableToParamTable(spec: FunctionTableSpec): ParamTableSpec {
  const argName = spec.argName || 'x'
  const otherVars = spec.is1D
    ? ['y']
    : spec.columns.map((c, idx) => (spec.paramName ? `${spec.paramName}_${c || idx + 1}` : `y_${idx + 1}`))
  const vars = [argName, ...otherVars]
  const rows: ParamRow[] = spec.rows.map((r) => {
    const values: Record<string, string> = { [argName]: r.x }
    otherVars.forEach((v, idx) => {
      values[v] = r.ys[idx] ?? ''
    })
    return { id: crypto.randomUUID(), values }
  })
  const columnUnits: Record<string, string> = {}
  if (spec.argUnit) columnUnits[argName] = spec.argUnit
  if (spec.outputUnit) {
    otherVars.forEach((v) => {
      columnUnits[v] = spec.outputUnit!
    })
  }
  return {
    id: spec.id,
    name: spec.name,
    kind: 'parametric',
    source: spec.source,
    vars,
    rows,
    results: [],
    stats: null,
    checkResult: null,
    checkMessage: '',
    columnUnits,
  }
}

// ---------------------------------------------------------------------------
// Value Resolution & Number Helpers
// ---------------------------------------------------------------------------

/** Resolves cell number from a ParamTableSpec row. */
export function getRowNumericValue(
  table: ParamTableSpec,
  rowIndex: number,
  varName: string,
): number | null {
  const row = table.rows[rowIndex]
  if (!row) return null
  const draft = (row.values[varName] ?? '').trim()
  if (draft !== '') {
    const n = Number(draft)
    if (Number.isFinite(n)) return n
  }
  const res = table.results[rowIndex]
  if (res?.success) {
    const val = res.values[varName]
    if (typeof val === 'number' && Number.isFinite(val)) return val
  }
  return null
}

/** Formats a numeric value consistently for table cells. */
export function formatCellValue(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return ''
  const abs = Math.abs(v)
  if (abs !== 0 && (abs < 1e-4 || abs >= 1e6)) {
    return v.toExponential(6)
  }
  // Trim trailing decimal zeroes
  const fixed = v.toPrecision(7)
  const num = Number(fixed)
  return String(num)
}

// ---------------------------------------------------------------------------
// Safe Expression Evaluation
// ---------------------------------------------------------------------------

const MATH_FUNCS: Record<string, (...args: number[]) => number> = {
  abs: Math.abs,
  sqrt: Math.sqrt,
  cbrt: Math.cbrt,
  exp: Math.exp,
  log: Math.log,
  log10: Math.log10,
  log2: Math.log2,
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  sinh: Math.sinh,
  cosh: Math.cosh,
  tanh: Math.tanh,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
  sign: Math.sign,
  min: Math.min,
  max: Math.max,
  pow: Math.pow,
}

const MATH_CONSTANTS: Record<string, number> = {
  pi: Math.PI,
  e: Math.E,
}

function tokenizeExpr(expr: string): string[] {
  const tokens: string[] = []
  let i = 0
  const n = expr.length

  while (i < n) {
    const ch = expr[i]
    if (/\s/.test(ch)) {
      i++
      continue
    }

    // Two-character operators
    const two = expr.slice(i, i + 2)
    if (two === '==' || two === '!=' || two === '<=' || two === '>=' || two === '&&' || two === '||') {
      tokens.push(two)
      i += 2
      continue
    }

    // Single-character operators and parens
    if ('+-*/%^!<>()[],'.includes(ch)) {
      tokens.push(ch)
      i++
      continue
    }

    // Numbers
    if (/[0-9]/.test(ch) || (ch === '.' && i + 1 < n && /[0-9]/.test(expr[i + 1]))) {
      let numStr = ''
      while (i < n && /[0-9.eE+-]/.test(expr[i])) {
        // Handle exponential sign: only allow + or - if preceded by e or E
        if ((expr[i] === '+' || expr[i] === '-') && !/[eE]/.test(expr[i - 1])) {
          break
        }
        numStr += expr[i++]
      }
      tokens.push(numStr)
      continue
    }

    // Identifiers
    if (/[a-zA-Z_]/.test(ch)) {
      let ident = ''
      while (i < n && /[a-zA-Z0-9_]/.test(expr[i])) {
        ident += expr[i++]
      }
      tokens.push(ident)
      continue
    }

    i++
  }

  return tokens
}

/** Tokenizer and recursive descent parser for basic math expressions. */
export function evaluateRowExpression(
  expr: string,
  vars: Record<string, number | null>,
): number | null {
  const tokens = tokenizeExpr(expr)
  if (tokens.length === 0) return null

  let pos = 0
  function peek(): string | null {
    return pos < tokens.length ? tokens[pos] : null
  }
  function consume(): string {
    return tokens[pos++]
  }

  // logical or: a || b
  function parseLogicalOr(): number | null {
    let left = parseLogicalAnd()
    while (peek() === '||') {
      consume()
      const right = parseLogicalAnd()
      if (left === null || right === null) return null
      left = left !== 0 || right !== 0 ? 1 : 0
    }
    return left
  }

  // logical and: a && b
  function parseLogicalAnd(): number | null {
    let left = parseComparison()
    while (peek() === '&&') {
      consume()
      const right = parseComparison()
      if (left === null || right === null) return null
      left = left !== 0 && right !== 0 ? 1 : 0
    }
    return left
  }

  // comparison: a < b, a <= b, a > b, a >= b, a == b, a != b
  function parseComparison(): number | null {
    const left = parseAddSub()
    const op = peek()
    if (op === '==' || op === '!=' || op === '<' || op === '<=' || op === '>' || op === '>=') {
      consume()
      const right = parseAddSub()
      if (left === null || right === null) return null
      switch (op) {
        case '==':
          return Math.abs(left - right) < 1e-12 ? 1 : 0
        case '!=':
          return Math.abs(left - right) >= 1e-12 ? 1 : 0
        case '<':
          return left < right ? 1 : 0
        case '<=':
          return left <= right ? 1 : 0
        case '>':
          return left > right ? 1 : 0
        case '>=':
          return left >= right ? 1 : 0
      }
    }
    return left
  }

  // addition and subtraction: a + b, a - b
  function parseAddSub(): number | null {
    let left = parseMulDiv()
    while (peek() === '+' || peek() === '-') {
      const op = consume()
      const right = parseMulDiv()
      if (left === null || right === null) return null
      left = op === '+' ? left + right : left - right
    }
    return left
  }

  // multiplication, division, modulo: a * b, a / b, a % b
  function parseMulDiv(): number | null {
    let left = parsePower()
    while (peek() === '*' || peek() === '/' || peek() === '%') {
      const op = consume()
      const right = parsePower()
      if (left === null || right === null) return null
      if (op === '*') left *= right
      else if (op === '/') {
        if (right === 0) return null
        left /= right
      } else if (op === '%') {
        if (right === 0) return null
        left %= right
      }
    }
    return left
  }

  // power: a ^ b
  function parsePower(): number | null {
    let left = parseUnary()
    while (peek() === '^') {
      consume()
      const right = parseUnary()
      if (left === null || right === null) return null
      left = Math.pow(left, right)
    }
    return left
  }

  // unary: -x, +x, !x
  function parseUnary(): number | null {
    if (peek() === '-') {
      consume()
      const val = parseUnary()
      return val === null ? null : -val
    }
    if (peek() === '+') {
      consume()
      return parseUnary()
    }
    if (peek() === '!') {
      consume()
      const val = parseUnary()
      return val === null ? null : val === 0 ? 1 : 0
    }
    return parsePrimary()
  }

  // primary: number, identifier, function call, (expression)
  function parsePrimary(): number | null {
    const token = peek()
    if (!token) return null

    if (token === '(') {
      consume()
      const val = parseLogicalOr()
      if (peek() === ')') consume()
      return val
    }

    // Number literal
    if (/^[0-9]+(\.[0-9]+)?([eE][+-]?[0-9]+)?$/.test(token)) {
      consume()
      return Number(token)
    }

    // Identifier or function call
    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(token)) {
      const ident = consume()
      const lower = ident.toLowerCase()

      // Function call: func(arg1, arg2)
      if (peek() === '(') {
        consume()
        const args: number[] = []
        if (peek() !== ')') {
          while (true) {
            const arg = parseLogicalOr()
            if (arg === null) return null
            args.push(arg)
            if (peek() === ',') {
              consume()
            } else {
              break
            }
          }
        }
        if (peek() === ')') consume()

        const fn = MATH_FUNCS[lower]
        if (fn) {
          const res = fn(...args)
          return Number.isFinite(res) ? res : null
        }
        return null
      }

      // Named constant
      if (lower in MATH_CONSTANTS) {
        return MATH_CONSTANTS[lower]
      }

      // Variable lookup (case-insensitive)
      for (const [k, v] of Object.entries(vars)) {
        if (k.toLowerCase() === lower) {
          return v !== null && Number.isFinite(v) ? v : null
        }
      }

      return null
    }

    return null
  }

  try {
    const res = parseLogicalOr()
    return res !== null && Number.isFinite(res) ? res : null
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// 1. Row Filtering
// ---------------------------------------------------------------------------

export type FilterOperator =
  | '>'
  | '<'
  | '>='
  | '<='
  | '=='
  | '!='
  | 'between'
  | 'is_finite'
  | 'is_nan'

export interface FilterCondition {
  column?: string
  operator: FilterOperator
  value?: number
  value2?: number
  customExpression?: string
}

export interface FilterConfig {
  condition: FilterCondition
  name?: string
  missingPolicy?: 'drop' | 'keep'
}

export function filterTableRows(
  table: ParamTableSpec,
  config: FilterConfig,
  existingTables: TableSpec[] = [],
): { table: ParamTableSpec; provenance: TableOperationProvenance } {
  const missingPolicy = config.missingPolicy ?? 'drop'
  const rows: ParamRow[] = []
  let rejectedCount = 0

  for (let r = 0; r < table.rows.length; r++) {
    const row = table.rows[r]
    let matches = false

    if (config.condition.customExpression) {
      const vars: Record<string, number | null> = {}
      for (const v of table.vars) {
        vars[v] = getRowNumericValue(table, r, v)
      }
      const evalResult = evaluateRowExpression(config.condition.customExpression, vars)
      matches = evalResult !== null && evalResult !== 0
    } else if (config.condition.column) {
      const col = config.condition.column
      const val = getRowNumericValue(table, r, col)
      const isMissing = val === null || !Number.isFinite(val)

      if (isMissing) {
        matches = config.condition.operator === 'is_nan' || missingPolicy === 'keep'
      } else {
        const targetVal = config.condition.value ?? 0
        switch (config.condition.operator) {
          case '>':
            matches = val > targetVal
            break
          case '<':
            matches = val < targetVal
            break
          case '>=':
            matches = val >= targetVal
            break
          case '<=':
            matches = val <= targetVal
            break
          case '==':
            matches = Math.abs(val - targetVal) < 1e-9
            break
          case '!=':
            matches = Math.abs(val - targetVal) >= 1e-9
            break
          case 'between': {
            const vMin = Math.min(targetVal, config.condition.value2 ?? targetVal)
            const vMax = Math.max(targetVal, config.condition.value2 ?? targetVal)
            matches = val >= vMin && val <= vMax
            break
          }
          case 'is_finite':
            matches = true
            break
          case 'is_nan':
            matches = false
            break
        }
      }
    }

    if (matches) {
      rows.push({
        id: newParamRow().id,
        values: { ...row.values },
      })
    } else {
      rejectedCount++
    }
  }

  const baseName = config.name?.trim() || `${table.name}_filtered`
  const name = uniqueTableName(baseName, existingTables)

  const provenance: TableOperationProvenance = {
    operation: 'filter',
    sourceTableIds: [table.id],
    sourceTableNames: [table.name],
    timestamp: Date.now(),
    description: config.condition.customExpression
      ? `Filtered by expression: ${config.condition.customExpression}`
      : `Filtered by ${config.condition.column} ${config.condition.operator} ${config.condition.value ?? ''}`,
    sourceRowCount: table.rows.length,
    resultRowCount: rows.length,
    rejectedRowCount: rejectedCount,
    details: { condition: config.condition, missingPolicy },
  }

  const newTable: ParamTableSpec = {
    id: newTableId(),
    kind: 'parametric',
    name,
    vars: [...table.vars],
    rows,
    results: [],
    stats: null,
    checkResult: null,
    checkMessage: '',
    source: 'gui',
    columnUnits: table.columnUnits ? { ...table.columnUnits } : undefined,
    provenance,
  }

  return { table: newTable, provenance }
}

// ---------------------------------------------------------------------------
// 2. Column Mathematical Transforms
// ---------------------------------------------------------------------------

export interface TransformConfig {
  targetColumn: string
  expression: string
  unit?: string
  name?: string
}

export function transformTableColumn(
  table: ParamTableSpec,
  config: TransformConfig,
  existingTables: TableSpec[] = [],
): { table: ParamTableSpec; provenance: TableOperationProvenance } {
  const targetCol = config.targetColumn.trim()
  if (!targetCol) throw new Error('Target column name cannot be empty.')

  const vars = table.vars.includes(targetCol) ? [...table.vars] : [...table.vars, targetCol]
  const rows: ParamRow[] = []
  let evaluatedCount = 0
  let nanCount = 0

  for (let r = 0; r < table.rows.length; r++) {
    const row = table.rows[r]
    const rowVars: Record<string, number | null> = {}
    for (const v of table.vars) {
      rowVars[v] = getRowNumericValue(table, r, v)
    }

    const calculated = evaluateRowExpression(config.expression, rowVars)
    const newValues = { ...row.values }
    if (calculated !== null && Number.isFinite(calculated)) {
      newValues[targetCol] = formatCellValue(calculated)
      evaluatedCount++
    } else {
      newValues[targetCol] = ''
      nanCount++
    }

    rows.push({
      id: newParamRow().id,
      values: newValues,
    })
  }

  const baseName = config.name?.trim() || `${table.name}_transformed`
  const name = uniqueTableName(baseName, existingTables)

  const columnUnits = table.columnUnits ? { ...table.columnUnits } : {}
  if (config.unit?.trim()) {
    columnUnits[targetCol] = config.unit.trim()
  }

  const provenance: TableOperationProvenance = {
    operation: 'transform',
    sourceTableIds: [table.id],
    sourceTableNames: [table.name],
    timestamp: Date.now(),
    description: `Computed column ${targetCol} = ${config.expression}`,
    sourceRowCount: table.rows.length,
    resultRowCount: rows.length,
    rejectedRowCount: nanCount,
    details: { targetColumn: targetCol, expression: config.expression, unit: config.unit, evaluatedCount },
  }

  const newTable: ParamTableSpec = {
    id: newTableId(),
    kind: 'parametric',
    name,
    vars,
    rows,
    results: [],
    stats: null,
    checkResult: null,
    checkMessage: '',
    source: 'gui',
    columnUnits: Object.keys(columnUnits).length > 0 ? columnUnits : undefined,
    provenance,
  }

  return { table: newTable, provenance }
}

// ---------------------------------------------------------------------------
// 3. Grouped Summaries (Group-By with Aggregation)
// ---------------------------------------------------------------------------

export type AggregationOp = 'mean' | 'std' | 'median' | 'min' | 'max' | 'sum' | 'count'

export interface AggregationDef {
  column: string
  op: AggregationOp
  outputName?: string
}

export interface GroupByConfig {
  groupColumns: string[]
  aggregations: AggregationDef[]
  name?: string
}

function computeMedian(arr: number[]): number {
  if (arr.length === 0) return NaN
  const s = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid]
}

function computeStdDev(arr: number[], mean: number): number {
  if (arr.length <= 1) return 0
  const sumSq = arr.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0)
  return Math.sqrt(sumSq / (arr.length - 1))
}

export function groupTableSummary(
  table: ParamTableSpec,
  config: GroupByConfig,
  existingTables: TableSpec[] = [],
): { table: ParamTableSpec; provenance: TableOperationProvenance } {
  if (config.groupColumns.length === 0) {
    throw new Error('At least one group-by column must be specified.')
  }
  if (config.aggregations.length === 0) {
    throw new Error('At least one aggregation must be specified.')
  }

  // Partition rows into groups
  const groups = new Map<string, { groupValues: Record<string, string>; rowIndices: number[] }>()

  for (let r = 0; r < table.rows.length; r++) {
    const row = table.rows[r]
    const keyParts = config.groupColumns.map((col) => (row.values[col] ?? '').trim())
    const groupKey = keyParts.join('__::__')

    if (!groups.has(groupKey)) {
      const groupValues: Record<string, string> = {}
      config.groupColumns.forEach((col, idx) => {
        groupValues[col] = keyParts[idx]
      })
      groups.set(groupKey, { groupValues, rowIndices: [] })
    }
    groups.get(groupKey)!.rowIndices.push(r)
  }

  // Determine output columns
  const outVars = [...config.groupColumns]
  const aggOutputNames: { def: AggregationDef; outName: string }[] = []

  for (const agg of config.aggregations) {
    const outName = agg.outputName?.trim() || `${agg.column}_${agg.op}`
    if (!outVars.includes(outName)) {
      outVars.push(outName)
    }
    aggOutputNames.push({ def: agg, outName })
  }

  const outRows: ParamRow[] = []

  for (const [, grp] of groups) {
    const rowValues: Record<string, string> = { ...grp.groupValues }

    for (const { def, outName } of aggOutputNames) {
      const vals: number[] = []
      for (const rIdx of grp.rowIndices) {
        const v = getRowNumericValue(table, rIdx, def.column)
        if (v !== null && Number.isFinite(v)) vals.push(v)
      }

      let res = NaN
      if (def.op === 'count') {
        res = vals.length
      } else if (vals.length > 0) {
        switch (def.op) {
          case 'sum':
            res = vals.reduce((a, b) => a + b, 0)
            break
          case 'mean':
            res = vals.reduce((a, b) => a + b, 0) / vals.length
            break
          case 'min':
            res = Math.min(...vals)
            break
          case 'max':
            res = Math.max(...vals)
            break
          case 'median':
            res = computeMedian(vals)
            break
          case 'std': {
            const m = vals.reduce((a, b) => a + b, 0) / vals.length
            res = computeStdDev(vals, m)
            break
          }
        }
      }

      rowValues[outName] = Number.isFinite(res) ? formatCellValue(res) : ''
    }

    outRows.push({
      id: newParamRow().id,
      values: rowValues,
    })
  }

  const baseName = config.name?.trim() || `${table.name}_summary`
  const name = uniqueTableName(baseName, existingTables)

  const columnUnits: Record<string, string> = {}
  for (const col of config.groupColumns) {
    if (table.columnUnits?.[col]) columnUnits[col] = table.columnUnits[col]
  }
  for (const { def, outName } of aggOutputNames) {
    if (def.op !== 'count' && table.columnUnits?.[def.column]) {
      columnUnits[outName] = table.columnUnits[def.column]
    }
  }

  const provenance: TableOperationProvenance = {
    operation: 'groupby',
    sourceTableIds: [table.id],
    sourceTableNames: [table.name],
    timestamp: Date.now(),
    description: `Grouped by [${config.groupColumns.join(', ')}] with ${config.aggregations.length} aggregations`,
    sourceRowCount: table.rows.length,
    resultRowCount: outRows.length,
    details: { groupColumns: config.groupColumns, aggregations: config.aggregations },
  }

  const newTable: ParamTableSpec = {
    id: newTableId(),
    kind: 'parametric',
    name,
    vars: outVars,
    rows: outRows,
    results: [],
    stats: null,
    checkResult: null,
    checkMessage: '',
    source: 'gui',
    columnUnits: Object.keys(columnUnits).length > 0 ? columnUnits : undefined,
    provenance,
  }

  return { table: newTable, provenance }
}

// ---------------------------------------------------------------------------
// 4. Rolling Statistics
// ---------------------------------------------------------------------------

export interface RollingConfig {
  column: string
  windowSize: number
  operations: ('mean' | 'std' | 'median')[]
  name?: string
}

export function rollingTableStatistics(
  table: ParamTableSpec,
  config: RollingConfig,
  existingTables: TableSpec[] = [],
): { table: ParamTableSpec; provenance: TableOperationProvenance } {
  const col = config.column
  const k = Math.max(1, Math.floor(config.windowSize))
  if (config.operations.length === 0) {
    throw new Error('At least one rolling statistic must be selected.')
  }

  const colNames: { op: 'mean' | 'std' | 'median'; name: string }[] = config.operations.map(
    (op) => ({
      op,
      name: `${col}_roll_${op}_${k}`,
    }),
  )

  const vars = [...table.vars]
  for (const { name } of colNames) {
    if (!vars.includes(name)) vars.push(name)
  }

  // Pre-extract numeric column values
  const rawValues: (number | null)[] = []
  for (let r = 0; r < table.rows.length; r++) {
    rawValues.push(getRowNumericValue(table, r, col))
  }

  const rows: ParamRow[] = []

  for (let r = 0; r < table.rows.length; r++) {
    const row = table.rows[r]
    const newValues: Record<string, string> = { ...row.values }

    // Trailing window [max(0, r - k + 1) .. r]
    const winStart = Math.max(0, r - k + 1)
    const windowVals: number[] = []
    for (let w = winStart; w <= r; w++) {
      const v = rawValues[w]
      if (v !== null && Number.isFinite(v)) windowVals.push(v)
    }

    for (const { op, name: outName } of colNames) {
      if (windowVals.length === 0) {
        newValues[outName] = ''
      } else {
        let res = NaN
        if (op === 'mean') {
          res = windowVals.reduce((a, b) => a + b, 0) / windowVals.length
        } else if (op === 'median') {
          res = computeMedian(windowVals)
        } else if (op === 'std') {
          const m = windowVals.reduce((a, b) => a + b, 0) / windowVals.length
          res = computeStdDev(windowVals, m)
        }
        newValues[outName] = Number.isFinite(res) ? formatCellValue(res) : ''
      }
    }

    rows.push({
      id: newParamRow().id,
      values: newValues,
    })
  }

  const baseName = config.name?.trim() || `${table.name}_rolling`
  const name = uniqueTableName(baseName, existingTables)

  const columnUnits = table.columnUnits ? { ...table.columnUnits } : {}
  if (table.columnUnits?.[col]) {
    for (const { name: outName } of colNames) {
      columnUnits[outName] = table.columnUnits[col]
    }
  }

  const provenance: TableOperationProvenance = {
    operation: 'rolling',
    sourceTableIds: [table.id],
    sourceTableNames: [table.name],
    timestamp: Date.now(),
    description: `Rolling statistics on ${col} (window = ${k})`,
    sourceRowCount: table.rows.length,
    resultRowCount: rows.length,
    details: { column: col, windowSize: k, operations: config.operations },
  }

  const newTable: ParamTableSpec = {
    id: newTableId(),
    kind: 'parametric',
    name,
    vars,
    rows,
    results: [],
    stats: null,
    checkResult: null,
    checkMessage: '',
    source: 'gui',
    columnUnits: Object.keys(columnUnits).length > 0 ? columnUnits : undefined,
    provenance,
  }

  return { table: newTable, provenance }
}

// ---------------------------------------------------------------------------
// 5. Table Joins & Temporal Alignment
// ---------------------------------------------------------------------------

export interface JoinConfig {
  type: 'inner' | 'left' | 'outer'
  keyA: string
  keyB: string
  mode: 'exact' | 'interpolate'
  extrapolationPolicy?: 'clamp' | 'nan' | 'none'
  name?: string
}

/** Linear interpolation helper on ordered knots (xs, ys). */
function interpolateLinear(
  targetX: number,
  xs: number[],
  ys: number[],
  extrapolate: 'clamp' | 'nan' | 'none',
): number | null {
  const n = xs.length
  if (n === 0) return null
  if (n === 1) return ys[0]

  if (targetX < xs[0]) {
    return extrapolate === 'clamp' ? ys[0] : null
  }
  if (targetX > xs[n - 1]) {
    return extrapolate === 'clamp' ? ys[n - 1] : null
  }

  // Binary search for bracket
  let low = 0
  let high = n - 1
  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    if (xs[mid] <= targetX) {
      low = mid + 1
    } else {
      high = mid - 1
    }
  }

  const i0 = Math.max(0, high)
  const i1 = Math.min(n - 1, i0 + 1)
  if (i0 === i1 || xs[i1] === xs[i0]) return ys[i0]

  const fraction = (targetX - xs[i0]) / (xs[i1] - xs[i0])
  return ys[i0] + fraction * (ys[i1] - ys[i0])
}

export function joinTables(
  tableA: ParamTableSpec,
  tableB: ParamTableSpec,
  config: JoinConfig,
  existingTables: TableSpec[] = [],
): { table: ParamTableSpec; provenance: TableOperationProvenance } {
  const keyA = config.keyA
  const keyB = config.keyB
  const mode = config.mode ?? 'exact'
  const extrapPolicy = config.extrapolationPolicy ?? 'nan'

  // Determine output variable names avoiding clashes (suffix _A, _B for non-key duplicates)
  const varsBWithoutKey = tableB.vars.filter((v) => v !== keyB)

  const finalVars: string[] = [...tableA.vars]
  const colMappingB: Record<string, string> = {}

  for (const vb of varsBWithoutKey) {
    if (tableA.vars.includes(vb)) {
      const renamed = `${vb}_B`
      colMappingB[vb] = renamed
      finalVars.push(renamed)
    } else {
      colMappingB[vb] = vb
      finalVars.push(vb)
    }
  }

  const outRows: ParamRow[] = []
  let duplicateCount = 0
  let extrapolatedCount = 0

  if (mode === 'exact') {
    // Exact match join on discrete keys
    const mapB = new Map<string, Record<string, string>[]>()
    for (let r = 0; r < tableB.rows.length; r++) {
      const rowB = tableB.rows[r]
      const k = (rowB.values[keyB] ?? '').trim()
      if (!mapB.has(k)) mapB.set(k, [])
      mapB.get(k)!.push(rowB.values)
    }

    const matchedKeysB = new Set<string>()

    for (let r = 0; r < tableA.rows.length; r++) {
      const rowA = tableA.rows[r]
      const k = (rowA.values[keyA] ?? '').trim()
      const bRows = mapB.get(k)

      if (bRows && bRows.length > 0) {
        matchedKeysB.add(k)
        if (bRows.length > 1) duplicateCount += bRows.length - 1
        for (const bVals of bRows) {
          const combined: Record<string, string> = { ...rowA.values }
          for (const [origB, mappedB] of Object.entries(colMappingB)) {
            combined[mappedB] = bVals[origB] ?? ''
          }
          outRows.push({ id: newParamRow().id, values: combined })
        }
      } else if (config.type === 'left' || config.type === 'outer') {
        const combined: Record<string, string> = { ...rowA.values }
        for (const mappedB of Object.values(colMappingB)) {
          combined[mappedB] = ''
        }
        outRows.push({ id: newParamRow().id, values: combined })
      }
    }

    if (config.type === 'outer') {
      for (let r = 0; r < tableB.rows.length; r++) {
        const rowB = tableB.rows[r]
        const k = (rowB.values[keyB] ?? '').trim()
        if (!matchedKeysB.has(k)) {
          const combined: Record<string, string> = {}
          for (const va of tableA.vars) {
            combined[va] = va === keyA ? k : ''
          }
          for (const [origB, mappedB] of Object.entries(colMappingB)) {
            combined[mappedB] = rowB.values[origB] ?? ''
          }
          outRows.push({ id: newParamRow().id, values: combined })
        }
      }
    }
  } else {
    // Continuous temporal alignment / linear interpolation of Table B onto Table A's grid
    const bKnots: { t: number; vals: Record<string, number> }[] = []
    for (let r = 0; r < tableB.rows.length; r++) {
      const t = getRowNumericValue(tableB, r, keyB)
      if (t !== null && Number.isFinite(t)) {
        const vals: Record<string, number> = {}
        for (const vb of varsBWithoutKey) {
          const num = getRowNumericValue(tableB, r, vb)
          if (num !== null && Number.isFinite(num)) vals[vb] = num
        }
        bKnots.push({ t, vals })
      }
    }

    bKnots.sort((a, b) => a.t - b.t)
    const xs = bKnots.map((k) => k.t)

    // Pre-extract each column in B
    const bColsData: Record<string, { x: number[]; y: number[] }> = {}
    for (const vb of varsBWithoutKey) {
      const xSeries: number[] = []
      const ySeries: number[] = []
      for (const knot of bKnots) {
        if (vb in knot.vals) {
          xSeries.push(knot.t)
          ySeries.push(knot.vals[vb])
        }
      }
      bColsData[vb] = { x: xSeries, y: ySeries }
    }

    for (let r = 0; r < tableA.rows.length; r++) {
      const rowA = tableA.rows[r]
      const targetT = getRowNumericValue(tableA, r, keyA)

      const combined: Record<string, string> = { ...rowA.values }
      let hasAnyInterpolated = false

      if (targetT !== null && Number.isFinite(targetT) && xs.length > 0) {
        if (targetT < xs[0] || targetT > xs[xs.length - 1]) {
          extrapolatedCount++
        }

        for (const [origB, mappedB] of Object.entries(colMappingB)) {
          const series = bColsData[origB]
          const interp = series
            ? interpolateLinear(targetT, series.x, series.y, extrapPolicy)
            : null
          if (interp !== null && Number.isFinite(interp)) {
            combined[mappedB] = formatCellValue(interp)
            hasAnyInterpolated = true
          } else {
            combined[mappedB] = ''
          }
        }
      } else {
        for (const mappedB of Object.values(colMappingB)) {
          combined[mappedB] = ''
        }
      }

      if (config.type === 'inner' && !hasAnyInterpolated) {
        continue
      }
      outRows.push({ id: newParamRow().id, values: combined })
    }
  }

  const baseName = config.name?.trim() || `${tableA.name}_joined_${tableB.name}`
  const name = uniqueTableName(baseName, existingTables)

  // Preserve column units
  const columnUnits: Record<string, string> = {}
  if (tableA.columnUnits) {
    Object.assign(columnUnits, tableA.columnUnits)
  }
  if (tableB.columnUnits) {
    for (const [origB, mappedB] of Object.entries(colMappingB)) {
      if (tableB.columnUnits[origB]) {
        columnUnits[mappedB] = tableB.columnUnits[origB]
      }
    }
  }

  const provenance: TableOperationProvenance = {
    operation: 'join',
    sourceTableIds: [tableA.id, tableB.id],
    sourceTableNames: [tableA.name, tableB.name],
    timestamp: Date.now(),
    description: `Joined ${tableA.name} (${keyA}) with ${tableB.name} (${keyB}) [${config.type}, mode=${mode}]`,
    sourceRowCount: tableA.rows.length + tableB.rows.length,
    resultRowCount: outRows.length,
    duplicateKeyCount: duplicateCount,
    extrapolatedCount,
    details: { config },
  }

  const newTable: ParamTableSpec = {
    id: newTableId(),
    kind: 'parametric',
    name,
    vars: finalVars,
    rows: outRows,
    results: [],
    stats: null,
    checkResult: null,
    checkMessage: '',
    source: 'gui',
    columnUnits: Object.keys(columnUnits).length > 0 ? columnUnits : undefined,
    provenance,
  }

  return { table: newTable, provenance }
}
