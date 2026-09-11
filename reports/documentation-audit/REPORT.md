# frees documentation, examples and usability audit

**Audited:** 10 September 2026 · repository revision `ec96baf` · Rust/WASM application in this repository.

**Main finding:** frees has a substantial engineering engine and a large documentation collection, but the documentation does not reliably describe the application users actually run. Correcting contradictory instructions, making examples task-aware, and exposing existing capabilities will improve usability more than adding another large batch of reference pages.

**Example coverage: 21.4% of the 655 catalogued symbols appear directly in the complete-document example collection (140/655).** Including partial guide and reference example code increases static coverage to **29.9% (196/655)**. These are reproducible symbol-incidence measurements, not percentages of numerical correctness or of every possible application workflow. The manifest itself is incomplete for the Rust implementation; an honest percentage of *all* functionality requires fixing that inventory first.

## 1. Scope, evidence and limits

I inspected the README, all guide Markdown and reference-page metadata/code sections, both example catalogues, the default document, documentation generation/checking, help/search/onboarding code, and the engine entry points and relevant implementations. I traced the browser path through `api.ts` → worker client → WASM exports → Rust core; checked REPL restrictions, component definitions, solver selection, analysis exports, CLI commands, and CI/fixture verification.

I enumerated every entry in both user-facing model catalogues, every guide fence, every reference Examples-section fence, and all 1,308 regression corpus files. Generated documentation catalogues are compiled copies, not additional examples. Inline code, signatures, constitutive-equation listings and fixtures are not treated as complete runnable lessons. Inline CAS demonstrations are discussed below despite being outside the fenced-code numerator.

I rebuilt the current native CLI and ran all 150 complete-document candidates through the native build of the WASM-facing `frees::solve` wrapper. This checks parsing and solve success, **not browser rendering, numerical expectations, accessibility, every solver option, or every branch inside a model**. Competitor comparisons use official public documentation, not hands-on benchmarking or claims of complete feature parity. Usability findings are a code/document review, not an observed user study.

Reproducible evidence accompanies this report:

| Artifact | Contents |
| --- | --- |
| [examples.csv](examples.csv) | All 332 model/snippet occurrences in scope, source, title, category, location and directly used symbols |
| [symbol-coverage.csv](symbol-coverage.csv) | All 655 catalogued symbols, page tier, example bindings, complete-document and broader code matches; blank matches identify gaps |
| [coverage-summary.json](coverage-summary.json) | Counts and family/domain breakdowns |
| [execution.csv](execution.csv) | Individual results for all 150 complete-document candidates |
| [fixtures.csv](fixtures.csv) | All 1,308 regression models, golden-file presence and directly used symbols; kept separate from user teaching material |
| [rust-inventory-gaps.csv](rust-inventory-gaps.csv) | 48 Rust intrinsic names absent from manifest canonical names and recorded aliases |
| [measure.cjs](measure.cjs), [run-checks.py](run-checks.py) | Measurement and execution reproduction scripts |

## 2. What frees can actually do

| Capability | Implementation evidence | Documentation assessment |
| --- | --- | --- |
| Declarative nonlinear equations, guesses, bounds, unit conversion, dimensional warnings, multiple roots | `crates/frees-core/src/engine.rs`, `engine/`, `solver/`, `units/`; editor Check/Solve paths | Strong starting material. Emphasize that unit warnings do not block solving and that a converged root need not be the physically intended root. |
| Arrays, matrices, functions/procedures, lookup tables and interpolation | `parser/`, `linalg.rs`, `procedures.rs`, `curvetable.rs`, `interp2.rs` | Broad syntax coverage; weak small complete examples for many individual operations. |
| Real-fluid, humid-air and material calculations | `props/`, RustProp dependency and property dispatch | Many cycle examples. Individual property pages can still be stubs; distinguish property validity, independent coordinates, units and reference states. |
| Acausal physical networks | 312 definitions in `components/library-data/`, expander, wizard and schematic | Useful connection and troubleshooting guides already exist. Most individual components lack direct complete-model examples. |
| ODEs, stiff integration, DAEs, events and linearization | `ode/`, `dae/`, parser/dynamic handling | Supported, not merely a roadmap item. Method documentation omits newer choices and retains incorrect backend attributions. |
| Control analysis and limited symbolic algebra | `control/`, `cas/`, `crates/frees/src/repl.rs` | Rich control examples; editor and REPL capabilities are incorrectly conflated. |
| Optimization, fitting, parameter estimation, Monte Carlo and PID tooling | `crates/frees/src/analysis.rs`, `web/src/api.ts` analysis methods and corresponding dialogs | Implemented paths exist. The boot document says several are not wired, and the guide offers too little end-to-end instruction for these tools. |
| Tables, plots, reports, digitization, project storage and offline browser use | `TablesTab`, `PlotTab`, `report.ts`, `DigitizerTab`, `projectStore`, PWA and worker code | Existing useful UI, not features that need to be invented. Explain their relationships and failure/recovery workflows. |

