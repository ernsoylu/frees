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

import type { TableSpec } from '../tables'

/** True when this table is hosted as a bound sheet in the Tables workbook:
 * all function tables, plus GUI parametric tables. Code PARAMETRIC and
 * ODE-origin tables keep their per-table windows — ODE trajectories can be
 * huge derived data (decision 5: glide stays for those). Lives here (not in
 * tableBinding) so App can use it without touching the Univer chunk. */
export function isHostedTable(t: TableSpec): boolean {
  return t.kind === 'function' || (t.kind === 'parametric' && t.source !== 'code')
}

/** Pre-DTO scrape hook (contract b): the host registers flush() while
 * mounted; App calls it before building solver payloads (function-table DTOs
 * or a parametric run) so a pending debounced sheet→spec sync can never
 * leave the solver stale. The flush returns the up-to-date hosted specs
 * synchronously (React state lands a render later — too late for the
 * closure building the request). */
export const tablesWorkbookSync: { flush: (() => TableSpec[]) | null } = { flush: null }

export function flushTablesWorkbook(): TableSpec[] | null {
  return tablesWorkbookSync.flush?.() ?? null
}
