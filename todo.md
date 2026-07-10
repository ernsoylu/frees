# frEES — Table–Spreadsheet Unification

> **STATUS: COMPLETE — Revision 3 (2026-07-03), critique-approved; ALL
> phases 0–4 DONE on branch `spike/univer-capability`, verified end-to-end
> against the Docker stack (see the per-phase result blocks). The Phase 4
> one-release gate was waived by owner decision. Branch is PR-ready; spike
> artifacts already stripped.** Goal: one tabular
> surface in the app. Today there are two disjoint systems — the Tables window
> (parametric + lookup/function tables, Mantine grids) and the Univer
> spreadsheet — plus read-only glide-data-grid result tables. This plan makes
> **Univer the host/editor for all editable tables** while the existing
> `TableSpec` model stays the source of truth for the solver. The previous
> content of this file (Data Analyzer plan, shipped 2026-07-02) is in git
> history.
>
> **Revision 2** incorporates two external critique rounds (both approved the
> architecture; neither demanded structural change). Every adopted point was
> verified against the codebase first. Headline adoptions: the **formula
> persistence paradox** fix (new contract f — a sparse formula overlay on
> `TableSpec`, viable because both spec kinds already store cells as strings:
> `ParamRow.values: Record<string,string>`, `CurveRow.x/ys`, with `Number()`
> coercion only at DTO build, `tables.ts:97-121`); a **sync state machine**
> replacing bare debounce (contract b); **async-formula, paste-across-
> protection, and context-menu items added to the Phase 0 spike**; **paste
> clipping** (contract a); **navigation list decoupled from Univer's sheet
> tabs** (decision 2); softened `linkedTableId` migration that preserves
> downgrade (contract d); snapshot cap lowered to 5k-warn/10k-hard with
> timestamped sheet names (contract e). Non-adopted points are recorded in
> **Rejected / deferred critique points** with reasons.
>
> **Revision 3** folds in the third critique round (both reviewers signed
> off — "clear to proceed to Phase 0"; edge-case hardenings only, no
> structural change): the **dependent-formula recalculation trap** (upstream
> edit → async recalc of a formula cell may emit no command event →
> `spec.rows` silently stale while the canvas shows the fresh value; fixed
> by the **targeted formula scrape** in contract b — O(F) over the sparse
> overlay, run on calc-complete *and* before every DTO build); a **row cap
> on paste/fill growth** (contract a); **error-string sanitization**
> (`#REF!`/`#DIV/0!`/… → omitted value, overlay retained; contract f); a
> defined **edit-settle rule** (commit *or* blur exits `USER_EDITING` and
> flushes the queued materialization; contract b); two Phase 0 probe
> additions (dependent-cell event emission; sheet deletion under
> cross-sheet references).

## Context — current state (verified against the codebase)

**Table surfaces today:**

| Surface | File | Grid | R/W | Feeds solver? |
|---|---|---|---|---|
| Tables container (tab bar) | `frontend/src/TablesTab.tsx` | — (host) | mixed | via children |
| Parametric table | `frontend/src/ParametricTableTab.tsx` | Mantine `<Table>` | editable inputs; read-only when `source:'code'` or `origin:'ode'` | **yes** (`solveTable`, `api.ts:947`) |
| Lookup/function table editor (1-D/2-D) | `frontend/src/FunctionTableEditor.tsx`, `CurveTableEditor.tsx` | Mantine inputs | editable | **yes** (`FunctionTableDto` on check/solve/solveTable, `api.ts:346/431/947`) |
| Big read-only results (ODE) | `DataGridReadOnly.tsx` (lazy glide) | glide-data-grid | read-only | no |
| States table | `StatesTab.tsx` + `plots/stateTable.ts` | Mantine | read-only | no |
| Analyzer time-series table | `analyzer/instruments/TableInstrument.tsx` | glide-data-grid | read-only | no |

**Data model:** `TableSpec = ParamTableSpec | FunctionTableSpec`
(`frontend/src/tables.ts:55`). Code-sourced tables (`TABLE…END` /
`PARAMETRIC` blocks) are parsed by the backend from editor text and returned
on every check (`CheckController.java:67/79`), merged via `mergeCodeTables`
(`tables.ts:350`), and **never persisted** (`saveTables`, `tables.ts:415`
skips them). GUI tables persist in the `tables` slice of the `.frees` file
(`project.ts:29`) and are wire-serialized to the solver as
`FunctionTableDto`/rows. Cell values are **strings** in both spec kinds;
numeric coercion happens only at DTO build (`toFunctionTableDtos`,
`tables.ts:97-121` — blank/invalid cells omitted).

**Univer integration today** (`frontend/src/spreadsheet/`, Univer
`@univerjs/presets` + `preset-sheets-core` 0.25.1, lazy-loaded):
- One full Univer engine per spreadsheet window (`SpreadsheetTab.tsx:46`),
  disposed on unmount; edits sync out debounced 300 ms with a `selfWriteRef`
  guard separating own writes from external writes.
- Storage format is the **legacy celldata shape** `{r,c,v:{v,m,f?}}` in
  `SpreadsheetSpec.sheets` (`spreadsheet/types.ts:3`), persisted to the
  `.frees` `spreadsheets` slice; `univerAdapter.ts` is the only bridge to
  Univer's `IWorkbookData` (formula cells load with `f` only, no cached `v`,
  so Univer recalculates — the PR #53 cached-v-freeze lesson).
