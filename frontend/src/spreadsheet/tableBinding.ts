// spreadsheet/tableBinding.ts
//
// Pure projections between a FunctionTableSpec and a bound sheet (contracts
// a/f of the table-spreadsheet unification plan, todo.md). The spec stays the
// persisted source of truth; the sheet is a materialized view. No Univer
// imports — everything speaks the stored celldata format (univerAdapter's
// isolation principle), so all mapping rules are unit-testable without the
// grid engine.
//
// Region layout (anchored at A1):
//   row 1        header — A1 = argument name; B1.. = curve-parameter values
//                (2-D) or the 'y' label (1-D)
//   rows 2..N+1  data — col A = x, cols B.. = ys
//
// The mapper is the *guarantee* behind protection (contract a): it scans only
// the schema's bounding box, so content outside the region can never reach a
// spec even if a mutation slips past the UI-level protection rules.

import { FunctionTableSpec } from '../tables'
import { colName, StoredCell, StoredCellValue, StoredSheet } from './univerAdapter'

/** Hard cap on data rows (contract a): a runaway 50k-row paste truncates here
 * instead of bloating the .frees file and swamping the solver. */
export const TABLE_MAX_ROWS = 5000
export const HEADER_ROW_COUNT = 1

/** Univer formula error literals (#REF! after a referenced sheet is deleted,
 * #DIV/0!, …). Contract f: these map to omitted spec values — never a
 * crash-risk string in a solver DTO — while the formula overlay entry is
 * retained so the user can fix the formula. */
const ERROR_VALUE = /^#(?:REF!|DIV\/0!|VALUE!|NAME\?|N\/A|NUM!|NULL!|CALC!|SPILL!|ERROR!|CYCLE!)$/i

export function isErrorValue(v: unknown): boolean {
  return typeof v === 'string' && ERROR_VALUE.test(v.trim())
}

/** Bound columns: the x column plus one per curve. */
export function boundColumnCount(spec: FunctionTableSpec): number {
  return 1 + spec.columns.length
}

function cellValue(raw: string): StoredCellValue {
  const trimmed = raw.trim()
  const num = Number(trimmed)
  const v: string | number = trimmed !== '' && Number.isFinite(num) ? num : raw
  return { v, m: raw }
}

/** A1 ref for 0-based sheet coordinates. */
export function a1(r: number, c: number): string {
  return `${colName(c)}${r + 1}`
}

// ---------------------------------------------------------------------------
// spec -> sheet (materialization)

export function specToSheetData(spec: FunctionTableSpec): StoredSheet {
  const celldata: StoredCell[] = []
  const styles: Record<string, string> = {}

  // Header row (bold). A1 = argument name; curve headers carry the raw
  // family-parameter strings (editable for 2-D tables, mapped back to
  // spec.columns), or a fixed 'y' label for 1-D.
  celldata.push({ r: 0, c: 0, v: cellValue(spec.argName || 'x') })
  styles.A1 = 'font-weight: bold;'
  spec.columns.forEach((param, j) => {
    celldata.push({ r: 0, c: j + 1, v: cellValue(spec.is1D ? 'y' : param) })
    styles[a1(0, j + 1)] = 'font-weight: bold;'
  })

  // Data rows. Blank cells are skipped unless the formula overlay has an
  // entry there — overlay cells are written with `f` so the adapter's load
  // path (f-only, no cached v) makes Univer recompute them.
  const formulas = spec.formulas ?? {}
  const pushCell = (r: number, c: number, raw: string) => {
    const ref = a1(r, c)
    const f = formulas[ref]
    if (!f && raw.trim() === '') return
    const v = cellValue(raw)
    if (f) v.f = f
    celldata.push({ r, c, v })
  }
  spec.rows.forEach((row, i) => {
    pushCell(i + HEADER_ROW_COUNT, 0, row.x)
    spec.columns.forEach((_, j) => pushCell(i + HEADER_ROW_COUNT, j + 1, row.ys[j] ?? ''))
  })

  return { name: spec.name, id: spec.id, celldata, styles, config: {} }
}