The strongest product position is **a local engineering calculation workspace combining equations, units, properties and physical networks**. That is a defensible focus; this review does not establish frees as a replacement for the full MATLAB/Simulink ecosystem or Wolfram's knowledge engine.

## 3. What the coverage percentages mean

### Denominator and rules

The baseline is the committed manifest's **655 unique, case-insensitive symbol names**, deduplicated across function, matrix, CALL, property, material, component and CAS families. One symbol counts once regardless of example count. Declared aliases can match the canonical symbol; separately catalogued aliases remain separate entries under this inherited denominator.

The scanner strips comments and string contents, detects function/procedure calls and component instantiations, and records incidence. It does not infer that an enclosing component teaches every function it calls internally. It does not count a prose mention or syntax-only reference block as a worked example. Partial guide fences can contain placeholders, so the broader figure is deliberately not presented as executable coverage.

| Measure | Count | Percentage | Interpretation |
| --- | ---: | ---: | --- |
| Reference page exists | 655/655 | **100.0%** | Inventory presence only |
| Page meets existing “rich/worked example” heuristic | 155/655 | **23.7%** | Link or code under Examples; not necessarily a direct demonstration or numerical assertion |
| Page has explicit gallery bindings | 114/655 | **17.4%** | Navigation association, not proof the target teaches this symbol |
| Direct use in complete-document candidates | 140/655 | **21.4%** | Recommended baseline example-coverage metric |
| Direct use including instructional code fragments | 196/655 | **29.9%** | Broader static teaching-code footprint |
| Direct use in the 144 successful initial smoke-check documents | 129/655 | **19.7%** | Still not assertion-backed numerical coverage; excludes other execution modes and the timed-out model |

The existing checker reports **155 rich, 354 reference and 146 stub pages**. Thus **22.3% are stubs**. “Reference” often means enough text or a citation, not a complete learning experience. For example, a component page can reproduce its entire constitutive model while omitting a minimal connected circuit that runs.

The manifest is not an exhaustive Rust capability list. `build-doc-manifest.mjs` primarily reads the sibling Java implementation, or retains previously generated non-component families when that repository is absent. Its Rust component reconciliation is valuable, but it does not make every other family authoritative. Static inspection found **312 intrinsic names in Rust, including 48 absent from manifest names and aliases**: examples include `tcdf`, `tinv`, `corrcoef`, `skewness`, confidence intervals, t-tests, ANOVA, bootstrap and permutation-test functions. Some are aliases or convenience names, so simply adding 48 to the denominator would also be misleading.

Language constructs (`DYNAMIC`, `EVENT`, `PARAMETRIC`, etc.), UI workflows, argument combinations, property fluids and component fidelity variants are not individual units in the 655-symbol denominator. Consequently, **21.4% is coverage of the current catalogued surface, not a defensible claim that exactly 78.6% of the application has no documentation**.

### Coverage by symbol family

Families overlap; these rows must not be summed. The property manifest has 30 records but 23 distinct names.

| Family | Unique names | Complete-document direct use | Coverage | Including fragments |
| --- | ---: | ---: | ---: | ---: |
| Registered functions | 276 | 79 | 28.6% | 124 |
| CALL procedures | 44 | 26 | 59.1% | 36 |
| Matrix functions | 14 | 2 | 14.3% | 6 |
| Property functions | 23 | 11 | 47.8% | 11 |
| Components | 312 | 40 | **12.8%** | 43 |
| Material functions | 5 | 3 | 60.0% | 3 |
| REPL CAS operations | 14 | 0 | 0.0% under this metric | 0 |

