# Engineering Roadmap

Signed milestones, open work and acceptance gates for `frees`. Current test
counts, the bundle measurement and the status of each subsystem live in
[`CLAUDE.md`](CLAUDE.md#current-status--verification-metrics); architecture and
the retained decisions D1–D14 live in
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
11. **Phase 4.5 — Review triage (2026-10-19 → 10-23).**
    - **Callable limitations** closed: `eig`, `eigvec`, `EulerRotate`, `cond`, `ss2ss`, `tf2zp`. All ten blends run through rustprop `heos-mixtures` and match CoolProp 8.0.0. Sweep nonconvergence is surfaced end to end. A lifecycle test covers stacked resource installs. The 20-model multi-domain audit is pinned in `tests/multidomain_fixes.rs`, and `LiquidWallHX` uses the exact isothermal-wall effectiveness.
    - **Final-residual guard.** A solve that leaves any equation's residual above `max(1e-6, 100·rel_tolerance)`, relative to its own top-level terms, fails and quotes the equation (`engine::unconverged_equation`, in `PreparedDocument::assemble_solution`).
    - **Unit checking reaches every body.** `DYNAMIC` bodies, initial conditions, method-of-lines `FOR` blocks and array-state initials all pass through `engine::unit_check`. `der(X)` carries X's units per second, and a bare-number initial value declares nothing. 955 documents check at zero unit warnings in CI. A warning on `[F]`, `[C]` or `[S]` names what frees read, and `cfm` and `gpm` are registered.
    - **SigPID anti-windup** is `/(Ki·Taw)`, so `Taw` is a reset time in seconds (owner decision 2026-10-22).
    - **Component parameter units.** A header unit (`Resistor(R [ohm])`) types a bare instance value and never scales it. 744 parameters declare units, and the 162 component pages carry three-column parameter tables. Parameters whose unit depends on wiring stay untyped and say so.
    - **Table and plot checklist** (T1–T15, F1–F12) is closed. The shared-axis unit label and the log Y2 axis were the last holes.
    - **Cross-layer acceptance.** `e2e/phase9-journeys.spec.ts` Journeys 4 and 5, and `src/tableSolveRace.test.tsx`: stale document and table results are discarded, and a Solve pressed during a check is queued, not dropped. The cross-browser e2e runs in its own CI job inside the Playwright image. That image tag must track the locked `@playwright/test`.

12. **Documentation programmes D.1–D.4 (2026-10-31 → 11-06).** D.1 converted the 25 Wave B bank problems to graded gallery entries (16 reproduce the bank, 9 state why not). D.2 converted 31 of 36 Wave C problems (#75–#77). D.3 is the frees Book: a static export of Help (D14), gated in CI and deployed under `book/`. D.4 grades statistics, fits, signals, sampling and sensitivity against NumPy/SciPy/statsmodels/SALib (`fixtures/stats/reference.json`, `tools/stats-ref/gen.py`) and fixed Sobol' dimensions 27–32, `digamma`, bounded LM and the IRLS cap at the source.
13. **Schematic workspace CR-SCHEMATIC-01 (2026-10-28 → 11-06).** Scope in [`docs/schematic-workspace-change-request.md`](docs/schematic-workspace-change-request.md). 01a readable canvas (decision D13: keep the custom SVG canvas), 01b editing foundation, 01c complete authoring and 01d explain and present closed 2026-10-28/29. Nine carry-forwards closed 2026-10-30, including engine per-block incidence, structured diagnoses, junction identity and remappable canvas keys. The 01e backlog (sheets and off-page connectors with project format v5, COMP-08 symbol overrides through an allowlist sanitizer, scenarios, RUN-05 playback) closed as phase D of item 14. Later fixes: junction dots on their wire point (2026-11-06) and the PWA update check on load (2026-11-07).
14. **Programme of 2026-11-05 (A–E, closed 2026-11-06; E #83).** A: `libm` Bessel functions and a full `filtfilt` start state, both at the 1e-12 grade. B: D.2 Wave C examples. C: the frees Book. D: schematic 01e. E: lazy fluid chunks. The module links Water, R134a, R1234yf and Air. The other 24 fluids and the mixture tables ship as rustprop `RPFLUID1`/`RPMIXTB1` files (RustProp v0.3.0) that the worker installs when a model names them. The module went from 4,587,160 to 3,994,390 bytes raw. On 2026-11-22 (owner-approved) the `FRPHTAB1`/`FRAUX1` table path and its fixtures were deleted (D12).
15. **Programme of 2026-11-06: interactive simulation and teaching (F–M, merged by 2026-11-12).** It was taken from four CircuitJS studies, as behaviour only (licence rule in §2). F decisions and baseline. G prepared reuse and a slider warm start. H flow particles, colour scales, diagram cursor, playback views and stateful symbols. I insight cards, lesson manifests, paired lessons, embed/kiosk, Book search and the bounded `#share=` format 2. J twelve electrical primitives and five signal blocks (library 312 → 329). K the live engine, bridge, bar and store (#103–#106). L live inputs, canvas controls, rolling and mini-scopes, root-found pause conditions, the recorder and preferred-value stepping. M six graded live labs, shared experiments, the power view and operating-point cards.
16. **Programme of 2026-11-12: workspace shell (N–R, 2026-11-13 → 11-18; review #125).** These patterns were taken from two RustGIS reviews (rules in §2). N one command registry, one run-target resolver and shortcuts from it. O the ribbon, behind **Preferences → Ribbon (preview)**. P the Schematic tab. Q window commands, the Window List, named layouts and state that outlives panels. R the Inspector's target, the Problems panel, Runs & Scenarios, dockable analysis tools and "Where is this command?".
17. **Programme of 2026-11-19: D.2 coverage follow-on (2026-11-19).** Every library component now appears in a graded gallery example: fluid 31/31, liquid 21/21, two-phase 47/47. Library fixes: `LiquidVolume` carries its outlet pressure, `TwoPhasePipe` is on the two-phase bond, and the moving-boundary single-phase zones use ε-NTU (#131). Goldens whose wiring the fixes now refuse are graded in the `superseded` section of `tolerances-rustprop.json`.

18. **Programme of 2026-11-22, EC1: one grade for every example (#137).** `examples.test.ts` runs `it.each(EXAMPLES)`: every example solves with zero unit warnings and carries at least one CHECK, and every CHECK is graded. PARAMETRIC examples run through their own table with `solve_table`. 126 CHECKs were added to 47 examples, taken from goldens at parity tolerance or from closed forms. The run found that `sensor-detrend-smooth-window` and `causal-zero-phase-filter` had never solved, because they called a vector multi-output function bare. They now use `[y] = f(...)`.
---

## 2. Open Work

### Programme of 2026-11-22: example curriculum and catalog tidy-up — approved 2026-11-22 (EC1 done)

**Goal.** Open Example should teach the basics of every functional area, and Help and the reference pages should carry the rest. No example is deleted. Every example ends up in one catalog, graded the same way, and reachable from Help.

**Measured on the working tree of 2026-11-22.** These figures come from a pattern scan of every example and every doc fence: 81 capabilities, 41 of them tiered *fundamental*. The scan and the interactive matrix are temporary audit evidence and are not in the repository: [Example coverage matrix](https://claude.ai/artifact/ER2J5v2hEFoR8HqEQjZKvs).
- **The picker ignores `featured`.** `Example.featured` says featured examples are the picker's set and the rest live in Help, and `HelpPage.tsx:574` hides featured ones from Help on that basis. `ExamplesModal.tsx` never filters, so the picker shows all 178 examples. The featured 22 therefore appear nowhere else.
- **The featured 22 teach 22 of 41 fundamentals.** Six sit in the Thermodynamics category and three are full systems. None uses CHECK, GUESS, FOR, uncertainty, psychrometrics, EVENT, a `PLOT` xy block, a property diagram, sliders or live mode. Fourteen fundamentals appear only in non-featured examples.
- **Five fundamentals have no example of any kind:** `Convert()`, the Curve Fit dialog, Monte Carlo, Sobol/Morris sensitivity and the REPL. The gallery's three sensitivity examples (`damping-sensitivity-oscillators`, `drive-cycle-energy-sensitivity`, `feedback-error-sensitivity`) compute finite differences by hand.
- **There are two catalogs with two shapes.** `examples.ts` holds 178 `Example`s with categories and CHECKs. `helpExamples.ts` holds 85 `{value, title, description, note, code}` entries with no CHECK; their category is parsed from the title prefix. `examples.test.ts` only *checks* the 85 for unit consistency, and no test solves them. Two ids exist in both catalogs with different text: `control-analysis-report` (the copies differ by 6 characters) and `cd-nozzle-shock` (a different model).
- **Help cannot open a lesson.** Help's Open in Editor hands code over as an anonymous `doc-snippet`, and `lessonFor('doc-snippet')` is null. Once the picker filters on `featured`, the 18 lessons and labs would open without their panel.
- **Categories overlap.** There are 21 gallery and 21 Help categories, including Mechanical/Mechanics, Thermal/Heat Transfer and HVAC/"HVAC & Refrigeration", and four analysis categories holding 1–4 examples each. 42 gallery descriptions read only "Solve (F2). ⟨title⟩".
- **Two workspace features have no documentation:** the Runs panel (run comparison) and the project library (autosave). The reference layer is complete: 761 of 761 pages have an executable fence.

**Binding rules (every phase).**
- **No example is deleted.** An example leaves the picker for the Help library. Merging two catalog entries keeps the model and its source note; the only thing dropped is a copy shown by diff to be the same model.
- **Grades stay frozen.** A CHECK or golden changes only for a cause found in the model, never to make a phase pass. A Help-library example that gets CHECKs is graded against its cited source or a stated closed form, as D.2 required.
- **One shape, one catalog, one gate.** No new example type, flag or registry is added. `featured` and `category` already carry everything the picker needs.

- **EC2. Fold the Help library into `EXAMPLES`.** Root cause: two catalogs with two shapes.
  - Convert the 85 `CYCLE_EXAMPLES` to non-featured `Example`s, with `category` set from today's title prefix through the EC3 map. Delete `helpExamples.ts`, the separate `EXAMPLE_CATEGORIES` path in `HelpPage.tsx`, the second branch in `searchIndex.ts` and the `CYCLE_EXAMPLES` carve-out in `check-doc-coverage.mjs`. A reference page's `examples:` can then bind any example.
  - Each converted example gets CHECKs against its source or a closed form. Do one PR per source group: Power Cycles and Gas Turbines; Control Systems (21); ODE (20); EV and Vehicle; HVAC; then the remainder.
  - Duplicates: diff `control-analysis-report` and keep the gallery copy if it is the same model. `cd-nozzle-shock` is a different model, so it stays under a new id (`cd-nozzle-normal-shock-branch`).
  - **Acceptance:** 263 examples, one shape, all inside the EC1 gate, and Help's library lists exactly the non-featured ones.
  - **Progress.** 9 of 85 moved; `helpExamples.ts` and its carve-outs stay until the last group.
    - **Power Cycles and Gas Turbines (9), branch `ec2-help-library`:** these went to `Thermodynamics`, as the EC3 map assigns. Each Help note now sits in its document's header, and every figure it cites is reproduced to the source's rounding. The CHECKs hold the engine's values at 1e-6 relative. `brayton-irreversible` gives 6484 kW where the book gives 6488 kW, a 0.06 % gap from the book's rounded intermediates. `ideal-rankine` cites no source, so it is graded against a hand calculation from steam-table values, which its header states. Help's Brayton schematic followed `brayton-cold-air-standard`. It is now keyed by that id in Help's panel for examples outside the picker, because `Example` carries no `diagram` field.
- **EC3. Tidy categories and descriptions.**
  - Map the 42 current labels onto about 12: Systems · Thermodynamics · HVAC & Refrigeration · Heat Transfer · Fluids & Fluid Power (Fluids, Pneumatics, Hydraulics, Water Resources, Turbomachinery) · Mechanics (Mechanical, Mechanics, Structural, Vehicle Dynamics) · Electrical & Powertrain · Aerospace & Compressible Flow · Control Systems · Dynamics & ODEs · Data & Analysis (Optimization, Uncertainty, Statistics, Sensitivity, Signal Processing) · Lessons & Labs. The map is a single table in the EC2 PR.
  - Rewrite the 42 "Solve (F2). ⟨title⟩" descriptions so each names what the example teaches and what to do after Solve. Normalise the quoted-key formatting of the D.2 entries to the file's style. Text only: no model changes.
  - **Acceptance:** no category holds fewer than 3 examples, and no description repeats its title.
- **EC4. The picker becomes the curriculum.**
  - `ExamplesModal` shows only `featured`, in array order. Its footer links to Help → Examples library ("246 more examples").
  - Help's Open in Editor passes the example id through `frees.pendingSnippet`, and App resolves it through `EXAMPLES`, so lessons and labs opened from Help get their panel and sliders. Add a test for this.
  - `featured` moves to these 17 existing examples, listed in teaching order:

    | # | Example | Teaches | Change |
    | --- | --- | --- | --- |
    | 1 | `ideal-gas` | equations and units, implicit unknowns, Convert, CHECK, REPL | add a `Convert()` line and CHECKs; the header asks the REPL for `m` in grams |
    | 2 | `linear-regression-diagnostics` | arrays, FOR, multi-output, linfit, statistics, Curve Fit | carry the seven points as a `TABLE` as well, so the Curve Fit dialog has data whose fit matches the CHECKed `a_1`/`a_0` |
    | 3 | `pump-valve-operating-point` | TABLE lookup, `model$` variants, schematic cards, operating point | — |
    | 4 | `rankine-cycle` | real-fluid properties | add a `PLOT kind = property` T–s diagram and CHECKs |
    | 5 | `hydraulic-metering-restriction` | first component network, schematic, GUESS | description: open the schematic, then delete the GUESS and watch the solve |
    | 6 | `tank-draining` | `Integral()` ODE pattern | — |
    | 7 | `sounding-rocket-trajectory` | DYNAMIC, EVENT, trajectory accessors | — |
    | 8 | `projectile-trajectory` | PARAMETRIC, Solve Table, Plots tab | — |
    | 9 | `step-impulse-response` | step and impulse responses, `PLOT` xy | — |
    | 10 | `cruise-control` | LTI models, Bode and root-locus plots | — |
    | 11 | `ev-battery-cooling-pid` | transient network, FUNCTION, stiff solver, variants | — |
    | 12 | `ev-thermal-management` | flagship multi-loop system, DAE (IDA) | — |
    | 13 | `multi-objective-beam` | Min/Max, Pareto, solid materials | — |
    | 14 | `correlated-temperature-heat-loss` | uncertainty, `Correlation()`, Monte Carlo, Sensitivity | header and description walk Tools → Monte Carlo and Tools → Sensitivity on this model; graded by EC5's JSON requests on the same text |
    | 15 | `vibration-tone-spectrum` | FFT, Welch, `PLOT` xy | — |
    | 16 | `lab-air-mixing` | psychrometrics, psychrometric chart, sliders, live mode | — |
    | 17 | `lesson-rc-charging` | the lesson sequence (predict, change, observe) | — |

    Without changes the 17 teach 36 of the 41 fundamentals. The four edited rows (1, 2, 4 and 14) close the remaining five. The 14 examples that lose `featured` stay in Help: `pressure-cooker`, `pump-sizing`, `projectile-motion`, `heat-conduction`, `dc-circuit`, `radiation-view-factors`, `engine-map-2d`, `rankine-cycle-efficiencies`, `brayton-cycle`, `refrigeration-vcr`, `cd-nozzle-shock`, `hx-effectiveness-ntu`, `engine-cycle-wiebe` and `adiabatic-flame-temp`.
  - **Owner decision (2026-11-22).** The 14 showcase examples lose `featured` and stay in Help. The picker carries one lab (`lab-air-mixing`) and one lesson (`lesson-rc-charging`). The EC4 table is final.
  - **Gate.** `examples.test.ts` gets one table of fundamental → pattern (the scan's own patterns, about 41 lines) and asserts that the featured set matches every row. A future change to `featured` therefore cannot drop a fundamental unnoticed.
  - **Acceptance:** the gate is green, every featured example is in the EC1 gate, and lessons and labs open with their panel from both the picker and Help.
- **EC5. Close the documentation gaps.** Only where a fundamental lacks a runnable doc example or a feature has no page; advanced features already covered by reference pages stay as they are.
  - `analysis_examples.md`: add `monte_carlo` and `sensitivity` JSON requests on the `correlated-temperature-heat-loss` text (one Sobol run, one Morris run), and one `parameter_fit` dynamic-calibration request. Add a short graded section each for signal processing (`Detrend` → `Window` → `Welch`) and regression (`linfit`, `polyfit`, and their match with the Curve Fit dialog). These are the two areas no guide covers today.
  - `getting_started.md`, Windows chapter: add a short "Projects and runs" section on the project library, autosave and the Runs panel, the two features no page mentions.
  - Do not add new guide files. `overviews.md` and `verification.md` stay prose-only by design.
  - **Acceptance:** `check-examples` and `check-docs` are green with the new assertions, and `compile-docs` and `build-book` succeed.

**Order and size.** EC1 is done (§1, item 18). Next come EC2 (four or five PRs) → EC3 → EC4 → EC5. EC4 is a small code change. EC2 is mostly authoring CHECKs. EC3 and EC5 are text only. Rebuild the WASM module before treating `check-examples` as evidence for any phase that touches an example.

### Usability validation

- **R15 pilot (Phase 4.4).** See the R15 entry below.
- **Workspace shell sessions (Phase O, after R).** These have not been run. The ribbon stays behind its preview flag (`ribbonPrefs.ts`) until the owner decides on these results.

**Validation (after O, and again after R).** Task sessions with five engineers of mixed experience:
- open an example and solve;
- run a sweep and plot it;
- import a CSV and fit it;
- add and connect a component and follow a diagnostic;
- compare a scenario with its baseline;
- close and recover a panel;
- save and restore a layout;
- export full-precision data and a publication plot.

Record completion, wrong-target commands, navigation errors, recovery time and help requests. The target is each task completed by at least four of five participants without help. The sessions can share participants with the R15 pilot. A small study is directional, not proof. **Never fabricate participant outcomes.**

### R15 usability pilot (Phase 4.4)

Cards, answer key, thresholds and the pinned build are in [`R15_PILOT.md`](R15_PILOT.md) (signed 2026-09-12). Still to do: run five engineering participants through scalar solve (≤ 5 min), component chain (≤ 10 min) and missing-boundary recovery (≤ 3 min); record times, assistance and feedback. Never fabricate participant outcomes.

### Open findings from closed programmes

None of these has been reverified since the date given. Check each against `main` before acting on it.

- **Slow example (2026-11-22, EC1).** `ev-battery-cooling-pid` takes about 16 s alone (IDA over the R134a loop) and 55 s under the parallel suite, so the gate's per-example timeout is 120 s. It has not been profiled.
- **Prepared solves (2026-11-07, G).** A cold `PreparedDocument` solve is not bit-equal to a fresh one on property cycles, and parametric tables inherit this. Both answers are within tolerance. Checked on four models only.
- **Engine findings from D.1 (2026-10-31).** User `function` arguments take no unit annotations. `step`/`stepinfo` over a few hundred samples take seconds. `PneumaticOrifice` passes forward flow only, so an overshooting volume traps pressure.
- **Units (2026-11-11).** The lexer does not read `Ω` inside a unit bracket, so a document cannot say back every unit the engine reports. Fixing it is a language-contract change.
- **RustProp crates.io publish (2026-11-06).** It was not done. The release job's preflight stopped because 13 new crates exceed crates.io's new-crate burst of 5. frees pins the `v0.3.0` tag.
- **Scenarios (2026-11-06, 01e).** A scenario's baseline is not saved with the project.
- **Symbols (2026-11-07, J).** There are no dedicated switch, transformer, op-amp or lamp symbols. They need Figma masters (`web/public/component-symbols/README.md`).
- **Live mode ceilings (2026-11-07 → 11-12).**
  - Each chunk arrives in a fresh transferred buffer; buffer recycling is deferred (`ponytail` note).
  - A slider follows a lab timeline line only when the units match, and a shared experiment's lines are in SI. The live speed is not shared.
  - The playback cursor does not move along a diagram path.
  - No entropy reaches a port, so the power view has no Ṡ_gen, T₀·Ṡ_gen or exergy Sankey.
  - Operating-point cards have no compressor curve, and no point on a one-ended stream. The REPL's `ans` is overwritten by a table evaluation.
- **Schematic (2026-11-06).** Spokes of one net can share a lane past their junction dot and branch without a second dot.

### Standing rules from closed programmes

These bind any further work that draws on the same sources.

**Licence rule (binding on every phase).** CircuitJS is GPL-2.0-or-later (`COPYING.txt`, `README.md`, file headers).
- No CircuitJS code, translated code, constants taken from its source, icons, help text or example circuits enter frees.
- Every adopted item is a behaviour reimplemented from physics and frees' own architecture. Lessons, equations and test data cite their own sources.
- One study proposed copying CircuitJS's speed-slider formula. That is rejected; frees chooses its own log mapping.

**RustGIS (Apache-2.0) shell work.**
- **Patterns only.** No RustGIS code, icons, theme JSON, spacing scale or artwork enter frees. We reimplement behaviour with frees' existing React 19, Mantine, Tabler and dockview, so no attribution is owed.
- **Visual identity is frozen** (Doc A §5, Doc B §9.1). The following stay as they are: `primaryColor: 'teal'`, the dark default, `defaultRadius: 'md'`, the Cascadia Code stack, the teal.7 → cyan.6 Solve gradient (it doubles as the progress bar), the dockview retint to Mantine tokens, and every chart, CodeMirror and Glide palette. New chrome uses only existing tokens and existing Tabler icons. No new docking, chart or icon package is allowed.
- **Keep a route to every feature.** No phase removes a command until the command parity test shows it is reachable elsewhere. Old labels stay as search aliases.
- **Close and Delete are different actions.** Closing a view never deletes data, stops a run, discards an analysis draft, clears terminal history or loses a digitizer calibration.

---

## 3. Deferred Candidates

**npm alerts left open (Socket scan, 2026-11-21).** `deps-security-refresh` patched vite, katex, undici, vitest, source-map-js, serialize-javascript, fast-uri, zod and probe-image-size within their ranges. These remain; revisit when the trigger lands:

- `glob` 11.1.0 (workbox-build `^11`) and `minimatch` 9/10 (linaria behind glide-data-grid; eslint): the fixes are in glob 14 and minimatch 11, outside those ranges. They are denial-of-service bugs in build tools that read only this repository's files. Trigger: a workbox-build or linaria release that takes the fixed major.
- `maplibre-gl` 4.7.1 (CVSS 10), `@plotly/mapbox-gl` (deprecated) and `es5-ext` (protest postinstall, runs on `npm ci`): plotly.js depends on them, but `src/plots/plotlyBundle.ts` (core + bar, pie, histogram, mesh3d, sankey) never bundles them; the built `dist/assets` carries none of their code. Trigger: adding a map or WebGL trace type to the bundle, or plotly.js 4.
- `babel-merge` and `@babel/plugin-proposal-export-namespace-from` (deprecated, no CVE): glide-data-grid's build-time dependencies.

**Research & infrastructure.**

- `frees-lsp` language server
- Python/C++ model export
- `SharedArrayBuffer` sweeps (needs COOP/COEP)
- Bounded surrogate property models
- WCAG 2.1 AA and touch ergonomics

**From the interactive-simulation programme** (each needs its own semantics and numerical validation):
- scheduling several DYNAMIC blocks;
- structural state migration;
- true hysteresis and state machines (event ordering, memory, chatter and Zeno policy);
- ADC/DAC and sampled control;
- wave propagation and water hammer (a distributed model, not a delay icon);
- the integrator RNG seam for stochastic boundaries;
- persisted checkpoints and branched runs;
- transistor-level device fidelity;
- symbol-standard presets (ANSI/IEC, ISO 1219);
- equivalent R/UA analysis between two ports;
- audio and sonification;
- UI localisation.

**From the workspace shell** (each needs its own trigger):
- **Project Explorer** (Doc A §9.1): only if the validation sessions show object and view confusion surviving Q.
- **Side-by-side linked views** with linked cursors (Doc B R5): this needs link semantics for plots, schematics and states, so it is a candidate after Q.
- **Quick Access customisation and favourites.**
- **External browser pop-out windows.**
- **An exportable History pane** (Doc B B10): RunsPanel and playback cover runs today.
- **The palette → shortcut-editor jump**, and remappable global keys beyond the canvas's.

---

## 4. Acceptance Gates

Every change must pass the following. Commands and current counts are in [`CLAUDE.md`](CLAUDE.md#essential-development-commands).

- **Rust:** `cargo fmt --all --check`; `cargo clippy -D warnings` on native and `wasm32-unknown-unknown`; `cargo test --workspace -- --skip golden_corpus_parity`; `cargo test --release --test parity`.
- **Goldens:** every fixture passes within [`fixtures/tolerances-rustprop.json`](fixtures/tolerances-rustprop.json). CI fails on an unused tolerance entry. Never edit a golden to fit a code change; a regenerated golden states its provenance in `oracle.generated_by`.
- **Frontend (Node 22):** `npm test`, `npm run lint`, `npm run check-docs`, `npm run check-examples` (zero unit warnings), and `npm run build` with PWA assets.
- **Bundle:** `frees.wasm` ≤ 5,120 KiB raw. CI warns at 200 KiB headroom (`ci.yml` ledger).
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
