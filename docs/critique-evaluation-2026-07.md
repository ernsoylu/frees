# frees — Evaluation of Five External Critiques

**Date:** 2026-07-25 · **Codebase:** `main` @ `dee97778` · **Method:** every verifiable claim was checked against the actual source (file:line cited), the running Docker stack (live API probes), the production site (`frees.softncon.com` header/asset checks), GitHub metadata, and dependency POMs. Where a claim could be demonstrated rather than read, it was demonstrated.

---

## 1. Executive summary

Five critiques (C#1–C#5) were evaluated, covering ~120 distinct verifiable claims. The headline results:

1. **Reliability varies enormously.** C#5 (the one that actually cloned the repo) is ~75–80 % accurate and is the only one worth close study. C#1, C#2 and C#3 are ~45–55 % accurate — each recommends building several things **that already exist and ship today** (SUNDIALS IDA, NSGA-II Pareto optimization, FFT, curve fitting, combustion, psychrometric charts, event handling, SSE streaming, an example gallery, autocomplete…). C#4 is ~15 % accurate — it reviews an imagined architecture (a browser-JS solver with no units) that bears no relation to frees.

2. **Even the best critique's three headline accusations are wrong.** C#5 claimed a GPL-3 license conflict (Symja is actually **LGPL-3**), missing compute-job caps (a **60 s wall-clock / 10 k iteration / 25 k equation** cap ladder exists), and missing Dulmage–Mendelsohn diagnostics (`Blocker.java` **already implements and ships** free-variable / redundant-equation naming — verified live).

3. **The live-fire audit found one genuinely severe issue none of the critiques caught:** `Determinant` is expanded at parse time by recursive cofactor (O(n!) AST nodes). An 11×11 determinant — a 13-line anonymous request — **OOM-killed a compute worker during this audit** (`OutOfMemoryError: Java heap space`, exit 99, container not restarted → tier degraded 3→2 workers until manual restart). This upgrades C#5's "will be slow past 8×8" to a small-payload denial-of-service vector. The fix is small (numeric LU intrinsic + size guard + `restart: unless-stopped`).

4. **The consensus that survives verification** — the real gap list — is concentrated in *distribution and interface*, not physics or numerics: no sharing/accounts/report-export loop, no visual schematic authoring, no FMI, a diagnostics **UI** gap (the data is already computed and shipped, just never rendered), no sensitivity/Monte-Carlo surface, and a near-zero community/trust footprint (1 star, no CONTRIBUTING.md, no published validation page — despite an *internal* CI harness that already verifies every runnable doc snippet solves).

5. **A meta-finding:** four of five reviewers "discovered missing" a long list of shipped features. If professional reviewers can't find them, users won't either. Part of the remedy is not code at all — it is a features/marketing surface and a standalone docs site.

---

## 2. What was verified and how

| Evidence stream | What it covered |
|---|---|
| 4 parallel read-only code audits | Steady-solver numerics, transient/DAE + analysis features, frontend/UX, infra/API/licensing — every claim tied to file:line |
| Live API probes (local stack, 1 API + 3 compute workers) | Canonical solve, complex-spectrum `Eigen`, `Determinant` scaling 6→11, SSE streaming, check-message quality, inconsistent-system solve error |
| Live production site | Response headers for `index.html` and `/assets/*`, stale-chunk 404, current asset graph |
| GitHub + git | 675 commits, 1 star / 0 forks / 7 issues, created 2026-06-10, MIT license; 1,365 backend `@Test` methods; 295 `COMPONENT` definitions counted per file |
| Dependency POMs (Gradle cache) | matheclipse-core 3.2.0, jgrapht-core 1.5.3, commons-math3, ANTLR 4.13.2 license texts |

### Key live-probe results

| Probe | Result |
|---|---|
| `x^2+y^3=77; x/y=1.23456` | COMPLETED in 1 ms solver time, 6 Newton iterations, residuals ≈ 0 — payload includes per-equation residuals, block structure, stats |
| `Eigenvalues([[0,−1],[1,0]])` (spectrum ±i) | FAILED with a clean, deliberate message: *"Matrix has complex eigenvalues; Eigenvalues/Eigen support real spectra only (symmetric matrices always qualify)."* |
| `Determinant` n=6/8/9/10 | 8 ms → 65 ms → 492 ms → **4,903 ms** (×7.6–×10 per size step — factorial signature) |
| `Determinant` n=11 | **Compute worker OOM-killed** (`Exited (99)`, `java.lang.OutOfMemoryError: Java heap space`); poison-message guard correctly dropped the redelivered task; worker stayed dead (no restart policy) |
| SSE `GET /api/jobs/{id}/stream` | Works; pushes the full result as an SSE event |
| Check: `x+y=10` (underdetermined) | *"…underspecified… **Free quantity (no defining relation): y. Coupled to: x.** A common cause: an element chain with no constitutive law…"* — names the variable, not just counts |
| Check: `x=1; x=2; y+z=3` (structurally singular) | *"…structurally singular: no complete assignment… **Redundant relation (no free variable left to determine): x=2.**"* — names the redundant equation |
| Solve: `x+y=10; x+y=12; z=5` (numerically inconsistent) | FAILED: *"Newton iteration stalled in block 0 (residual 1.414). Try different guess values."* — names the block and residual, but the advice is generic and the payload carries **no** partial diagnostics (`result: null`) |
| Production headers | `index.html`: `cache-control: no-cache`, Cloudflare `DYNAMIC`; `/assets/*`: `public, max-age=31536000, immutable`, Cloudflare `HIT`; old chunk `App-BFD2fdT1.js`: 404 |

---

## 3. Scorecard per critique

### C#1 — "Architectural Critique & Holistic Improvement Plan" · **Grade: C− (~45 %)**

*The strategy consultant.* Fluent, well-structured, and confidently wrong about the codebase's current state.

**Fatally wrong:** Its P0 #2 recommendation — "Replace the transient core with Sundials IDA… converts frees from demo-able to credible on stiff transients" — recommends, as a 10–12-engineer-week project, something **already shipped**: a JNA SUNDIALS IDA binding with `IDACalcIC` consistent initialization, root-finding events, KLU sparse Jacobians above 24 states, plus in-tree `ode45` (adaptive Dormand–Prince), `ode23s` (Rosenbrock) and `ode15s/23t/23tb` (BDF) (`dae/SundialsIda.java`, `ode/DynamicSolver.java:439-505`, `ode/BdfMethod.java`). It also proposes hosting the SUNDIALS bridge in the mdf-sidecar — which is an MDF4 measurement-file parser, unrelated to numerics. Component count stale (~130 vs 295). "No programmatic API" — 25 REST endpoints exist (undocumented, which is the real point). "Blank editor… no example gallery, no template chooser" — a 47-card gallery, ~132 total shipped examples, an auto-loaded worked default model, and a first-run banner all exist. "One compute worker" — the stack runs horizontally-scaled RabbitMQ consumers (3 replicas locally; `/api/health` reports live consumer counts).

**Right:** no FMI, no collaboration/versioning/accounts, no AI/surrogate layer, no CAD, no Monte-Carlo/PCE UQ, no OPC-UA/MQTT, no document-level report generator, diagnostics UX shallow on failure. The two closing principles (preserve equation transparency; treat the async substrate as the product) are genuinely good.

**Scale problem:** its 20-item, 4-quarter Gantt assumes a funded team. Partitioned 3-D co-simulation coupling, CRDT collaboration, an HPC autoscaler fleet and an AI layer are not realistic next steps for a 6-week-old solo project with 1 star.

### C#2 — "The Core Identity Crisis" · **Grade: C− (~45 %)**

*The positioning piece.* Its central thesis attacks a strawman: frees does **not** claim to be CAE/FEA anywhere — README line 1 reads *"a web-based, open-source equation-solving environment for engineers"*, and the CLAUDE/README describe the component layer as deliberately "0-D lumped." The entire §1 "identity crisis" table argues against a claim the project never made.

**Wrong:** "No DASSL/IDA" (shipped, see above). "Newton-only with step-halving, no line search" — `NewtonSolver` has a named backtracking line search (≤25 halvings with re-evaluation), bound projection, column equilibration, SVD pseudoinverse fallback, a guess-transform restart ladder, Brent rescue for 1-D blocks, and block merging (`NewtonSolver.java:278-508`, `EquationSystemSolver.java:974-1265`). "Polling — should use WebSocket/SSE" — SSE is the primary transport, polling is the documented fallback (`api.ts:228-283`). "No parameter estimation" — a Levenberg–Marquardt curve fitter with bounds, R², RMSE ships with both a REST endpoint and a frontend modal (`CurveFitter.java`, `/api/curve-fit`, `CurveFitModal`). "No sparse anywhere" — KLU is wired on the DAE side.

**Right and important:** no Pantelides/index reduction (confirmed — zero hits); the steady Newton path is dense Apache-Commons LU (true); expand-to-scalars has a real performance ceiling (this audit's determinant kill is the proof point); no FMI; no visual schematic editor; no distributable interactive "Diagram window" apps (sliders exist only inside Help-page runnable docs, not the workspace); `model$` fidelity variants cover only ~12 of 295 components (~4 %). Its closing positioning conclusion — own the open, web-native equation-solver niche — is sound — and is in fact the positioning frees already states.

### C#3 — "Comprehensive Expert Review" · **Grade: C (~50 %)**

*The feature-matrix piece.* The most thorough enumerator — and the one with the most enumerable errors, because its feature matrix appears drawn from priors about "tools like this" rather than the product.

**Claimed missing but exists (all verified):** psychrometric chart (backend `Psychrometrics.generate` + `/api/psychart` + a "New psychrometric chart" menu item and `psychro` PlotKind); histograms, bar, pie, 3D surface (`ChartType` union, `figure.ts:425-487`); curve fitting/regression (LinFit/PolyFit DSL intrinsics + LM fitter); FFT/IFFT/Convolve DSL intrinsics; multi-objective optimization (full NSGA-II with non-dominated sort, SBX, crowding → Pareto front at `/api/optimize/multi`); combustion/chemical equilibrium (NASA-7 polynomials, equilibrium adiabatic flame temperature with five dissociation reactions, Wiebe); transport properties (viscosity/conductivity/Prandtl/surface tension + Chapman-Enskog/Wilke mixtures + a 10-correlation convection library: Dittus-Boelter, Gnielinski, Shah, Gungor-Winterton, Zukauskas, Churchill-Chu…); refrigerant blends with glide (R404A/R407C/R410A aliases + `BlendSource/BlendSensor/BlendMixer` composition-rider components, tested); variable-step stiff solvers (ode45/ode23s/BDF/IDA); DSL event handling (`EVENT name: expr = expr | rising|falling -> stop|record|set state = expr` — a thermostat-with-deadband fixture ships); state-space/discrete conversions (`ss`, `tf2ss`, `ss2tf`, `c2d`, `d2c`, `balreal`, `pade`…); editor autocomplete (function + live variable completion, hover lint tooltips, F1 contextual reference); a template/example gallery (47 cards + ~85 more in Help ≈ 132 total).

**Right:** no Monte Carlo; no sensitivity/tornado module (nuance below); no Sankey; no animation of transients; no workspace parameter sliders; no accounts/cloud save/share links/version history; no document-level PDF/report export; no XLSX export; no standalone docs site; no videos; no LiBr–H₂O/absorption; no PCM/stratified storage; no battery-degradation models beyond Thévenin; residuals/convergence **UI** absent; block highlighting absent; community risk real (1 star, 0 forks, bus factor 1). Its Part VI strategy (beachhead: education + thermal-fluid preliminary design; "bridge between equation text and the engineer's mental model") is the best strategic writing across all five critiques, and its monetization/community sections are sensible.

### C#4 — "Asset Fetch Collapse" · **Grade: D (~15 %)**

*The wrong-architecture piece.* Its §2–§5 describe a different product: it asserts frees has no unit awareness ("2+2=4 arithmetic", "Unit Awareness: None") when unit checking with SI canonicalization is one of frees' deepest features; it assumes the solver runs on the browser main thread in JavaScript (it runs in Java compute workers behind RabbitMQ); it recommends adding "ODE/step-response primitives (RK4, BDF)" that already exist; it proposes automatic differentiation as missing when a 536-line symbolic `Differentiator` already feeds an analytic-Jacobian path with FD fallback (`NewtonSolver.java:200-246`).

**Its one contribution:** the reported production error (`Failed to fetch dynamically imported module: …/assets/App-BFD2fdT1.js`) is a real failure mode — but its diagnosis and fix are both wrong for this deployment. The prescribed cache headers **already exist exactly as prescribed** (`no-cache` on `index.html`, `immutable` on `/assets/` — `nginx.conf.template:92,102`, confirmed live). The actual mechanism is *a tab left open across a redeploy*: old chunks 404 (confirmed live), and any of the ~30 lazy-loaded routes/modals then fails. Today that lands in an `ErrorBoundary` with a manual "Reload" button — not a blank screen, but still a mid-work interruption. The real fix is a `vite:preloadError` one-shot auto-reload handler, which is genuinely absent.

### C#5 — "I cloned the repo" · **Grade: B+ (~75–80 %)**

*The only reviewer who did the work.* Exact commit count (675), exact test count (1,365), exact component count (295 across 13 files), correct on the IDA binding details, all-roots mode (Brent scan + multi-start + dedup + branch forking, all confirmed at `AllRootsSolver.java`), column equilibration + SVD fallback, analytic-Jacobian-with-FD-fallback, O(n!) determinant (empirically confirmed and then some), real-only `Eigen` (confirmed live, including its observation that the control path handles complex spectra fine), no Pantelides, no FMI, no Python SDK/OpenAPI, no accounts/sharing/report loop, single-error lint (the wire format itself is a scalar `errorLine`), guess/bounds living outside the document text, `App.tsx` monolith (2,856 lines), landing page = the app. Its strategic reading — "you built a desktop app that happens to run in a browser; the URL is unused" and "publish validation, engineers don't adopt solvers on faith" — is the single most valuable paragraph in all five documents.

**But its three headline accusations all failed verification:**
- **License:** matheclipse-core 3.2.0's POM declares **LGPL-3**, not GPL-3 — the linking-permissive variant; MIT + LGPL linking is the intended use. (Real residue found by this audit instead: no THIRD-PARTY notices for LGPL-3 Symja / LGPL-2.1 JGraphT, and a vendored `libCoolProp.so` committed with no license note.)
- **Compute caps:** "the rate limiter guards the door, not the job" — wrong. `SolverApiSupport` hard-caps any solve at **60 s wall-clock and 10,000 iterations** regardless of what the request asks; the parser caps generated equations at 25,000; table runs at 5,000 rows/120 s. (Residue: no hard-kill watchdog for a wedged *native* call, and — as this audit demonstrated — a parse-time memory explosion sits below all those caps.)
- **DM diagnostics:** "DM is nearly free from your matching — ship it" — already shipped. `Blocker.java` computes the Dulmage–Mendelsohn underdetermined part via Hopcroft–Karp + alternating reachability and **names free quantities, their coupling sets, and redundant relations** in check messages (verified live, §2).
- Smaller misses: property memoization exists (20 k-entry LRU in `CoolProp.java:33-41`; the true gaps are TTSE/bicubic unused and humid-air calls uncached); "Check gates Solve, extra click" — Solve auto-chains Check (`checkThenSolve`, `App.tsx:1311-1333`; F2 does both; the welcome banner says so); "48 examples" — 47 in the gallery but ≈132 shipped.

---

## 4. The verified gap list (what is actually missing)

Deduplicated across all five critiques, **only claims that survived verification**, ordered by consensus × impact:

| # | Gap | Status detail | Critiques |
|---|---|---|---|
| G1 | **Distribution loop**: no shareable links, no read-only views, no accounts/cloud projects, no fork/embed | Confirmed absent; persistence is localStorage + `.frees` download only | 1,2,3,5 |
| G2 | **Document-level report export** (PDF/Word/LaTeX) + print stylesheet | Absent. Plot-scoped vector **PDF/EPS/SVG export exists** (Apache FOP). Docs describe a "Formatted report tab" that has no implementation (`marked` is in package.json for glide-data-grid's markdown cells, not a report renderer) | 1,2,3,5 |
| G3 | **Visual schematic authoring** for the 295-component layer | Absent (Diagram app deleted; `ComponentWizardModal` is a form, not a canvas; `componentCatalog.ts` (4,042 lines of metadata) exists to feed a palette) | 1,2,3,5 |
| G4 | **FMI/FMU import/export** | Zero source matches | 1,2,3,5 |
| G5 | **Diagnostics UI** | Backend ships per-equation residuals, block structure, iteration/stats in every solve payload — **no component renders any of it**; failed solves return `result: null` (no partials); no per-block iteration history; no convergence trace | 1,3,5 |
| G6 | **Steady-solver scaling posture** | Dense Commons-Math LU only (KLU exists but only on the DAE side); no LM/trust-region/homotopy fallback; expand-to-scalars ceiling proven by the determinant incident | 2,5 |
| G7 | **No Pantelides / structural index detection** | Confirmed; IDA + `IDACalcIC` is index-1 only; high-index models fail with unexplained errors | 2,5 |
| G8 | **Sensitivity / tornado + Monte Carlo UQ** | Confirmed absent. Notably: the RSS uncertainty engine already computes per-source contributions internally and **discards them** (`EquationSystemSolver.java:2153-2166`) — a tornado output is nearly free | 1,3 |
| G9 | **Multi-error lint + in-text guess/bounds** | Wire format is a single `errorLine`; guesses/bounds persist in `.frees` and round-trip the API but have no DSL text form (don't diff, don't survive copy-paste) | 5 |
| G10 | **API surface undocumented; no Python client/Jupyter story** | 25 endpoints across 11 controllers, zero OpenAPI | 1,3,5 |
| G11 | **Community/trust surface** | 1 star, 0 forks, no CONTRIBUTING.md, no published validation page — despite internal harnesses (`scripts/run_examples.py`; CI `check-doc-snippets` verifies every runnable doc fence solves) | 3,5 |
| G12 | **Standalone docs site / landing page** | `/help` is deep-linkable and code-split, but needs the app bundle; landing page is the app itself | 3,5 |
| G13 | **Chunk-load auto-recovery** | `ErrorBoundary` with manual Reload exists; no `vite:preloadError` handler, no auto-reload | 4 |
| G14 | Content gaps that survived: LiBr–H₂O/absorption; INCOMP beyond EG/PG glycols (parser regex forbids `INCOMP::…` strings); PCM/stratified storage; battery aging; Sankey; transient animation; workspace sliders; XLSX export; contour plots; videos | Each individually confirmed | 3,5 |
| G15 | Property-layer performance headroom | TTSE/bicubic backend unused; humid-air (`HAPropsSI`) calls bypass the cache entirely; property cache is one global synchronized lock; an implemented+tested bicubic `PhPropertyTable` sits unwired (dead code) | 5 (partially) |

---

## 5. Claimed missing — but exists (the refutation list)

Worth keeping verbatim, because **this doubles as the marketing/docs to-do list** — four reviewers missed these, so users will too:

- SUNDIALS **IDA** DAE solver (JNA, `IDACalcIC`, rootfinding, KLU sparse >24 states, graceful degradation) + adaptive `ode45`, stiff `ode23s` Rosenbrock, `ode15s/23t/23tb` BDF
- DSL **EVENT** handling (zero-crossing, rising/falling filters, stop/record/`set` mode switching, both integrator paths)
- **NSGA-II multi-objective** optimization → Pareto front; Brent/Nelder-Mead/BOBYQA + log-barrier/augmented-Lagrangian constraints
- **Levenberg–Marquardt curve fitting** (REST + UI modal) and LinFit/PolyFit DSL intrinsics
- **FFT/IFFT/Convolve** intrinsics; `routh`, `c2d`/`d2c`, `mason`, `nichols`, `errorconst`, `residue` (repeated poles) in the control suite
- **Combustion**: NASA-7, equilibrium flame temperature (5 dissociation reactions), Wiebe, gas-mixture transport (Wilke / Mason-Saxena)
- **Transport properties** + convection-correlation library (10+ named correlations), two-phase pressure-drop/void models, solid-materials mini-DB
- **Zeotropic blends with glide** + composition-rider components (tested with R407C)
- **Psychrometric charts**, property diagrams, histograms, bar/pie, 3D surface, Bode/Nyquist/Nichols/root-locus/pole-zero, secondary Y-axis
- **SSE job streaming** (primary; bounded: 60 s timeout, 500-emitter ceiling)
- **Compute-job caps**: 60 s wall-clock, 10 k iterations, 25 k generated equations, 5 000 rows/120 s tables; poison-message drop (proved itself during this audit)
- **DM-grade check messages** naming free variables, coupling sets, redundant equations
- **Editor autocomplete** (functions + live variables), lint-gutter hover tooltips, F1 → per-symbol reference pages
- **Example gallery** (47 cards; ≈132 shipped examples) + auto-loaded default worked model + first-run banner; runnable doc snippets **with sliders** in Help, CI-verified to solve
- **Analytic Jacobians** (symbolic `Differentiator`, FD fallback), column equilibration, SVD fallback, backtracking line search, all-roots mode
- **Vector plot export** (SVG/**PDF**/**EPS** via FOP, PNG/JPG @4×), whiteboard PNG/SVG, parametric-table → spreadsheet → CSV
- **Property cache** (20 k LRU), uncertainty engine (first-order Jacobian + SVD + RSS with a second `UncertaintyOf` pass), REPL + CAS, MDF4 measurement analyzer with sidecar fallback, PID tuner with auto-linearized plant

---

## 6. New findings from this audit (in no critique)

| # | Finding | Severity | Evidence |
|---|---|---|---|
| N1 | **`Determinant` ≥11×11 OOM-kills a compute worker.** Parse-time recursive cofactor builds ~n!-node `Expr` trees; no size guard (the 25 k-equation cap doesn't apply — it's one equation with a huge tree). Worker exited 99 (`OutOfMemoryError`), tier degraded 3→2, **no `restart:` policy** so the loss is permanent until manual restart. Rate limiting does not prevent 3 requests. | **High** (small-payload DoS) | `EquationParser.java:2378-2399`; live kill reproduced |
| N2 | Failed solves return `result: null` — the frontend gets a one-line error and none of the residual/block data that exists for successful solves | Medium | live probe §2 |
| N3 | **Docs/code drift:** docs promise a "Solution panel diagnostics" view and a "Formatted report tab"; neither is implemented (`docsCatalog.ts:125`; the `marked` dep serves glide-data-grid's markdown cells, not a report renderer) | Medium (trust) | agent audit |
| N4 | No THIRD-PARTY/NOTICE file: Symja **LGPL-3**, JGraphT **LGPL-2.1**, vendored 6.6 MB `libCoolProp.so` committed with no license text (upstream MIT), SUNDIALS BSD | Medium (compliance hygiene, not a conflict) | POMs; `git ls-files` |
| N5 | Humid-air property calls (`HAPropsSI`) bypass the property cache; all property calls share one global `synchronized` lock; the implemented + tested bicubic `PhPropertyTable` is dead code | Medium (perf) | `CoolProp.java:69-125`; `PhPropertyTable.java` |
| N6 | SonarCloud step submits analysis but the quality gate does **not** fail CI | Low | `ci.yml:51-56` |
| N7 | `R454B` (and other new blends) missing from the fluid alias map (R404A/407C/410A present) | Low | `PropertyFunctions.java:70-74` |
| N8 | Component-name completion absent although `componentCatalog.ts` (4,042 lines) contains everything needed to feed it | Low | `EquationEditor.tsx:39` |
| N9 | Analytic-Jacobian path is all-or-nothing per block — one property call demotes the whole block to finite differences, so the flagship thermofluid use case always runs FD | Info | `NewtonSolver.java:213-246` |
| N10 | The default first-run document is a ~200-line expert-level EV TMS model — the opposite failure mode of the critics' "blank editor": it may read as intimidating rather than empty. A graded "simple → cycle → system" default (or the gallery on first launch) is worth an A/B thought | Info | `defaultExample.ts` |

---

## 7. Realistic combined roadmap

Scaled to the actual situation: a solo project, six weeks public, already carrying an unusually deep engine. Ordering principle: **fix what this audit proved broken → close the distribution loop (the all-critique consensus) → then pick strategic bets**.

### Tier 0 — This week (small, provably needed)

1. **Determinant**: evaluate numerically via LU at solve time (same synthetic-call pattern as `Eigen`), plus a parse-time size guard with a clear error. Kills N1.
2. **`restart: unless-stopped`** on compute containers (one OOM must not permanently shrink the tier).
3. **`vite:preloadError` handler** — one-shot auto-reload on chunk-load failure (sessionStorage flag to avoid loops). Kills the C#4 crash class.
4. **THIRD-PARTY-NOTICES.md** (Symja LGPL-3, JGraphT LGPL-2.1, CoolProp MIT incl. the vendored `.so`, SUNDIALS BSD, ANTLR BSD, Commons Apache-2.0).
5. **Complex eigenvalues** for `Eigen`/`Eigenvalues` — return `(re, im)` outputs (the complex-capable code already exists in the control path).
6. Either implement or un-document the promised diagnostics panel / report tab (N3) — doc honesty is a trust feature.

### Tier 1 — Next 4–8 weeks (the consensus: distribution + diagnostics)

7. **Diagnostics panel** rendering what the payload already carries (residuals, blocks, iterations, max residual) + populate partial results on failure (N2). Backend is ~done; this is mostly UI.
8. **Share-by-URL**: lz-string-compress the document into a URL fragment → zero-backend shareable links + a read-only view. The single cheapest distribution feature that exists nowhere in the competitive set at $0.
9. **Printable report view** (print stylesheet over formatted equations + solution + plots → browser print-to-PDF). Cheap version first; LaTeX/Pandoc later if demanded.
10. **Landing + docs site**: extract the compiled markdown docs (already markdown-sourced with CI-verified snippets) to a static site; put the gallery and a 3-minute demo on a real landing page.
11. **Published validation page**: ~30 problems from standard thermodynamics, heat-transfer and controls textbooks, with references, vs frees results, generated from the existing `run_examples.py`/doc-snippet harness in CI. (C#5's best idea; mostly writing, not code.)
12. **Tornado/sensitivity output**: stop discarding the per-source uncertainty contributions (G8) and render them; this is hours of backend work + one chart.
13. **OpenAPI (springdoc) + a 100-line Python client** over `/api/check`/`/api/solve`. Unlocks scripting/Jupyter/CI stories cheaply.
14. **Multi-error lint** (errorLine → list of diagnostics; ANTLR error recovery already collects more than one) + optional in-text guess/bounds annotation syntax so projects become fully text-complete and diffable.
15. Small content wins: CSV button directly on the Tables workbook; contour plot type; R454B et al. aliases; component-name autocomplete from `componentCatalog`.

### Tier 2 — Quarter-scale strategic bets (pick 2–3, not all)

16. **Visual schematic authoring MVP** — palette + canvas emitting `COMPONENT`/`connect` text, powered by the existing `componentCatalog`. The strongest consensus UX multiplier (C#2/C#3/C#5) and the natural successor to the deleted Diagram app.
17. **Steady-solver depth**: port the existing KLU/sparse path from the DAE side to large steady blocks; add an LM/trust-region fallback for property-laden blocks (Commons Math LM is already a dependency via the curve fitter). Structural **index detection** with actionable messages (C#5's medium-lift version — not full Pantelides).
18. **Property performance**: enable CoolProp TTSE/bicubic (or wire the dormant `PhPropertyTable`), cache humid-air calls, reduce the global lock. Directly speeds the flagship thermofluid/HVAC workloads.
19. **Monte Carlo UQ** reusing the parametric-sweep machinery + histogram/CDF plots (both already exist).
20. **FMI export** (Co-Simulation FMU wrapping the solved component graph). The most-requested interop item (4 of 5 critiques) — but do it *after* the distribution loop; an island with no visitors doesn't need a ferry terminal yet.
21. **Cloud projects + simple version history** — server-stored snapshots behind share links first; accounts only when usage justifies them.

### Explicitly rejected (from the critiques, with reasons)

- **Partitioned 3-D FEA/CFD co-simulation coupling** (C#1): wrong scale and wrong identity; frees' stated 0-D positioning is a strength, not an accident.
- **CRDT real-time co-editing** (C#1/C#3): premature before there are two users on one document; share links + snapshots first.
- **HPC autoscaler fleet / result hypercubes** (C#1): the RabbitMQ substrate already scales horizontally; a sweep-primitive can come when someone asks for 10 k runs.
- **AI copilot layer** (C#1/C#3): defer; the equation-transparent DSL is well-suited to it later, but it's a distraction before distribution exists.
- **WASM in-browser solver / desktop Tauri pivot** (C#4/C#2): plausible *long-term* precisely because `core` is Spring-free by design — but a rewrite of the compute story is not this year's problem.
- **"Stop claiming CAE/FEA"** (C#2/C#4): nothing to stop — the claim was never made.

---

## 8. Bottom line

The five critiques agree on one true thing, and it is the right thing: **the engine is far ahead of the product around it.** But their inventories of the engine are so unreliable that acting on them directly would have meant rebuilding four major systems that already ship (IDA, Pareto optimization, events, SSE) while missing the one defect that actually took down a worker during testing.

What verification supports: fix the determinant/worker-resilience items now; spend the next two months on the distribution loop (share links, report/print export, landing + docs site, published validation) and on *rendering* the diagnostics the backend already computes; then choose among schematic authoring, solver depth, property performance, and FMI as deliberate strategic bets. And publish the §5 list somewhere visible — the cheapest fix of all is telling people what frees already does.