The CAS zero means **no matching complete-document/fenced worked examples in this measurement**, not “no CAS instruction.” The REPL guide contains inline table examples for Factor, Expand, Diff and others. Those need a separate REPL execution harness and accurate capability labels, rather than being passed to document Solve.

### Component-domain coverage

| Domain | Directly exemplified / available | Percentage |
| --- | ---: | ---: |
| Fluid | 5/31 | 16.1% |
| Moist air | 4/36 | 11.1% |
| AC | 3/7 | 42.9% |
| Pneumatic | 0/18 | 0.0% |
| Powertrain | 1/19 | 5.3% |
| Electrical | 5/31 | 16.1% |
| Mechanical | 0/27 | 0.0% |
| Two-phase | 9/47 | 19.1% |
| Heat | 4/17 | 23.5% |
| Liquid | 6/21 | 28.6% |
| Hydraulic | 0/23 | 0.0% |
| Control | 0/1 | 0.0% |
| Signal | 3/34 | 8.8% |

An equation-only mass–spring example does not teach the mechanical component library. Similarly, a pump-head equation is not automatically an example of the `Pump` component. This distinction explains why many engineering subjects have examples while their component-domain coverage remains low.

### All example collections

| Collection | Occurrences | Treatment |
| --- | ---: | --- |
| Open Example gallery (`examples.ts`) | 47 | Complete-document candidate; **46 unique IDs**, with `rankine-cycle` duplicated |
| Legacy Help worked models (`helpExamples.ts`) | 85 | Complete-document candidates; separate collection from gallery |
| Default boot document | 1 | Complete-document candidate |
| Guide `run` fences | 17 | Complete-document candidates with inline Run UI |
| Other guide fences | 131 | Partial syntax, illustrative or complete code; not assumed independently solvable |
| Reference Examples-section fences | 51 | Worked-code fragments; not assumed independently solvable |
| **Total teaching-code occurrences inventoried** | **332** | Occurrences, not 332 distinct engineering problems |
| Regression corpus | 1,308 | Separate developer verification inventory; not added to teaching coverage |

Gallery categories are uneven: Control Systems 12, Thermodynamics 10, Heat Transfer 8, Mechanics 4, Systems 3, Aerospace 3, Powertrain 3, and one each in Mechanical, Electrical, Fluids and Optimization. Even “Mechanical” versus “Mechanics” splits the same user intent. Large model counts are not evidence of balanced coverage.

## 4. Execution results and confirmed defects

Initial smoke check: **144/150 succeeded (96.0%), five rejected and one timed out at ten seconds**. All 17 runnable guide blocks succeeded. The gallery had 43 successes, three expected main-Solve rejections and one timeout; Help models had 83 successes and two genuine ready-to-run problems. These are solve-success observations with default request settings, not checks of physical correctness or zero warnings.

| Model | Observation | Meaning / concrete fix |
| --- | --- | --- |
| Gallery `projectile-trajectory`, `damped-oscillator`, `driving-cycle-energy` | Main Solve reports underspecified models | Their comments correctly require **Solve Table**. The gallery's blanket “press Solve” instruction is wrong for these entries. Show an execution-mode badge and route the action accordingly. Table execution was not validated in this smoke check. |
| Help `cd-nozzle-shock` | Division by zero while solving the area–Mach block | Its “guess Me = 2.9” appears only in a comment. Appending `GUESS Me = 2.9` made the scratch copy solve. Teach branch selection explicitly. |
| Help `forced-response-lsim` | Parser error at `OUTPUT` | Quoting the plot labels (`'Time [s]'`, `'Output'`) made the scratch copy solve. |
| Gallery `ev-battery-cooling-pid` | Exceeded initial 10-second audit budget | Succeeded in **19.77 seconds** on a separate 60-second retry. This was a budget observation, not a correctness failure; see [slow-example-followup.json](slow-example-followup.json). |

After the longer retry, **145 candidates solved unchanged**, three require the table workflow, and two have confirmed documentation defects. Excluding the three table-workflow candidates, that is 145/147 ordinary Solve candidates (**98.6%**) succeeding with the longer allowance for the EV model. This does not establish numerical accuracy.

