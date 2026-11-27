# Engineering Roadmap

Open work, acceptance gates and the rules that still bind. Test counts and
subsystem status live in [`CLAUDE.md`](CLAUDE.md#current-status--verification-metrics);
architecture and decisions D1–D14 live in
[`ARCHITECTURE_AND_REQUIREMENTS.md`](ARCHITECTURE_AND_REQUIREMENTS.md). Closed
work is recorded in Git history and its PRs, not here.

---

## 1. Done

Phases 1, 2 and 4.1–4.5; documentation programmes D.1–D.4 and the frees Book;
schematic CR-SCHEMATIC-01 (01a–01e); the programmes of 2026-11-05 (A–E, lazy
fluid chunks), 2026-11-06 (F–M, interactive simulation and teaching),
2026-11-12 (N–R, workspace shell) and 2026-11-19 (D.2 component coverage);
removal of the (P,h) table path (D12, #136); EC1, which runs one solve-and-CHECK
gate over every example (#137); EC2, the Help library folded into `EXAMPLES`: all 85 entries graded by the EC1 gate, 263 examples in one catalogue, Help listing the 241 non-featured ones, and `helpExamples.ts` deleted (#139, #171–#174, #176); the slider drag it caught listing pins after a lowered `Integral` (#175); EC3, the 263 examples in 12 categories (the smallest holds 5) and the 64 descriptions that said only "Solve (F2)" or repeated their title rewritten, held by an `examples.test.ts` gate (#177); EC4's first part, Help's Open in Editor naming its example so a lesson or lab opens with its panel (#178); FX0, the three
project data-loss paths U01, U02 and U04 (#141); FX7, hybrid events E01–E03 (#142;
three event goldens regenerated against closed forms, owner-approved); FX1a,
case-sensitive milli/mega prefixes and `S`, with lowercase former-mega spellings
refused (#143, owner decision); FX1b, the optimizer reads a capitalised
decision's guess (#144); FX8/E04, vapour-side superheat from the dew point (#145); FX8/E06, nonnegative regeneration loss (#146); FX8/E07, moving-boundary zones at zero wall superheat (#147); FX3g with FX8's reverse-flow policy, signed ISO 6358 flow with a linear zero-flow band and a bidirectional `TwoPhaseFlowRes` (#148); FX9/U03, raw statistics and the data table from the source series (#149); FX9/U05, the box plot registered and every offered chart type validated against the bundle (#150); FX9/U06, a 3D mesh kept whatever its row order (#151); FX9/U07, playback speed on coarse trajectories (#152); FX9/U08, disconnect beside a comment, from the parser's endpoint spans (#153); FX9/E08, a live watch's unit checked against its column (#154); FX9 docs, the table accessors' syntax shown as it parses (#155); FX2a, component members' units filled from the check, values still SI (#156); FX1f, a solve's property answers independent of what the process solved before (#157); FX1d, every `If` branch checked for one unit (#158); FX1c, a warning when °C/°F values are added or scaled as if they were differences (#159); FX2b, user functions' argument units checked and their results' units carried (#160); FX3f, `[Ω]` and `[kΩ]` accepted inside a unit bracket (#161); FX3a, `FOR` bounds must be integers and a reversed range runs zero times (#162); FX3b, a repeated definition name is refused (#163); FX3c, cubic table lookups honour `XLOG`/`YLOG` (#164); FX3d, a solve warns when a property call's `T=`/`P=` input is above the fluid's `Tmax`/`pmax` (#165); FX3e (part), `mbar`, `ton`, `mph`, `knot` and `inH2O` (#166); FX6, both profiles recorded (#167); FX4 (part), an explicit equation's function error, size limits, unknown bounds and `sum`'s named arguments reported as themselves (#168); FX4, the component-chain hint only with components, a BOBYQA fallback warning, and the recursion limit named as fixed (#169); FX4, a reversed indexed `Sum`/`Product` is empty like `FOR` (#170).

---

## 2. Open Work, in priority order

### FX. Correctness fixes from the 2026-11-23 engine audit

**Source.** About 120 probe documents were run through the WASM module, and the
code behind each failure was read. Two external reviews were triaged the same day. The second
(16 findings, E01–E08 and U01–U08) supplied FX0 and FX7–FX9; the first review's
rejected points are listed at the end of FX. Every item below reproduced on
`main` at `8c9f942`. The probes were temporary evidence and are not in the repository;
each item carries its own repro, and each fix lands with that repro as a test.

**Binding rules.**
- **Root cause, one place.** Fix the shared lookup, checker or parser, not each caller.
- **Grades stay frozen.** A golden or CHECK changes only when the item itself is the cause, and the PR names it. A scan of `fixtures/`, the examples and the docs found no document that relies on case-folded units: the 8 `[mm]` and the 1 `[MW]` are all spelled correctly.
- **A Java-parity quirk is not a reason to keep a wrong answer.** Where a fix departs from the reference engine, the code comment says so and the pinned parity test is rewritten to assert the fixed behaviour.
- **Language changes need the owner.** FX5 changes how existing documents parse, so it waits for a decision. Items marked *owner decision* list the options.

**FX1. Silent wrong numbers (one PR per item).**
- **FX1e. `Integral` gives one answer for one integral.** Done (decided 2026-11-27). The constant-limit stepper is Dormand–Prince 5(4) instead of the Java Heun predictor–corrector, `step` caps the step on both paths (an accuracy hint, not a different method), and the integration variable is no longer a result row. 32 goldens were regenerated for this cause; the 17 whose values moved are graded against closed forms and now agree to about 1e-11 (the Java values were 6e-9 to 3e-7 off). Units done: a result has the integrand's unit times the variable's, and the variable has its limits' unit, on both paths and in Check as in Solve (`F = Integral(t^2, t, 0, 2)` is `-`, `Integral(x, x, 0, 2 [m])` is `m^2`). The checker reads the integrals as written (`integral::unit_view`) in place of the lowered tail. `tank-draining` and `newton-cooling` gained `[s]` on their upper limits, which the new check asked for; no value moved.

**FX8. Component invariants at the boundaries.** Each fix pairs the failing point with the reviewer's passing control, and scans the goldens and gallery for the component first.
- **E05. `TwoPhaseEvaporatorUA` applies outlet superheat at the inlet saturation temperature.** `Tevap = T_sat(P=in.P)` sets `out.h` at `out.P`. With R134a and `SH = 5`, the delivered superheat is 5.00, 6.27 and 11.80 K at dP = 0, 20 and 100 kPa.
  - Fix: keep `Tevap` as the heat-transfer driving temperature, and set the outlet from `Temperature(P=out.P, x=1) + SH`.
  - The EV thermal model uses this component on both evaporator branches, so its goldens may move, for this cause.
  - **Blocked on `md-hpwh` (measured 2026-11-24, re-measured 2026-11-25).** The fix delivers exactly the set superheat, where the Java goldens deliver 6.92 K (`ev-thermal-management`) and 6.77/9.77 K (`new-library-components`) for SH = 5/8 at dP = 20 kPa; both goldens and the four reference pages sharing the `aux` example move for this cause. But `multidomain_examples.md[md-hpwh]` then fails in WASM only. Its 53-equation block stalls cold on both targets, and the ladder's consistent-start rung starts 1.4e-12 apart on the two (the sweep's property calls), reaches 1e-7 after one step and 1 % after two, then converges natively in 28 iterations and stalls in WASM after 195. With `rustprop_warm` bypassed, WASM solves it, agreeing with native to 1.5e-13. Re-measured on FX1f (#157), 2026-11-25: `md-hpwh` still stalls in WASM (block 22, 30 iterations, residual 2.47e6), from guesses near the solution as well. Natively it is a rescue-ladder solve on main too: 85 iterations with today's outlet formula, 95 with E05's. Between iterations 6 and 20 the full Newton steps only take the residual from 27 to 11, which points at an inaccurate Jacobian entry or a kink in that block. E05 waits for block 22 to converge directly; land it then, with `md-hpwh` as a second repro.
  - Not reverified on FX1f: a cold `Temperature(R134a, P=1282785, h=261234)` (compressed liquid) differed by 7.3e-10 between native and WASM with the seed bypassed, where every other call measured agreed to 4e-13. If `md-hpwh` still splits the targets, start there.

**FX3. Wrong or surprising results from the language (not silent, but wrong).**
- **FX3e. Gauge units and unknown units.** `mbar`, `ton` (refrigeration), `mph`, `knot` and `inH2O` were added (#166).
  - Done (decided 2026-11-27): `psig` and `barg` are gauge scales over the fixed standard atmosphere, 101.325 kPa, so `0 [psig]` is 101,325 Pa absolute. Like °C, only a bare literal carries the offset (`[psig/s]` is a difference), and the checker's absolute-temperature rules no longer read a gauge offset as a temperature. The language guide has a "Gauge pressures" section.
  - Done (decided 2026-11-27): an unknown unit on a literal is a preparation error (Check and Solve) that quotes the line and the unit, keeps the mega/milli hint, and otherwise names the nearest known unit within a third of the name's length (`kpas` → `kpa`; `zorkmids` gets no guess). `units_unknown_unit_warns` is regenerated for this cause, and the frontend's "unconverted units" pill, summary and report heading, which only that warning reached, are removed.
  - Done (owner decision 2026-11-27): identifier-safe unit spellings. `_per_` divides and a lone `_` multiplies, so `[kg_per_m3]` is `[kg/m^3]` and `[kJ_per_kg_K]` is `[kJ/kg-K]`; the Cengel problem files use them. Before the unknown-unit error they passed unconverted with a warning.


**FX6. Measure, then optimise.** Both profiles were recorded on 2026-11-25 (native release build, `fx3e`, callgrind with line tables). The next step for each changes numbers or representation, so each waits on an *owner decision*.
- **`ev-battery-cooling-pid`** takes 15.0 s natively. It runs `ode23s` (Rosenbrock), not IDA, over 0–4000 s.
  - Counts: 1,432 steps, one ODE Jacobian refresh per step, 10,426 algebraic solves (about 7 per step), 396,194 Newton block solves, 4.74 M residual evaluations, and 774,428 property calls (28,324 cold flashes).
  - Inclusive split: the ODE Jacobian (`ode::methods::jacobian`, finite differences, each state column a full nested algebraic solve) takes 57 %. Newton residuals take 76 % and the line search 25 %. `props_si` takes 19.6 %, about half of it cold flashes. Sparse factorisation does not appear in the profile.
  - The lever is the per-step Jacobian refresh. It could be reused across steps (a W-method), or made analytic from the block structure. Property calls come second.
  - *Owner decision:* either option changes this model's integration path, so its golden values move and need regenerating for that cause.
  - **Decided 2026-11-27:** reuse the Jacobian across steps (a W-method), refreshing when convergence slows or the step changes sharply. This model's goldens are regenerated for this cause.
- **`step`/`stepinfo` with a long time vector:** the 2026-10-31 finding reproduces and is quadratic in the sample count N. `[y] = step(num, den, t)` takes 5.6 s at N = 1000, 23 s at 2000 and 146 s at 5000. A 2000-equation baseline without `step` takes 0.07 s, and `check` alone takes 10.7 s at 2000.
  - Cause: `step` emits one equation `y[i] = step$i(…, t[1], …, t[N])` per sample, so every equation names all N samples. At N = 1000, 66 % of the instructions are `Equation::variables` rebuilding `BTreeSet<String>`s. The passes involved are the unit check (28.5 %), the blocker (22.9 %), display names (14.3 %), `unknowns` (13.2 %) and `builtin_constants` (10.9 %).
  - Rerunning the simulation per sample is only about 15 %. A memo for it was measured (23 s → 20 s at N = 2000) and not kept.
  - *Owner decision:* the fix is representational. Options are to substitute a constant time vector's values into the call, so the samples are not variables, or to make the time responses one vector-valued call node.
  - **Decided 2026-11-27:** substitute a constant time vector's values into the call; a non-constant time vector keeps today's path.
  - Note that 25,000 equations is the generator's limit, so N above about 20,000 is refused.

**FX5. Language-contract items (owner decision before any work).** Each changes how existing text parses, so each needs a migration-matrix row (§4) and a golden scan.
- **Transpose and string literals.** `A' + A'`, and `C = A'` followed by any later `'string'`, lex the two quotes as one string (`lexer.rs`, pinned as Java behaviour). The fix: after an identifier, `)` or `]`, a quote is a transpose.
  - **Decided 2026-11-27:** do it, with its migration-matrix row and golden scan. The other two FX5 items stay undecided.
- **Matrix names depend on statement order** (`parser/expand.rs:52`). A matrix used before its declaring statement, a `FOR` body reading a matrix declared outside it, and `[A; A]` all fail as underspecified. The fix: pre-register shapes over the whole document, and let `FOR` bodies see the enclosing scope.
- **A temperature-difference unit** such as `[dC]`/`[dF]`. Until then the checker warns (FX1c, #159) when °C/°F values are combined with weights that sum to neither 0 (a difference) nor 1 (a mean).

**Order (decided 2026-11-27).** FX1e, then FX3e (gauge units, then unknown units), then the two EC4 engine items (`Convert` labels, declared sigmas as analysis sources), then FX6 (`step` substitution, then the W-method), then FX5's transpose fix. E05 still waits for `md-hpwh`'s block 22. FX5's matrix-order and temperature-difference items stay undecided. Each item is its own PR with its repro as a test. Rebuild the WASM module before treating `check-examples` as evidence.

**Process lessons from this cycle.**
- **Stacked PRs:** when the base PR is squash-merged, merge `main` into the dependent branch rather than rebasing it. A rebase needs a force-push, and the agent sandbox blocks force-pushes.
- **Grade against physics, not only the oracle.** The Java goldens froze at least one wrong event result, and the parity script compared event counts only. A fix that touches a golden needs an independent analytic or physical expectation, and a gate that checks names and values, not counts.
- **Catalog moves (EC2):** a converter that maps fields by hand must fail loudly on a field it does not know. The first EC2 group dropped Help's `diagram` field, and only `tsc -b` caught it. Run `tsc -b` on every group, not just `vitest`.

**External review, 2026-11-23: points not taken.** Re-raise one only with new evidence.
- **"Lazy fluid loading infected the core; let the CLI bundle everything."** That is the current design. Native builds link all 28 fluids through `frees-core`'s default `linked-fluids` feature; the core keeps only the `install_from_bytes` seam (D12).
- **"Replace the custom canvas with React Flow."** D13 spiked React Flow on three models. Drag cost matched, it lost native SVG export and keyboard connect, and it added 63 KB gzipped. The 350-line figure was the subset React Flow would have replaced, not the canvas (12.4k lines today, most of it routing and authoring that React Flow does not provide). D13's own reconsider triggers stand. The review's accessibility point is taken and belongs with the WCAG 2.1 AA item in §3.
- **"Use mdBook instead of the custom SSR Book."** D14 measured mdBook on the 844 pages: 635 pages showed raw `$…$` math and 212 showed raw Help directives. Making it work needs a second implementation of the Help dialect.
- **"SharedArrayBuffer avoidance is a hard ceiling."** It stays a deferred candidate (§3) with its COOP/COEP cost. There is no measured sweep that needs it.
- **"The integrator needs an RNG seam now."** It stays deferred. No model has asked for in-time stochastic boundaries, and parameter Monte Carlo over a `DYNAMIC` document already re-solves per sample.
- **Live-mode buffer recycling.** It stays a `ponytail:` ceiling until a profile shows GC pauses in a long run.
- **Catalog unification and function units** are already EC2/EC4 and FX2b.

### EC. Example curriculum (approved 2026-11-22; EC1 done)

**Goal.** Open Example teaches every fundamental; Help carries the rest. One catalog, one shape, one gate.

**Binding rules.** No example is deleted; an example leaves the picker for the Help library. Grades stay frozen: Help-library examples are graded against their cited source or a stated closed form. No new example type, field, flag or registry is added.

- **EC4. The picker becomes the curriculum.** Done: Help's Open in Editor opens lessons with their panel (#178), and `ExamplesModal` shows only the 17 `featured` examples, in the owner's order, which is now the `EXAMPLES` order (#179). Remaining:
  - Four examples gain content. `rankine-cycle` has its T–s `PLOT` and CHECKs (#180), and `linear-regression-diagnostics` carries its points as `TABLE regression_data` with the Curve Fit steps (#183: document `TABLE` blocks now reach the workbook as code tables from Check and Solve, and #185 does the same for `STATE TABLE` blocks, which open their Fluid States windows; `e2e/code-tables.spec.ts` fits it and `siyavula-correlation` in the dialog). `ideal-gas` has `m_g = m * Convert(kg, g)`, its CHECKs and a REPL prompt (decided 2026-11-27: unit inference now labels a `Convert` result in its target unit, and display reads it on that unit's scale, so it shows `292.16 [g]`; no value changes). Open:
    - `correlated-temperature-heat-loss` gets a walk-through of Monte Carlo and Sensitivity. *Owner decision:* neither analysis takes the document's own `UncertaintyOf(x) = …` lines as sources. Monte Carlo refuses ("needs at least one variable with a declared uncertainty") although it does honour the document's `Correlation`; its sources come only from the Variable Information window (`analysis::montecarlo::run_with_tables_and_base`). With 0.2 K and 0.3 K entered there, 1,000 samples (seed 42) give σ = 2.56 W against the first-order 2.65 W. Sobol/Morris refuse any document that declares a `Correlation`. Either the analyses read declared sigmas as sources, or the walk-through tells the reader to re-enter them and shows Sensitivity on a copy without the correlation.
      **Decided 2026-11-27:** Monte Carlo and Sensitivity read `UncertaintyOf(x) = σ` lines as sources, and Variable Information still overrides them. Sobol/Morris keep refusing correlations.
  - Gate done: `examples.test.ts` `FUNDAMENTALS` lists 45 fundamentals with the pattern that finds each in a featured example (#181). The two not yet taught (Monte Carlo, Sobol/Morris) are `'open'` rows; they close with the walk-through above.
- **EC5. Documentation gaps.** Done (#182; the `pi`-for-`pi#` diagnostic it surfaced is fixed in #184): `analysis_examples.md` titles its four requests and adds Monte Carlo on `correlated-temperature-heat-loss` (correlation honoured, σ = 2.56 W against the first-order 2.65 W), a graded `Detrend` → `Welch` / `Window` → `FFT` section and a regression section where `linfit`, `polyfit` and a graded `curve_fit` request agree; `check-doc-examples.mjs` now runs `curve_fit` requests. `getting_started.md` has "Projects and runs". Sobol/Morris on that model stays refused, because the document declares a `Correlation`; examples 3 and 4 run it without one and say why.

### Usability validation (not run)

- **R15 pilot.** Cards, answer key and thresholds are in [`R15_PILOT.md`](R15_PILOT.md). Five participants: scalar solve (≤ 5 min), component chain (≤ 10 min), missing-boundary recovery (≤ 3 min).
- **Workspace shell sessions.** Five engineers: open and solve an example; sweep and plot; import a CSV and fit it; connect a component and follow a diagnostic; compare a scenario; recover a panel; restore a layout; export data and a plot. The target is each task completed by at least four of five without help. The ribbon stays behind its preview flag until the owner decides.
- **Never fabricate participant outcomes.**

### Open findings (not reverified since the date given)

- **2026-11-06.** The RustProp crates.io publish was blocked by the new-crate burst limit; frees pins the `v0.3.0` tag. A scenario's baseline is not saved with the project. Spokes of one net can share a lane past their junction dot.
- **2026-11-07.** There are no switch, transformer, op-amp or lamp symbols; they need Figma masters.
- **Live-mode ceilings:**
  - Chunk buffers are not recycled.
  - Lab timelines follow a slider only when the units match.
  - The live speed is not shared.
  - The playback cursor does not move along a diagram.
  - There is no entropy or exergy in the power view.
  - There is no compressor curve on operating-point cards.
  - The REPL's `ans` is overwritten by a table evaluation.

### Standing rules

- **CircuitJS (GPL-2.0-or-later).** No code, translated code, constants, icons, help text or example circuits. Behaviour only, reimplemented from physics with frees' own sources.
- **RustGIS (Apache-2.0).** Patterns only. Visual identity is frozen: teal primary, dark default, `md` radius, Cascadia Code, the teal → cyan Solve gradient, and the existing chart, CodeMirror and Glide palettes. No new docking, chart or icon package. No command is removed until the parity test shows another route to it. Closing a view never deletes data.

---

## 3. Deferred Candidates

- **npm alerts (Socket, 2026-11-21).**
  - `glob` 11 and `minimatch` 9/10: build-time denial-of-service bugs. Trigger: workbox-build or linaria taking the fixed major.
  - `maplibre-gl`, `@plotly/mapbox-gl` and `es5-ext`: not bundled. Trigger: a map or WebGL trace, or plotly.js 4.
  - `babel-merge` and `@babel/plugin-proposal-export-namespace-from`: glide-data-grid build dependencies.
- **Research and infrastructure:** the `frees-lsp` language server; Python/C++ model export; `SharedArrayBuffer` sweeps; bounded surrogate property models; WCAG 2.1 AA and touch ergonomics, including schematic canvas keyboard navigation (raised by the 2026-11-23 review).
- **Simulation:**
  - several DYNAMIC blocks; structural state migration
  - hysteresis and state machines; ADC/DAC and sampled control
  - water hammer; stochastic boundaries
  - checkpoints and branched runs; transistor-level devices
  - symbol-standard presets; equivalent R/UA between two ports
  - sonification; UI localisation
- **Workspace shell:** a Project Explorer (only if the validation sessions show the need); linked side-by-side views; Quick Access favourites; browser pop-out windows; an exportable History pane; remappable global keys.

---

## 4. Acceptance Gates

Every change must pass these. Commands and counts are in [`CLAUDE.md`](CLAUDE.md#essential-development-commands).

- **Rust:** `cargo fmt --all --check`; `cargo clippy -D warnings` on native and `wasm32-unknown-unknown`; `cargo test --workspace -- --skip golden_corpus_parity`; `cargo test --release --test parity`.
- **Goldens:** every fixture passes within [`fixtures/tolerances-rustprop.json`](fixtures/tolerances-rustprop.json). CI fails on an unused tolerance entry. Never edit a golden to fit a code change; a regenerated golden states its provenance in `oracle.generated_by`.
- **Frontend (Node 22):** `npm test`, `npx tsc -b`, `npm run lint`, `npm run check-docs`, `npm run check-examples` (zero unit warnings), and `npm run build`.
- **Bundle:** `frees.wasm` ≤ 5,120 KiB raw.
- **Language changes** must satisfy the migration matrix:
  - Equation functions solve forward and backward.
  - Multi-output calls keep order, shape and units.
  - Discarded outputs keep their constraints.
  - Ordered bodies never read before assignment.
  - Repeated instances stay independent.
  - Tables called like functions interpolate identically.
  - Index, call and initial resolution is deterministic, including the index-0 diagnostic.
  - A swept defaulted input takes one value per row.
  - ODE, DAE, event and accessor tolerances hold.
  - An unknown variant selector is a preparation error.
  - Analysis settings reach the CLI, WASM and UI identically.
  - Metadata, plot and check calls stay out of the balance count.
  - Legacy import round-trips.
