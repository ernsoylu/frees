# Engineering Roadmap

Signed milestones, open work and acceptance gates for `frees`. Current test
counts, the bundle measurement and the status of each subsystem live in
[`CLAUDE.md`](CLAUDE.md#current-status--verification-metrics); architecture and
the retained decisions D1–D12 live in
[`ARCHITECTURE_AND_REQUIREMENTS.md`](ARCHITECTURE_AND_REQUIREMENTS.md). Git
history keeps the detailed narrative of every closed item.

---

## 1. Signed Milestones

1. **Phase 1 — Operational wins & governance.** Node 22 pin, `cargo audit`/`cargo deny`/`npm audit`, [`SECURITY.md`](SECURITY.md), Release-Please with multi-platform binaries, offline Playwright suite, [`CONTRIBUTING.md`](CONTRIBUTING.md).
2. **Phase 2 — Robustness & verification.** Zero-copy `Float64Array` boundary, parser fuzzing ([`fuzz/`](fuzz)), macOS + Chromium/Firefox/WebKit CI, Pareto point inspection.
3. **Phase 4 core numerics — statistics & signal kernels (4.1–4.6).** Inference intrinsics, weighted/bounded fitting with SVD covariance, calibration, correlated/non-Gaussian uncertainty, `O(n log n)` transforms and sensor kernels, LHS/Sobol designs, Sobol'/Morris sensitivity.
4. **Documentation & example verification.** `check-docs` reconciled against the Rust registries; `check-doc-examples.mjs` executes `{ CHECK … }` fences in CI.
5. **Browser analysis parity & evaluator guard.** Sensitivity/QMC/fitting dialogs through the worker; cumulative evaluator work budget in `eval.rs`.
6. **Measurement tables & scientific plots.** Filter/transform/group/rolling/join operations feeding fits and sweeps; box plots, ECDFs, confidence ribbons, `NaN` line breaks.
7. **Unified language (U0–U9).** Frozen in [the language contract](ARCHITECTURE_AND_REQUIREMENTS.md#12-language-compatibility-contract); legacy `CALL`/`MODULE`/`PROCEDURE`/`COMPONENT` grammar confined to the import converter.
8. **Phase 4.1 — Sparse factorization.** Deterministic AMD/COLAMD with cached orderings; Gilbert–Peierls kernel kept over `faer`/`sprs` on size grounds. Signed 2026-09-12.
9. **Phase 4.2 — Lazy chunk seam.** `props/tables.rs::install_from_bytes` and opt-in component-library fetch; no default-bundle bytes. Signed 2026-09-12.
10. **Phase 4.3 — Component authoring & routing.** Encapsulate-to-component and the obstacle-avoiding router in `schematic/layout.ts`. Signed 2026-09-12.
11. **Phase 4.5 — Review triage, closed items (2026-10-19 → 10-22).**
    - **Callable limitations:** `eig`, `eigvec`, `EulerRotate`, `cond`, `ss2ss`, `tf2zp`.
    - **Blends:** all ten via rustprop `heos-mixtures`, matching CoolProp 8.0.0.
    - **Resource seam:** lifecycle test for stacked installs.
    - **Sweep nonconvergence:** surfaced end to end.
    - **Reference-audit engine leads.**
    - **Multi-domain component audit:** 20 coupled models, `tests/multidomain_fixes.rs`.
    - **`LiquidWallHX`:** exact isothermal-wall effectiveness law.
    - **Unit-consistent examples:** 955 documents at zero unit warnings, enforced in CI.
    - **Final-residual guard:** see the paragraph below.

    **Final-residual guard.** A solve whose assembled solution leaves any equation's residual above `max(1e-6, 100·rel_tolerance)`, relative to that equation's own top-level terms, now fails with the equation quoted instead of reporting `ok` (`engine::unconverged_equation`, applied in `PreparedDocument::assemble_solution` for solve, sweep rows and all-roots). This is the path by which the merge rescue once returned a 1.2e4 residual as success. Across the 843 converged corpus solves the worst relative residual is 1.3e-7, so no golden changes.

---

## 2. Open Work

### R15 usability pilot (Phase 4.4)

Cards, answer key, thresholds and the pinned build are in [`R15_PILOT.md`](R15_PILOT.md) (signed 2026-09-12). Still to do: run five engineering participants through scalar solve (≤ 5 min), component chain (≤ 10 min) and missing-boundary recovery (≤ 3 min); record times, assistance and feedback. Never fabricate participant outcomes.

### Units — left open by the 2026-10-21 audit

Rechecked on `8366ca7`, 2026-10-22. Order is the recommended execution order.

1. **`DYNAMIC` bodies are never unit-checked**, in DYNAMIC-only *and* mixed documents: `der(x) = -k*x + 5 [kg]` with `k [1/s]`, `x0 [m]` warns nowhere. The cause is that `check_units_full` receives only the algebraic equations, and `der(·)` has no dimension. **Plan:**
   - In `checker::dim_of_call`, `der(X)` gets X's units divided by seconds.
   - Feed the body equations, and initials as `X = expr`, to the unit check only (not the blocker), through one helper shared by `check` (`engine.rs`, the DYNAMIC-only early return) and the prepared solve.
   - Method-of-lines `FOR` blocks are left for later.
   - Expect a `check-examples` fallout pass on transient examples.
2. **Component parameter units are parsed, then dropped.** `component_function_params` reads `Resistor(R [ohm])`; `toplevel.rs` discards the unit because `components::def::Param` has no field for it. A bare `R=2.2` is therefore checked as dimensionless. **Plan:**
   - Add the unit to `Param`.
   - Have the expander emit `inst$param` into `member_units`.
   - Annotate `library-data/*.frees` with the units the audit derived.
   - That source then supplies the unit column of the 162 parameter tables that lack one. Their *meaning* text stays documentation work.
3. **`F`, `S`, `C` are °F, seconds and °C, never farad/siemens/coulomb.** Units are case-insensitive except `CASE_SENSITIVE_UNITS` (`h`/`H`), and remapping `F` would break °F users. **Plan:** append "`[F]` is °F; write `[farad]`" (likewise `[C]`, `[S]`) only to unit warnings that already fire on such a literal.
4. **`cfm` and `gpm` are not registered.** Add them to `units/registry.rs`.
5. **Stale tutorial fixtures.** `fixtures/corpus/docs_tutorials_10/13` freeze the old `[F]` tutorial text. Regenerate them from the current pages, stating that provenance.

### Table and plot checklists — per-item audit

The September checklists were deleted in `0b116de`/`b2ab4b1`; recover them from history. Then walk each item against the existing suites:

- `tables.precision.test.ts`
- `tableValidation.test.ts`
- `tableGridModel.test.ts`
- the `plots/` suites

Open fixes only for real holes. Matching keywords against test titles shows that a test plausibly exists, not that the item is covered.

### Cross-layer acceptance

There is no `edit → solve → plot → export → reopen` journey, and no UI-level cold/warm median and p95. [`playwright.bench.config.ts`](web/playwright.bench.config.ts) currently times only the raw engine `solve`. Extend the existing journeys and that config; do not add a third harness.

---

## 3. Deferred Candidates

**Documentation programmes.**

- **D.1** Wave B example tranches: pneumatic, hydraulic, powertrain, control, moist air, heat transfer, uncertainty (electrical is done).
- **D.2** Wave C large-domain examples: two-phase, fluid, liquid.
- **D.3** The *frees Book* (mdBook) and a 30–50-model public gallery.
- **D.4** Offline reference fixtures from NumPy/SciPy/statsmodels/SALib, with seeds and versions recorded. Passing examples do not establish estimator parity; D.4 and the R15 pilot stay separate from example execution.

**Research & infrastructure.**

- `frees-lsp` language server
- Python/C++ model export
- crates.io publishing
- `SharedArrayBuffer` sweeps (needs COOP/COEP)
- Bounded surrogate property models
- FMI/FMU 2.0/3.0
- WCAG 2.1 AA and touch ergonomics

### Native desktop & iOS (Tauri v2) — proposal only

No Tauri project exists and no build has been measured.

**Why the port is cheap:**

- There is no cross-origin isolation or network dependency.
- The engine boundary is already `&str → String` (`crates/frees/src/lib.rs`), and `frees-cli` already calls it natively.
- `call(...)` in `engineClient.ts` is the single dispatch seam.

**Hard constraint — thread affinity.** The REPL session, progress sink and deadline predicate are `thread_local!`, so the native side needs one dedicated `std::thread` per worker index, with index 0 REPL-affine. A Tokio blocking pool would lose the session.

**Phases:**

1. `src-tauri/`, excluded from the root workspace (or the wasm32 clippy gate breaks). CSP keeps `'wasm-unsafe-eval'`.
2. A `tauri` Vite mode without the PWA/build-info plugins, with `base: './'`. Keep `legacy-peer-deps`.
3. Per-index engine threads, with `ipc::Channel<f64>` for progress. Use the JSON envelopes, not `*_zerocopy`.
4. One `saveBlob` helper replacing the six anchor-download copies; `openPrintReport` is the hardest item.
5. A `build-tauri` release matrix, unsigned.
6. iOS, which needs macOS/Xcode.

**Accepted ceilings:**

- JSON envelopes, not binary IPC.
- Stop cancels only transients.
- The `localStorage` quota is unchanged.

**Acceptance:**

- Every §4 gate stays green unchanged.
- A dispatch-layer test covers every method name.
- Manual smoke: solve parity, sweep progress, Stop, two-call REPL affinity, exports, reopen, print.

---

## 4. Acceptance Gates

Every change must pass the following. Commands and current counts are in [`CLAUDE.md`](CLAUDE.md#essential-development-commands).

- **Rust:** `cargo fmt --all --check`; `cargo clippy -D warnings` on native and `wasm32-unknown-unknown`; `cargo test --workspace -- --skip golden_corpus_parity`; `cargo test --release --test parity`.
- **Goldens:** every fixture passes within [`fixtures/tolerances-rustprop.json`](fixtures/tolerances-rustprop.json). CI fails on an unused tolerance entry. Never edit a golden to fit a code change; a regenerated golden states its provenance in `oracle.generated_by`.
- **Frontend (Node 22):** `npm test`, `npm run lint`, `npm run check-docs`, `npm run check-examples` (zero unit warnings), and `npm run build` with PWA assets.
- **Bundle:** `frees.wasm` ≤ 5,120 KiB raw. CI warns at 200 KiB headroom; the lazy-chunk pay-down is overdue (`ci.yml` ledger).
- **Language changes** must still satisfy the migration matrix:
  - Equation functions solve forward and backward.
  - Multi-output calls keep order, shape and units.
  - Discarded outputs keep their constraints.
  - Ordered bodies never read before assignment.
  - Repeated instances stay independent.
  - Tables called like functions interpolate identically.
  - Index/call/initial resolution is deterministic, including the index-0 diagnostic.
  - A defaulted input that is swept takes one value per row.
  - ODE/DAE/event/accessor tolerances hold.
  - An unknown variant selector is a preparation error.
  - Analysis settings reach CLI, WASM and UI identically.
  - Metadata, plot and check calls stay out of the balance count.
  - Legacy import round-trips.