Product files were not changed. Scratch fixes confirm useful documentation repairs without expanding this audit into implementation work.

## 5. Highest-priority criticism, grounded in the code

### P0 — instructions and guarantees contradict the running application

1. **Onboarding contradicts itself.** `GettingStartedModal.tsx` says the loaded document is a full EV thermal model. `defaultExample.ts` actually provides a smaller equation model. Its visible comment says optimization, curve fitting and Monte Carlo are not wired; `api.ts` and WASM analysis exports implement those paths. Use the actual loaded model's title and remove obsolete capability warnings.
2. **The REPL promises unsupported operations.** `getting_started.md` teaches matrix/vector literals, ranges, single-unknown equation solving and CALL execution in the REPL. `crates/frees/src/repl.rs:269` explicitly rejects these forms. Label editor versus REPL examples and link each rejection to the supported editor workflow.
3. **Legacy infrastructure guidance is still user-facing.** `overviews.md` describes a client/server queue architecture; `advanced_solving.md` tells users to investigate `/api/health`, worker queues and HTTP 429. `architecture_deployment.md` correctly describes local WASM. `verification.md` instructs readers to run a Java Gradle test in a nonexistent local `backend/` directory. Replace the stale passages with current worker/offline troubleshooting and native verification commands.
4. **Algorithm attributions are stale.** `symbolic_cas.md` and CAS pages claim Symja/Apache Commons Math. `components.md` calls `ida` the SUNDIALS integrator, while `dae/mod.rs` documents a direct Rust implementation. Compatibility of method names is not identity of implementation. Correct attributions and document limitations; avoid suggesting a broad CAS compatibility guarantee.
5. **A parameter description can change the answer.** The `Pipe` reference says `rough` is relative roughness, but both its displayed equation and `library-data/fluid.frees:67` pass `rough / D` to the friction factor. That implies absolute roughness in metres. Fix the parameter contract and demonstrate a known pipe pressure drop; otherwise users can divide by diameter twice.
6. **A README quick-start command is invalid.** `solve --json` is documented, but the current CLI prints JSON by default and does not expose that flag. Document `--request`, solver options, exit codes and an actual batch example using the implemented CLI contract.

### P1 — page quantity hides weak teaching and unreliable associations

- **Duplicate gallery IDs:** `rankine-cycle` occurs at `examples.ts:179` and `:1153`. Help resolves bindings with `.find()`, so the first match wins; gallery keys also use the ID. Add uniqueness checking and keep one canonical identity per example.
- **Bindings need relevance checks.** The `Pump` reference binds pump-sizing/Rankine gallery models, but those bound models do not directly instantiate `Pump` under this scan. The `Pipe` page has no bindings despite the library containing examples that use it. A related application is useful context, but it should not substitute for a runnable demonstration of the documented component.
- **Two model catalogues split discovery.** Help renders both collections; the search implementation imports `EXAMPLES` but not `CYCLE_EXAMPLES`. The 85 Help models are not indexed individually through the same example route. Consolidate identity and search coverage before producing more copies.
- **Gallery instructions and metadata are too thin.** Category is available, but completion time, execution mode, prerequisite, expected output and capability level are missing. The `featured` field's comment promises a focused picker; `ExamplesModal.tsx` returns all examples when unfiltered. Start with a small curated set and retain “All examples.”
- **The documentation gate overclaims.** The current checker passes while the defects above remain. It checks page symbols, links and IDs, not numerical results or whether a bound example uses its symbol. The snippet checker still targets a server at port 8080. The reference README describes 475 symbols, while the current manifest has 655. Its stated quality contract is stronger than the checks actually enforce.

Keep the existing strengths: inline Run/Open in Editor, sliders, faceted search, migration synonyms, staged tutorials with expected outcomes, deliberate-error journeys, component wizard, and diagnostics. These are the foundations of a good learning experience; they need consistent data and reliable examples.

## 6. Comparison with similar tools

These are comparisons of documented learning patterns and product fit. They are not numerical solver benchmarks or exhaustive feature matrices.

