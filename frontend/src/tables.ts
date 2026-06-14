import { CheckResponse, FunctionTableDto, ParametricTableDto, TableRowResult, TableStats } from './api'
import { newParamRow, ParamRow } from './ParametricTableTab'

// ---------------------------------------------------------------------------
// Tables (Epic 8): the Tables window manages any number of
// Parametric Tables (run tables) and Function Tables (tabulated functions from
// the Graph Digitizer or entered manually). A Function Table's name is the
// function name callable in equations; its column names are the arguments —
// the first column is the lookup argument. If it has a curve family parameter,
// the rest are curves with the family parameter value in the header
// (e.g. T = 100, 200, ...).
// ---------------------------------------------------------------------------

export interface ParamTableSpec {
  id: string
  kind: 'parametric'
  name: string
  vars: string[]
  rows: ParamRow[]
  results: TableRowResult[]
  stats: TableStats | null
  checkResult: CheckResponse | null
  checkMessage: string
  source?: 'code' | 'gui'
}

export interface CurveRow {
  x: string
  ys: string[]
}

export interface FunctionTableSpec {
  id: string
  kind: 'function'
  name: string // function name callable in equations
  argName: string // first column: the lookup argument, e.g. Re
  paramName: string // family parameter name, e.g. T ('' for a lone curve)
  xLog: boolean
  yLog: boolean
  columns: string[] // family parameter value per curve column
  rows: CurveRow[]
  is1D?: boolean // if true, it represents a function without a curve family/parameter
  // 'code' tables are parsed from TABLE ... END blocks in the editor text and
  // are shown read-only (the editor text is their source of truth). Undefined
  // / 'gui' tables are created and edited in the Tables window.
  source?: 'code' | 'gui'
}

export type TableSpec = ParamTableSpec | FunctionTableSpec

let tableCounter = 1

export function newTableId(): string {
  return `table-${Date.now()}-${tableCounter++}`
}

export function newParamTable(existing: TableSpec[]): ParamTableSpec {
  const count = existing.filter((t) => t.kind === 'parametric').length
  return {
    id: newTableId(),
    kind: 'parametric',
    name: `Parametric ${count + 1}`,
    vars: [],
    rows: [newParamRow(), newParamRow(), newParamRow()],
    results: [],
    stats: null,
    checkResult: null,
    checkMessage: '',
  }
}

export function newFunctionTable(existing: TableSpec[], is1D: boolean): FunctionTableSpec {
  const count = existing.filter((t) => t.kind === 'function').length
  return {
    id: newTableId(),
    kind: 'function',
    name: `func${count + 1}`,
    argName: 'x',
    paramName: '',
    xLog: false,
    yLog: false,
    columns: is1D ? [''] : ['100', '200'],
    rows: Array.from({ length: 5 }, () => ({ x: '', ys: is1D ? [''] : ['', ''] })),
    is1D,
  }
}

/** Function tables in solver wire format; blank cells are simply omitted.
 * Code-sourced tables are skipped — the backend parses them from the editor
 * text itself, so re-sending them would be redundant. */
export function toFunctionTableDtos(tables: TableSpec[]): FunctionTableDto[] {
  const dtos: FunctionTableDto[] = []
  for (const table of tables) {
    if (table.kind !== 'function' || table.name.trim() === '') continue
    if (table.source === 'code') continue
    const curves = table.columns.map((paramRaw, j) => {
      const points: number[][] = []
      for (const row of table.rows) {
        const x = Number(row.x)
        const y = Number(row.ys[j])
        if (row.x.trim() !== '' && (row.ys[j] ?? '').trim() !== '' && Number.isFinite(x) && Number.isFinite(y)) {
          points.push([x, y])
        }
      }
      const param = Number(paramRaw)
      return {
        param: paramRaw.trim() !== '' && Number.isFinite(param) ? param : null,
        points,
      }
    })
    if (curves.some((c) => c.points.length > 0)) {
      dtos.push({
        name: table.name.trim(),
        argNames: [table.argName, table.paramName].filter((a) => a.trim() !== ''),
        xLog: table.xLog,
        yLog: table.yLog,
        curves,
      })
    }
  }
  return dtos
}

function scaleVal(v: number, log: boolean): number {
  return log && v > 0 ? Math.log10(v) : v
}

function unscaleVal(v: number, log: boolean): number {
  return log ? Math.pow(10, v) : v
}

function fmtCell(v: number): string {
  return parseFloat(v.toPrecision(6)).toString()
}

