# frEES — Data Analyzer (oscilloscope-like Measurement Analysis App)

## Context

frees has solver-bound plotting (Plotly) and spreadsheet/table windows, but no way to import
external measurement data, explore recorded signals, or do time-series root-cause analysis.
This increment adds a native **Data Analyzer** app, benchmarked against **a measurement-tool vendor the reference measurement tool V8**
(Measure Data Analyzer), the industry-standard ECU/vehicle measurement analysis tool. Feature
research is grounded in the the reference measurement tool documentation research corpus (id
`674b82cb-527f-463d-aff2-555dd5ca70f4`); libraries verified on npm/Maven Central.

**Revision 4 (final — unconditionally approved by both reviewers)** — incorporates four
external critique rounds. Every critique claim was verified against the codebase before
adoption; adopted points became the **Design contracts** (§2.5) and phase amendments below;
non-adopted points are recorded in **Rejected / deferred critique points** with reasons.
Round 3 approved the architecture and contributed implementation-level notes (Transferables,
GC contract, over-cap UX, sidecar transport = decision 4, CoolProp lock starvation risk).
Round 4 approved unconditionally; its three mechanical gotchas are folded in (detached-buffer
ordering in the worker, uPlot ResizeObserver loop guard, primitive-boxing escalation of the
GC contract) and the **mdf4j spike is now a structured, gated timebox** (§ Phase 3).

**Decisions taken (with owner sign-off):**
1. Oscilloscope engine = **uPlot** (new ~45 KB dep; canvas, millions of points, built-in cursor
   + multi-chart sync). Plotly remains for scatter/histogram and all existing plots.
   Alternative was Plotly `scattergl` with hand-built cursors.
2. **ASAM MDF4 (.mf4) import is in scope**, phased in at Phase 3 behind a timeboxed spike
   (CSV/TSV ships first, client-side). Fallback ladder now includes a planned **asammdf
   Python sidecar** rung (§ Phase 3) if mdf4j fails on real OEM files.
3. **Phase 4 calc compute policy = cap + cache, no cancel in v1**: hard raster cap, CoolProp
   LRU cache on the calc path, async SSE above a low threshold; cooperative job cancellation
   is deferred (none exists anywhere in the backend today — it would be net-new).
4. **Sidecar transport (if the asammdf rung is reached) = internal REST over Railway's
   private network, not gRPC.** Rationale: the sidecar is a contingency, not a core service —
   a proto toolchain + codegen in two languages is unjustified for ~3 stateless endpoints
   (`parse-metadata`, `extract-channel`, `health`); Railway's private network is plain
   HTTP-friendly, and the repo already carries a hard-won lesson that its private IPv6
   addresses change per redeploy (the nginx `resolver` foot-gun in CLAUDE.md) — the Java
   client must re-resolve DNS per request (set `networkaddress.cache.ttl` low / resolve by
   hostname each call), which is trivial over HTTP and awkward with long-lived gRPC channels.
   Resilience contract in § Phase 3.

## 1. Feature Investigation — the reference measurement tool features → frees requirements (the research corpus-grounded)

the reference measurement tool is a high-performance viewer/analyzer for ECU & vehicle measurement data: docking-window
UI, "Configurations" storing layout + signal assignments + measure files, engineered for
millions of samples.

