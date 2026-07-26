# frees Roadmap — Active Plan & Deferred Backlog

**Adopted:** 2026-07-26 · **Provenance:** the full recommendation sweep of the five external critiques (`critique-evaluation-2026-07.md`), minus everything already shipped (the T0 hardening plus PRs #93–#101) and the explicit rejections.

**Decision rule (owner's call):** every candidate was scored **Value 0–10** (impact for frees' real users, as a web app) and **Effort 0–10** (1 ≈ hours, 3 ≈ days, 5 ≈ 1–2 weeks, 7 ≈ 3–6 weeks, 9 ≈ months). Items with **Value ≥ 6 form the active plan below, ordered most-valuable first** (effort breaks ties). Items below 6 are **deferred** — recorded at the bottom so they are a decision, not an omission.

---

## Active plan (Value ≥ 6, in order)

### 1. Visual schematic editor — V8 / E8

Drag-and-drop authoring for the component layer: a palette of the 295 library components, a canvas where instances are placed and ports wired, emitting ordinary `COMPONENT`/`connect` text into the editor (text stays the source of truth — the canvas is a projection, never a second model).

- **Why:** the single strongest consensus across the critiques — engineers think in schematics; the 295-component library is the product's biggest asset and today it is reachable only through text and the form-based wizard.
- **Approach:** build on the generated `componentCatalog.ts` (types, ports, params already machine-readable). Phase it: start with item 9 (the read-only rendered schematic) to get graph layout and port geometry right, then add placement/wiring/param editing on top. Emit text through the same insertion path the Component Wizard uses; re-parse (Check) is the round-trip validator.
- **Done when:** a user can build the voltage-divider and a two-loop thermal network entirely by drag-drop, the emitted text solves, and hand-edited text re-renders on the canvas.

### 2. Property backend upgrade (vendored CoolProp binary) — V7 / E3

Replace `backend/core/src/main/java/native/libCoolProp.so` with a current upstream build.

- **Why:** the vendored binary predates every predefined low-GWP blend — all ten aliases shipped in #97 currently skip their gated tests (`BlendAliasTest`); newer pure fluids ride along free.
- **Approach:** build/fetch the current upstream release for linux-x64, swap the vendored `.so`, run the full property-affected suite (`ValidationSuiteTest`, `ZeotropicBlendTest`, `BlendAliasTest`, cycle examples). The gated tests light up automatically — zero further code.
- **Done when:** `BlendAliasTest` passes (not skips) for the blends the new build ships, and the full suite is green.

### 3. Levenberg–Marquardt / trust-region fallback in the steady solver — V7 / E5

A damped fallback for blocks where plain Newton + backtracking stalls.

- **Why:** "Newton iteration stalled" is the most user-visible failure mode, especially in property-laden two-phase blocks where the Jacobian goes near-singular across the dome.
- **Approach:** in `NewtonSolver`/`EquationSystemSolver.solveBlockWithFallback`, add an LM rung to the existing fallback ladder (retry-transforms → Brent → merge): damped normal equations `(JᵀJ + λI)δ = −Jᵀr` with adaptive λ, reusing the existing column equilibration and bound projection. The math library already carries an LM optimizer (used by the curve fitter) as reference.
- **Done when:** a regression set of currently-stalling documents (collect from the cycle examples with degraded guesses) converges, and the full suite shows no solve-time regressions.

### 4. Sparse (KLU) linear algebra for the steady Newton path — V7 / E6

- **Why:** the steady path is dense LU at O(n³) — the ceiling for large component networks (the DAE side already runs KLU above 24 states, so the machinery exists in-repo).
- **Approach:** port the CSC assembly + `SUNLinSol_KLU` usage from `IdaDaeSolver`/`SundialsIda` into a sparse branch of `NewtonSolver.computeJacobian`/linear solve, gated on block size (reuse the DAE side's threshold pattern), with the existing structural sparsity index (`varToEquations`) providing the pattern and colored FD the entries. Dense stays the default for small blocks; SVD remains the rank-deficiency fallback.
- **Done when:** a ≥200-unknown component system solves measurably faster than dense, and results match dense to tolerance across the suite.

### 5. Auto-check on idle (live lint) — V6 / E3

- **Why:** with multi-error lint shipped (#100), live checking is the natural completion — errors appear as you pause typing, not when you press F4.
- **Approach:** debounce (~600 ms after last keystroke) a background `check()` from `onTextChange` in `App.tsx`, feeding the existing `errorList` path; suppress while a solve/check is already in flight; deployed rate limits are respected by the debounce plus the parse semaphore server-side.
- **Done when:** typing a broken line marks it within a second without pressing anything, and typing steadily never queues more than one in-flight check.

### 6. Monte Carlo uncertainty — V6 / E4

- **Why:** the natural extension of the shipped first-order/RSS engine; probabilistic answers for systems too nonlinear for first-order.
- **Approach:** sample the declared uncertainties (`VariableSpec.uncertainty`, normal by default) N times, re-solve with warm starts (the parametric-table run loop is the template), aggregate mean/σ/percentiles; render with the existing histogram chart type. Cap N and reuse the table-run time budget so it cannot monopolize a worker.
- **Done when:** the `f = x·y` validation case reproduces the analytic σ within sampling tolerance, and a nonlinear case shows the first-order/MC divergence it should.

### 7. Measured-vs-simulated compare view — V6 / E4

- **Why:** the analyzer (measurement data) and the solver (ODE tables) already meet in one app — an overlay with error metrics is the "simulate vs. measured in one window" story no adjacent tool has, and the analyzer already imports ODE/parametric tables.
- **Approach:** in the Data Analyzer, pair a measured channel with a solved ODE column (resample onto the measurement raster), overlay them, and show RMSE / max error / bias in an inspector strip; reuse the existing cursor machinery for point-wise deltas.
- **Done when:** a transient solve overlaid on an imported measurement shows live error metrics that update with the cursors.

### 8. Signature help in the editor — V6 / E4

- **Why:** completion (functions, variables, components) shipped; parameter hints are the missing half — 276 functions and 295 components whose signatures currently require F1 or the wizard.
- **Approach:** on `(` (and on explicit trigger inside a call), show a tooltip built from `functionCatalog` usage strings and `componentNames`/catalog param lists, highlighting the active argument by comma-counting within the current balanced parens.
- **Done when:** typing `lqr(` shows the argument list with the active parameter bold, and `Chiller inst(` shows the component's parameter order.

### 9. Auto-rendered schematic (read-only) — V6 / E5

- **Why:** the cheap 60 % of item 1 — comprehension without authoring. A rendered network answers "what did I just wire?" at a glance and doubles as documentation output.
- **Approach:** build the instance/connect graph from the payload's component metadata (`ComponentDto` + connect topology from the parse), lay it out (layered/orthogonal — an off-the-shelf layout algorithm is fine), render as SVG in a dock window with domain-colored edges and port labels; clicking an instance scrolls the editor to its declaration.
- **Done when:** the shipped EV thermal example renders as a legible two-loop diagram with correct connectivity, and the SVG exports like other plots.

### 10. Parallel parametric tables — V6 / E5

- **Why:** a 5 000-row table currently runs serially on one worker while the other replicas idle; the queue is already the right shape for fan-out.
- **Approach:** split table rows into chunked sub-tasks dispatched over the existing RabbitMQ path, aggregate per-chunk results in the job store, preserve the accessor fixed-point semantics by keeping accessor-dependent tables serial (they are detected already), and keep the existing row/time budgets as the global cap.
- **Done when:** a 1 000-row accessor-free table completes ~Nx faster with N workers, and accessor tables produce identical results to today.

### 11. Structural index detection with actionable messages — V6 / E5

- **Why:** a natural acausal model with an algebraic constraint between states (rigidly coupled inertias, incompressible loops) currently dies with an unexplained singular-matrix failure at initialization.
- **Approach:** not full index reduction — detect the structural condition (match the differentiated variables against the algebraic constraints on the `DaeAssembly`/`Blocker` machinery) and name the culprits: "this connection creates an index-2 constraint between ω1 and ω2 — add compliance or an explicit derivative." The Dulmage–Mendelsohn tooling already in `Blocker` does the naming.
- **Done when:** the rigid two-inertia fixture fails with the named-variable guidance instead of a singular-matrix error.

### 12. Tabular property acceleration — V6 / E5

- **Why:** flash calls inside Newton loops dominate thermofluid solve time; a bicubic (P,h) table with analytic partials is already implemented and tested in-repo (`PhPropertyTable`) but never wired.
- **Approach:** wire `PhPropertyTable` behind the property dispatch for the hot pure-fluid (P,h)/(P,T) paths with a per-fluid lazy build and a correctness tolerance gate against direct calls; alternatively (or additionally) extend the JNA binding to the backend's own tabular mode. Also cache humid-air calls (currently uncached) and narrow the single global property lock.
- **Done when:** a two-phase cycle example solves ≥3× faster with results inside the accuracy gate, and the property test suite is green.

### 13. In-text guess/bounds annotations — V6 / E5

- **Why:** guesses/bounds live only in the Variable Information modal today, so they don't travel with shared links, don't diff, and don't survive copy-paste — the one part of a project that isn't text.
- **Approach:** an opt-in annotation the parser strips into `VariableSpec` (e.g. `x = ? {guess 2, min 0, max 10}` or a `GUESS x = 2 [0,10]` directive — decide against the grammar's ambiguity budget), merged with modal-entered values (text wins, modal remains a view/editor of the same state and can write annotations back).
- **Done when:** a shared link carrying annotated guesses solves identically for the recipient, and the modal round-trips them.

### 14. Workspace parameter sliders — V6 / E5

- **Why:** tactile what-if — drag a parameter, watch the solution update. The runnable-docs sliders already prove the loop (override → re-solve) works.
- **Approach:** let the user pin variables from the Variable Explorer to a slider strip (min/max from bounds or ±50 %); on release (and debounced during drag for small systems) re-solve via the existing override path (the same mechanism REPL assignments use).
- **Done when:** two pinned parameters on a cycle example can be dragged with sub-second solution updates and plots refreshing.

### 15. Parameter estimation against measured data — V6 / E6

- **Why:** calibration closes the loop the compare view (item 7) opens: fit model parameters so the simulation matches the measurement.
- **Approach:** generalize the curve fitter from "expression vs points" to "model vs dataset": chosen unknown parameters, an objective built from the compare view's residuals, driven by the existing bound-constrained optimizer with each evaluation being a solve (warm-started). Budget-capped like table runs.
- **Done when:** a synthetic case (data generated from known parameters + noise) recovers the parameters, end-to-end from an imported file.

### 16. Component content waves — V6 / E6

- **Why:** breadth is adoption — the named gaps: thermal storage (stratified tank, PCM), building/zone models, power-electronics average models, battery aging, fuller machinery maps.
- **Approach:** the established pipeline (component markdown → catalog; golden fixtures with `// EXPECT` directives) makes each wave mechanical; one wave ≈ 5–10 components with fixtures and reference pages. Order by user pull.
- **Done when:** per wave — components ship with passing fixtures, reference pages, and one worked example each.

### 17. Interactive dashboards (bound inputs/gauges) — V6 / E8

- **Why:** distributable mini-apps: a solved model behind sliders, fields and gauges that a colleague can use without touching equations — the strongest "engineering application platform" feature in the critique set.
- **Approach:** last on purpose — it composes items 13/14 (annotated inputs, slider loop), the share links, and ideally the schematic renderer. A dashboard is a declarative layout (JSON in the project) binding widgets to variables; view-mode hides the editor.
- **Done when:** a dashboard built on the cycle example can be shared by link and driven by someone who never opens the editor.

---

## Suggested execution sequencing

The order above is by value; these waves respect effort and dependencies without changing the priorities:

- **Wave A — quick wins, run alongside anything:** 2 (property upgrade), 5 (idle check), 8 (signature help).
- **Wave B — solver & property depth:** 3 (LM fallback) → 11 (index detection) → 4 (KLU steady) → 12 (tabular properties).
- **Wave C — analysis trio:** 6 (Monte Carlo), 7 (compare view) → 15 (estimation, builds on 7).
- **Wave D — the strategic project:** 9 (rendered schematic) → 1 (schematic editor) → 14 (sliders) → 17 (dashboards, also wants 13).
- **Anytime:** 10 (parallel tables), 13 (in-text guesses), 16 (content waves).

### Wave D, split: non-UI first (done), UI second

Wave D's items each have a backend/data half and a rendering half. The
non-UI halves shipped first because they are independently useful, testable
without a browser, and they de-risk the UI work by fixing the contracts it
draws against:

- **Shipped (non-UI):** item 13's `GUESS` directive (in-text guesses/bounds),
  item 9's connection-topology payload (`connections[{domain, endpoints}]` on
  the check response), item 10's chunked table fan-out.
- **Remaining (UI), in order:**
  1. **Schematic renderer (item 9's UI half).** A read-only dock window that
     lays out the network from the shipped topology payload and renders it as
     SVG: instances as nodes (type + name), connections as domain-colored
     edges, click-an-instance to reveal its declaration in the editor, export
     like a plot. Redraws from **check**, so it tracks the text without a
     solve. Layout is layered/orthogonal; a small hand-rolled layered
     algorithm avoids adding a graph-layout dependency to a bundle that
     already code-splits its heavy libraries — revisit only if hierarchical
     sub-networks need it.
  2. **Slider strip (item 14).** Pin variables from the Variable Explorer to a
     strip; drag re-solves through the existing override path (the mechanism
     REPL assignments and the runnable docs already use), debounced during
     drag, committed on release. Bounds come from `GUESS`/Variable
     Information, else ±50 %.
  3. **`GUESS` round-trip in the Variable Information modal (item 13's UI
     half).** The modal becomes a view/editor of the same state the text
     carries: values entered there can be written back into the document as
     `GUESS` lines, so the modal and the text stop being two sources of truth.
  4. **Schematic editor (item 1).** Placement, wiring and parameter editing on
     top of (1)'s layout and port geometry, emitting ordinary
     `COMPONENT`/`connect` text through the Component Wizard's insertion path.
     The canvas stays a projection — text remains the source of truth, and
     Check is the round-trip validator.
  5. **Dashboards (item 17).** Composes the slider loop, the annotated inputs
     and the renderer; last on purpose.

The first three are each self-contained and shippable on their own; item 1 is
the large one and should not start until (1) has proven the layout and port
geometry against real networks.

---

## Deferred (Value < 6 — recorded, not planned)

| Item | V | E | One-line reason |
|---|---|---|---|
| Homotopy/continuation for hard blocks | 5 | 7 | LM fallback first; revisit if stalls persist |
| Per-iteration convergence trace in Diagnostics | 5 | 3 | Nice-to-have once failures are rarer |
| `INCOMP::` fluid-name support (brines, absorption pairs) | 5 | 3 | Do together with the property-backend upgrade if pulled |
| 1-D distributed elements (FV pipe/HX) | 5 | 7 | Next fidelity rung; needs user pull |
| User component/template publishing registry | 5 | 6 | Needs users and accounts first |
| Importer for a common desktop equation-solver file format | 5 | 6 | Conversion funnel; revisit when adoption starts |
| Accounts + cloud projects | 5 | 7 | Solo use is covered by local autosave + share links |
| Video tutorials / demo recordings | 5 | 4 | Content, not code — do alongside any release |
| DOE generators (LHS/factorial into tables) | 4 | 3 | Cheap, but sweep demand not shown yet |
| Absorption cycles (LiBr–H₂O) | 4 | 4 | After `INCOMP::` support |
| Humid-air property caching + finer lock | 4 | 2 | Fold into item 12 when touched |
| More convection/HT correlations | 4 | 3 | Ongoing content; add on request |
| Contour plot type | 4 | 3 | The one missing chart; awaiting a real use case |
| Sankey / energy-flow diagrams | 4 | 5 | Presentation polish |
| Transient animation / time scrubber | 4 | 5 | Teaching polish |
| Exergy analysis module | 4 | 4 | Differentiator without demonstrated pull |
| Full Pantelides / dummy derivatives | 4 | 9 | Detection (item 11) covers the real pain |
| Symbolic preprocessing (CSE/alias elimination) | 4 | 7 | Performance, superseded by items 4/12 |
| Embeddable read-only widget | 4 | 4 | Share links cover most of it |
| Server-side version history / diff | 4 | 6 | After accounts |
| Community model library | 4 | 6 | After accounts |
| "Real" LaTeX report generator | 4 | 5 | Browser print-to-PDF shipped; demand-driven |
| Classroom mode / auto-grading | 4 | 8 | Far-future distribution wedge |
| Hard-kill watchdog for wedged native calls | 4 | 4 | OOM path is handled; hangs unobserved so far |
| App.tsx decomposition | 4 | 5 | Code health; fold into the next big frontend project |
| AI copilot (NL→model, convergence advisor) | 4 | 8 | Premature until the user base exists |
| XLSX export | 3 | 2 | CSV shipped |
| Editor block-highlighting per line | 3 | 3 | Diagnostics badges cover it |
| Jupyter widget/kernel | 3 | 5 | Python client covers scripting |
| Real-time co-editing (CRDT) | 3 | 9 | No multi-user demand |
| Native BLAS / exact-AD backends | 3 | 8 | Wrong cost/benefit for a JVM web service |
| Make the static-analysis gate block CI | 3 | 1 | Owner's call; currently analysis-only |
| WCAG/accessibility pass | 3 | 5 | Worth a sweep eventually |
| PCE uncertainty | 2 | 7 | Academic |
| Industrial live-data connectors (OPC-UA/MQTT) | 2 | 7 | Not this product |
| Vector-field plots | 1 | 4 | Noise |

## Decided against (not deferred — closed)

FMI import/export ("this is a web app in the end" — the integration surface is the REST contract + the state-space export) · marketing/landing page (the app opens directly; the Getting Started modal is the welcome mat) · 3-D/partitioned multiphysics coupling · CAD import · desktop-app pivot · in-browser WASM solver port. Rationale in `critique-evaluation-2026-07.md`.