- Three existing solver bridges: (1) `ssheet('Book','Sheet!A1:B2')` cell→
  equation substitution (`ssheetResolver.ts`, applied in `App.tsx:1007`);
  (2) `resultBindings` + `autoSync` writing solved vars into cells
  (`App.tsx:463-516`); (3) **`linkedTableId`** — a two-way sync of ONE
  parametric table into sheet 0 (`App.tsx:518-573`) plus "Create Table from
  Selection" in `SpreadsheetTab`.

So the bridge already exists for one case; this plan generalizes it and makes
it the primary UI, instead of a bolt-on.

## Decisions

1. **Merge the presentation layer, not the data model.** `TableSpec` remains
   the persisted source of truth and the solver wire contract
   (`FunctionTableDto`, `ParametricTableDto`, code-block re-derivation) is
   untouched. A hosted table is a *projection* of its spec into a sheet, not
   a spreadsheet that happens to contain numbers. Rationale: frees tables are
   schemas (arg names, log axes, curve-family params, input-vs-computed
   columns); dissolving them into free-form cells breaks the solver
   round-trip.
2. **One "Tables" workbook window, one sheet per table** — replacing
   `TablesTab` as the container for editable tables — rather than a Univer
   engine per table. Rationale: each Univer instance is a full engine +
   workbook (`SpreadsheetTab.tsx:46`); N tables must not cost N engines.
   **Navigation does not rely on Univer's native bottom sheet tabs** (they
   scroll horizontally and degrade past ~10 tables): the host keeps a slim
   table list (successor of today's `TablesTab` tab bar — grouped
   Parametric / Function / read-only) that programmatically activates the
   corresponding sheet. *(Rev 2: critique-adopted.)*
3. **Bound sheets are materialized, never persisted as celldata.** On load
   the Tables workbook is rebuilt from the `tables` slice; nothing table-
   shaped is written into the `spreadsheets` slice. Rationale: two sources
   of truth drift, and derived/result data would bloat the `.frees` file.
   User-typed formulas survive reload via the spec-side overlay (contract f).
4. **Bound sheet = the table only, no scratch cells (v1).** Edits outside
   the bound region are rejected (reverted). Scratch work belongs in a
   normal spreadsheet window — which can already reference solver data via
   `ssheet()`/bindings. Rationale: mixed persistence (materialized region +
   persisted free cells in one sheet) is the single biggest complexity trap
   in this design; cut it from v1.
5. **Huge read-only results stay on glide** (ODE tables, analyzer table).
   They get an "Open in Spreadsheet" one-shot **snapshot** action instead of
   live hosting. Rationale: 100k-row derived data re-computed per solve does
   not belong in a live workbook or the project file.
6. **Values are read through the Univer facade at sync time**
   (`getRange().getValues()`), never from raw celldata, so a Univer formula
   typed into an input cell contributes its *computed* value to the spec/DTO.
   This is a hard contract because the raw-celldata seam already bit us once
   (cached-v freeze). *(Rev 2: hardened against the async formula engine —
   see contract b: sync must gate on calculation-complete, not on command
   execution alone.)*

## Design contracts (bind Phase 1+)

### a. Binding model

- New module `frontend/src/spreadsheet/tableBinding.ts`: pure functions
  `specToSheetData(spec) → stored-sheet` and
  `sheetEditsToSpec(spec, facadeValues) → spec'` for each spec kind. All
  mapping logic is unit-testable without Univer (same isolation principle as
  `univerAdapter.ts`).
- Fixed region anchored at A1. Layout per kind:
  - **FunctionTableSpec:** row 1 = header (`argName`, then curve columns —
    param values for 2-D, single value column for 1-D); data rows below.
    `xLog`/`yLog`, table name, and arg/param names are edited in a slim
    toolbar above the grid (they are schema, not cells).
  - **ParamTableSpec:** row 1 = variable names (+ units where known), data
    rows below; input-column cells editable, computed/result columns
    protected and written back after `solveTable`.
- **`sheetEditsToSpec` is a strict spatial filter**: it scans only the
  schema's bounding box (`spec` column count × region rows), never the
  sheet's active range — content outside the region can never leak into a
  spec even if a mutation slips past protection. Defense in depth: contract
  c is UX, this mapper bound is the guarantee. *(Rev 2: made explicit.)*
- Row append/delete inside the region maps to spec row ops. **Column
  insert/delete via the grid is disallowed in v1** — columns are schema and
  change through the existing configure UI (`ConfigureTableModal.tsx` for
  parametric; the toolbar for function tables). **The right-click context
  menu on bound sheets must be filtered accordingly** (structural
  insert/delete items hidden or rerouted to the configure UI) — a visible
  menu item that silently does nothing reads as a broken app. Phase 0
  verifies per-sheet menu customization. *(Rev 2: critique-adopted.)*