| the reference measurement tool feature | Detail (from docs) | frees Data Analyzer requirement |
|---|---|---|
| **File formats** | ASAM MDF V3 (`.dat`/`.mf3`), MDF V4/4.3 (`.mf4`, LZ4/ZSTD), CSV/TSV/DXL/DIA ASCII (custom INI layouts), XLS(X), a matrix language, bus traces (BLF/ASC), `.lab`, `.cdf` | **P0:** CSV/TSV (client-side). **P1:** MF4 (backend). Later: MDF3, XLSX, `.mat`. Bus traces/lab/cdf out of scope |
| **Variable Explorer** | Search/filter huge signal lists by source file, device, raster, type; AND/OR filters | Signal browser panel (glide-data-grid) with text search + per-file filters |
| **Oscilloscope** | Analog/Boolean/event strips; independent X/Y zoom + zoom-box; dual cursors → auto delta readout; continuous vs sample-snap cursors; anchored cursors | Multi-strip time-series (uPlot), dual cursors + Δt/Δy readout, sample-snap, zoom-box |
| **Table** | Values by timestamp; interpolates empty cells (step-hold) | Time-indexed grid of selected signals, step-hold fill |
| **Scatter / Histogram / Statistics** | Signal-vs-signal correlation; user-defined classes; avg/min/max/median/stddev over selected range | Scatter + histogram instruments (Plotly); stats bound to cursor-bounded range |
| **Event List** | Condition (or Boolean calc signal) → timestamps; double-click jumps all synced instruments | Condition-based event finder + click-to-navigate |
| **GPS Map / Video / Phasor / Battery instruments** | Domain add-ons | Out of scope v1 (GPS map candidate P2) |
| **Calculated signals** | Formula editor; arith/logic/bitwise/ternary; reduction behaviors (`Accumulate_Prefix/Rolling/Reset/Samples`) × fns (`_Average/_Integral/_Min/_Max/_Sum/_Count`); `State_Delay()`, `Delta()`, `Master()`; inputs step-interpolated; output raster = merge / fixed / same-as-signal; compiled C-like engine in V8 | **Reuse the frees equation evaluator** per-sample over a merged raster with per-input step/linear interpolation; `delta`/`integral`/`movavg`/`delay` time ops. frees differentiator: units-aware + CoolProp property functions on measured data |
| **FMU functions** | FMI V2 derived-signal models | Out of scope (frees COMPONENT layer is the future analog) |
| **Cross-instrument sync** | Linked time axes; master sync cursor drives oscilloscope ↔ table ↔ scatter ↔ map | Shared per-session time cursor + range; one move updates every instrument |
| **Multi-file compare** | Multiple files per config; per-file or per-signal time offset (numeric or SHIFT-drag) | Multi-file sessions with per-file time offset (numeric Δt entry **and** SHIFT-drag) |
| **Export** | Signal subset and/or visible time range to MDF/CSV; instrument toolbar pre-fills range | Export selected signals × visible window → CSV (MF4 later) |
| **Configs/templates** | `.xdx` config, `.xdt` template (layout w/o data), `.zdx` zipped | Analyzer session as a slice in the `.frees` project file (layout, assignments, formulas, file refs — never bulk data); see **template mode** contract §2.5b |
| **Large-file performance** | MDF index → reduced dataset drawn w/o losing peaks; on-the-fly indexing; signal cache; lazy cursor values (`~` approx → exact) | Min/max envelope decimation (M4-style, type-aware §2.5d), per-channel columnar cache, exact cursor lookup via binary search / lazy fetch |

## 2. Technology Stack

| Concern | Choice | Rationale |
|---|---|---|
| Oscilloscope charting | **uPlot 1.6.32** (new dep, MIT) | Canvas, millions of points, built-in cursor + multi-chart cursor sync = the reference measurement tool sync-cursor for free. Wrapper modeled on `frontend/src/plots/PlotlyChart.tsx` **in lifecycle only** (dynamic import, ResizeObserver, purge-on-unmount) — uPlot's aligned-arrays data shape and `cursor.sync` API differ materially from Plotly (risk-listed) |
| Scatter/histogram | **Plotly** (existing) | Not perf-critical; reuse `plots/figure.ts` builder style |
| Grid | **@glideapps/glide-data-grid 6.0.3** (existing) | Canvas-virtualized; already the read-only grid (`DataGridReadOnly.tsx`, `TablesTab.tsx`) |
| CSV parse | **papaparse 5.5.4** (new dep, MIT) | Streaming client-side parse in **worker mode** (no main-thread jank at 1 M+ rows) into `Float64Array` columns via a chunked growable-buffer strategy (double-on-full, trim at end). Parsed buffers return to the main thread as **Transferable Objects** (`postMessage(msg, [buffers])` — zero-copy ownership transfer); a structured-clone copy of hundreds of MB would freeze the main thread for seconds and defeat the worker. **Ordering rule:** transfer detaches the buffers in the worker instantly, so every worker-side derived result (column min/max, monotonicity validation, type sniffing) must be computed *before* the `postMessage` — reading a detached buffer throws |
| MF4 parse | **`de.richardliebscher.mdf4j:mdf4j:0.2.0`** (backend, spike-gated) | Only MDF4 reader on Maven Central; early-stage → isolated behind a `MeasurementParser` interface with a 4-rung fallback ladder (§ Phase 3). **License check is a spike deliverable** (repo is MIT; no license tooling exists) |
| State | **`useReducer` + local context** inside the analyzer (no zustand) | Self-contained window; App.tsx keeps only the serializable `AnalyzerSpec[]` slice like `whiteboards`. Bulk samples live in a module-level ChannelStore outside React (no re-render storms, no autosave bloat). **ADR note:** the frontend has no external store today (verified — App.tsx `useState` + prop drilling everywhere); ChannelStore is deliberately the first non-React store, holding bulk data only, never UI state |
| Windowing | **dockview-react** (existing) `analyzer:<uuid>` kind | Exact whiteboard pattern. Inside the window: vertical resizable strip stack (not nested dockview) — matches the reference measurement tool's stacked-strip workflow, trivially serializable |
| Backend service | Spring `MeasurementController` on the API node + core `measurement` package | I/O-bound, not solver compute; async job pattern (dispatcher → RabbitMQ → Redis job store + SSE) already exists for heavy calc requests |