/**
 * Fill missing: every blank cell whose row has an x inside a curve's
 * tabulated span is interpolated from that curve's known points (linear,
 * in log space for log axes). Cells outside the span stay blank — the
 * chart carries no information there.
 */
export function fillMissingCells(table: FunctionTableSpec): FunctionTableSpec {
  const rows = table.rows.map((r) => ({ x: r.x, ys: [...r.ys] }))
  for (let j = 0; j < table.columns.length; j++) {
    const known: { x: number; y: number }[] = []
    for (const row of rows) {
      const x = Number(row.x)
      const y = Number(row.ys[j])
      if (row.x.trim() !== '' && (row.ys[j] ?? '').trim() !== '' && Number.isFinite(x) && Number.isFinite(y)) {
        known.push({ x, y })
      }
    }
    known.sort((p, q) => p.x - q.x)
    if (known.length < 2) continue
    for (const row of rows) {
      const x = Number(row.x)
      if (row.x.trim() === '' || !Number.isFinite(x)) continue
      if ((row.ys[j] ?? '').trim() !== '') continue
      if (x < known[0].x || x > known[known.length - 1].x) continue
      let hi = 1
      while (known[hi].x < x) hi++
      const x0 = scaleVal(known[hi - 1].x, table.xLog)
      const x1 = scaleVal(known[hi].x, table.xLog)
      const y0 = scaleVal(known[hi - 1].y, table.yLog)
      const y1 = scaleVal(known[hi].y, table.yLog)
      const t = x1 === x0 ? 0 : (scaleVal(x, table.xLog) - x0) / (x1 - x0)
      row.ys[j] = fmtCell(unscaleVal(y0 + t * (y1 - y0), table.yLog))
    }
  }
  return { ...table, rows }
}

/** Rows sorted ascending by numeric x (blank x rows sink to the bottom). */
export function sortFunctionRows(table: FunctionTableSpec): FunctionTableSpec {
  const rows = [...table.rows].sort((a, b) => {
    const xa = a.x.trim() === '' ? Number.POSITIVE_INFINITY : Number(a.x)
    const xb = b.x.trim() === '' ? Number.POSITIVE_INFINITY : Number(b.x)
    return (Number.isFinite(xa) ? xa : Number.POSITIVE_INFINITY)
      - (Number.isFinite(xb) ? xb : Number.POSITIVE_INFINITY)
  })
  return { ...table, rows }
}

function fmt6(v: number): string {
  return parseFloat(v.toPrecision(6)).toString()
}

function identifier(raw: string, fallback: string): string {
  const cleaned = raw.replace(/\[.*?\]/g, '').trim().replace(/\W+/g, '_').replace(/^_+|_+$/g, '')
  return /^[A-Za-z]/.test(cleaned) ? cleaned : fallback
}

/**
 * Builds a Function Table from digitized curves (Story 8.7 "Send to Function
 * Table"): the x grid is the union of every curve's x samples, each curve
 * fills its own rows, and the gaps left by differing samples are
 * interpolated right away via fillMissingCells.
 */
export function functionTableFromDigitizer(input: {
  existing: TableSpec[]
  xName: string
  yName: string
  xLog: boolean
  yLog: boolean
  curves: { param: string; points: { x: number; y: number }[] }[]
}): FunctionTableSpec {
  const count = input.existing.filter((t) => t.kind === 'function').length
  const xKeys = new Set<string>()
  for (const curve of input.curves) {
    for (const p of curve.points) xKeys.add(fmt6(p.x))
  }
  const xs = [...xKeys].map(Number).sort((a, b) => a - b)
  const rows: CurveRow[] = xs.map((x) => ({
    x: fmt6(x),
    ys: input.curves.map((curve) => {
      const hit = curve.points.find((p) => fmt6(p.x) === fmt6(x))
      return hit ? fmt6(hit.y) : ''
    }),
  }))
  const is1D = input.curves.length <= 1
  const table: FunctionTableSpec = {
    id: newTableId(),
    kind: 'function',
    name: identifier(input.yName, '').toLowerCase() || `func${count + 1}`,
    argName: identifier(input.xName, 'x'),
    paramName: is1D ? '' : 'param',
    xLog: input.xLog,
    yLog: input.yLog,
    columns: input.curves.map((c) => c.param),
    rows,
    is1D,
  }
  return fillMissingCells(table)
}

/** Builds a read-only Function Table spec from a solver-wire DTO (a TABLE
 * block the backend parsed out of the editor text). The x grid is the union of
 * every curve's x samples; each curve fills its own rows. */
