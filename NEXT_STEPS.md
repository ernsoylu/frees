# Engineering Roadmap & Phased Execution Plan

This document outlines the phased engineering roadmap, active milestones, and quality acceptance gates for `frees` (`frees-wasm`).

---

## 1. Verified Architecture & Completed Milestones

The project provides an end-to-end client-side WebAssembly modeling platform with zero external backend dependencies:

- **Target-Agnostic Core ([`frees-core`](file:///home/eren/homecloud/dev/frees-wasm/crates/frees-core))**: Scaled Newton-Raphson, Powell hybrid dogleg, adaptive ODE integrators (`ode45`, `radau5`), index-1 DAE BDF/IDA solver with event root-finding, and an exact rational symbolic CAS.
- **Thermodynamic Property Backbone (`rustprop`)**: Pure-Rust CoolProp implementation supporting multiparameter Helmholtz energy equations of state, incompressibles (`INCOMP::MEG`, `MPG`), and ASHRAE moist air psychrometrics (`HAPropsSI`). 26 real fluids are linked and served on the diagram picker — every pure fluid [`props/propfun.rs`](file:///home/eren/homecloud/dev/frees-wasm/props/propfun.rs)'s alias table names.
- **WebAssembly Bridge & Worker Pool ([`frees`](file:///home/eren/homecloud/dev/frees-wasm/crates/frees), [`engineClient.ts`](file:///home/eren/homecloud/dev/frees-wasm/web/src/engineClient.ts))**: Zero-copy structured typed array boundary hosting a pool of up to 4 Web Workers with dynamic concurrency clamping, request correlation, weighted sweep progress, and deterministic row re-assembly.
- **Interactive Workbench ([`web`](file:///home/eren/homecloud/dev/frees-wasm/web))**: React 19 / TypeScript application featuring Glide Data Grid virtualized tables, Plotly.js scientific plotting with thermodynamic diagram overlays, CodeMirror/Monaco editor support, shareable URL links (`#share=<lz-string>`), and offline PWA caching via IndexedDB.
- **Experimental Data & Statistics ([`analysis/`](file:///home/eren/homecloud/dev/frees-wasm/crates/frees-core/src/analysis))**: Descriptive and inferential statistics (43 intrinsics including Student-t, Welch t-test, ANOVA, bootstrap, permutation tests), weighted/bounded/robust curve fitting and dynamic parameter calibration with parameter covariance, correlated and non-Gaussian input uncertainty ([`Correlation(A, B)`](file:///home/eren/homecloud/dev/frees-wasm/crates/frees-core/src/analysis/uncertainty.rs) / [`DistributionOf(X)`](file:///home/eren/homecloud/dev/frees-wasm/crates/frees-core/src/analysis/distributions.rs)), truncated inverse-CDF sampling, seeded Latin-hypercube and scrambled Sobol designs, Sobol' variance decomposition and Morris screening, and $O(n \log n)$ arbitrary-length transforms with sensor kernels ([`Detrend`](file:///home/eren/homecloud/dev/frees-wasm/crates/frees-core/src/signal.rs), [`Smooth`](file:///home/eren/homecloud/dev/frees-wasm/crates/frees-core/src/signal.rs), [`Window`](file:///home/eren/homecloud/dev/frees-wasm/crates/frees-core/src/signal.rs), [`Filter`](file:///home/eren/homecloud/dev/frees-wasm/crates/frees-core/src/signal.rs), [`FiltFilt`](file:///home/eren/homecloud/dev/frees-wasm/crates/frees-core/src/signal.rs), [`XCorr`](file:///home/eren/homecloud/dev/frees-wasm/crates/frees-core/src/signal.rs), [`Welch`](file:///home/eren/homecloud/dev/frees-wasm/crates/frees-core/src/signal.rs), peak detection).
- **Strict Quality Gates**: 1,308 golden regression fixtures passing with zero regressions, four-shard compiled WASM golden-corpus replay in CI, 59 frontend Vitest test suites (655 tests) passing, clean clippy `-D warnings` on native and `wasm32-unknown-unknown`, automated documentation and example validation in CI, and the WASM bundle strictly gated under the 5,120 KiB ceiling (3,981.7 KiB raw / 1,791.0 KiB gzipped, leaving 1,138.3 KiB headroom, measured 2026-09-12).


### Summary of Completed Engineering Milestones

The following milestones are fully implemented, verified, and integrated into `main`.

1. **Phase 1: Operational Wins & Governance** — Node 22 pinned; supply-chain hardening (`cargo audit`, `cargo deny`, `npm audit`) and [`SECURITY.md`](file:///home/eren/homecloud/dev/frees-wasm/SECURITY.md); Release-Please automation with multi-platform binaries; standing offline Playwright suite; [`CONTRIBUTING.md`](file:///home/eren/homecloud/dev/frees-wasm/CONTRIBUTING.md) and issue templates.
2. **Phase 2: Robustness, Performance & Verification** — zero-copy `js_sys::Float64Array` WASM boundary; parser/expression fuzzing in [`fuzz/`](file:///home/eren/homecloud/dev/frees-wasm/fuzz); cross-platform CI matrix with macOS and Chromium/Firefox/WebKit Playwright; Pareto point-click inspection in [`MinMaxModal.tsx`](file:///home/eren/homecloud/dev/frees-wasm/web/src/MinMaxModal.tsx).
3. **Phase 4 (Core Numerics): Statistical Analysis & Signal Kernels** — inference intrinsics in [`descriptive.rs`](file:///home/eren/homecloud/dev/frees-wasm/crates/frees-core/src/descriptive.rs) (4.1); weighted/bounded fitting with SVD covariance in [`curvefit.rs`](file:///home/eren/homecloud/dev/frees-wasm/crates/frees-core/src/analysis/curvefit.rs) and calibration in [`paramfit.rs`](file:///home/eren/homecloud/dev/frees-wasm/crates/frees-core/src/analysis/paramfit.rs) (4.2); correlated and non-Gaussian uncertainty with truncated inverse-CDF sampling (4.3); sensor kernels and $O(n \log n)$ Bluestein/Cooley-Tukey transforms (4.5); LHS/Sobol designs with Sobol' and Morris sensitivity (4.6).
4. **Documentation & Example Verification Infrastructure** — documentation gate reconciled against the live Rust registries (PR #24); example runner [`check-doc-examples.mjs`](file:///home/eren/homecloud/dev/frees-wasm/web/scripts/check-doc-examples.mjs) executing `{ CHECK ... }` fences in CI (PR #24); 19 worked engineering models landed (PR #25); 56 reference pages authored to 723 catalogued symbols (PR #26); electrical component wave B (PR #28).
5. **Browser Analysis Parity, Usability & Evaluator Guard** — sensitivity/QMC/fitting endpoints wired through [`engine.worker.ts`](file:///home/eren/homecloud/dev/frees-wasm/web/src/wasm/engine.worker.ts) and [`api.ts`](file:///home/eren/homecloud/dev/frees-wasm/web/src/api.ts) with dialogs for Sobol/Morris, LHS/Sobol designs and empirical quantiles, and fit diagnostics (σ, robust loss, covariance, rank, `atBound`); P0 model and contract repairs (pipe roughness units, `cd-nozzle-shock` guess, `forced-response-lsim` labels, CLI `--json` removal, onboarding alignment); cumulative evaluator work budget replacing unbounded loop ceilings in [`eval.rs`](file:///home/eren/homecloud/dev/frees-wasm/crates/frees-core/src/eval.rs).
6. **Measurement Table Operations & Scientific Visualization** — row filtering, column transforms, group-by, rolling statistics, key/timestamp joins with interpolation, `NaN`/duplicate/extrapolation policy and unit-metadata preservation, and derived tables feeding fitting, calibration and sweeps directly; box plots, ECDFs, confidence and prediction ribbons, plot-to-table binding identity, and `NaN` line breaks.
7. **Unified Language Architecture (Stages U0–U9)** — operator semantics, scoping and callable inventory frozen in [the language compatibility contract](ARCHITECTURE_AND_REQUIREMENTS.md#12-language-compatibility-contract) and [callable sources of truth](CLAUDE.md#callable-sources-of-truth); scalar output headers and unified expression-position dispatch; declarative and ordered `function` bodies with lexical scoping, definite assignment and colon-range loops; parenthesized indexing, named arguments, `initial(...)` and `guess(...)`; components as `function [ports] = name(params)` with `port`/`connect`/`require`/`variant` lowering; `simulate`/`sweep`/`plot`/`table`/`linearize`/`state_table` as registered calls with run ownership; analysis parity across CLI, WASM and UI via `frees-cli analyze OP --request`; product-wide migration of the standard library, gallery, Help and editor tooling plus `frees-cli migrate`; legacy `CALL`/`MODULE`/`PROCEDURE`/`COMPONENT` grammar removed from the production parser and confined to the import converter.
8. **Phase 4.1 Sparse Matrix Factorization & Graph Reordering** — deterministic AMD/COLAMD with supercolumn absorption lifted out of [`dae/colamd.rs`](file:///home/eren/homecloud/dev/frees-wasm/crates/frees-core/src/dae/colamd.rs) to serve the general solver; CSC structure fingerprints cache the fill-reducing ordering across Newton iterations while numeric LU is refactored each iteration; the dependency-free Gilbert–Peierls kernel was retained over `faer`/`sprs` on WASM size and portability grounds. Signed: 2026-09-12.
9. **Phase 4.2 Pre-Expansion Lazy Chunk Seam** — asynchronous property-table and component-library fetching via [`props/tables.rs::install_from_bytes`](file:///home/eren/homecloud/dev/frees-wasm/crates/frees-core/src/props/tables.rs), a pre-solve document scan that awaits required resources before `solve`/`solveTable`/`check`, per-worker caching, and CI headroom reporting that warns at the 200 KiB trigger. Opt-in via `__freesPropertyTableBaseUrl` / `__freesComponentLibraryBaseUrl`; adds no bytes to the default bundle. Signed: 2026-09-12.
10. **Phase 4.3 Custom Component Authoring & Advanced Schematic Routing** — shift-click selection and Encapsulate emitting a canonical reusable component block with validated connected selections, and an obstacle-avoiding orthogonal router in [`schematic/layout.ts`](file:///home/eren/homecloud/dev/frees-wasm/web/src/schematic/layout.ts) with a regression test and fallback to the original lane. Signed: 2026-09-12.

---

## 2. Active Roadmap

Two milestones are open. Everything else in the phased plan is signed off above; the deferred tracks in §3 are the next candidates once they close.

### Phase 4.4 R15 Usability Pilot Validation

- [x] Pilot cards, answer key, results table, acceptance thresholds, and the pinned build commit are recorded in [`R15_PILOT.md`](file:///home/eren/homecloud/dev/frees-wasm/R15_PILOT.md).
  - Signed: 2026-09-12 — ready for five human sessions; no participant outcomes are fabricated.
- [ ] Execute the structured pilot with 5 engineering participants per [`R15_PILOT.md`](file:///home/eren/homecloud/dev/frees-wasm/R15_PILOT.md).
- [ ] Test the core tasks: scalar solve within 5 minutes, component chain within 10 minutes, missing-boundary diagnostic recovery within 3 minutes.
- [ ] Record completion times, assistance requirements, and qualitative feedback to guide workbench UX improvements.

### Phase 4.5 Retained Review Triage Follow-up

The eight §3.3 leads were rechecked against `b2ab4b1` on 2026-09-13; the verdicts
and their evidence are recorded in [§3.3](#33-retained-review-triage-record-2026-09-13).
Three were stale or not findings and were retired. What survived is below.
Nothing here is a new review; each item is a lead that still reproduces.

- [ ] **Callable limitations — reproduced verbatim.** `eig` and `eigvec` sit in `UNPORTED` ([`eval.rs`](file:///home/eren/homecloud/dev/frees-wasm/crates/frees-core/src/eval.rs)) and `EulerRotate` in `UNPORTED_CALL_INTRINSICS` ([`parser/expand.rs`](file:///home/eren/homecloud/dev/frees-wasm/crates/frees-core/src/parser/expand.rs)); `ss2ss` fails output-shape handling with *"Matrix must have exactly 2 dimensions: bn"* and `tf2zp` with *"Expected vector array access"*. Port the four names (the `eigen`/`eigenvalues` implementations in [`linalg.rs`](file:///home/eren/homecloud/dev/frees-wasm/crates/frees-core/src/linalg.rs) are the existing working path), add native and WASM regressions, then remove the limitation banners from the four reference pages — the pages' asserted diagnostics must be replaced by checked results in the same change.
- [ ] **`.mix` refrigerant blends — reproduced.** `Enthalpy(R454B, T=300, P=500000)` still fails with a NaN residual. Ten blends are named by the alias table and none is backed; needs upstream mixture routing, so this gates on `rustprop` rather than on this repository.
- [ ] **Optional resource seam — genuine coverage gap.** [`props/tables.rs`](file:///home/eren/homecloud/dev/frees-wasm/crates/frees-core/src/props/tables.rs) tests only a single-fluid install (`install_from_bytes_serves_the_fetched_fluid`) and hostile-byte refusal. The multi-resource lifecycle, cache behaviour and numeric coverage the old note asks for are untested. Add the tests before anything depends on production lazy resources; the seam itself works and the old replacement-only warning stays retired.
- [ ] **Accessor sweeps and global nonconvergence — no coverage found.** A keyword sweep of all 659 frontend test titles returned zero matches for this behaviour, the only sub-item of the table checklist with none. Confirm it by reading the sweep path before writing a test; a title sweep proves absence of a *name*, not of the behaviour.
- [ ] **Table and plot checklists — audit per item, do not re-review.** The remaining sub-items map onto existing suites ([`tables.precision.test.ts`](file:///home/eren/homecloud/dev/frees-wasm/web/src/tables.precision.test.ts), [`tableValidation.test.ts`](file:///home/eren/homecloud/dev/frees-wasm/web/src/tableValidation.test.ts), [`tableGridModel.test.ts`](file:///home/eren/homecloud/dev/frees-wasm/web/src/tablesGrid/tableGridModel.test.ts), the nine `plots/` suites; render-failure recovery is covered by *"renders error boundary with Retry button on render failure"*). Walk the two checklists one item at a time against those files and open fixes only where a hole is real. Keyword matching established plausibility, not coverage.
- [ ] **Cross-layer acceptance — still absent.** The suite has three Phase 9 journeys plus two offline specs; none is the `edit → solve → plot → export → reopen` chain. [`playwright.bench.config.ts`](file:///home/eren/homecloud/dev/frees-wasm/web/playwright.bench.config.ts) is a reusable browser harness but times the raw engine `solve`, not the UI, so the cold/warm median and p95 this item asks for have never been measured at UI level. Extend the journeys and the bench config rather than adding a third harness.

---

## 3. Deferred & Long-Term Candidates

With the phased plan closed out, the following documentation and research tracks are the explicitly deferred backlog.

### 3.1 Deferred Documentation & Example Programmes

These items expand user-facing documentation, written tutorials, and reference examples:

- **Deferred — D.1 Component Domain Example Wave B (Remaining Tranches B1–B15, B19–B29)**:
  - Curated engineering problems from the reference bank covering pneumatic (B1–B3), hydraulic (B4–B6), mechanical/powertrain (B7–B9), control (B10–B12), moist air (B13–B15), heat transfer (B19–B21), and uncertainty/sensitivity (B22–B29).
  - Electrical tranche (B16–B18, B30) was completed in PR #28. The remaining tranches will be landed in targeted batches adhering to complete-document verification and `{ CHECK ... }` assertion standards.
- **Deferred — D.2 Component Domain Example Wave C (Large Fluid & Two-Phase Systems)**:
  - Dedicated worked examples for the largest uncovered component domains: Two-Phase (38 components), Fluid (26 components), and Liquid (15 components), including refrigeration cycles, pipe networks, and pump curves.
- **Deferred — D.3 Comprehensive Documentation & Public Example Gallery ("The frees Book")**:
  - Build an mdBook compiling language syntax, physical modeling principles, thermodynamic EoS fundamentals, and solver debugging guides.
  - Curate a public gallery of 30–50 verified engineering models from the regression corpus with interactive simulation previews.
- **Deferred — D.4 Cross-Library Reference Validation Fixtures**:
  - Author reproducible cross-library reference fixtures generated from NumPy, SciPy, statsmodels, and SALib (with exact seeds, versions, and estimator conventions recorded) to validate statistics and fitting kernels offline without runtime Python dependencies.

### 3.2 Long-Term Strategic, Research & Infrastructure Candidates

- **Deferred — Standalone Language Server ([`crates/frees-lsp`](file:///home/eren/homecloud/dev/frees-wasm/crates))**: Dedicated LSP server communicating over stdio to provide real-time diagnostics, syntax highlighting, unit checking, and autocomplete in external editors (VS Code, Neovim, Helix).
- **Deferred — Standalone Simulation Code Export (Python & C++)**: AST visitor exporting solved equation models to standalone Python scripts (SciPy `fsolve`/`solve_ivp`) or header-only C++ numerical code.
- **Deferred — Crates.io Publishing for Dependencies & Core Engine**: Publish `rustprop`, `frees-core`, and `frees-cli` to crates.io once API contracts and upstream dependencies stabilize.
- **Deferred — SharedArrayBuffer Multi-Threading**: Research cross-origin isolation (`COOP`/`COEP`) headers for zero-copy multi-threaded sweeps, with seamless fallback for standard static hosting environments.
- **Deferred — Native Desktop & iOS Packaging (Tauri v2)**: Package the workbench as installable desktop and iOS applications running the solver as native Rust rather than WASM. Scoped in [§3.4](#34-deferred--native-desktop--ios-packaging-tauri-v2); no build has been produced or measured.
- **Deferred — Neural & Domain-Bounded Surrogate Property Models**: Train bounded surrogate evaluators for fast property estimation during Newton line-search steps, with exact Helmholtz verification at convergence.
- **Deferred — Standards Interoperability (FMI / FMU 2.0/3.0)**: Package dynamic systems as Functional Mock-up Units for co-simulation in industrial engineering workflows.
- **Deferred — Accessibility & Touch Ergonomics**: Full WCAG 2.1 AA compliance, enhanced screen reader announcements, and tactile multi-touch canvas navigation.

### 3.3 Retained Review Triage Record (2026-09-13)

The September table/plot reviews and documentation audits were consolidated here
as leads to recheck. They were rechecked against `b2ab4b1` on 2026-09-13. What
still reproduces moved to [Phase 4.5](#phase-45-retained-review-triage-follow-up);
this section is now the record of that triage, not a work list. Do not restore
already-completed milestones or old coverage percentages as active work.

| Lead | Verdict | Evidence |
| --- | --- | --- |
| Reference coverage depth | **Retired as a finding** | The measurable half is a standing CI gate — `npm run check-docs` and `npm run check-examples` run in [`ci.yml`](file:///home/eren/homecloud/dev/frees-wasm/.github/workflows/ci.yml) and were green on the `b2ab4b1` merge. The open-ended half ("continue source-backed argument and example review") has no done condition and belongs with the §3.1 documentation programmes. |
| Verified callable limitations | **Reproduced** | `eig`, `eigvec`, `EulerRotate`, `ss2ss`, `tf2zp` each run through `frees-cli solve`; every diagnostic matched its reference page verbatim. → Phase 4.5 |
| Property coverage — Air flash near bubble, 1–7 bar, $x \approx 10^{-4}$–$10^{-2}$ | **Stale — does not reproduce** | All four corner points solve finite and monotone in both $P$ and $x$ against the installed `rustprop` revision (1 bar: −203.1 and 1 825.8 J/kg; 7 bar: 44 343.2 and 46 035.5 J/kg). The historical refusal is gone; the old note asked for exactly this recheck. |
| Property coverage — `.mix` blends | **Reproduced** | `Enthalpy(R454B, T=300, P=500000)` fails with a NaN residual. → Phase 4.5 |
| Optional resource seam | **Reproduced as a coverage gap** | The seam works and layers correctly; the multi-resource lifecycle, cache and numeric-coverage tests the note asks for do not exist. → Phase 4.5 |
| Table review follow-up | **One confirmed hole, rest unaudited** | Accessor-sweep global nonconvergence matched zero of 659 test titles; the other sub-items map onto existing suites. → Phase 4.5 |
| Plot review follow-up | **No hole found, unaudited** | Render-failure recovery, histogram channels, code-owned plots and export all have tests. Needs a per-item audit, not a re-review. → Phase 4.5 |
| Cross-layer acceptance | **Reproduced** | Three Phase 9 journeys and two offline specs; no `edit → solve → plot → export → reopen` chain, and no UI-level p95 measurement. → Phase 4.5 |
| Scientific validation and usability | **Retired — not a finding** | A governance rule, not work: oracle fixtures and the R15 pilot stay separate from example execution, and neither passing examples nor static coverage establishes estimator parity or human task completion. It guards §2's R15 pilot and §3.1's D.4 and is recorded there. |

### 3.4 Deferred — Native Desktop & iOS Packaging (Tauri v2)

Proposal only. **No Tauri project exists in the tree and no desktop or iOS build
has ever been produced or measured**; every figure below is a code reading, not a
benchmark. Grep for `tauri|electron|capacitor` currently returns only the
physics components named `Capacitor` and `Electrolyzer`.

**Goal.** Installable desktop apps (Linux/macOS/Windows) and later an iOS app
from the existing tree, with the solver running as **native Rust inside the app
binary** rather than as WASM in a Web Worker. The browser build keeps the WASM
path unchanged; the two must agree numerically.

**Why the port is cheap.** Three properties already hold:

- **No cross-origin isolation.** D3 and [`nginx.conf.template`](file:///home/eren/homecloud/dev/frees-wasm/web/nginx.conf.template) rule out `COOP`/`COEP`, and `SharedArrayBuffer` appears nowhere in `web/src`. The largest webview hazard does not apply.
- **No network.** [`api.ts`](file:///home/eren/homecloud/dev/frees-wasm/web/src/api.ts) states that nothing in the module reaches the network; the only `fetch` calls are WASM init and the dormant lazy-resource seam of Phase 4.2.
- **The engine boundary is already a string protocol.** [`crates/frees/src/lib.rs`](file:///home/eren/homecloud/dev/frees-wasm/crates/frees/src/lib.rs) exposes `solve`, `solve_table`, `check`, `monte_carlo` and the analysis entry points as `&str → String`, and [`frees-cli`](file:///home/eren/homecloud/dev/frees-wasm/crates/frees-cli/src/main.rs) already calls them natively. A native backend is a dispatch `match` over functions the parity corpus already replays, not new engine code.

**Single dispatch seam.** `call(method, args, onProgress, workerIndex)` in
[`engineClient.ts`](file:///home/eren/homecloud/dev/frees-wasm/web/src/wasm/engineClient.ts) is the sole funnel for all engine methods, and
[`engine.worker.ts`](file:///home/eren/homecloud/dev/frees-wasm/web/src/wasm/engine.worker.ts) is the only module importing `wasm/pkg`. The backend swap is one
branch in that function.

**Thread affinity is a hard constraint, not a preference.** Three pieces of
engine state are `thread_local!`: the REPL `Session` ([`repl.rs`](file:///home/eren/homecloud/dev/frees-wasm/crates/frees/src/repl.rs)), the
progress sink ([`progress.rs`](file:///home/eren/homecloud/dev/frees-wasm/crates/frees-core/src/progress.rs), whose `Sink` is `Box<dyn Fn(f64)>` and
therefore not `Send`), and the cancel/wall-clock predicate
([`ode/deadline.rs`](file:///home/eren/homecloud/dev/frees-wasm/crates/frees-core/src/ode/deadline.rs)). A Tokio blocking pool would scatter consecutive
REPL calls across threads and lose the session, so the native side must mirror
the existing pool: one dedicated `std::thread` per worker index, index 0
REPL-affine.

#### Phased outline

1. **Shell.** New top-level `src-tauri/` (`Cargo.toml`, `tauri.conf.json`, `build.rs`, `src/`, `icons/`), **excluded from the root workspace** via `exclude = ["src-tauri"]` — otherwise `cargo clippy --workspace --target wasm32-unknown-unknown` (a standing gate in §4) would try to build Tauri for `wasm32` and fail. CSP must retain `'wasm-unsafe-eval'` in `script-src`, as [`security-headers.conf`](file:///home/eren/homecloud/dev/frees-wasm/web/security-headers.conf) already does.
2. **Frontend build variant.** A `tauri` mode in [`vite.config.ts`](file:///home/eren/homecloud/dev/frees-wasm/web/vite.config.ts) that skips `pwaPlugin()` and `buildInfoPlugin()` (both exist for the nginx/Vercel deployment), sets `base: './'` and a separate `outDir`, and leaves `manualChunks` and the KaTeX font stripper untouched. `web/.npmrc`'s `legacy-peer-deps=true` must survive any scaffolding, since Glide Data Grid peer-caps at React 18. Path-based `/help` routing in `main.tsx` and the root-absolute icon hrefs in `index.html` need relative or hash forms.
3. **Native engine backend.** A per-worker-index engine thread plus `engine_call` / `engine_stop` / `engine_retire_extra` commands, with `tauri::ipc::Channel<f64>` replacing `globalThis.__freesOnProgress`. First cut returns the plain JSON envelopes (`frees::solve`, `frees::solve_table` — the CLI's path); the `*_zerocopy` variants return `JsValue` and are WASM-only.
4. **Native file I/O.** One `saveBlob` helper replacing the six hand-rolled anchor-download copies (`project.ts` ×2, `tablesGrid/csv.ts`, `plots/exportPlot.ts`, `schematic/SchematicTab.tsx`, `DigitizerTab.tsx`) — a net deletion in the browser build too. [`saveTarget.ts`](file:///home/eren/homecloud/dev/frees-wasm/web/src/saveTarget.ts) already models the save destination as a closed set and is the seam for a native destination. `openPrintReport` in [`report.ts`](file:///home/eren/homecloud/dev/frees-wasm/web/src/report.ts) uses `window.open` + `print()` and has no webview-portable equivalent; it is the highest-friction single item.
5. **Release.** A `build-tauri` matrix job in [`release.yml`](file:///home/eren/homecloud/dev/frees-wasm/.github/workflows/release.yml) mirroring [`tools/vercel-build.sh`](file:///home/eren/homecloud/dev/frees-wasm/tools/vercel-build.sh)'s two-stage build. Code signing and notarization are explicitly out of scope for a first cut.
6. **iOS.** Requires macOS, Xcode and an Apple Developer account; cannot be produced or verified on the current Linux development machine. [`MobileLayout.tsx`](file:///home/eren/homecloud/dev/frees-wasm/web/src/MobileLayout.tsx) and the `viewport-fit=cover` / `apple-mobile-web-app-capable` tags in `index.html` are a genuine head start, so the work is re-tuning rather than a new shell.

#### Known ceilings to accept or revisit

- **JSON envelopes, not binary IPC.** `WorkerResult.matrix` / `odeBuffers` stay null on the native path; `hydrateRowValues` no-ops because the envelope already carries the values. Upgrade to `tauri::ipc::Response` with a length-prefixed `f64` blob only if serialization is measured to dominate.
- **Stop cancels transients only.** `wasmStop()` terminates workers; a running native solve cannot be killed. `deadline::install` gives cooperative cancellation inside ODE integration and sweep loops, not inside a blocking algebraic Newton solve.
- **`localStorage` quota is unchanged.** [`projectStore.ts`](file:///home/eren/homecloud/dev/frees-wasm/web/src/projectStore.ts) already flags the ~5 MB ceiling as a pain point, and a Tauri webview does not lift it. A native filesystem store is a separate, genuine win.
- **Relation to SharedArrayBuffer multi-threading (§3.2).** A native desktop engine obtains real parallelism without cross-origin isolation, which narrows that item to the browser deployment only. It does not close it.

#### Acceptance criteria

- Every gate in §4 stays green **unchanged**, including `cargo clippy --workspace --target wasm32-unknown-unknown`, `cargo test --release --test parity`, `npm test`, `npm run lint` and a `web/dist` production build that still emits the PWA assets.
- Native and WASM backends agree on the golden corpus. The parity replay already exercises the native `frees` rlib that the Tauri commands would dispatch to; what is **not** covered is the dispatch layer itself, which needs its own test over every method name, plus a frontend test of the native response mapping.
- Manual smoke in a running desktop window, none of which is implied by the automated gates: a solve matching the browser result; a sweep whose progress bar advances (proves the progress channel); Stop during a transient; two consecutive REPL commands where the second sees the first's bindings (proves thread affinity); CSV, plot and project export; project reopen; the print report.

---

## 4. Quality & Change Control Acceptance Gates

Every proposed change to the codebase must pass all automated verification gates prior to integration:

### 1. Rust Engine Quality Gates

```bash
# Code formatting check
cargo fmt --all --check

# Strict linting across native and wasm targets
cargo clippy --workspace --all-targets -- -D warnings
cargo clippy --workspace --target wasm32-unknown-unknown --all-targets -- -D warnings

# Core unit and integration test suite
cargo test --workspace -- --skip golden_corpus_parity

# Full golden regression corpus replay (1,308 fixtures)
cargo test --release --test parity
```

- **Zero Regression Policy**: All 1,308 golden fixtures must pass within declared tolerance specifications ([`fixtures/tolerances-rustprop.json`](file:///home/eren/homecloud/dev/frees-wasm/fixtures/tolerances-rustprop.json)).
- **Dead Tolerance Detection**: Relaxed tolerances that become unnecessary must be removed; CI fails if an unused tolerance entry remains.

### 2. Frontend & WebAssembly Gates

```bash
# Frontend test suite (Node 22 required)
cd web && npm test

# ESLint code quality verification
npm run lint

# Documentation and example consistency gates
npm run check-docs
npm run check-examples

# Production bundle compilation and PWA asset generation
npm run build
```

- **Node 22 Toolchain Requirement**: Pinned in `web/.nvmrc` and enforced via `web/package.json`.
- **Bundle Budget Ceiling**: The compiled WebAssembly engine (`frees.wasm`) must strictly remain $\le 5,120\text{ KiB}$ raw (measured at 3,981.7 KiB on 2026-09-12). Any PR exceeding this budget fails CI automatically. The lazy-chunk seam (Phase 4.2) is in place; CI warns when headroom reaches the 200 KiB trigger.
- **Executable Documentation**: All guide code fences and gallery models with `CHECK` markers must solve and assert expected values through [`web/scripts/check-doc-examples.mjs`](file:///home/eren/homecloud/dev/frees-wasm/web/scripts/check-doc-examples.mjs) during CI.

### 3. Language Migration Acceptance Matrix

Changes implementing Phase 3 (Unified Language) must satisfy the following verification matrix:

| Case | Required Assertion |
|---|---|
| Equation function solved forward and backward | Same equations/results within existing tolerances; no local solve that severs dependencies. |
| Nested single-output call and multi-output matrix/signal call | Correct output order, shapes, units, and private namespaces. |
| Discarded or omitted outputs | Internal constraints retained; unassigned outputs do not alter the system. |
| Ordered accumulator and mixed root/correction example | Correct updates and dependency order; no read-before-assignment. |
| Equation-only statement in an algorithm migration | Preserved deliberately or flagged with an actionable diagnostic; never silently ignored. |
| Module or component instantiated multiple times | Independent locals, states, and output references. |
| Lookup table called like a function | Identical interpolation, units, family, and boundary policies. |
| Array access versus function call versus initial condition | Deterministic resolution, including invalid index zero diagnostics. |
| Sweep of a defaulted formal input | Exactly one effective input value per row; hard-coded constraints are not overwritten. |
| ODE, stiff ODE, DAE, event reset, and coupled accessor solve | Existing result/event tolerances, consistent initialization, and feedback. |
| Structural variant with unknown selector | Clear preparation error, not a changing Newton graph. |
| Linearization / fitting / sampling / sensitivity | Existing diagnostics/settings reach native, WASM, and browser interfaces identically. |
| Metadata, plot, and check calls | Excluded from equation balance counts; executed in the correct phase. |
| Legacy import and new text export | Version preserved, conversion review available, round-trip fidelity verified. |
