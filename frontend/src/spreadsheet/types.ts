// spreadsheet/types.ts

export interface SpreadsheetSpec {
  id: string
  name: string
  /** Sheet data array — opaque JSON for persistence. Each entry is
   *  `{ name, id, celldata, styles, … }`; `celldata` keeps the legacy
   *  `{ r, c, v: { v, m, f? } }` cell shape that App/resolver/bindings read. */
  sheets: unknown[]
  /** Bindings mapping variable names to cell references (e.g. "Sheet1!A1") for input */
  bindings?: Record<string, string>
  /** Bindings mapping variable names to cell references for auto-syncing results */
  resultBindings?: Record<string, string>
  /** Whether to auto-sync resultBindings after a successful solve */
  autoSync?: boolean
  /** ID of a parametric table this spreadsheet is linked to (if any) */
  linkedTableId?: string
}

export function emptySpreadsheetData(): unknown[] {
  return [{
    name: 'Sheet1',
    id: '0',
    status: 1,        // active
    order: 0,
    celldata: [],
    /** jspreadsheet cell styles: CSS strings keyed by A1 ref (e.g. { A1: 'font-weight:bold;' }). */
    styles: {},
    config: {},
  }]
}
