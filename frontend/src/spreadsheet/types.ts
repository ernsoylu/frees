// spreadsheet/types.ts

export interface SpreadsheetSpec {
  id: string
  name: string
  /** FortuneSheet sheet data array — opaque JSON for persistence. */
  sheets: unknown[]
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
