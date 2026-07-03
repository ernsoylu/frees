// spreadsheet/tablesWorkbookBridge.ts
//
// Univer-free bridge between App and the lazily-loaded TablesWorkbookTab, so
// App can reference the workbook without pulling the Univer chunk into the
// entry bundle.

/** Fallback flag (Phase 1 of the table-spreadsheet unification plan): the
 * Univer Tables workbook hosts function/lookup tables by default; set
 * VITE_TABLES_WORKBOOK=0 to fall back to the legacy Mantine editors for one
 * release while the workbook host proves itself. */
export const TABLES_WORKBOOK_ENABLED =
  ((import.meta as unknown as { env?: Record<string, string> }).env?.VITE_TABLES_WORKBOOK ?? '1') !== '0'

/** The dock window id of the single Tables workbook (decision 2: one engine
 * for all hosted tables, never an engine per table). */
export const TABLES_WORKBOOK_WINDOW_ID = 'table:univer-workbook'

import type { FunctionTableSpec } from '../tables'

/** Pre-DTO scrape hook (contract b): the host registers flush() while
 * mounted; App calls it before building FunctionTableDto payloads so a
 * pending debounced sheet→spec sync can never leave the solver stale. The
 * flush returns the up-to-date hosted specs synchronously (React state lands
 * a render later — too late for the closure building the request). */
export const tablesWorkbookSync: { flush: (() => FunctionTableSpec[]) | null } = { flush: null }

export function flushTablesWorkbook(): FunctionTableSpec[] | null {
  return tablesWorkbookSync.flush?.() ?? null
}
