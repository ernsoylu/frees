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
gate over every example (#137); EC2 group 1 (#139); FX0, the three
project data-loss paths U01, U02 and U04 (#141); FX7, hybrid events E01–E03 (#142;
three event goldens regenerated against closed forms, owner-approved); FX1a,
case-sensitive milli/mega prefixes and `S`, with lowercase former-mega spellings
refused (#143, owner decision); FX1b, the optimizer reads a capitalised
decision's guess (#144); FX8/E04, vapour-side superheat from the dew point (#145); FX8/E06, nonnegative regeneration loss (#146); FX8/E07, moving-boundary zones at zero wall superheat (#147); FX3g with FX8's reverse-flow policy, signed ISO 6358 flow with a linear zero-flow band and a bidirectional `TwoPhaseFlowRes` (#148); FX9/U03, raw statistics and the data table from the source series (#149); FX9/U05, the box plot registered and every offered chart type validated against the bundle (#150); FX9/U06, a 3D mesh kept whatever its row order (#151); FX9/U07, playback speed on coarse trajectories (#152); FX9/U08, disconnect beside a comment, from the parser's endpoint spans (#153); FX9/E08, a live watch's unit checked against its column (#154); FX9 docs, the table accessors' syntax shown as it parses (#155); FX2a, component members' units filled from the check, values still SI (#156); FX1f, a solve's property answers independent of what the process solved before (#157); FX1d, every `If` branch checked for one unit (#158); FX1c, a warning when °C/°F values are added or scaled as if they were differences (#159).

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
- **FX1e. `Integral` gives two answers for one integral.** With constant limits, the optional `step` selects a trapezoid stepping driver: `Integral(t^2, t, 0, 2, 0.5)` gives 2.75. With a variable limit, `step` is ignored (`integral.rs:694`) and the result is the adaptive 2.6667. The dummy variable `t` also leaks out as a solved row, and the two paths report different units.
  - Fix: both paths give the same value for the same integral. The step becomes an accuracy hint for the adaptive rule, not a different method.
  - Keep `t` out of the variables.
  - Before changing anything, scan the goldens for a five-argument `Integral` and list them.

**FX8. Component invariants at the boundaries.** Each fix pairs the failing point with the reviewer's passing control, and scans the goldens and gallery for the component first.
- **E05. `TwoPhaseEvaporatorUA` applies outlet superheat at the inlet saturation temperature.** `Tevap = T_sat(P=in.P)` sets `out.h` at `out.P`. With R134a and `SH = 5`, the delivered superheat is 5.00, 6.27 and 11.80 K at dP = 0, 20 and 100 kPa.
  - Fix: keep `Tevap` as the heat-transfer driving temperature, and set the outlet from `Temperature(P=out.P, x=1) + SH`.
  - The EV thermal model uses this component on both evaporator branches, so its goldens may move, for this cause.
  - **Blocked on `md-hpwh` (measured 2026-11-24, re-measured 2026-11-25).** The fix delivers exactly the set superheat, where the Java goldens deliver 6.92 K (`ev-thermal-management`) and 6.77/9.77 K (`new-library-components`) for SH = 5/8 at dP = 20 kPa; both goldens and the four reference pages sharing the `aux` example move for this cause. But `multidomain_examples.md[md-hpwh]` then fails in WASM only. Its 53-equation block stalls cold on both targets, and the ladder's consistent-start rung starts 1.4e-12 apart on the two (the sweep's property calls), reaches 1e-7 after one step and 1 % after two, then converges natively in 28 iterations and stalls in WASM after 195. With `rustprop_warm` bypassed, WASM solves it, agreeing with native to 1.5e-13. Re-measured on FX1f (#157), 2026-11-25: `md-hpwh` still stalls in WASM (block 22, 30 iterations, residual 2.47e6), from guesses near the solution as well. Natively it is a rescue-ladder solve on main too: 85 iterations with today's outlet formula, 95 with E05's. Between iterations 6 and 20 the full Newton steps only take the residual from 27 to 11, which points at an inaccurate Jacobian entry or a kink in that block. E05 waits for block 22 to converge directly; land it then, with `md-hpwh` as a second repro.
  - Not reverified on FX1f: a cold `Temperature(R134a, P=1282785, h=261234)` (compressed liquid) differed by 7.3e-10 between native and WASM with the seed bypassed, where every other call measured agreed to 4e-13. If `md-hpwh` still splits the targets, start there.

**FX2. Units that disappear.**
- **FX2b. User `FUNCTION` arguments carry no units.** `FUNCTION Sq(a [m]); y = Sq(3 [m])` warns "argument must be dimensionless" and returns `9 [-]`. The `[m]` annotation is parsed and then ignored, both on arguments and on multi-output results (`parser/toplevel.rs:771`).
  - Fix: an annotated argument checks the call against its declared unit. An unannotated argument is a wildcard, so it no longer raises the false warning. The result's unit follows the body or the declared output unit.
  - This supersedes the D.1 open finding on function arguments.

**FX3. Wrong or surprising results from the language (not silent, but wrong).**
- **FX3a. `FOR` bounds.** `FOR i = 1 TO 2.5` runs three times. `FOR i = 3 TO 1` runs 1, 2, 3 instead of zero times.
  - Fix: a non-integer bound is an error, and a reversed range runs zero times. First check the goldens and examples for reversed ranges.
- **FX3b. Same-name functions.** `FUNCTION f` followed by `FUNCTION F` keeps the second silently. Make it a duplicate-definition error, as variables already are.
- **FX3c. Cubic table interpolation ignores `XLOG`/`YLOG`** (`curvetable.rs:238`), so it disagrees with the linear path on a log-scale table. Honour the flags.
- **FX3d. Water at 5000 °C returns a value with no warning**, far outside the equation of state's range. Emit a range warning from rustprop's validity limits. Do not refuse, since the extrapolation is CoolProp's behaviour.
- **FX3e. Missing common units:** `psig`, `barg`, `mbar`, `ton` (refrigeration), `mph`, `knot` and `inH2O`. Gauge units need an atmosphere convention, which is an *owner decision*: a fixed 101.325 kPa, or a refusal that names `psia`.
  - Also: an unknown unit leaves the value unconverted and the solve reports OK. Make an unknown unit on a literal a preparation error.

- **FX3f. `Ω` inside a unit bracket.** `R = 10 [Ω]` and `[kΩ]` fail with "unexpected character `Ω`", but the engine prints `[Ω]` in its own output, so a reported unit cannot be pasted back. Accepting `Ω` in the unit lexer is purely additive, since that text is a syntax error today. It does not need FX5's contract process.

**FX4. Diagnostics that point the wrong way.**
- A property call outside its range, or an overflow, reports "Newton stalled after 0 iterations… try different guess values". An explicit single-equation block that fails on its first evaluation should report the function error itself.
- Size limits (FOR > 10⁶, `linspace`, `zeros`) are labelled "Syntax error". Label them as limits.
- A NaN `FOR` bound reports "Array index expression cannot be evaluated".
- `sum(i, i=1, N)` is reported as a fluid property call.
- The underspecified/overspecified hint talks about component chains in a document that has no components. Show that hint only when the document instantiates components.
- A one-decision BOBYQA request runs Nelder-Mead. The response should carry a warning saying so.
- User `FUNCTION` recursion stops at 64 levels, so `h(70)` with a base case fails. Raise the limit under the evaluator's work budget, or name it in the message and the reference page.

**FX6. Measure, then optimise.**
- Profile `ev-battery-cooling-pid` (16 s alone; IDA over the R134a loop) before changing anything. Split the time between residual assembly, the Jacobian, the factorisation and property calls. The engine already factors sparse Jacobians (Phase 4.1), so "no sparsity" is not the working hypothesis. Property evaluation and the number of Jacobian refreshes are.
  - Acceptance: a recorded profile, and the gate timeout back near the suite's normal limit.
- `step`/`stepinfo`: the 2026-10-31 finding ("seconds over a few hundred samples") did not reproduce at the default length (41–90 ms on 2026-11-23). Retest with a long explicit time vector. If it is still fast, close the finding.

**FX5. Language-contract items (owner decision before any work).** Each changes how existing text parses, so each needs a migration-matrix row (§4) and a golden scan.
- **Transpose and string literals.** `A' + A'`, and `C = A'` followed by any later `'string'`, lex the two quotes as one string (`lexer.rs`, pinned as Java behaviour). The fix: after an identifier, `)` or `]`, a quote is a transpose.
- **Matrix names depend on statement order** (`parser/expand.rs:52`). A matrix used before its declaring statement, a `FOR` body reading a matrix declared outside it, and `[A; A]` all fail as underspecified. The fix: pre-register shapes over the whole document, and let `FOR` bodies see the enclosing scope.
- **A temperature-difference unit** such as `[dC]`/`[dF]`. Until then the checker warns (FX1c, #159) when °C/°F values are combined with weights that sum to neither 0 (a difference) nor 1 (a mean).

**Order.** FX2b → FX1e → FX3 (FX3f first) → FX6 → FX4. E05 waits for `md-hpwh`'s block 22 (see E05). FX5 waits for decisions. Each item is its own PR with its repro as a test. Rebuild the WASM module before treating `check-examples` as evidence.

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

- **EC2. Fold the Help library into `EXAMPLES`. 9 of 85 done (#139).** The remaining groups, one PR each: Control Systems (21), ODE (20), EV and Vehicle (10), HVAC (10), then the remaining 15. Each entry becomes a non-featured `Example` in its EC3 category, with its Help note moved into the header and CHECKs at 1e-6 relative.
  - `control-analysis-report` is in both catalogs: diff the two and keep the gallery copy if the model is the same. `cd-nozzle-shock` is a different model and becomes `cd-nozzle-normal-shock-branch`.
  - The last PR deletes `helpExamples.ts`, the `EXAMPLE_CATEGORIES` path in `HelpPage.tsx`, the second branch in `searchIndex.ts` and the carve-out in `check-doc-coverage.mjs`.
  - **Acceptance:** 263 examples inside the EC1 gate, and Help lists exactly the non-featured ones.
- **EC3. Categories and descriptions.** Map the current labels onto 12: Systems · Thermodynamics · HVAC & Refrigeration · Heat Transfer · Fluids & Fluid Power · Mechanics · Electrical & Powertrain · Aerospace & Compressible Flow · Control Systems · Dynamics & ODEs · Data & Analysis · Lessons & Labs. Rewrite the 42 "Solve (F2). ⟨title⟩" descriptions; this is text only. **Acceptance:** no category holds fewer than 3 examples, and no description repeats its title.
- **EC4. The picker becomes the curriculum.** `ExamplesModal` shows only `featured`, in this order: `ideal-gas`, `linear-regression-diagnostics`, `pump-valve-operating-point`, `rankine-cycle`, `hydraulic-metering-restriction`, `tank-draining`, `sounding-rocket-trajectory`, `projectile-trajectory`, `step-impulse-response`, `cruise-control`, `ev-battery-cooling-pid`, `ev-thermal-management`, `multi-objective-beam`, `correlated-temperature-heat-loss`, `vibration-tone-spectrum`, `lab-air-mixing`, `lesson-rc-charging`. The table is final (owner decision 2026-11-22).
  - Four examples gain content: `ideal-gas` gets `Convert()`, CHECKs and a REPL prompt; `linear-regression-diagnostics` gets a `TABLE` for the Curve Fit dialog; `rankine-cycle` gets a T–s `PLOT` and CHECKs; `correlated-temperature-heat-loss` gets a walk-through of Monte Carlo and Sensitivity.
  - Help's Open in Editor passes the example id, so lessons and labs open with their panel.
  - A gate table of fundamental → pattern, about 41 rows, asserts that the featured set covers every fundamental.
- **EC5. Documentation gaps.** In `analysis_examples.md`: Monte Carlo and Sobol/Morris requests on `correlated-temperature-heat-loss`, a `parameter_fit` dynamic calibration, and graded signal-processing and regression sections. In `getting_started.md`: "Projects and runs" (project library, autosave, Runs panel). No new guide files.

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