export function functionTableFromDto(dto: FunctionTableDto): FunctionTableSpec {
  const is1D = dto.curves.length <= 1 && (dto.curves[0]?.param == null)
  const xKeys = new Set<string>()
  for (const curve of dto.curves) {
    for (const p of curve.points) xKeys.add(fmt6(p[0]))
  }
  const xs = [...xKeys].map(Number).sort((a, b) => a - b)
  const rows: CurveRow[] = xs.map((x) => ({
    x: fmt6(x),
    ys: dto.curves.map((curve) => {
      const hit = curve.points.find((p) => fmt6(p[0]) === fmt6(x))
      return hit ? fmt6(hit[1]) : ''
    }),
  }))
  return {
    // Stable id keyed by name so the table keeps its identity across solves.
    id: `code-${dto.name.toLowerCase()}`,
    kind: 'function',
    name: dto.name,
    argName: dto.argNames[0] ?? 'x',
    paramName: is1D ? '' : (dto.argNames[1] ?? 'param'),
    xLog: dto.xLog,
    yLog: dto.yLog,
    columns: dto.curves.map((c) => (c.param == null ? '' : fmt6(c.param))),
    rows,
    is1D,
    source: 'code',
  }
}

/** Builds a read-only Parametric Table spec from a PARAMETRIC ... END block. */
export function paramTableFromDto(dto: ParametricTableDto): ParamTableSpec {
  const rows: ParamRow[] = dto.rows.map((row) => {
    const values: Record<string, string> = {}
    dto.vars.forEach((v, j) => {
      const cell = row[j]
      values[v] = cell == null ? '' : fmt6(cell)
    })
    return { id: crypto.randomUUID(), values }
  })
  return {
    id: `code-param-${dto.name.toLowerCase()}`,
    kind: 'parametric',
    name: dto.name,
    vars: dto.vars,
    rows: rows.length > 0 ? rows : [newParamRow()],
    results: [],
    stats: null,
    checkResult: null,
    checkMessage: '',
    source: 'code',
  }
}

/** Replaces the code-sourced tables in the list with the freshly parsed set
 * from the latest solve/check, leaving GUI tables untouched. */
export function mergeCodeTables(
  existing: TableSpec[],
  functionDtos: FunctionTableDto[] | undefined,
  parametricDtos?: ParametricTableDto[] | undefined,
): TableSpec[] {
  const guiTables = existing.filter((t) => t.source !== 'code')
  const codeFunctionTables = (functionDtos ?? []).map(functionTableFromDto)
  const codeParamTables = (parametricDtos ?? []).map(paramTableFromDto)
  return [...guiTables, ...codeFunctionTables, ...codeParamTables]
}

/** Makes an independent, editable GUI copy of a code-defined table, decoupled
 * from the editor text. The copy is renamed to avoid clashing with the
 * code-defined original (which still wins in the solver by its text name). */
export function duplicateAsEditable(table: TableSpec): TableSpec {
  const name = `${table.name}_copy`
  if (table.kind === 'function') {
    return {
      ...table,
      id: newTableId(),
      name,
      rows: table.rows.map((r) => ({ x: r.x, ys: [...r.ys] })),
      columns: [...table.columns],
      source: 'gui',
    }
  }
  return {
    ...table,
    id: newTableId(),
    name,
    rows: table.rows.map((r) => ({ id: crypto.randomUUID(), values: { ...r.values } })),
    results: [],
    stats: null,
    checkResult: null,
    checkMessage: '',
    source: 'gui',
  }
}

const TABLES_KEY = 'frees.tables'

export function loadTables(): TableSpec[] {
  try {
    const raw = localStorage.getItem(TABLES_KEY)
    if (!raw) return []
    const tables = JSON.parse(raw) as any[]
    // Migrate 'curve' kind to 'function' kind, and run results/check state are transient.
    return tables.map((t) => {
      let mapped = t
      if (t.kind === 'curve') {
        mapped = { ...t, kind: 'function' }
      }
      return mapped.kind === 'parametric'
        ? { ...mapped, results: [], stats: null, checkResult: null, checkMessage: '' }
        : mapped
    })
  } catch {
    return []
  }
}

export function saveTables(tables: TableSpec[]) {
  try {
    // Code-sourced tables are re-derived from the editor text on each solve;
    // never persist them (they would otherwise show stale before a re-solve).
    const slim = tables
      .filter((t) => t.source !== 'code')
      .map((t) =>
        t.kind === 'parametric'
          ? { ...t, results: [], stats: null, checkResult: null, checkMessage: '' }
          : t,
      )
    localStorage.setItem(TABLES_KEY, JSON.stringify(slim))
  } catch {
    // storage unavailable: tables still work for the session
  }
}
