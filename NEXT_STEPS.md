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
7. **Unified Language Architecture (Stages U0–U9)** — operator semantics, scoping and callable inventory frozen in [`docs/language-contract-v2.md`](file:///home/eren/homecloud/dev/frees-wasm/docs/language-contract-v2.md) and [`docs/callable-inventory.md`](file:///home/eren/homecloud/dev/frees-wasm/docs/callable-inventory.md); scalar output headers and unified expression-position dispatch; declarative and ordered `function` bodies with lexical scoping, definite assignment and colon-range loops; parenthesized indexing, named arguments, `initial(...)` and `guess(...)`; components as `function [ports] = name(params)` with `port`/`connect`/`require`/`variant` lowering; `simulate`/`sweep`/`plot`/`table`/`linearize`/`state_table` as registered calls with run ownership; analysis parity across CLI, WASM and UI via `frees-cli analyze OP --request`; product-wide migration of the standard library, gallery, Help and editor tooling plus `frees-cli migrate`; legacy `CALL`/`MODULE`/`PROCEDURE`/`COMPONENT` grammar removed from the production parser and confined to the import converter.
8. **Phase 4.1 Sparse Matrix Factorization & Graph Reordering** — deterministic AMD/COLAMD with supercolumn absorption lifted out of [`dae/colamd.rs`](file:///home/eren/homecloud/dev/frees-wasm/crates/frees-core/src/dae/colamd.rs) to serve the general solver; CSC structure fingerprints cache the fill-reducing ordering across Newton iterations while numeric LU is refactored each iteration; the dependency-free Gilbert–Peierls kernel was retained over `faer`/`sprs` on WASM size and portability grounds. Signed: 2026-09-12.
9. **Phase 4.2 Pre-Expansion Lazy Chunk Seam** — asynchronous property-table and component-library fetching via [`props/tables.rs::install_from_bytes`](file:///home/eren/homecloud/dev/frees-wasm/crates/frees-core/src/props/tables.rs), a pre-solve document scan that awaits required resources before `solve`/`solveTable`/`check`, per-worker caching, and CI headroom reporting that warns at the 200 KiB trigger. Opt-in via `__freesPropertyTableBaseUrl` / `__freesComponentLibraryBaseUrl`; adds no bytes to the default bundle. Signed: 2026-09-12.
10. **Phase 4.3 Custom Component Authoring & Advanced Schematic Routing** — shift-click selection and Encapsulate emitting a canonical reusable component block with validated connected selections, and an obstacle-avoiding orthogonal router in [`schematic/layout.ts`](file:///home/eren/homecloud/dev/frees-wasm/web/src/schematic/layout.ts) with a regression test and fallback to the original lane. Signed: 2026-09-12.

---

## 2. Active Roadmap

One milestone remains open. Everything else in the phased plan is signed off above; the deferred tracks in §3 are the next candidates once it closes.

### Phase 4.4 R15 Usability Pilot Validation

- [x] Pilot cards, answer key, results table, acceptance thresholds, and the pinned build commit are recorded in [`R15_PILOT.md`](file:///home/eren/homecloud/dev/frees-wasm/R15_PILOT.md).
  - Signed: 2026-09-12 — ready for five human sessions; no participant outcomes are fabricated.
- [ ] Execute the structured pilot with 5 engineering participants per [`R15_PILOT.md`](file:///home/eren/homecloud/dev/frees-wasm/R15_PILOT.md).
- [ ] Test the core tasks: scalar solve within 5 minutes, component chain within 10 minutes, missing-boundary diagnostic recovery within 3 minutes.
- [ ] Record completion times, assistance requirements, and qualitative feedback to guide workbench UX improvements.

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
- **Deferred — Neural & Domain-Bounded Surrogate Property Models**: Train bounded surrogate evaluators for fast property estimation during Newton line-search steps, with exact Helmholtz verification at convergence.
- **Deferred — Standards Interoperability (FMI / FMU 2.0/3.0)**: Package dynamic systems as Functional Mock-up Units for co-simulation in industrial engineering workflows.
- **Deferred — Accessibility & Touch Ergonomics**: Full WCAG 2.1 AA compliance, enhanced screen reader announcements, and tactile multi-touch canvas navigation.

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