**Data-locality architecture (hybrid):** all instruments read from a client-side columnar
**ChannelStore** (`getWindow(ref, from, to, maxPoints)`), fed by `InMemorySource` (CSV parsed
in-browser) or `RemoteSource` (MF4 uploaded, indexed server-side, fetched as windowed decimated
envelopes). One shared window DTO for both:
`ChannelWindow { t[], v?[], min?[], max?[], decimated, totalSamples, unit }` — raw `v` when
small, M4 min/max envelope when large; cursor readout always resolves the exact sample lazily
(the reference measurement tool's `~`→exact pattern).

## 2.5 Design contracts (bind Phase 1+; written before code)

These pin the load-bearing behaviors both critiques flagged as named-but-unspecified.

### a. ChannelStore lifecycle

- **Cache key** = `measurementId` (uuid minted at import time), stored in `AnalyzerSpec`
  together with a **file signature** `{ name, size, headerHash }` where `headerHash` = hash of
  the first 64 KB + the parsed column-name list. Never a full-content hash (1 GB CSVs).
- **Sharing + refcount**: entries are refcounted by the `AnalyzerSpec`s that reference them;
  two analyzer windows on the same file share one entry.
- **Release binds to analyzer *deletion*, not window close.** Verified codebase behavior:
  closing a dockview window never deletes backing state — App reconciles state→windows
  (`App.tsx:1492-1508` closes windows whose object was deleted; there is no
  `onDidRemovePanel` cleanup hook exposed to App). So `channelStore.release(measurementId)`
  is called from `onDeleteAnalyzer` (mirroring `onDeleteWhiteboard`, `App.tsx:2503`), and a
  closed-but-not-deleted analyzer keeps its data (reopen is instant), exactly like every other
  frees window kind.
- **Eviction**: warn at ~50 M cells; past the ceiling, LRU-evict measurements not referenced
  by any *open* analyzer window. Evicted data degrades to the same "re-import file" placeholder
  as project load (§b) — never a silent OOM crash. Note the ceiling is deliberate headroom,
  not comfort: 50 M cells ≈ 400 MB of `Float64Array`s is high for one browser tab — Phase 1
  end-to-end testing includes watching overall tab memory (DevTools memory panel) at the
  warning threshold.

### b. Persistence — "template mode"

- Named behavior (the reference measurement tool `.xdt` analog): the `.frees` project stores **refs only** (layout,
  signal assignments, formulas, file signatures). On load, an analyzer window renders its
  **full layout with empty strips** plus one per-missing-file "Locate file…" banner; one
  re-pick repopulates every strip bound to that file.
- Re-picked files are **verified against the stored signature**: column-name match is
  mandatory (wrong file rejected — hard error, per project strict-over-warn policy);
  size/headerHash mismatch is advisory with explicit override.
- Project load shows one summary toast: "N analyzer window(s) awaiting measurement files."
- Mid-session `RemoteSource` 404 (API node restarted, ephemeral store gone) reuses the same
  banner inline with a re-upload action — not just at project load.

### c. CSV time-base contract

- `csvImport.ts` must emit a **sorted, strictly monotonic `Float64Array` of seconds** per file.
- Detection heuristic, in order: column-name match (`time|t|timestamp|zeit|sec|ms`),
  monotonicity scan, format sniffing (ISO-8601 string, epoch s vs ms by magnitude, relative
  seconds, sample index). Unit-header rows on lines 2–3 are consumed by the existing
  header/unit-row detection.
- **Ambiguous or absent time column → modal asks the user** (pick a column, or enter a sample
  rate `dt` for index-based data). No silent guess.
- Duplicate timestamps or non-monotonic rows → **hard import error** naming the offending
  row numbers (strict-over-warn). This contract is load-bearing for step-hold fill (Phase 2)
  and the merged raster (Phase 4).

### d. Type-aware decimation

- Float64 analog channels → M4 min/max envelope (as before).
- **Boolean/enum channels → transition-preserving decimation**: all edges kept while under the
  point budget; over budget, per-bucket "any-change" flag so no pulse ever disappears. Min/max
  alone renders a 1-sample pulse sub-pixel — wrong for the boolean strips Phase 1 ships.
- String-valued channels (fault codes, state names) → **out of scope Phase 1**; known
  limitation noted in the signal browser (import keeps them listed but unplottable).

### e. Signal colors + cursor model

- **Colors**: auto-assigned from a fixed 10-color categorical palette by assignment slot,
  **persisted per-signal in `AnalyzerSpec`** so sessions are color-stable; user override is a
  later polish item. New palette array under `frontend/src/analyzer/` — no reusable helper
  exists (`figure.ts:52-59` palette is property-semantic; XY plots fall back to Plotly's
  colorway).
- **Phase 2 cursor model (explicit)**: cursors **A + B**; continuous ↔ sample-snap toggle;
  Δt/Δv readout; statistics bind to the A–B range. **Anchored cursors are deferred** past v1.

## 3. Implementation Plan (each phase independently shippable)

### Phase 1 — Analyzer shell, CSV import, oscilloscope MVP
Create `frontend/src/analyzer/`: `types.ts` (AnalyzerSpec/SignalRef/ChannelWindow + file
signature), `channelStore.ts` (lifecycle per §2.5a: measurementId key, refcount,
deletion-bound release, LRU eviction), `decimate.ts` (pure min/max envelope **+
transition-preserving boolean path**, §2.5d), `csvImport.ts` (papaparse **worker mode** →
chunked-growable Float64Array, buffers handed back to the main thread as **Transferables**
(zero-copy, per §2), header/unit-row detection, **time-column detection + user
fallback modal**, §2.5c), `palette.ts` (10-color categorical, §2.5e), `UPlotChart.tsx`
(imperative wrapper à la `PlotlyChart.tsx` lifecycle + ResizeObserver — **rAF-throttle the
resize callback and hand uPlot explicit pixel dimensions**, as `PlotlyChart.tsx` already does:
uPlot in a flex/grid dock tile can otherwise trigger a `ResizeObserver loop limit exceeded`
feedback loop),
`DataAnalyzerTab.tsx` (reducer, signal browser, multi-strip oscilloscope, X/Y zoom/pan,
boolean strips).
Modify: `workspace/WorkspaceDock.tsx` (KIND_ICONS), `App.tsx` (state + `createAnalyzer` +
`onDeleteAnalyzer` → `channelStore.release`, near the `createWhiteboard` pattern ~L1576,
content-map loop ~L2261, Spotlight ~L1779), `WorkspaceChrome.tsx` (menu ≈L481),
`package.json` (+uplot, +papaparse).
Tests: vitest `decimate.test.ts` (peak preservation **+ boolean pulse preservation**),
`csvImport.test.ts` (delimiters, unit rows, NaN gaps, **time-column detection matrix: ISO /
epoch s / epoch ms / relative / index+dt / ambiguous→ask / non-monotonic→error**);
`npm run build` type gate. **Fixture policy: large CSVs are script-generated at test time,
never committed.**

### Phase 2 — Cursors + sync, Table & Statistics instruments, persistence, CSV export
Create: `analyzer/instruments/TableInstrument.tsx` (step-hold fill),
`instruments/StatisticsInstrument.tsx`, `analyzer/stats.ts`, `analyzer/exportCsv.ts`
(selected signals × visible range, merged raster).
Modify: `DataAnalyzerTab.tsx` (cursor model per §2.5e: A+B, Δ readout, sample-snap toggle,
uPlot `cursor.sync`, zoom-box), `project.ts` (`analyzers: AnalyzerSpec[]` slice,
`PROJECT_VERSION` → 2, `migrate()`/sanitize — note `migrate` already tolerates missing slices
via `?? []`), `App.tsx` (slice into `buildProject`/load). **Template mode** per §2.5b:
missing-file placeholder + signature-verified re-pick + load-summary toast + mid-session 404
banner.
Tests: stats/step-hold/export-raster vitest; project round-trip + migration test; template-mode
re-pick rejects a wrong-signature file.

### Phase 3 — Backend measurement service + MF4 (spike-gated)
Create: `backend/core/src/main/java/com/frees/backend/measurement/` — `MeasurementParser`
(interface), `Mf4Parser` (mdf4j; **1-day spike first**, see checklist below),
`EnvelopeDecimator` (Java twin of `decimate.ts`, incl. boolean path), `ChannelWindowDto`;
`backend/web/.../api/MeasurementController.java` (`POST /api/measurements` multipart →
metadata; `GET /api/measurements/{id}`; `GET .../channels/{name}?from&to&maxPoints`;
`DELETE`), `MeasurementStore.java` (**stream multipart directly to temp dir — never buffer in
heap**; channel reads via `FileChannel`/`MappedByteBuffer`; in-memory metadata map + TTL/LRU
mirroring `web/.../api/SolveContextCache.java`; lazy channel extraction).
Modify: `application.properties` (multipart limits + `frees.security.max-upload-bytes`),
`RequestGuardFilter.java` (per-route cap raise — **only** `/api/measurements*`, everything
else keeps 1 MB; pattern = the existing `/api/health` short-circuit, lines 63-66. **Note: the
existing cap is Content-Length-only, so the upload route must additionally count streamed
bytes and abort over-cap, and validate magic bytes**), `core/build.gradle` (mdf4j), frontend
`channelStore.ts` (+RemoteSource), `api.ts` (client fns), upload UI.
**Spike structure (1-day timebox, gated — gates the phase):**
- *Pre-work (off the clock):* script-generate the fixture set with Python **asammdf** (the
  reference MDF4 implementation — using it for fixtures also proves the sidecar rung's
  toolchain for free): (a) small uncompressed, (b) DZ/ZSTD-compressed, (c) LZ4-compressed,
  (d) VLSD channel, (e) multi-channel-group with differing rasters + linear/rational/
  value-to-text CCBLOCK conversions, (f) ~100 MB realistic file. Fixtures are generated by a
  committed script, not committed as binaries (except the small (a) test fixture).
- *Gate 1 (hour 0–1) — smoke:* dep resolves, parse (a), enumerate groups/channels, extract one
  channel to arrays. **Fail → spike over, drop to rung 2 immediately.**
- *Gate 2 (hours 1–3) — OEM breakers:* (b), (c), (d), (e) in that order; each binary
  pass/fail into a support matrix. Record the **license** here too.
- *Gate 3 (hours 3–5) — scale:* on (f), measure full-index time, lazy single-channel extract
  time, and peak heap (must not materialize the whole file).
- *Verdict (hour 5–6), criteria fixed up front:* **full pass** = (a)+(b)+(c)+(e) parse and
  Gate 3 is sane → mdf4j is the parser; VLSD (d) alone failing is acceptable (VLSD is mostly
  strings/bus data, out of scope v1) and gets a known-limitation note. **Partial** =
  uncompressed-only → rung 2 covers demos; real OEM files need the sidecar → decision goes to
  the owner with the matrix. **Fail at Gate 1/2 broadly** → sidecar rung, per ladder.
- *Deliverable:* the support matrix + license + measured numbers + go/no-go, recorded here.
- **SPIKE RESULT (2026-07-02, mdf4j 0.2.0, license Apache-2.0 ✓): PARTIAL.**
  Matrix (fixtures from `backend/core/src/test/resources/measurement/generate_mdf_fixtures.py`,
  probes in `Mf4SpikeTest`): (a) uncompressed 4.10 **PASS**; (d) VLSD **PASS** (string channel
  listed, numeric channels extract fine — better than expected); (h) linear conversions
  **PASS** (applied: 0.1·raw−40 verified) and multi-group **PASS**; (b) ZSTD → FAIL
  "Unknown zip type: 2"; (c) LZ4 → FAIL "Unknown zip type: 4"; (g/e) **plain deflate DZ →
  FAIL** ("Should not happen") — i.e. *no DZ compression of any kind*, the real boundary is
  compression, not conversions. Gate 3 on the 99.9 MB fixture: metadata 1 ms, one-channel
  extract 876 ms, retained heap 21 MB (lazy, never materializes the file). **Decision taken:**
  ship Phase 3 on mdf4j for uncompressed .mf4 (typed error tells users to re-export
  uncompressed when a compressed file is uploaded); the **asammdf-sidecar rung for
  compressed OEM files is now an owner decision** (matrix above) — contract already pinned
  in decision 4 below.
**Fallback ladder (in order):** mdf4j → minimal in-house uncompressed-DT-block reader →
**asammdf Python sidecar** (separate container; implements `MeasurementParser` remotely —
adds a second runtime + Railway deploy unit, planned but not built until the spike fails) →
ship Phase 3 as CSV-upload-only.
**Sidecar contract (decision 4, applies only if that rung is reached):** transport = internal
**REST** over Railway's private network (`http://<service>.railway.internal:<port>`), ~3
stateless endpoints (`POST /parse-metadata`, `GET /channels/{name}` streaming, `GET /health`);
the Java client **re-resolves DNS per request** (`networkaddress.cache.ttl` low — Railway
private IPv6 changes every redeploy, same foot-gun nginx already guards against); **read
timeout 60 s** (MDF parsing of GB-scale files takes seconds, not ms) with connect timeout
short (~2 s); sidecar failures map to **typed error payloads** surfaced to the user (e.g.
"unsupported bus-channel format in group 3"), never a bare 502; the raw file stays on the
shared temp volume / is re-streamed — the sidecar holds no state, so a sidecar restart is
invisible beyond a retried request.
Tests: `:core:test` (parser vs committed small `.mf4` fixture, decimator property tests);
`:web:test` (MockMvc multipart round-trip; oversize still rejected on other routes; streamed
over-cap upload aborted).

### Phase 4 — Calculated signals (the differentiator)
**Pre-spike (2–4 h, gates the phase estimate):** measure per-call `PropsSI` cost through the
JNA binding **including the process-wide `synchronized` lock** (`core/.../props/CoolProp.java`
— every binding method serializes on one global lock, and the throwing `propsSI` used by
solves is uncached; only `propsSIOrNaN` hits the 20k LRU today). **Measure evaluator overhead
separately from CoolProp** (a no-property formula over the same raster) so allocation cost
doesn't masquerade as native-call cost. Output: measured µs/call for both, and the cache
decision below.
Create: `core/.../measurement/MergedRaster.java`, `SampledSeries.java` (**per-input
interpolation mode: `step` — default for boolean/enum/ECU states — or `linear` — default for
continuous analog inputs feeding property functions**; step-holding T/P into nonlinear
CoolProp functions manufactures artificial derivative spikes; linear-interp precedent:
`core/ode/OdeAccessors.valueAtTime`), `TimeSeriesEvaluator.java` — evaluates the formula per
raster point via the existing `Evaluator` (`backend/core/.../ast/Evaluator.java`; units +
CoolProp free). **GC-pressure contract:** do NOT allocate a fresh input `Map` per point — over
a 1 M-pt raster that's 1 M map + boxing allocations and the GC dominates runtime. And a
reused `Map<String, Double>` only halves the problem: writing a primitive `double` into it
still boxes a new `Double` per point per variable. The target is an **array-backed primitive
resolver** — pre-resolve each formula variable to an index once, then per point the
`Evaluator` reads `double resolve(int varId)` from a reused `double[]` (add the core
`Evaluator` overload for this; a mutated map is the acceptable fallback only if the AST walk
can't take an indexed resolver without invasive surgery — pre-spike quantifies the gap). Time ops `delta`/`integral`/`movavg`/
`delay` (net-new accessors; `OdeAccessors` interpolation/crossing helpers are the reusable
building blocks).
**Compute policy (decision 3):** hard raster cap (~1 M pts); calc-path
property calls routed through the CoolProp LRU (extend caching to the throwing `propsSI`
path or a calc-local cache — pre-spike decides); `POST /api/measurements/calc` sync below a
threshold that is **lowered when the formula contains property functions** (the global lock
makes CoolProp formulas the slow class), else 202+job via existing JobController/SSE;
**no mid-job cancel in v1** — client abandons stale jobs, the 1 h Redis job TTL cleans up
(documented limitation; cooperative cancel would be net-new backend machinery).
**Over-cap UX:** a `merge` raster easily exceeds the cap organically (two 1 MHz channels with
offset timestamps → ~2 M union points), so exceeding it is a *guided path, not a failure*:
the API returns a **typed error** (`RASTER_CAP_EXCEEDED` + actual point count + a suggested
`dt` that lands under the cap), and `CalcSignalModal.tsx` catches it and offers one-click
"Switch to fixed dt = <suggested> with linear interpolation" — never a generic failure toast.
Request carries `{name, formula, inputs: [{var, measurementId, channel, interp} |
{var, inline:{t[],v[]}, interp}], raster: merge|fixed(dt)|sameAs(var)}` — inline covers
client-parsed CSV (route shares the raised body cap). Frontend
`analyzer/CalcSignalModal.tsx` (CodeMirror w/ existing frees-DSL setup, var→channel binding,
per-input interp picker, raster picker); results land in ChannelStore as first-class channels.
Tests: core — raster merge, step vs linear edges, delta/integral/movavg/delay vs analytic
signals, one CoolProp per-sample case (`Enthalpy('R134a', T=…, P=…)` ramp) with cache-hit
assertion, over-cap merge → `RASTER_CAP_EXCEEDED` with a suggested `dt` that verifiably lands
under the cap; web MockMvc; vitest DTO mapping + modal over-cap recovery path.

### Phase 5a — Multi-file sessions, time offsets, Event List
Create: multi-file session support in `channelStore.ts`/`DataAnalyzerTab.tsx`, per-file
time-offset UI (**numeric Δt entry field and SHIFT-drag** — numeric entry is mandatory;
visual drag alone is too imprecise for high-frequency control-loop sync),
`instruments/EventListInstrument.tsx` (simple comparisons client-side, complex conditions via
Phase-4 boolean calc channel; rising-edge timestamps; click sets shared cursor). These three
are coupled: cross-file events need offsets applied first.
Tests: event-edge detection, offset application vitest.

### Phase 5b — Scatter + Histogram instruments
Create: `instruments/ScatterInstrument.tsx`, `instruments/HistogramInstrument.tsx` (Plotly
builders, `plots/figure.ts` style). Independent of the sync model — parallelizable with 5a.
Tests: builder vitest; `npm run build`.

### Phase 5c — Polish + accessibility pass
Keyboard cursor stepping, snap toggle, keyboard-navigable signal browser / table / event list
(beyond glide-data-grid/Mantine defaults).

## Risks

- **mdf4j 0.2.0 maturity** (highest): may lack DZ compression, VLSD, CCBLOCK conversions.
  Mitigated by the spike checklist + `MeasurementParser` seam + 4-rung fallback ladder
  (incl. planned asammdf sidecar).
- **CoolProp per-sample cost + process-wide lock**: every property call goes through one
  global `synchronized` JNA binding with per-call string fluid resolution; the solve-path
  variant is uncached. Mitigated by the Phase-4 pre-spike, raster cap, calc-path caching,
  and the lowered async threshold for property-function formulas.
- **Multi-user CoolProp lock starvation (compute tier)**: concurrent property-heavy calc jobs
  all serialize on the single JNA lock, so saturated consumer threads on `frees.tasks` could
  delay unrelated solves platform-wide. Acceptable single-/few-user today (the raster cap
  bounds each job). Documented future mitigations, in escalation order: a separate RabbitMQ
  queue + capped consumer concurrency for calc tasks (so property jobs can't starve solves),
  then pooled native library instances or a dedicated CoolProp worker node. Not built in v1.
- **Evaluator GC pressure (Phase 4)**: naive per-point `Map` allocation over a 1 M-pt raster
  makes GC the bottleneck and corrupts the pre-spike's CoolProp numbers — and even a reused
  map still boxes a `Double` per write. Mitigated by the array-backed primitive-resolver
  contract in Phase 4 and the split pre-spike measurement.
- **uPlot wrapper complexity**: aligned-arrays data shape + `cursor.sync` differ materially
  from Plotly; "modeled on PlotlyChart.tsx" holds for lifecycle only. Budget wrapper time
  accordingly in Phase 1.
- **ChannelStore leak/growth**: mitigated by refcount + deletion-bound release + LRU eviction
  (§2.5a); closing a window intentionally retains data (matches all frees window kinds).
- **Upload security**: raise the cap per-route only; the existing guard is Content-Length-only
  so the route must count streamed bytes; validate magic bytes; stream to temp dir, never
  buffer whole file in heap.
- **Memory (backend)**: extract channels lazily via memory-mapped reads, keep raw file on
  disk, LRU/TTL eviction; frontend warns then evicts per §2.5a.
- **Railway statelessness**: measurement store is per-API-node + ephemeral — acceptable
  single-node today; 404 on known id → inline re-upload banner (§2.5b), same path as project
  load; multi-node needs sticky routing/object storage later (documented, out of scope).
  If the asammdf sidecar rung is reached, it adds a second deploy unit — transport, DNS
  re-resolution, timeouts, and error mapping are pinned by decision 4 + the Phase 3 sidecar
  contract.
- **App.tsx growth**: all new code under `frontend/src/analyzer/`; App.tsx gains only the spec
  slice + factory + delete-release hook (same footprint as whiteboards).

## Rejected / deferred critique points

- **"Two state patterns" (zustand vs reducer)**: moot — the frontend has no zustand or any
  external store (verified); ChannelStore is deliberately the first non-React store, bulk data
  only. ADR one-liner added to §2.
- **Global undo/redo for analyzer actions**: no app-wide undo exists (only DiagramTab-local
  stacks, `DiagramTab.tsx:3511`); the analyzer opts out in v1, consistent with whiteboards,
  plots, and tables.
- **Per-phase a11y Definition-of-Done**: deferred to Phase 5c beyond the default keyboard
  behavior of glide-data-grid/Mantine components.
- **Visible-window-only calc recompute**: rejected for v1 — the calc channel must be fully
  materialized for export and cursor-range statistics; full-raster with a hard cap instead.
- **the research corpus/the reference measurement tool IP concern**: requirements are behavioral feature parity derived from the
  owner's own research notebook, not copied documentation text; no action.
- **Anchored cursors, string-channel plotting, GPS map**: explicitly deferred (§2.5d/e, §1).

## Verification

- Per phase: `cd frontend && npm run build` (type gate) + `npx vitest run`; backend phases:
  `cd backend && ./gradlew :core:test :web:test` (module-qualified per project rule).
- End-to-end after Phase 1/2: `./frees.sh start`, open http://localhost:5173, create an
  Analyzer window, import a generated 1 M-row CSV (script it), verify smooth zoom/pan (parse
  must not jank the UI — worker mode, and the buffer handoff must be a Transferable: no
  multi-second freeze at parse completion), watch overall tab memory near the ~50 M-cell
  warning threshold (DevTools memory panel), boolean pulse visible at full zoom-out, cursor delta
  correctness against known values; save/reload the `.frees` file and verify **template mode**:
  layout restored, "Locate file…" banner, re-pick repopulates, wrong file rejected by
  signature; close the analyzer window and reopen (data retained), delete it (store released).
- After Phase 3: upload a real `.mf4` fixture, browse channels, verify decimated envelope
  preserves a known injected spike; verify oversize upload rejected mid-stream.
- After Phase 4: calc channel `P_kW = tq * w / 1000` and a CoolProp property channel; verify
  against hand-computed samples at cursor positions; verify linear vs step interp on a ramp
  input; verify async path on a large raster and the raster-cap error above the limit.
