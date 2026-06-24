// spreadsheet/types.ts

export interface SpreadsheetSpec {
  id: string
  name: string
  /** FortuneSheet sheet data array — opaque JSON for persistence. */
  sheets: unknown[]
  /** Bindings mapping variable names to cell references (e.g. "Sheet1!A1") for input */
  bindings?: Record<string, string>
  /** Bindings mapping variable names to cell references for auto-syncing results */
  resultBindings?: Record<string, string>
  /** Whether to auto-sync resultBindings after a successful solve */
  autoSync?: boolean
}

export function emptySpreadsheetData(): unknown[] {
  return [{
    name: 'Sheet1',
    id: '0',
    status: 1,        // active
    order: 0,
    celldata: [],
    config: {},
  }]
}