- **Paste clipping:** a paste extending beyond the schema's column bounds is
  clipped to the region and a toast reports it ("Pasted data clipped to N
  table columns"); rows grow to fit (row growth is already a spec op).
  Auto-expanding 2-D curve columns on horizontal paste overflow is deferred
  (see Rejected/deferred). *(Rev 2: critique-adopted.)*
- **Row cap on growth (5,000 rows):** the mapper's row-growth op enforces a
  hard cap, so a runaway 50k-row spreadsheet paste (or fill-drag) truncates at the
  cap with a toast ("Paste truncated: table row limit") instead of appending
  50k rows to the spec, bloating the `.frees` file, and lagging the solver.
  Enforced in `sheetEditsToSpec` (covers every growth path, not just paste);
  consistent with the Phase 3 snapshot caps. Bigger data belongs in CSV /
  the analyzer, not a lookup table. *(Rev 3: critique-adopted.)*
- **Sheet-tab rename ↔ `TableSpec.name`** sync both ways; sheet deletion via
  the grid is disabled — table deletion happens in the navigation list with
  the existing confirm flow. *(Rev 2: critique-adopted.)*
- Code-sourced tables (`source:'code'`) and ODE-origin tables render as
  fully protected sheets (editor text stays their source of truth), exactly
  mirroring today's read-only behavior.

### b. Sync loop — a state machine, not a bare debounce *(Rev 2: reworked)*

- Sheet→spec and spec→sheet share one small state machine in a dedicated,
  testable hook (`useUniverTableSync`): states `IDLE` /
  `USER_EDITING` / `MATERIALIZING`.
  - Spec→sheet materialization (mount, table create/configure,
    `solveTable` results) runs only from `IDLE`; if results arrive during
    `USER_EDITING` (active cell editor open or debounce pending), the
    materialization is **queued and applied when editing settles** — solver
    output must never clobber a cell mid-keystroke.
  - **Edit-settle rule** *(Rev 3)*: `USER_EDITING` exits on cell-editor
    commit **or** on blur (focus leaves the workbook — e.g. the user clicks
    another dock window); either transition flushes the queued
    materialization, so an abandoned open cell cannot pin the queue forever.
    Documented limitation: while a cell is held in edit mode, protected
    columns show pre-solve values until commit/blur.
  - The existing `selfWriteRef` identity guard (`SpreadsheetTab.tsx`)
    remains the low-level echo filter *under* the state machine; the
    machine adds ordering, it does not replace the guard.
- **Async formula gate:** Univer's formula engine computes asynchronously,
  so `CommandExecuted` + 300 ms debounce can fire before a formula's value
  exists — facade reads would capture stale/`undefined`/interim error
  states. Sheet→spec sync must therefore gate on the formula engine's
  calculation-complete signal (Phase 0 identifies the exact event); if a
  cell in the region carries `f` but is still dirty, the sync defers to the
  next cycle rather than writing a stale value into the spec.
  *(Rev 2: critique-adopted.)*
- **Targeted formula scrape — the dependent-recalc trap** *(Rev 3)*: an edit
  to `A2` recalculates a dependent formula in `B2` **asynchronously**, and
  that background recalc may emit no `set-range-values` command at all — so
  a sync keyed to the user's edit coordinate would leave `spec.rows["B2"]`
  silently stale while the canvas shows the new value. Rule: never trust
  edit coordinates alone. Whenever `spec.formulas` is non-empty, (1) on
  every calculation-complete signal and (2) **unconditionally before every
  DTO build** (check/solve/`solveTable`), facade-read exactly the
  coordinates in `spec.formulas` and refresh their `spec.rows` values.
  The overlay is sparse, so this is O(formula count) — effectively free —
  and (2) guarantees the solver never receives a stale evaluated value even
  if a completion event was missed. Phase 0 item 3 probes whether dependent
  cells emit events at all; the pre-DTO scrape holds regardless of the
  answer.
- Sheet→spec reads via facade (decision 6). Non-numeric garbage in a numeric
  cell follows the existing wire rule (blank/invalid cells omitted from the
  DTO, `tables.ts:97-121`) — no new validation regime in v1.

### c. Protection mechanism (spike-gated)

- Preferred: Univer permission/protected-range API **if** it is present and
  workable in `preset-sheets-core` 0.25 (Phase 0 answers this).
- Fallback: intercept mutations via `onBeforeCommandExecute` — reject/revert
  `sheet.mutation.set-range-values` (and structural mutations) whose target
  intersects a protected region. **The fallback is only acceptable if
  rejection leaves the undo stack clean** — Phase 0 explicitly tests a
  multi-cell paste spanning editable + protected columns and inspects the
  undo stack afterwards; if interception leaves ghost entries (Ctrl+Z then
  "undoes" an edit that never happened) and cannot be cleaned atomically
  (revert self-write + history-step removal), then native protected ranges
  are a **hard blocker for Phase 2's protected result columns**, not a
  nice-to-have. *(Rev 2: critique-adopted, both rounds flagged this.)*
- Either way: protected cells get a **visual affordance at materialization
  time** (distinct background fill via the stored-style path
  `univerAdapter.ts` already supports) — users must *see* which columns
  belong to the solver, not discover it by rejection. *(Rev 2:
  critique-adopted.)* And `sheetEditsToSpec` independently ignores protected
  coordinates (contract a's spatial filter).

### d. Retirement of `linkedTableId` — soft, downgrade-safe *(Rev 2: reworked)*

- The generalized binding supersedes the one-off parametric link. On project
  load in the new version, a `SpreadsheetSpec.linkedTableId` is **ignored
  (link inert) but the field is preserved** on the spec and in saved files;
  a one-time toast explains the table now lives in the Tables workbook.
  Rationale: stripping the field is a one-way door — a user who saves and
  then downgrades after hitting a bug would lose the link permanently;
  keeping it costs nothing (old versions keep working on their own sync
  path, new versions don't act on it). The field is stripped only by an
  explicit "Unlink" action in the spreadsheet UI. *(Critique-adopted.)*
- The `ssheet()` bindings, `resultBindings`, `autoSync`, and "Create Table
  from Selection" (now targeting the Tables workbook) are **kept** — they
  are orthogonal (free cells ↔ solver), not table hosting.

### e. Snapshot contract ("Open in Spreadsheet") *(Rev 2: caps + naming)*

- One-shot copy of a read-only result grid (ODE table, states, analyzer
  table selection) into a new sheet of a user-chosen spreadsheet window.
  It is a normal persisted sheet from that moment (deliberately decoupled
  from re-solves).
- **Warn at 5k rows, hard cap at 10k** (was ~20k in Rev 1): snapshot cells
  persist as celldata objects in the `.frees` file and are parsed by Univer
  on every load — the cap protects file size and load time, not just heap.
  Above the cap the dialog routes users to the existing CSV export instead.
  *(Critique-adopted.)*
- Snapshot sheet names carry a timestamp (`ODE run (2026-07-03 14:00)`) so a
  static snapshot is never mistaken for a live table. *(Critique-adopted.)*

### f. Formula persistence overlay *(Rev 2: new — closes the formula paradox)*

- Rev 1 had a contradiction: decision 6 lets a user type a Univer formula
  into an input cell (its computed value feeds the solver), but decision 3
  rematerializes bound sheets from the spec on load — so the formula string
  would be **silently destroyed on reload**, replaced by a frozen number.
  Unacceptable: if it looks like a spreadsheet, formulas must survive.
- Fix — a **sparse formula overlay on the spec**, not a cell-type change:
  `TableSpec` gains optional `formulas?: Record<string /* A1 */, string>`.
  Row cells keep holding the last computed value as a string (so
  `toFunctionTableDtos`/`solveTable` wire paths are **completely
  untouched**), and `specToSheetData` re-applies the overlay as `f`-only
  cells at materialization — Univer recomputes on load, exactly the
  adapter's existing formula convention. `sheetEditsToSpec` maintains the
  overlay (formula entered → recorded; formula replaced by a literal →
  entry removed). Formulas may reference only bound cells / other sheets in
  the Tables workbook (decision 4 means there are no scratch cells to
  reference). Optional field → old files load unchanged, old app versions
  ignore it (sanitize already tolerates unknown/missing slices).
- **Error-string sanitization** *(Rev 3)*: a formula can evaluate to a
  Univer error (`#REF!` after a referenced sheet is deleted, `#DIV/0!`,
  `#VALUE!`, …). The mapper must recognize error results from the facade
  and map them to a **blank/omitted spec value** — the existing
  omit-invalid wire rule (`tables.ts:97-121`) then keeps them off the
  solver, never a crash-risk string in a DTO. The **overlay entry is
  retained** (the formula persists so the user can fix it) and the cell
  gets a visual warning (error style + toast on first occurrence). Phase 0
  item 6 probes what sheet deletion does to cross-sheet references
  (auto-`#REF!` vs a hanging reference that throws on `getValues()`) — the
  mapper must tolerate both.
- Formulas in **protected** (computed/result/code) cells: not possible —
  protection rejects the edit; the overlay only ever covers editable
  coordinates.

## Implementation Plan (each phase independently shippable)

### Phase 0 — Univer capability spike (timebox: one day, gates contracts b/c)
*(Rev 2: grew from half a day — three critique-adopted probes added.)*
Answer with a small probe branch, against `preset-sheets-core` 0.25.1:
1. Protected ranges / permission API: present in the preset? Facade or
   plugin config? Can a range be locked while the rest of the sheet edits?
2. Command interception: can `onBeforeCommandExecute` veto
   `set-range-values` + row/col structural mutations cleanly? **Undo-stack
   probe (gate):** paste a block spanning editable + protected columns,
   reject the protected part, then inspect the undo stack — ghost entries
   that can't be atomically cleaned ⇒ interception fallback is dead and
   item 1 becomes a hard blocker (contract c).
3. **Async formula completion (gate):** `=SUM(A1:A1000)`, edit `A1`,
   measure the gap between `CommandExecuted` and the computed value being
   visible to `getValues()`; identify the calculation-complete
   event/lifecycle hook the sync must gate on (contract b). **Also verify
   whether the background recalc of the *dependent* cell emits any sheet
   mutation/command event or resolves silently in the data model** — this
   decides whether the targeted formula scrape (contract b) is
   belt-and-braces or the *only* mechanism keeping dependent values fresh.
   *(Rev 3.)*
4. Facade `getValues()` on formula cells returns computed values once
   calculation completes (ordering vs the formula engine, ties into 3).
5. **Context-menu customization:** can structural items (insert/delete
   row/column) be hidden or rerouted per-sheet without affecting normal
   spreadsheet windows (contract a)?
6. Sheet-tab UX: programmatic add/remove/rename/reorder of sheets in one
   workbook; per-sheet toolbar injection point for the schema toolbar;
   rename event observable for the name↔spec sync. **Cross-sheet reference
   deletion probe** *(Rev 3)*: programmatically delete a sheet that another
   sheet's formula references — does Univer rewrite the formula to `#REF!`,
   or leave a hanging reference that throws on `getValues()`? (Feeds the
   contract f error-sanitization rules.)
7. Perf sanity: one workbook with 10 sheets × 1k rows — load time and edit
   latency.
Deliverable: support matrix recorded here + mechanism decision for
contract c + the named formula-complete event for contract b.
**Fail on (1) AND (2) → stop, redesign; fail on (3) with no discoverable
completion signal → formulas in bound sheets are cut from v1 (overlay
contract f ships dormant) rather than shipping stale-read corruption.**

**SPIKE RESULT (2026-07-03, `@univerjs/preset-sheets-core` 0.25.1,
branch `spike/univer-capability`): FULL PASS — no contract needs its
fallback.** Probe: `frontend/univer-spike.html` +
`frontend/src/spike/univerSpike.ts` (spike branch only, plus a temporary
vite `rollupOptions.input` entry), run headless via `vite build` +
`vite preview` + Playwright. Matrix:
1. **Protection: PASS, with one gotcha.** `FRange.getRangePermission()
   .protect()` ships in the preset (`protectedRangeShadow` config confirms
   the render side too), but the default rule only restricts *non-owners* —
   the local session is the owner, so writes still succeed after a bare
   `protect()`. The working recipe is `protect()` **then
   `rule.setPoint(RangePermissionPoint.Edit, false)`**: command-level writes
   are then rejected (`executeCommand` returns `false`, no exception).
2. **Undo-stack cleanliness: PASS on both paths.** A mixed write spanning
   editable + protected columns (the paste shape) is rejected **atomically**
   by native protection — no partial write to the editable part, **no undo
   entry**. The `onBeforeCommandExecute`-throw veto also cancels cleanly
   (value unchanged, undo stack untouched, error propagates to the caller)
   — so interception stays viable for filtering *structural* mutations.
   Contract c's "hard blocker" branch is moot.
3. **Async formula: PASS — and the critique's trap is confirmed real.**
   After editing `A1` upstream of `B1 = =SUM(A1:A5)`, `B1` still reads the
   stale value 2 ms after the edit; fresh at ~104 ms.
   `FFormula.onCalculationResultApplied()` / `calculationResultApplied()` /
   `calculationEnd()` all exist and work — this is contract b's gate. The
   dependent recalc dispatches `formula.mutation.set-formula-calculation-
   result` — **not** `sheet.mutation.*` — so the existing `SpreadsheetTab`
   sync filter would indeed miss it. Bonus: the `SheetValueChanged` facade
   event fires for **both** the edited and the dependent cell (A1 *and*
   B1) — candidate single event source for the sheet→spec trigger.
4. **`getValues()` post-calc: PASS** — fresh value after awaiting
   `onCalculationResultApplied()`.
5. **Context menu: config surface confirmed** — the preset factory accepts
   `menu` (per-item `{hidden}`) + `contextMenu`; instance-level granularity
   is sufficient because the Tables workbook is its own Univer instance
   (decision 2). Exact menu-item ids verified visually in Phase 1.
6. **Sheet ops + `#REF!`: PASS.** Facade create/`setName` work;
   `SheetDeleted` event fires. Deleting a referenced sheet **rewrites the
   dependent formula itself to `=#REF!`** (cell holds
   `{f:'=#REF!', v:'#REF!', t:1}`) — Univer destroys the original formula,
   which makes the contract-f overlay the *recovery* path, not just
   persistence. `getValue()` on the error cell returns `null` → maps onto
   the omit-invalid wire rule with no extra code. (Caveat: `deleteSheet`
   returned `false` despite succeeding — don't trust its return value.)
7. **Perf: PASS, non-issue.** 10 sheets × 1k rows × 8 cols:
   `createWorkbook` 37–39 ms, single edit 7–8 ms, 8k-cell facade read
   9–10 ms, engine boot 19–51 ms.

**Write-back mechanism decision (new):** the materializer writes protected
result cells via the **mutation level** (`sheet.mutation.set-range-values`),
which bypasses the command-layer permission gate by design and creates **no
undo entry** — correct semantics, since solver write-back must not be
user-undoable. Point-toggling (allow→write→deny, ~5 ms) also works but has
a race window while permission is lifted — rejected.

**New constraint for Phase 1:** protection rules are engine session state,
not part of our stored format — `specToSheetData`'s protection map must be
(re-)applied on every mount/materialization, and rule creation is async
(`protect()` + `setPoint()` are promises) so the host must await protection
before declaring a bound sheet ready for input.

### Phase 1 — Lookup/function tables hosted in Univer
Create: `spreadsheet/tableBinding.ts` (contract a: FunctionTableSpec both
directions + protection map + spatial filter + paste clipping + formula
overlay per contract f), `spreadsheet/useUniverTableSync.ts` (contract b
state machine, extracted and unit-testable), `spreadsheet/
TablesWorkbookTab.tsx` (decision 2: one engine, sheet-per-table, navigation
list, schema toolbar, context-menu filtering — reusing the
`SpreadsheetTab.tsx` lifecycle/sync/selfWrite patterns; extract shared
hooks rather than copy).
Modify: `TablesTab.tsx` (function tables route to the workbook host; the
old editors stay behind a fallback flag for one release), `App.tsx` content
map (`table` window kind renders the workbook host), `tables.ts` (add the
optional `formulas` overlay field + row-op helpers the mapper needs —
sanitize tolerates the new optional field).
Explicitly unchanged: DTO wire path (`toFunctionTableDtos`), code-table
merge, Graph Digitizer table creation.
Tests: vitest `tableBinding.test.ts` — spec→sheet→spec round-trip identity
(values **and** formula overlay); blank/invalid cell omission matches
`toFunctionTableDtos`; 1-D vs 2-D layouts; protected-coordinate edits
ignored by the mapper; paste block clipped at column bounds; **row growth
truncated at the 5k cap with the truncation reported**; **error strings
(`#REF!`/`#DIV/0!`/`#VALUE!`) map to omitted values with the overlay entry
retained**; out-of-region content never reaches the spec.
`useUniverTableSync` state-machine tests: materialization queued during
`USER_EDITING`, applied on commit-settle **and on blur**; **stale-dependent
scrape** — upstream value change with no event for the dependent formula
cell still yields a fresh value at DTO build (the pre-DTO scrape).
`npm run build` type gate.

**PHASE 1 RESULT (2026-07-03, branch `spike/univer-capability`): DONE,
verified end-to-end.** Implementation notes vs the plan:
- Files: `spreadsheet/tableBinding.ts` (+`.test`), `tableSyncMachine.ts`
  (+`.test` — named per its state-machine role; the "hook" is the host's
  dispatch), `TablesWorkbookTab.tsx`, `tablesWorkbookBridge.ts` (Univer-free
  module carrying the flag + pre-DTO `flush` so App never statically imports
  the Univer chunk). `FunctionTableSpec.formulas` added (contract f).
- One dock window `table:univer-workbook`; function tables lose their
  per-table windows; every open path (rail menu, Spotlight, digitizer send,
  `openTableWindow`) routes there. Fallback `VITE_TABLES_WORKBOOK=0`.
- v1 deviation: the grid **context menu is disabled wholesale** on the
  Tables workbook (per-item filtering deferred to Phase 2 polish);
  structural column/sheet commands are additionally vetoed command-level.
- Pre-DTO scrape: `flushTablesWorkbook()` returns the fresh specs
  synchronously (React state lands a render later — too late for the solve
  handler's closure); `functionTableDtos` became a function calling it.
- Materializer writes protected cells at the mutation level per the spike
  decision; protection rules re-applied on every mount (session state).
- E2E verified against the live Docker backend (vite preview + `/api`
  proxy, added to vite.config): sheet-entered 1-D table → `U = func1(2.5)`
  solves to 25; a `=A4*10` cell contributes its **computed** value to the
  DTO, survives reload (overlay → rematerialize → Univer recomputes), and
  editing upstream A4 refreshes the dependent spec value to 40 (the
  dependent-recalc trap, closed); protected header edit rejected
  (`argName` unchanged). Vitest 138 green (29 new); build green.
- Not yet exercised live: 2-D curve-header edits, paste clipping UX, code
  `TABLE` blocks as protected sheets — covered by unit tests, flagged for
  Phase 2's e2e sweep.

### Phase 2 — Parametric tables + result write-back
Extend `tableBinding.ts` to `ParamTableSpec`: input columns editable,
computed columns protected **with the visual lock styling** (contract c),
`solveTable` results written back through the state machine (queued if the
user is editing); code/ODE-origin specs fully protected.
Modify: retire the Mantine grid in `ParametricTableTab.tsx` (keep its
run-controls/stats strip as the sheet toolbar), `ConfigureTableModal.tsx`
(now the only column-schema editor, per contract a), `App.tsx:518-573`
linked-table effects removed + soft `linkedTableId` handling (contract d:
field preserved, inert, toast, explicit Unlink), `spreadsheet/types.ts`
(document the field as superseded-but-parsed).
Tests: round-trip with mixed input/computed columns; result write-back does
not echo into spec inputs; write-back queued during an active edit lands
after settle; a `linkedTableId` project fixture loads with the field intact
and the link inert; existing project round-trip tests stay green (`tables`
slice format is backward-compatible — that is the point of decision 1).

**PHASE 2 RESULT (2026-07-03, same branch): DONE, verified end-to-end.**
Deviations vs the plan, all deliberate:
- **Computed cells are not range-protected.** The frees parametric model has
  no fixed result columns — any blank input cell becomes computed per run —
  so "protected result columns" would be a scattered, per-cell rule set.
  Instead: computed cells render green (visual lock cue), typing over one
  turns it into an **input override** (standard equation-solver behavior) and invalidates
  results/check exactly as the old grid's invalidateActiveParam did; the
  mapper detects untouched computed cells against the previous spec, so
  write-backs never echo into inputs. Failed runs render a red `n ✗` Run
  marker.
- **Code PARAMETRIC and ODE tables stay in their per-table glide windows**
  (decision 5's spirit — ODE trajectories can be 100k rows of derived
  data); only GUI parametric tables are hosted. `isHostedTable` (in the
  Univer-free bridge) is the single predicate App and the host share.
- **Row floor:** blank rows are runs, so sheet→spec never trims below the
  previous row count; Add/Remove Row buttons (workbook toolbar) stay the
  row-count controls, typing below the last run grows it.
- **solveTable write-back needed no new path** — results land in the spec
  and the existing materializer (state-machine-queued, mutation-level,
  style-carrying) writes the computed cells.
- Header units are not sheet-editable in v1 (schema stays in
  ConfigureTableModal / variable info); code/ODE headers render `name
  [unit]`.
- `linkedTableId`: both sync effects removed; field inert + preserved;
  "Unlink table (legacy)" button in the spreadsheet toolbar strips it;
  legacy projects get a load notice; "Export to Spreadsheet" is now a
  timestamped snapshot with no link (contract e).
- Bug found by e2e and fixed: focusing the workbook window clobbered
  `activeTableId` with the window id — excluded in the dock focus handler.
- E2E (Docker backend, preview + Playwright): parametric table created in
  the workbook, columns configured via the modal, inputs typed (stray
  keystrokes into the protected header were rejected), Check Table OK, Run
  Table wrote green computed values; a 99 typed over computed `c`
  invalidated results and the re-run failed that row with the red marker
  (2/3 runs solved). Note for host verification: build with
  `VITE_ASYNC_API=1` or the 202+job solve path silently never polls.
Vitest 147 green (9 new parametric binding cases); build green.

### Phase 3 — Read-only snapshots ("Open in Spreadsheet")
Create: snapshot action on the ODE glide grid, `StatesTab`, and the
analyzer `TableInstrument` (contract e: 5k warn / 10k hard cap → CSV-export
routing above it, timestamped sheet names) → new sheet in a chosen/new
spreadsheet window via the stored-celldata format (no Univer dependency at
the call site).
Tests: snapshot of an ODE fixture lands values+units header; cap paths
(warn accepted, hard cap routes to CSV); `.frees` round-trip includes the
snapshot sheet.

**PHASE 3 RESULT (2026-07-03, same branch): DONE.**
`spreadsheet/snapshot.ts` (Univer-free builder, unit-tested caps: 5k
confirm / 10k hard → CSV message; timestamped names); shared
`createSnapshotSpreadsheet` in App feeding (a) the rewritten Export to
Spreadsheet (units headers, `n ✗` failed-run markers, caps), (b) an "Open
in Spreadsheet" button on read-only code/ODE table windows, (c) per-grid
snapshot buttons in Fluid States (converted to the selected display
units). **Deviation:** the analyzer `TableInstrument` snapshot is deferred
— measurement-scale channels mostly exceed the 10k cap by design and the
analyzer already ships CSV export; revisit on demand. Verified live
(Inspector export from the workbook window → timestamped spreadsheet
opens). 151 tests green.

### Phase 4 — Retirement & cleanup
Remove the flag-fallback Mantine editors (`FunctionTableEditor.tsx`,
`CurveTableEditor.tsx`, the `ParametricTableTab` grid), drop dead code.
Verify the `ag-grid` vendor chunk (`vite.config.ts:55`) has no remaining
render site and remove the dependency if so. Update help topics
(`src/docs/`) that show the old table editors. Bundle check: Univer must
remain lazy — the Tables workbook host ships in the same lazy chunk as
`SpreadsheetTab`.

**PHASE 4 RESULT (2026-07-03, same branch): DONE — the one-release
fallback gate was waived by owner decision ("proceed next phase").**
- `FunctionTableEditor.tsx` + `ParametricTableTab.tsx` deleted
  (`CurveTableEditor.tsx` never existed as a file); `ParamRow`/
  `newParamRow` moved to `tables.ts`; `VITE_TABLES_WORKBOOK` flag removed
  (workbook unconditional). TablesTab is now a slim read-only code/ODE
  window (glide grid + Open in Spreadsheet + a new **"Editable copy"**
  action cloning a code table into the workbook — preserves the old
  strip's copy-to-editable feature).
- MobileLayout falls back to the workbook panel for hosted tables.
- ag-grid: the dependency was already gone from package.json and src;
  only the dead manualChunks line remained — removed. Bundle verified:
  no ag-grid chunk, no spike entry, Univer absent from every entry
  chunk (lives in the lazy shared `univerAdapter` chunk, 5.4 MB, shared
  by SpreadsheetTab + TablesWorkbookTab as intended).
- Docs audit: help pages describe `PARAMETRIC` blocks and the Tables
  window generically; no old-editor UI was documented → no doc changes.
- Spike artifacts stripped (univer-spike.html, `src/spike/`, vite input
  entry); the vite `preview.proxy` addition is kept (useful for host
  verification).
- Live smoke post-retirement: function and parametric table creation
  both land in the workbook with their toolbars. 151 tests green.

## Risks

- **Univer protection/permission maturity in the preset** (highest): gated
  by Phase 0 items 1+2 with the undo-stack probe deciding whether the
  interception fallback is even admissible (contract c); the mapper
  independently ignores protected coordinates either way.
- **Async formula engine** (Rev 2, hardened Rev 3): sheet→spec sync gated
  on the calculation-complete signal, and the unconditional pre-DTO formula
  scrape (contract b) backstops missed events and silent dependent recalcs
  — the solver can only ever see facade-fresh evaluated values. If Phase 0
  finds no reliable completion signal at all, formulas in bound sheets are
  cut from v1 rather than risking stale reads into the solver.
- **Sync-loop regressions**: two writers (binding materializer + user
  edits) now ordered by the `useUniverTableSync` state machine, with the
  proven `selfWriteRef` guard underneath and pure, unit-tested mappers. The
  formula-cached-v seam is closed by decision 6 (facade reads only).
- **UX regression for fast keyboard entry**: the Mantine editors are
  clunky, but they exist; Phase 1 keeps them behind a fallback flag for one
  release so the workbook host must win on merit before the old path dies.
- **Engine cost**: bounded by decision 2 (one engine for all tables). The
  Tables workbook joins the existing per-window engine population; opening
  Tables + N free spreadsheets is unchanged from today's N+1 worst case.
- **`.frees` compatibility**: low — the `tables` slice gains only an
  optional `formulas` field (old versions ignore it); `linkedTableId` is
  preserved, not stripped (downgrade-safe, contract d).
- **Undo semantics**: Univer's undo stack vs spec state can diverge on
  rejected mutations; Phase 0 item 2 probes this directly, and v1 documents
  that undo inside a bound sheet is best-effort (consistent with app-wide
  no-undo precedent).

## Adopted / rejected critique points

### Round 3 (Rev 3) — all four new points adopted

- **Dependent-formula recalculation trap** → contract b targeted formula
  scrape (calc-complete + unconditional pre-DTO), Phase 0 item 3 probe.
  The sharpest catch of the round: without it, `spec.rows` can silently
  diverge from the canvas and feed the solver a stale value.
- **Unbounded row paste** → contract a 5k row cap, enforced in the mapper's
  growth op so every growth path is covered.
- **Error-string sanitization** → contract f: errors become omitted values
  (existing wire rule), overlay retained, visual warning; Phase 0 item 6
  probes `#REF!` vs throwing hanging references on sheet deletion.
- **Edit-settle definition** → contract b: commit or blur exits
  `USER_EDITING` and flushes the queue; abandoned open cells can't pin
  solver results forever; documented stale-while-editing limitation.

### Rounds 1–2 (Rev 2)

**Adopted** (both rounds, deduplicated): async formula gate + completion
event (→ contract b, Phase 0 items 3/4); undo-stack probe for interception,
promotion of native protection to hard blocker if it fails (→ contract c,
Phase 0 item 2); paste clipping + toast (→ contract a); context-menu
filtering on bound sheets (→ contract a, Phase 0 item 5); strict spatial
filter in the mapper (→ contract a, made explicit); navigation list instead
of raw sheet tabs (→ decision 2); tab-rename↔spec-name sync, tab deletion
disabled (→ contract a); sync state machine `useUniverTableSync` (→
contract b); visual lock styling for protected columns (→ contract c,
Phase 2); formula persistence overlay (→ new contract f — the strongest
catch of either round); soft `linkedTableId` migration preserving downgrade
(→ contract d); snapshot cap 5k/10k + CSV routing + timestamped names (→
contract e).

**Rejected / deferred, with reasons:**
- **Auto-schema expansion on horizontal paste overflow** ("add 8 new curve
  parameters?"): deferred — it is schema mutation via grid gestures, which
  contract a deliberately excludes from v1; strict clipping + toast covers
  the case without a second schema-edit pathway. Revisit with post-v1
  feedback.
- **Extending `TableSpec` cell types to carry formulas** (critique 2's
  Option A as literally proposed): adopted in *spirit*, but implemented as
  the sparse overlay (contract f) instead of changing cell value types —
  cells are already strings consumed by `Number()` at DTO build, so a
  side-map keeps the wire path and every existing consumer untouched.
- **Blocking formulas in bound sheets** (critique 2's Option B): rejected as
  the default — it neuters the point of a spreadsheet host. It survives
  only as the Phase 0 escape hatch if no calculation-complete signal exists.
- **Replacing `selfWriteRef` with the state machine**: the machine is added
  *above* the guard, not instead of it — the identity check is proven in
  production and still needed as the low-level echo filter.
- **Critique 1's snapshot heap numbers** (50–100 MB "instantly" at 200k
  cells): the magnitude is overstated for plain numeric celldata, but the
  underlying point (persisted-file bloat + Univer parse time on load) is
  real and the cap was lowered anyway — the binding constraint is the
  `.frees` file, not transient heap.

## Verification

- Per phase: `cd frontend && npm run build` + `npx vitest run`.
- End-to-end after Phase 1 (`./frees.sh start`, http://localhost:5173):
  create a 2-D lookup table in the Tables workbook, reference it from an
  equation, solve, correct value; edit a cell, re-check, solve reflects it;
  type a Univer formula into a data cell, confirm its **computed** value
  reaches the solver *and the formula itself survives a `.frees`
  save/reload* (contract f); paste an oversized block from a real
  spreadsheet and confirm column clipping + row-cap truncation + toasts;
  edit an upstream cell a formula depends on, solve immediately, confirm
  the solver received the **recomputed** dependent value (the pre-DTO
  scrape); delete a sheet another sheet's formula references — errored cell
  visibly flagged, omitted from the solve, formula survives reload;
  right-click a column header on a bound sheet — no structural items;
  save/reload `.frees` — sheets rematerialize from specs (and the file
  contains no bound-sheet celldata beyond the formula overlay).
- After Phase 2: parametric run — inputs entered in the sheet, results land
  in visually-locked protected columns, editing a result cell is rejected
  **and Ctrl+Z immediately afterwards does not corrupt the sheet**; trigger
  a solve, keep typing in an input cell while results arrive, confirm the
  write-back waits for the edit to settle; load a pre-plan project using
  `linkedTableId` — field intact, link inert, toast shown; code-defined
  `PARAMETRIC`/`TABLE` blocks render protected.
- After Phase 3: ODE run → snapshot → values match the glide grid at spot-
  checked rows; timestamped sheet name; >10k-row snapshot routes to CSV;
  project round-trip keeps the snapshot.
- After Phase 4: `npm run build` bundle report — no ag-grid chunk, Univer
  still absent from the entry chunk.
