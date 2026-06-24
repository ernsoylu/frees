# frEES Backend Scilab Parity Improvements

## Completed Tasks (earlier work)
* **MIMO Control System Upgrades:**
  * Upgraded `ControllerDesign` and `PolynomialHelpers` to fully support `double[][]` state space representations (MIMO).
  * Replaced Apache Commons Math implementations internally with Jama for robustness (eigen decomposition, Schur decomposition via Apache/Jama wrappers).
* **Scilab Control Functions Integration:**
  * Supported continuous-time LQR/Lyapunov functions: `lqr`, `lyap`.
  * Supported discrete-time LQR/Lyapunov functions: `dlqr`, `dare`, `dlyap`.
  * Supported pole placement (Ackermann's formula): `place`.
  * Supported Controllability/Observability matrices: `ctrb`, `obsv`.
  * Supported Singular Value Decomposition: `svd`.
* **Parser Upgrades for MIMO Operations:**
  * Updated `ControlSystemsFlattener` to evaluate dynamically sized state matrices up to `n x m` output arrays for MIMO outputs.
  * Corrected evaluation contexts for 1D arrays vs 2D arrays within the `EquationParser` to accommodate vectorized inputs transparently.
* **Function Registry Integration:**
  * Created `FunctionRegistry.java` to catalogue and map backend computation capabilities to frontend documentation and autocomplete.
  * Exposed backend control formulas (lqr, place, rlocus, ctrb, obsv, etc.) under `/api/reference` via `ReferenceController.java`.

## Completed — Tier 4 Scilab Parity (backend)
* **New functions** (full pipeline: FunctionRegistry → autosize → flatten → evaluator prefix → CAS math, each with end-to-end tests):
  * **`acker(A, B, pr, pi : K)`** — Ackermann pole placement, aliased to `place` (reuses the `place$` evaluator).
  * **`lqe(A, G, C, Q, R : L)`** — continuous Kalman estimator gain via dual Riccati: `L = lqr(A', C', G·Q·G', R)'`.
  * **`gram(A, M, type$ : W)`** — controllability (`'c'`, M=B) / observability (`'o'`, M=C) gramian via the Lyapunov solver.
  * **`balreal(A, B, C : Ab, Bb, Cb)`** — internally-balanced realization (Laub's method: gramians → Cholesky → SVD balancing transform). Multi-output, mirrors `svd`.
* **7 new end-to-end tests** in `ControlSystemDesignTest` (acker, lyap, dlyap, dare+dlqr, lqe, gram, balreal invariants), all hand-verified. Full backend suite green.

## Completed — Bugs Found & Fixed
* **Unwired control dispatch (backend, runtime bug):** `dlqr`/`dare`/`lyap`/`dlyap` had `eval*` methods in `ControlSystemsEvaluator` and flatten dispatch, but the `Evaluator.java` prefix router only handled `lqr$`/`place$`/`ctrb$`/`obsv$`. So `CALL dlqr/dare/lyap/dlyap` would have failed at runtime — the existing tests only exercised the CAS layer directly (`ControllerDesign.*`), never end-to-end. Now wired + regression-tested.
* **Editor autocomplete excluded ALL CALL functions (frontend):** `EquationEditor` derived built-in names from each catalog snippet's *leading* identifier, so every `CALL <fn>(…)` resolved to `CALL` (filtered as a keyword). No control/linear-algebra function was ever completable or function-highlighted. Fixed by extracting the callee after `CALL`.
* **REPL Tab-completion inserted descriptive labels (frontend):** `replFunctionNames` passed full menu labels (e.g. `'lqr (LQR optimal gain)'`) as completion candidates, so accepting one inserted the whole string. Fixed to use bare names.
* Both autocomplete fixes consolidated into a shared `catalogFunctionNames()` helper in `functionCatalog.ts` (callee-after-CALL or leading identifier, minus block keywords), used by the editor and the REPL.

## Completed — Frontend Wireup (Tier 4 + previously-hidden functions)
Surfaced all 8 control functions — the 4 new ones plus `dlqr`/`dare`/`lyap`/`dlyap`, which were in the backend registry but had never appeared in the UI:
* **Functions menu / insert snippets** — `functionCatalog.ts` (8 entries with snippet, description, sample usage).
* **Help page** — `helpReference.ts` (8 entries, categorized Design/Analysis/Linear).
* **Examples** — `examples.ts` new worked example: *"Estimator, Gramians & Balanced Realization"* (lqe + gram ×2 + balreal).
* **Editor autocomplete + syntax highlighting** — `EquationEditor.tsx`.
* **REPL Tab-completion** — `App.tsx`.
* **Spotlight / Ctrl+K palette** — automatic (data-driven from `FUNCTION_CATEGORIES`).
* Frontend builds green (`tsc` + Vite).

## Completed — Housekeeping
* Deleted 19 throwaway `*.py` codegen scaffolding scripts from the repo root.
* Deleted `ControllerDesignExt.java` — unreferenced duplicate of `ctrb`/`obsv`/`lyap`/`dlyap` (everything uses `ControllerDesign`).
* Deleted `src/main/java/.../parser/LatexConverterTest.java` — a do-nothing `main()` stub; the real JUnit test lives in `src/test/java/...`.

## Future Work / Known Limitations
* **`kalman` (deferred by design):** Scilab's `kalman` is the online filter time/measurement update (iterative, system-returning) — doesn't fit frees' static-solve model. `lqe` covers the steady-state estimator gain observer design needs. Revisit only for a transient/online filter, which would pair with the DYNAMIC solver.
* **Model-reduction follow-ons:** now that `balreal` + `gram` exist, natural next additions are `hsvd` (Hankel singular values), `balred`/`modred` (truncate a balanced realization to order r). Would reuse the `balreal` transform.
* **`dare` robustness:** uses `EigenDecomposition` of the symplectic matrix and selects eigenvalues with magnitude < 1, throwing if it can't find `n` stable ones (see comment in `ControllerDesign.dare`). Not robust for borderline/defective spectra — consider an ordered (real) Schur form, as `lqr` already uses the matrix-sign iteration.
* **`balreal`/`gram` preconditions:** `gram` requires a stable `A` (Lyapunov); `balreal` additionally needs minimal (controllable+observable) so the gramians are SPD for Cholesky. Non-minimal/unstable inputs currently surface as a raw decomposition exception rather than a friendly message — add explicit precondition checks/messages.
* **Catalog label inconsistency (cosmetic):** math functions use bare labels (`'round'`) while control functions use descriptive labels (`'lqr (LQR optimal gain)'`). Completion is now normalized via `catalogFunctionNames()`, but the menu labels themselves remain mixed; consider standardizing.
* **Frontend deep-render polish:** matrix-valued CALL outputs already resolve through the Solution/Arrays windows; consider a dedicated state-space/system viewer for the new design outputs (gains, gramians, balanced systems).

---

# Spreadsheet App — Phased Implementation Plan

## Overview

Integrate a full spreadsheet app into the frees multi-window workspace using [**FortuneSheet**](https://github.com/ruilisi/fortune-sheet) (`@fortune-sheet/react`). Spreadsheets become first-class dock windows — multi-instance like diagrams and whiteboards — with bidirectional data transfer to the Variable Explorer, Parametric Tables, Plots, and Diagram apps.

### Library Summary: FortuneSheet

| Aspect | Detail |
|---|---|
| Package | `@fortune-sheet/react` (React component), `@fortune-sheet/core` (engine) |
| Component | `<Workbook data={sheets} onChange={cb} />` |
| Data format | Array of sheet objects; cells in `celldata` sparse format: `[{ r, c, v: { m, v, ct, ... } }]` |
| Key props | `data`, `onChange`, `onOp`, `lang`, `showToolbar`, `showFormulaBar`, `showSheetTabs`, `toolbarItems`, `cellContextMenu`, `sheetTabContextMenu`, `hooks` |
| Features | Cell formatting, formulas, merge, freeze, sort/filter, charts, conditional formatting, data validation, pivot, multi-sheet, find/replace |
| TypeScript | Yes (written in TS, built-in types) |
| Persistence | `onChange` emits full sheet data array; `onOp` emits granular operations for collaborative/undo |

### Architecture Reference: How frEES Registers New App Types

Adding a new multi-instance app follows the established **Diagram/Whiteboard pattern**:

```
1. types.ts          — Data model interface (SpreadsheetSpec)
2. storage.ts        — localStorage load/save helpers
3. Tab.tsx           — React component (lazy-loaded)
4. project.ts        — Add `spreadsheets` slice to ProjectSlices, sanitize, migrate
5. App.tsx           — State management, panelContent/panelTitles loop, Inspector panel
6. WorkspaceDock.tsx  — KIND_ICONS entry (tab icon)
7. WorkspaceChrome.tsx — VIEWS entry + Rail sidebar section (new/open/delete)
```

---

## Phase 1 — Foundational Scaffold (MVP)

**Goal:** A single spreadsheet opens in its own dock window. Editing cells works. Data round-trips through save/load.

### 1.1 Install FortuneSheet

```bash
cd frontend && npm install @fortune-sheet/react @fortune-sheet/core
```

Verify the package builds cleanly with the existing Vite + React 19 setup. Check for peer dependency conflicts (React 18 vs 19 — if FortuneSheet requires React 18, evaluate `--legacy-peer-deps` or use a compatibility shim).

### 1.2 Define Data Model — `spreadsheet/types.ts`

```typescript
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
```

### 1.3 Persistence Helpers — `spreadsheet/spreadsheetStorage.ts`

Follow `diagramStorage.ts` / `whiteboardStorage.ts` pattern:
- `loadSpreadsheets(): SpreadsheetSpec[]` — read from `frees-spreadsheets` localStorage key
- `saveSpreadsheets(specs: SpreadsheetSpec[]): boolean` — write with quota error handling + custom event broadcast
- `SPREADSHEET_SAVE_ERROR_EVENT` constant

### 1.4 Create the Tab Component — `spreadsheet/SpreadsheetTab.tsx`

```typescript
// spreadsheet/SpreadsheetTab.tsx  (code-split via React.lazy)
import { Workbook } from '@fortune-sheet/react'
import '@fortune-sheet/react/dist/index.css'

interface Props {
  singleSpreadsheetId: string
  spreadsheets: SpreadsheetSpec[]
  onSpreadsheetsChange: (specs: SpreadsheetSpec[]) => void
}

export default function SpreadsheetTab({ singleSpreadsheetId, spreadsheets, onSpreadsheetsChange }: Props) {
  const spec = spreadsheets.find(s => s.id === singleSpreadsheetId)
  if (!spec) return <EmptyState />

  const handleChange = (data: unknown[]) => {
    onSpreadsheetsChange(spreadsheets.map(s =>
      s.id === singleSpreadsheetId ? { ...s, sheets: data } : s
    ))
  }

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <Workbook
        data={spec.sheets}
        onChange={handleChange}
        showToolbar={true}
        showFormulaBar={true}
        showSheetTabs={true}
        lang="en"
      />
    </div>
  )
}
```

### 1.5 Register in the Dock System

**`WorkspaceDock.tsx`** — add to `KIND_ICONS`:
```typescript
import { IconGrid4x4 } from '@tabler/icons-react'  // or IconTablePlus
// ...
spreadsheet: IconGrid4x4,
```

**`WorkspaceChrome.tsx`** — add to `VIEWS` array:
```typescript
{ value: 'spreadsheet', label: 'Spreadsheet', tip: 'Spreadsheet — Excel-style data editor', icon: IconGrid4x4 },
```
Add the Rail sidebar `InstanceMenu` section (paralleling whiteboard/diagram): new/open/delete actions, badge count, `idPrefix: 'spreadsheet:'`.

**`App.tsx`** — integrate state and panelContent:
```typescript
// State
const [spreadsheets, setSpreadsheets] = useState<SpreadsheetSpec[]>(() => loadSpreadsheets())

// Lazy import
const SpreadsheetTab = lazy(() => import('./spreadsheet/SpreadsheetTab'))

// panelContent loop (after whiteboards loop)
for (const ss of spreadsheets) {
  const winId = `spreadsheet:${ss.id}`
  panelTitles[winId] = ss.name
  panelContent[winId] = (
    <div style={{ height: '100%', minHeight: 0 }}>
      <Suspense fallback={lazyTabFallback}>
        <SpreadsheetTab
          key={`spreadsheet-${ss.id}-${workspaceEpoch}`}
          singleSpreadsheetId={ss.id}
          spreadsheets={spreadsheets}
          onSpreadsheetsChange={setSpreadsheets}
        />
      </Suspense>
    </div>
  )
}

// Inspector panel (in focusedWindow handler)
if (fw?.kind === 'spreadsheet') {
  // Rename + delete controls
}
```

### 1.6 Project Persistence — `project.ts`

- Add `spreadsheets: SpreadsheetSpec[]` to `ProjectSlices` interface
- Add `spreadsheets` to `buildProject()`, `sanitizeProject()`, `migrate()` with `plainJson()` / `Array.isArray()` guards
- Existing `.frees` files without `spreadsheets` key get `[]` on load (backwards compatible)

### 1.7 Acceptance Criteria — Phase 1

- [ ] Can create a new spreadsheet from the Rail sidebar
- [ ] Spreadsheet opens as a dockable window (can tab, split, float, maximize)
- [ ] FortuneSheet toolbar, formula bar, and sheet tabs are visible
- [ ] Cell editing (values, formulas, formatting) works
- [ ] Multiple spreadsheet instances can coexist
- [ ] State persists across page reloads (localStorage)
- [ ] State saves/loads from `.frees` project files
- [ ] Inspector panel shows rename/delete for focused spreadsheet
- [ ] Spotlight (Ctrl+K) includes "New Spreadsheet" action
- [ ] `tsc` and `vite build` pass green

---

## Phase 2 — Equation Editor ↔ Spreadsheet (`ssheet()` Function)

**Goal:** Equations can directly reference spreadsheet cell values via a `ssheet()` function, and solved results can flow back into spreadsheet cells. This is the core bidirectional link between the solver and the spreadsheet.

### 2.1 The `ssheet()` Function — Equation Syntax

Introduce a new built-in function that the equation parser recognizes:

```
; Pull a vector from spreadsheet column A, rows 1-3
num = ssheet(A1:A3)
den = ssheet(B1:B3)
[A ~ ~ ~] = tf2ss(num, den)

; Pull a single scalar
k_gain = ssheet(C1)

; Pull a 2D matrix block
M = ssheet(A1:C3)

; Explicit spreadsheet name (when multiple workbooks exist)
data = ssheet("Measurements", D1:D10)
```

**Resolution rules:**
- `ssheet(range)` — resolves against the **first (or only) spreadsheet** in the project. If multiple exist and no name is given, use the first one by creation order.
- `ssheet("name", range)` — resolves against the spreadsheet whose `SpreadsheetSpec.name` matches (case-insensitive).
- **Range formats:** A1-style references — `A1` (scalar), `A1:A5` (column vector), `A1:C1` (row vector), `A1:C3` (matrix).
- **Sheet tab references (optional):** `ssheet("Workbook", Sheet2!A1:A5)` — defaults to the active sheet if not specified.
- **Return type:** scalar for a single cell, 1D array for a row/column range, 2D array for a block range. These map directly to frees' existing array/matrix variable system.

### 2.2 Backend Implementation

The `ssheet()` function is **not** computed by the backend's math engine — it's a **data-injection function** resolved by the frontend before the equation text is sent to the solver.

**Approach A — Frontend Pre-Processing (Recommended):**

1. Before calling `check()` or `solve()`, the frontend scans the equation text for `ssheet(...)` references
2. For each reference, it reads the cell values from the corresponding `SpreadsheetSpec.sheets[].celldata`
3. It replaces `ssheet(A1:A3)` with a literal array expression: `[1.5, 2.7, 3.1]`
4. The substituted text is sent to the backend — the backend never sees `ssheet()`

```typescript
// spreadsheet/ssheetResolver.ts
export interface SsheetReference {
  match: string           // full match: 'ssheet(A1:A3)' or 'ssheet("Name", B1:C3)'
  spreadsheetName?: string // optional explicit name
  sheetName?: string       // optional sheet tab name
  range: string           // 'A1:A3', 'B1:C3', 'C1'
}

export function parseSsheetReferences(text: string): SsheetReference[]
export function resolveSsheetValues(
  refs: SsheetReference[],
  spreadsheets: SpreadsheetSpec[]
): Map<string, string>  // match → literal replacement
export function substituteSsheetRefs(text: string, spreadsheets: SpreadsheetSpec[]): string
```

**Approach B — Backend-Aware (Alternative):**
- Register `ssheet` in `FunctionRegistry.java` as a special data-passthrough function
- Frontend serializes spreadsheet cell data into the solve request payload alongside equations
- Backend resolves `ssheet()` references during parsing
- More complex but enables `ssheet()` references inside `FUNCTION`/`TABLE`/`DYNAMIC` blocks

> **Recommendation:** Start with Approach A (frontend pre-processing) for simplicity. Migrate to Approach B only if `ssheet()` needs to work inside block constructs.

### 2.3 Frontend Integration — `effectiveText()` Pipeline

The existing `effectiveText()` function in `App.tsx` already appends diagram bindings to the raw editor text before sending to the solver. Extend this pipeline:

```typescript
function effectiveText(): string {
  let text = editorText
  text = appendDiagramBindings(text, diagramBindings)
  text = substituteSsheetRefs(text, spreadsheets)  // ← NEW
  return text
}
```

This ensures `ssheet()` references are resolved transparently — the editor shows the human-readable `ssheet(A1:A3)` syntax, but the solver receives concrete numeric values.

### 2.4 Cell Value Extraction from FortuneSheet Data

FortuneSheet stores cells in a sparse `celldata` array: `[{ r: row, c: col, v: { v: value, m: display } }]`.

Create a utility to extract values from this format:

```typescript
// spreadsheet/cellReader.ts

/** Parse A1-style range into numeric row/col bounds. */
export function parseRange(range: string): { r1: number; c1: number; r2: number; c2: number }

/** Read a scalar, vector, or matrix from a sheet's celldata. */
export function readCellRange(
  celldata: { r: number; c: number; v: { v: unknown } }[],
  range: { r1: number; c1: number; r2: number; c2: number }
): number | number[] | number[][]

/** Format extracted values as a frees literal expression. */
export function toLiteral(value: number | number[] | number[][]): string
// Scalar:  '3.14'
// Vector:  '[1.5, 2.7, 3.1]'
// Matrix:  '[[1,2,3],[4,5,6],[7,8,9]]'
```

### 2.5 Editor Syntax Highlighting & Autocomplete

Extend the CodeMirror editor configuration:
- **Syntax highlighting:** Recognize `ssheet` as a built-in function keyword (teal/green like other CALL functions)
- **Autocomplete:** Add `ssheet` to the function completion list with snippet: `ssheet(${1:A1:A10})`
- **Hover tooltip:** Show the resolved cell values on hover over a `ssheet()` call (like variable value previews)
- **Validation:** Warn if the referenced spreadsheet name doesn't exist or the range is out of bounds

### 2.6 Reverse Direction — Solved Values into Spreadsheet Cells

After a successful solve, optionally write solved variable values back into designated spreadsheet cells:
- **Approach:** A mapping stored in `SpreadsheetSpec.solverBindings`: `{ variableName → { sheetId, row, col } }`
- **Trigger:** After `solve()` completes, iterate bindings and update the corresponding `celldata` entries
- **UI:** In the spreadsheet's Inspector panel, a "Bind to Variable" action that lets the user pick a solved variable for the selected cell

### 2.7 Acceptance Criteria — Phase 2

- [ ] `ssheet(A1:A3)` in the equation editor resolves to the correct cell values
- [ ] `ssheet("Name", B1:C3)` resolves against the named spreadsheet
- [ ] Scalar, vector, and matrix ranges all resolve correctly
- [ ] The Formatted view shows the resolved numeric values (not `ssheet()` raw text)
- [ ] Changing spreadsheet cell values and re-solving picks up the new values
- [ ] Editor syntax-highlights `ssheet` as a built-in function
- [ ] Editor autocomplete suggests `ssheet()` with a range snippet
- [ ] Empty/non-numeric cells produce a clear error message
- [ ] Solved values can be written back to bound spreadsheet cells
- [ ] `tsc` and `vite build` pass green

---

## Phase 3 — Variable Explorer ↔ Spreadsheet Integration

**Goal:** Solved variables flow into spreadsheet cells via UI actions; spreadsheet data can define input variable overrides.

### 3.1 Push Solved Variables into a Spreadsheet (Read Direction)

Add an **"Export to Spreadsheet"** action to the Variable Explorer:
- Button in `Workspace.tsx`: "Export to Spreadsheet" (or context menu per-variable row)
- On click: creates a new spreadsheet (or targets an existing one via a picker modal)
- Populates cells with variable name, value, unit, uncertainty columns
- Uses FortuneSheet's `celldata` format:
  ```
  Row 0: headers ["Variable", "Value", "Units", "Uncertainty"]
  Row N: [name, value, units, ±unc]
  ```

For **array/matrix variables**, export as a sub-grid:
- 1D vector → single column
- 2D matrix → row×col block with a header cell containing the variable name

### 3.2 Pull Spreadsheet Data into Solver (Write Direction — UI-Level)

Allow a spreadsheet to define **input overrides** for the solver:
- User marks a cell range as a "Variable Binding" (via a context menu extension or a toolbar button)
- The binding associates a cell (or cell range) with a variable name
- Before solve, the bound cell values are injected into `varDrafts` (same path as Variable Information modal)
- This enables data-entry workflows: fill a spreadsheet with measurements → solve equations against them

> **Note:** This is the UI-driven companion to Phase 2's `ssheet()` equation-level approach. `ssheet()` references live in the equation text; variable bindings are UI metadata stored in `SpreadsheetSpec`. Both coexist — `ssheet()` for inline equation use, bindings for the Variable Information workflow.

### 3.3 Auto-Sync Mode

A toggle in the Inspector panel: **"Auto-sync with solver"**
- When enabled, after every solve the spreadsheet auto-updates designated "result cells" with the latest solved values
- Uses a simple mapping: `{ variableName → { sheetId, row, col } }`
- Stored as metadata in `SpreadsheetSpec`

### 3.4 Acceptance Criteria — Phase 3

- [ ] "Export to Spreadsheet" button in Variable Explorer creates/populates a spreadsheet
- [ ] Scalar variables export as name/value/unit/uncertainty rows
- [ ] Array/matrix variables export as properly shaped grids
- [ ] Variable bindings can be set from spreadsheet cells
- [ ] Bound values integrate with the solver pipeline
- [ ] Auto-sync toggle updates result cells after solve (if enabled)

---

## Phase 4 — Table App ↔ Spreadsheet Integration

**Goal:** Bidirectional data transfer between Parametric/Function Tables and Spreadsheets.

### 4.1 Export Table to Spreadsheet

Add an action button to `TablesTab.tsx`: **"Open in Spreadsheet"**
- Creates a new spreadsheet pre-populated with the table's data:
  - **Parametric table:** headers = variable names, rows = parametric run values + results
  - **Function table:** headers = [x, y1, y2, ...], rows = data points
- Cell formatting: bold headers, number formatting matching the table's unit display

### 4.2 Import Spreadsheet Range into Table

Allow creating a **Parametric Table from a spreadsheet selection**:
- User selects a cell range in the spreadsheet
- Right-click → "Create Parametric Table" (or a toolbar action)
- Reads the selection: first row = variable names, subsequent rows = input values
- Creates a new `ParamTableSpec` in `tables` state with the extracted data
- The table appears in the Tables rail section, ready for parametric solving

### 4.3 Linked Table View

A spreadsheet can act as a **live view** of a parametric table:
- When the table is solved, results auto-populate into linked spreadsheet cells
- Editing cells in the spreadsheet that correspond to input columns triggers table re-solve
- Implementation: bidirectional binding stored as `linkedTableId` in `SpreadsheetSpec`

### 4.4 Acceptance Criteria — Phase 4

- [ ] "Open in Spreadsheet" action on Parametric and Function tables
- [ ] Table data exports with proper headers, formatting, and units
- [ ] Spreadsheet selection → "Create Parametric Table" works
- [ ] Linked table mode auto-syncs between table results and spreadsheet cells
- [ ] Editing linked spreadsheet input cells triggers table invalidation

---

## Phase 5 — Plot & Diagram App Integration

**Goal:** Spreadsheet data can source plots; diagram variable overlays can reference spreadsheet cells.

### 5.1 Spreadsheet → Plot Data Source

Add spreadsheet as a data source for X-Y plots:
- In the Plot creation/config modal, add a "From Spreadsheet" data source option
- User selects X column and Y column(s) from a spreadsheet range
- Plot traces read from the spreadsheet's `celldata` on each re-render
- Data binding: `PlotSpec.traces[n].source = { type: 'spreadsheet', spreadsheetId, sheetId, xRange, yRange }`

### 5.2 Diagram → Spreadsheet Cell References

Diagram variable overlays currently bind to solved variables. Extend to optionally reference a spreadsheet cell:
- In the Diagram binding UI, add a "Spreadsheet cell" binding type
- Format: `spreadsheet:<id>!A1` or `spreadsheet:<id>!Sheet1!B3`
- Diagram reads the cell value at render time and displays it as a label overlay
- Useful for annotation/reference data that isn't part of the equation system

### 5.3 Acceptance Criteria — Phase 5

- [ ] X-Y Plot can use a spreadsheet column range as a data series
- [ ] Plot auto-updates when spreadsheet data changes
- [ ] Diagram overlays can reference individual spreadsheet cells
- [ ] Cell references resolve correctly across multiple sheets

---

## Phase 6 — Polish, Performance & Advanced Features

**Goal:** Production-quality UX, performance optimization, and advanced spreadsheet features.

### 6.1 Theming & Dark Mode

- FortuneSheet must respect the frees dark theme (`MantineProvider defaultColorScheme="dark"`)
- Override FortuneSheet's default CSS variables to match Mantine's color tokens
- Create `spreadsheet/theme.css` with dark-mode overrides for `.fortune-sheet` container
- Test both light and dark modes

### 6.2 Toolbar Customization

- Remove/hide FortuneSheet toolbar items that don't apply to the frees context (e.g., collaboration features)
- Add custom toolbar buttons:
  - "Export to Variable Explorer"
  - "Create Table from Selection"
  - "Link to Plot"
- Use the `toolbarItems` prop to customize

### 6.3 Import/Export

- **Import:** Support pasting Excel/CSV data into the spreadsheet (FortuneSheet handles this natively)
- **Export:** Add "Export as CSV" and "Export as XLSX" buttons to the Inspector panel
  - CSV: iterate `celldata`, emit rows
  - XLSX: evaluate using a library like `SheetJS` (`xlsx`) or FortuneSheet's built-in export if available
- **Copy/Paste interop:** Ensure clipboard data transfers work between spreadsheet ↔ Parametric Table ↔ external apps

### 6.4 Performance Optimization

- **Large datasets:** FortuneSheet handles virtualized rendering internally; verify with 10k+ rows
- **Debounced saves:** Debounce `onChange` before persisting to localStorage (FortuneSheet fires frequently)
- **Code splitting:** `SpreadsheetTab.tsx` is already lazy-loaded; ensure `@fortune-sheet/react` chunk is reasonably sized
- **Memory:** Monitor for memory leaks when opening/closing many spreadsheet windows

### 6.5 Formula Integration with frees Variables

Advanced feature — extend FortuneSheet's formula engine to resolve `frees()` custom functions:
- `=FREES("x")` → looks up variable `x` from the latest solve result
- `=FREES_ARRAY("A", 1, 2)` → looks up array element `A[1,2]`
- Implementation: register a custom function via FortuneSheet's formula parser hooks (if supported) or post-process cell formulas
- This turns the spreadsheet into a live dashboard of solved values

### 6.6 Context Menu Extensions

Add frees-specific context menu items via `cellContextMenu` prop:
- "Set as Variable Input" → creates a solver binding
- "Link to Variable Explorer" → marks cell as auto-updated from solve results
- "Insert Solved Values" → bulk-fill selection with named variable values

### 6.7 Acceptance Criteria — Phase 6

- [ ] Dark mode renders correctly (no white flashes, consistent with Mantine theme)
- [ ] Custom toolbar buttons work
- [ ] CSV export produces correct output
- [ ] Clipboard paste from Excel works
- [ ] Performance is acceptable with 10k+ row datasets
- [ ] `=FREES("x")` custom formula resolves solved variables (stretch goal)
- [ ] Context menu extensions are functional

---

## Implementation Order & Dependencies

```
Phase 1 (MVP)                        ← No dependencies, pure frontend
  ↓
Phase 2 (Equation ↔ Spreadsheet)     ← Depends on Phase 1 + effectiveText() pipeline
  ↓
Phase 3 (Variable Explorer)          ← Depends on Phase 1 + solver result format
  ↓
Phase 4 (Tables)                     ← Depends on Phase 1 + tables.ts data model
  ↓
Phase 5 (Plots & Diagrams)           ← Depends on Phase 1 + PlotSpec/DiagramSpec
  ↓
Phase 6 (Polish)                     ← Depends on all above
```

Phase 2 should follow Phase 1 directly — the `ssheet()` function is the core solver-level integration. Phases 3, 4, and 5 are **parallelizable** once Phases 1–2 are complete — they touch different integration surfaces.

## Files to Create

| File | Purpose |
|---|---|
| `frontend/src/spreadsheet/types.ts` | `SpreadsheetSpec` interface + `emptySpreadsheetData()` |
| `frontend/src/spreadsheet/spreadsheetStorage.ts` | localStorage persistence helpers |
| `frontend/src/spreadsheet/SpreadsheetTab.tsx` | Main component wrapping `<Workbook>` (code-split) |
| `frontend/src/spreadsheet/ssheetResolver.ts` | `ssheet()` reference parser + cell value extractor (Phase 2) |
| `frontend/src/spreadsheet/cellReader.ts` | A1-range parser + FortuneSheet `celldata` reader (Phase 2) |
| `frontend/src/spreadsheet/theme.css` | Dark mode + Mantine theme overrides for FortuneSheet |

## Files to Modify

| File | Changes |
|---|---|
| `frontend/package.json` | Add `@fortune-sheet/react`, `@fortune-sheet/core` |
| `frontend/src/project.ts` | Add `spreadsheets` to `ProjectSlices`, `sanitizeProject`, `migrate` |
| `frontend/src/App.tsx` | State, lazy import, panelContent loop, Inspector panel, `effectiveText()` pipeline, new/delete handlers |
| `frontend/src/workspace/WorkspaceDock.tsx` | Add `spreadsheet` to `KIND_ICONS` |
| `frontend/src/WorkspaceChrome.tsx` | Add to `VIEWS`, Rail `InstanceMenu`, props for spreadsheet items |
| `frontend/src/EquationEditor.tsx` | Syntax highlight + autocomplete for `ssheet()` (Phase 2) |
| `frontend/src/Workspace.tsx` | "Export to Spreadsheet" button (Phase 3) |
| `frontend/src/TablesTab.tsx` | "Open in Spreadsheet" action (Phase 4) |
| `frontend/src/PlotTab.tsx` | Spreadsheet data source option (Phase 5) |
| `frontend/src/diagram/DiagramTab.tsx` | Spreadsheet cell reference bindings (Phase 5) |

## Risk Assessment

| Risk | Mitigation |
|---|---|
| React 19 compatibility — FortuneSheet may target React 18 | Test immediately in Phase 1.1; if incompatible, consider `--legacy-peer-deps` or a version pin |
| Bundle size — FortuneSheet + formula engine may be large | Code-split via `React.lazy`; measure chunk size; consider `@fortune-sheet/react` without charts plugin |
| FortuneSheet dark mode support | May need extensive CSS overrides; evaluate early in Phase 6.1 |
| localStorage quota with large spreadsheet data | Use the existing quota-error pattern from `diagramStorage.ts`; consider IndexedDB for large sheets |
| FortuneSheet formula conflicts with frees solver | Custom `=FREES()` functions are a stretch goal (Phase 6.5); if the formula parser isn't extensible, fall back to cell-level bindings |
| `ssheet()` range parsing edge cases | Comprehensive unit tests for A1-range parser; handle merged cells, empty cells, non-numeric cells gracefully |
