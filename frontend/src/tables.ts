import { CheckResponse, CurveTableDto, TableRowResult, TableStats } from './api'
import { newParamRow, ParamRow } from './ParametricTableTab'

// ---------------------------------------------------------------------------
// Tables (Epic 8, Stories 8.6-8.7): the Tables window manages any number of
// Parametric Tables (run tables) and Curve Tables (tabulated functions from
// the Graph Digitizer). A Curve Table's name is the function name callable
// in equations; its column names are the arguments — the first column is the
// lookup argument, the rest are one curve each with the family parameter
// value in the header (e.g. T = 100, 200, ...).
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
}

export interface CurveRow {
  x: string
  ys: string[]
}

export interface CurveTableSpec {
  id: string
  kind: 'curve'
  name: string // function name callable in equations
  argName: string // first column: the lookup argument, e.g. Re
  paramName: string // family parameter name, e.g. T ('' for a lone curve)
  xLog: boolean
  yLog: boolean
  columns: string[] // family parameter value per curve column
  rows: CurveRow[]
}

export type TableSpec = ParamTableSpec | CurveTableSpec

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

export function newCurveTable(existing: TableSpec[]): CurveTableSpec {
  const count = existing.filter((t) => t.kind === 'curve').length
  return {
    id: newTableId(),
    kind: 'curve',
    name: `curve${count + 1}`,
    argName: 'x',
    paramName: '',
    xLog: false,
    yLog: false,
    columns: [''],
    rows: Array.from({ length: 5 }, () => ({ x: '', ys: [''] })),
  }
}

/** Curve tables in solver wire format; blank cells are simply omitted. */
export function toCurveTableDtos(tables: TableSpec[]): CurveTableDto[] {
  const dtos: CurveTableDto[] = []
  for (const table of tables) {
    if (table.kind !== 'curve' || table.name.trim() === '') continue
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
  return log ? Math.log10(v) : v
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
export function fillMissingCells(table: CurveTableSpec): CurveTableSpec {
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
export function sortCurveRows(table: CurveTableSpec): CurveTableSpec {
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
 * Builds a Curve Table from digitized curves (Story 8.7 "Send to Curve
 * Table"): the x grid is the union of every curve's x samples, each curve
 * fills its own rows, and the gaps left by differing samples are
 * interpolated right away via fillMissingCells.
 */
export function curveTableFromDigitizer(input: {
  existing: TableSpec[]
  xName: string
  yName: string
  xLog: boolean
  yLog: boolean
  curves: { param: string; points: { x: number; y: number }[] }[]
}): CurveTableSpec {
  const count = input.existing.filter((t) => t.kind === 'curve').length
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
  const table: CurveTableSpec = {
    id: newTableId(),
    kind: 'curve',
    name: identifier(input.yName, '').toLowerCase() || `curve${count + 1}`,
    argName: identifier(input.xName, 'x'),
    paramName: input.curves.length > 1 ? 'param' : '',
    xLog: input.xLog,
    yLog: input.yLog,
    columns: input.curves.map((c) => c.param),
    rows,
  }
  return fillMissingCells(table)
}

const TABLES_KEY = 'frees.tables'

export function loadTables(): TableSpec[] {
  try {
    const raw = localStorage.getItem(TABLES_KEY)
    if (!raw) return []
    const tables = JSON.parse(raw) as TableSpec[]
    // Run results and check state are transient.
    return tables.map((t) =>
      t.kind === 'parametric'
        ? { ...t, results: [], stats: null, checkResult: null, checkMessage: '' }
        : t,
    )
  } catch {
    return []
  }
}

export function saveTables(tables: TableSpec[]) {
  try {
    const slim = tables.map((t) =>
      t.kind === 'parametric'
        ? { ...t, results: [], stats: null, checkResult: null, checkMessage: '' }
        : t,
    )
    localStorage.setItem(TABLES_KEY, JSON.stringify(slim))
  } catch {
    // storage unavailable: tables still work for the session
  }
}