/** A1 ranges the host must protect (protect() + setPoint(Edit, false) per the
 * Phase 0 spike — a bare protect() does not restrict the local session).
 * Code-sourced tables are fully protected (the editor text is their source of
 * truth); GUI tables protect the schema header cells only: the argument name
 * (toolbar-edited) and, for 1-D, the fixed 'y' label. 2-D curve-parameter
 * headers stay editable — they map back to spec.columns. */
export function protectedRangesFor(spec: FunctionTableSpec): string[] {
  if (spec.source === 'code') {
    const lastCol = colName(Math.max(spec.columns.length, 1))
    return [`A1:${lastCol}${TABLE_MAX_ROWS + HEADER_ROW_COUNT}`]
  }
  return spec.is1D ? ['A1:B1'] : ['A1:A1']
}

// ---------------------------------------------------------------------------
// sheet -> spec (user edits, read through the facade)

/** Facade reads over the bound region, row-major from A1 (header row
 * included). `formulas` uses '' for non-formula cells. Values must come from
 * the facade *after* the calculation-complete gate (contract b), never from
 * raw celldata. */
export interface RegionRead {
  values: (string | number | boolean | null)[][]
  formulas: string[][]
}

export interface SheetEditsResult {
  spec: FunctionTableSpec
  /** Data rows exceeded TABLE_MAX_ROWS and were cut (toast the user). */
  truncated: boolean
  /** A1 refs whose value was a formula error, mapped to blank (flag them). */
  errorCells: string[]
  /** Content existed beyond the bound columns / row cap (host clears it). */
  outOfRegion: boolean
}

export function sheetEditsToSpec(spec: FunctionTableSpec, read: RegionRead): SheetEditsResult {
  // Code tables are never writable through the sheet; the mapper is the
  // last line of defense if a mutation slips past protection.
  if (spec.source === 'code') {
    return { spec, truncated: false, errorCells: [], outOfRegion: false }
  }

  const cols = boundColumnCount(spec)
  const errorCells: string[] = []
  const formulas: Record<string, string> = {}

  const cellStr = (r: number, c: number): string => {
    const f = read.formulas[r]?.[c] ?? ''
    const raw = read.values[r]?.[c]
    if (f) formulas[a1(r, c)] = f
    if (isErrorValue(raw)) {
      errorCells.push(a1(r, c))
      return ''
    }
    return raw === null || raw === undefined ? '' : String(raw)
  }

  // Header: 2-D curve-parameter values map back to spec.columns; the column
  // *count* is schema and never changes from sheet edits (contract a).
  const columns = spec.is1D
    ? [...spec.columns]
    : spec.columns.map((_, j) => cellStr(0, j + 1))

  // Data region: bounded scan (never the sheet's full used range).
  let lastDataRow = 0 // sheet row index of the last non-blank data row
  const scanLimit = read.values.length
  for (let r = HEADER_ROW_COUNT; r < scanLimit; r++) {
    for (let c = 0; c < cols; c++) {
      const raw = read.values[r]?.[c]
      const f = read.formulas[r]?.[c]
      if (f || (raw !== null && raw !== undefined && String(raw).trim() !== '')) {
        lastDataRow = r
        break
      }
    }
  }

  let truncated = false
  if (lastDataRow > TABLE_MAX_ROWS) {
    lastDataRow = TABLE_MAX_ROWS
    truncated = true
  }

  const rows: { x: string; ys: string[] }[] = []
  for (let r = HEADER_ROW_COUNT; r <= lastDataRow; r++) {
    rows.push({ x: cellStr(r, 0), ys: columns.map((_, j) => cellStr(r, j + 1)) })
  }

  // Out-of-region detection: anything beyond the bound columns within the
  // read window, or rows past the cap — the host clears these (contract a).
  let outOfRegion = truncated
  for (let r = 0; r < scanLimit && !outOfRegion; r++) {
    const rowVals = read.values[r] ?? []
    for (let c = cols; c < rowVals.length; c++) {
      const raw = rowVals[c]
      if ((raw !== null && raw !== undefined && String(raw).trim() !== '') || read.formulas[r]?.[c]) {
        outOfRegion = true
        break
      }
    }
  }

  return {
    spec: {
      ...spec,
      columns,
      rows,
      formulas: Object.keys(formulas).length > 0 ? formulas : undefined,
    },
    truncated,
    errorCells,
    outOfRegion,
  }
}
