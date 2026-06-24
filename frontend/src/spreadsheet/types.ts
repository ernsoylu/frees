// spreadsheet/types.ts

export interface SpreadsheetSpec {
  id: string
  name: string
  /** FortuneSheet sheet data array — opaque JSON for persistence. */
  sheets: unknown[]
  /** Bindings mapping variable names to cell references (e.g. "Sheet1!A1") */
  bindings?: Record<string, string>
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