| Tool | Documented strength | Criticism / boundary | What frees should adopt |
| --- | --- | --- | --- |
| **MATLAB** | Onramp sequences commands, arrays, functions, plots, import, programming and a final project; exercises provide automated feedback in a browser. [Official MATLAB Onramp](https://matlabacademy.mathworks.com/details/matlab-onramp/gettingstarted) | That sequence teaches the MATLAB language; it does not explain frees' acausal equation model. Transferring assignment/order assumptions would be confusing. | An assessed sequence: solve → alter an input → find an error → plot → explain the result. Add a short MATLAB-to-frees translation page, building on existing search synonyms. |
| **Simulink** | Onramp teaches block editing, signal inspection, discrete/continuous systems and simulation time using projects. [Official Simulink Onramp](https://matlabacademy.mathworks.com/details/simulink-onramp/simulink) | Its block/signal learning model is not interchangeable with physical conservation ports. A schematic alone does not teach causality or boundary conditions. | Explain a small model through equation, schematic and time plot together. Teach signal ports separately from physical connectors and show one invalid connection with recovery. |
| **EES** | Official Help mirrors the calculation workspace: equations, solution, residuals, parametric/lookup/integral tables, units and variable information. [EES Help index](http://fchart.com/ees/eeshelp/eeshelp.htm) | The index is comprehensive but menu-oriented; a novice must still know what task or window to look for. | EES is the closest workflow comparator. Preserve familiar equations/units/tables, but lead documentation with “find a state,” “sweep a design,” and “recover a failed solve.” |
| **Mathcad** | Its beginner guide combines natural worksheet math, explanatory text, units, plots, function tooltips and help; official tutorials include ordering regions and sample calculations. [PTC beginner guide](https://www.ptc.com/en/blogs/cad/mathcad/complete-beginners-guide), [Mathcad Help](https://support.ptc.com/help/mathcad/r12.0/en/) | A worksheet's ordering and definition model must not be silently carried into frees. A polished layout also does not establish numerical validity. | Ship report-ready engineering examples with assumptions, inputs, equations, result units, plots and a conclusion. Improve the existing report flow rather than first replacing the text editor with a new visual math editor. |
| **WolframAlpha** | A direct calculation entry point offers natural-language and math input, with examples organized by recognizable topics. [WolframAlpha](https://www.wolframalpha.com/), [Examples by topic](https://www.wolframalpha.com/examples) | A query-answer entry point does not by itself teach a reusable, stateful engineering model. A similar-looking input box must not imply equivalent natural-language or knowledge coverage. | Use task-language discovery (“pressure drop in a pipe,” “fit measured cooling data”) that opens transparent editable templates. No general natural-language solver is needed to achieve that improvement. |

For physical acausal modeling, **Simscape is a more precise comparator than Simulink alone**; MathWorks presents physical modeling as a distinct learning path alongside Simulink. Use that distinction in positioning and migration material, rather than implying all block diagrams have the same semantics. [MathWorks learning paths](https://matlabacademy.mathworks.com/details/simulink-onramp/simulink)

## 7. Missing or insufficient documentation to add

| Gap | Smallest useful addition | Acceptance evidence |
| --- | --- | --- |
| Actual browser/CLI/REPL capability boundary | One support matrix generated from current dispatch plus explicit restrictions | Each supported example runs through its designated interface; unsupported examples show the right alternative |
| Missing Rust statistics and aliases | Inventory/reconcile the 48 names; group related operations before authoring pages | Canonical names and aliases agree with Rust; one small dataset with known results per statistical family |
| Matrix and CAS teaching | Complete linear-system/matrix example; separate REPL transcripts with expected transformed expressions | Inputs and expected outputs checked in the relevant execution mode |
| Underrepresented component domains | One minimal closed model for pneumatic, hydraulic, mechanical and control; then powertrain and signal variants | All ports, boundary conditions and parameters explained; solve plus one expected invariant |
| Individual component usability | “When to use,” required parameters with units/defaults, minimal full network, expected result, limitations | Direct instantiation in the bound example; no undefined boundaries or hidden setup |
| Optimization and Pareto workflows | One bounded single-objective model and one two-objective trade-off, showing dialog setup and result interpretation | Known optimum or independently checked nondomination; explain infeasible candidates |
| Monte Carlo versus first-order uncertainty | A shared model demonstrating both, distributions, reproducibility and interpretation | Expected mean/spread with tolerance and clear distinction between propagated uncertainty and confidence |
| Parameter fitting and PID UI | Measurement CSV → fit → residual plot; plant → tune → compare responses | Data fixture, parameter bounds, units, expected fit/response and limitations |
| Solver choice and diagnostics | Current method table including Radau, ODE versus DAE choice, initialization and event restrictions | Matched small problems with expected endpoints/events; explain aliases without claiming identical external libraries |
| Data/project lifecycle | Save/export/reopen, browser storage, offline installation, recovery and portability walkthrough | Reopen exported project and reproduce its results; distinguish persisted models from transient REPL state |
| Trust and verification | Current commands, independent analytic checks, parity tests and known limitations | Clearly distinguish Java agreement from independent physical/numerical validation |
| Migration | Short EES, MATLAB, Mathcad and Simulink/physical-network mappings | Side-by-side examples of equality, case-insensitivity, SI conversion, arrays, execution order and connections |

Do not write a standalone page for every synonym or manufacture hundreds of near-identical examples. Reuse small complete models across related symbols, but explicitly show which operation each model teaches.

## 8. Practical improvement plan and user-friendly flow

**First: repair correctness.** Fix the six P0 areas, the two failing Help models, duplicate IDs and Solve/Solve Table instructions. Update the verification page and remove contradictory implementation claims. These changes are small and immediately remove dead ends.

**Second: unify the example contract.** Reuse the existing example/catalogue system. Add execution mode, expected outputs/tolerances, difficulty, intended task and a short “change this” exercise. Index both collections; validate identity and direct relevance. Keep plain documentation fragments explicitly marked “partial snippet.” A Run button should perform the right operation or explain the required next step.

**Third: make five short journeys the front door.** Extend the existing `journeys.md` and tutorials:

1. Solve a two-variable equation with units; change which variable is unknown.
2. Compute a fluid state; intentionally choose dependent inputs and recover.
3. Connect a source–pipe–sink network; remove a boundary and interpret the diagnostic.
4. Sweep an input; plot a result and explain the trend.
5. Add dynamics or fit measured data; export a short report.

Each journey should begin with a plain-language goal, use one visible action at a time, show a numerical or visual expectation, and end with a small modification the learner performs. Provide visible buttons as well as keyboard shortcuts. Use the existing editor, wizard, plots and reporting rather than adding a parallel learning application.

**Fourth: close breadth gaps selectively.** Start with the zero-coverage component domains and matrix/CAS execution examples, then the analysis workflows. For correlations and physical components, document validity ranges, sign conventions, conservation assumptions, property dependencies and initialization. These details matter more than another generic paragraph about acausal modeling.

**Fifth: make documentation checks reflect user promises.** Derive names from Rust and reconcile every exposed family. Execute examples through the same interface used by the UI, using the existing test infrastructure. Assert meaningful outputs and invariants, test selected error-recovery cases, validate unique IDs and links, and publish separate presence, example-incidence and assertion-backed metrics. Frozen regression fixtures are useful evidence but do not automatically stay synchronized with edited teaching examples.

Suggested targets—not measured outcomes—are: no known broken first-run instructions; 100% of examples with an explicit execution mode; all runnable examples checked in CI; at least one complete example per component domain; and at least 90% of new users completing the first small solve within five minutes in a moderated test. Test with engineering students and engineers migrating from other tools, including keyboard and small-screen use. Record time, wrong turns and recovery, not just satisfaction scores.

## 9. Reproduce and interpret the audit

From the repository root, with the project's dependencies installed:

```sh
node reports/documentation-audit/measure.cjs
cargo build -p frees-cli --release
python reports/documentation-audit/run-checks.py
cd web
node scripts/check-doc-coverage.mjs
```

The measurement uses the committed manifest without regenerating it from a potentially different sibling repository. The scanner contains sanity checks and rejects duplicate *audit* identities; repeated product IDs are preserved with occurrence suffixes. Execution uses four concurrent native processes and a ten-second per-model limit, so timings are not benchmarks. The separate slow-model retry and scratch repairs are explicitly follow-up observations.

**Recommended decision:** invest first in accurate, executable teaching of the capabilities frees already has. The existing 100% reference-page number should never stand alone; publish it beside the **21.4% complete-document symbol coverage**, the denominator limitations, and execution/assertion evidence.
