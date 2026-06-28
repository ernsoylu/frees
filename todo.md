# frEES — MATLAB-Style Documentation Overhaul

## Goal

Replace the current help system — vague topic-guide prose plus hand-maintained one-line
function lists — with **MATLAB-style, per-function reference documentation**: granular,
example-bound, interactive, error-driven, searchable, and **mathematically rigorous**. Every
built-in function, procedure, block construct, and component must have a reference page that
matches the implementation, **states the underlying equations / algorithm in rendered math
(KaTeX) with a literature citation**, is cross-linked to a runnable, backend-verified example,
and surfaces the exact errors a user can hit. North star: the MathWorks function reference
(e.g. `zeros`, `ss2tf`) — Syntax / Description / Examples / Input & Output Arguments / See Also
— but with the governing equations and references made explicit, the way an engineering
reference (Çengel, Nise, Kays & London) does.

## Why the current help is "too vague" (observed today)

The shipped help (`HelpPage.tsx` 145 KB) is three disconnected things, none of which is a
function reference:
1. **Prose topic guides** — `frontend/src/docs/*.md` (10 files) compiled by
   `scripts/compile-docs.js` (`[Topic: id]` markers) → `docsCatalog.ts` → rendered in
   `HelpPage.tsx`. Conceptual, not lookup-oriented.
2. **Hand-transcribed function lists** — `helpReference.ts`: `{name, desc, example?, unit?}`
   rows grouped into tables. Each function is **one line**; no syntax variants, no argument
   tables, no error coverage, no per-function examples. The file itself admits *"there is no
   machine-readable registry … would otherwise only be discoverable by reading the backend
   switch statements."* — **this drift gap is the root accuracy problem.**
3. **A giant embedded worked-example catalog** baked directly into `HelpPage.tsx` (Power
   Cycles, Gas Turbines, Aerospace, Control Systems, …), separate from the curated runnable
   library in `examples.ts`.

There is **no page that answers "how do I call `SolveLinear` / `ss2tf` / `Enthalpy`, what
are its arguments, show me an example, what errors will I hit."** That is what we are building.

## What we already have (reuse, don't reinvent)

- **Validated example library** — `frontend/src/examples.ts` (`Example[]`, each `text` verified
  against the backend with zero unit warnings; harnessed by
  `backend/.../core/ExampleFixtureHarnessTest.java` and the `*ExamplesTest` suite). Function
  pages bind to these by `id` instead of inventing untested snippets.
- **Interactive markdown renderer** — `HelpPage.tsx` already renders KaTeX, `[Graph="…"]`,
  `[Diagram: X]` (`docs/DocDiagrams.tsx`), and `[Topic: id]` tags. We extend this, not replace it.
- **REPL execution path** — `ReplTerminal.tsx` → `POST /api/repl/evaluate` (`ReplEvaluator`).
  "Send to REPL" / "Open as document" needs no new compute infra.
- **Search** — `searchIndex.ts` (`buildSearchIndex` over `DOCS_CATALOG` + `EXAMPLES`). Extend
  to index function pages + frontmatter.
- **Live reference data** — units & constants already come from `GET /api/reference`.
- **Backend source-of-truth** — `parser/FunctionRegistry.java`, `ast/Evaluator.evalBuiltin`,
  `ast/ControlSystemsEvaluator`, `parser/ProcedureEvaluator`, `api/ReplEvaluator`; grammar in
  `backend/src/main/antlr/Frees.g4`. Component library in the `*.frees` std-lib files.

## Architectural decisions (recommended — confirm before Phase 0)

1. **Extend the existing `.md` + `[Tag]` compile pipeline; do NOT adopt MDX.** The advisory
   proposed MDX, but frees already owns an interactive markdown+tag renderer, a backend-tested
   example library, and a REPL endpoint — MDX would duplicate all three and add a
   Vite/`@mdx-js` toolchain. We add new inline tags (`[Run: id]`, `[Example: id]`,
   `[ArgTable: fn]`) handled in `HelpPage.tsx`. *(Alternative if richer composition is later
   needed: MDX via `@mdx-js/rollup`. Not now.)*
2. **Machine-readable function manifest is the accuracy backbone.** Emit a
   `function-manifest.json` from the backend registries (names, arity, arg/return kinds,
   category) and **fail a test** if any backend built-in lacks a doc page or any doc page names
   a non-existent function. Closes the drift gap `helpReference.ts` calls out.
3. **Examples are backend-verified, never invented.** Every code block on a function page is
   either an existing `examples.ts` entry (by `id`) or a new snippet added to the example
   harness test. Honors frees' standing "every example verified, zero unit warnings" rule.
4. **Interactivity v1 = "Send to REPL" + "Open as document" + inline expected output.** Reuse
   the existing single REPL session. **Defer** the advisory's web-worker isolation sandbox and
   per-block ephemeral workspaces — over-built for v1.
5. **Error-driven help = stable error codes → doc anchors.** Add machine-stable codes to
   backend exceptions, map code → `/help/errors#code`, deep-link from frontend error toasts.
6. **Mathematical rigor with citations is mandatory, not optional.** Every page that
   implements a formula or algorithm (functions, property models, solver/control/CAS ops,
   component constitutive equations) must render its governing equations in KaTeX and cite the
   source. **Ground every citation against the NotebookLM "Frees" notebook**
   (id `350fef25-d19d-4542-a55d-7217276f077a`, 157 sources — Çengel, Nise, Kays & London,
   Kakaç, Holman, Idelchik, Collier, EES/Mastering-EES, Amesim lib PDFs). The `notebooklm` CLI
   is authenticated:
   `notebooklm ask "<governing equation / method for X>" --notebook 350fef25 -s <srcid>`
   for a grounded, source-attributed lookup; use `notebooklm source list --notebook 350fef25`
   to pick the right textbook. Do **not** cite from model memory — pull the equation and the
   reference from the notebook so they match the implementation and a real document.

## Per-function page template (the contract)

Authored as one markdown topic per function (`[Topic: fn-solvelinear]`), with frontmatter:

```
---
name: SolveLinear
category: Matrix & Linear Algebra
summary: Solve the linear system A·x = b.
related: [Inverse, Determinant, Dot]
examples: [matrix-meshcurrents, control-ss2tf]   # ids in examples.ts
tags: [linear, lu, svd, matrix]
references:                                       # grounded via the Frees notebook
  - "Golub & Van Loan, Matrix Computations, §3.4 (LU with partial pivoting)"
---
```
Body sections (omit a section only when truly N/A):
- **Syntax** — every call form / arg variation.
- **Description** — what it does, then when to use it.
- **Mathematical Formulation** — the governing equation(s) / algorithm rendered in KaTeX
  (e.g. `A x = b`, `A = P L U`, Newton step, ε-NTU relation, property correlation), with a
  one-line note on the numerical method actually used by the backend. **Every formula carries
  a citation** keyed to the `references` frontmatter.
- **Examples** — progressive (basic → intermediate → advanced), spanning domains
  (aerospace / mechanical / electrical / chemical / thermo). Each is a `[Run: id]` block.
- **Input Arguments** — table: name · type · required · description (units/dims/constraints).
- **Output Arguments** — table: name · type · description.
- **Common Errors** — table: error code · cause · fix; with a `[Run: id]` that triggers it.
- **Extended Capabilities** — units, uncertainty propagation, complex, matrix/array support.
- **References** — full citations (textbook/standard + section), sourced from the Frees
  NotebookLM notebook; renders as a footnote list, cross-linked from the formulas above.
- **See Also** — related functions + Cookbook recipes.

## Phased plan

- **Phase 0 — Inventory & scaffolding. IN PROGRESS.**
  - DONE — **Manifest generator** `frontend/scripts/build-doc-manifest.mjs` reads
    `FunctionRegistry.java` (166 structured fns) + greps live `case "…"` dispatch labels from
    `Evaluator`/`ControlSystemsEvaluator`/`ReplEvaluator`, emits
    `frontend/src/docs/reference/function-manifest.json` with per-fn `documented` flags +
    coverage counts. Drift-resistant (re-reads backend each run). **Surfaced the gap:** 116
    dispatch-only names absent from the registry (real built-ins — `erf`, `gamma`, `factorial`,
    `interpolate`, `lookup`, `viewfactor_*`, `heisler_*`, `normalcdf`, bessels — plus noise:
    multi-output case labels `gm/pm/tr/ts/Kp…` and the `if` keyword, for human triage).
  - DONE — **Reference scaffolding** `frontend/src/docs/reference/`: `_TEMPLATE.md` (page
    contract + frontmatter schema), `README.md` (authoring + notebook-grounding workflow),
    category subfolders.
  - DONE — **Exemplar page** `reference/heat-transfer/hx_effectiveness.md` realizing the full
    standard: KaTeX ε-NTU relations grounded against the Frees notebook (Kays & London Eq. 2-13,
    Kakaç Eq. 2.46, Holman Eq. 10-27), bound to the verified example `hx-effectiveness-ntu`,
    with Input/Output/Common-Errors tables. Manifest now reports 1/166 documented.
  - DONE — **Registry completion** (the single-source-of-truth pass). Refined the generator to
    reconcile at the *dispatch-arm* level: multi-label `case "a","b"` arms are captured whole, and
    aliases (labels sharing an arm with a registered name — `isen_t0_t`=`t0_t`, `hx_epsilon`,
    `darcy_friction`, `bessel_j`=`besselj`, `flametemp`…) fold into their canonical instead of
    showing as gaps. That left **97 genuinely-missing scalar built-ins**, all now added to
    `FunctionRegistry.java` (166 → **272** functions) with signatures/descriptions harvested from
    `helpReference.ts` + verified against the Evaluator dispatch: inverse-trig/hyperbolic, number-
    theory/bitwise, complex helpers, special functions (Gamma/Bessel/erf/orthogonal polys), stats &
    regression, calculus (`Integral`/`GaussIntegral`/`Differentiate`/`UncertaintyOf`), interpolation
    & lookup, parametric-table + ODE-result accessors, string helpers, Heisler/view-factors,
    stagnation props. New categories: Complex, Special Functions, Calculus, Interpolation, Tables,
    ODE Results, Logic, Strings. **Manifest now reports 0 dispatch-only gaps**; backend
    `compileJava` green; no duplicate names; the entries also flow to the live `/api/reference`.
  - DONE — **Full documentable surface** enumerated by the generator (`function-manifest.json`),
    reading each family from its authoritative source: **136 components** parsed from
    `resources/components/*.frees` (`COMPONENT <name>`, grouped by 12 domain files), **30 property
    functions** from `PropertyFunctions.java` `OUTPUTS`/`HA_OUTPUTS` (fluid + humid-air), **5
    material functions** + 23 materials from `SolidProperties.java`, **44 CALL procedures** and **14
    matrix functions** from the curated `helpReference.ts`, and **14 REPL/CAS ops** from
    `ReplEvaluator`. **Grand total: 515 documentable symbols**, each carrying a `documented` flag.
    Manifest sections: `functions`, `matrixFunctions`, `callProcedures`, `propertyFunctions`,
    `materials`, `components`, `replCasOps`, plus a `coverage` summary block. (Robust TS-field
    parsing handles single/double/backtick-quoted `desc`/`signature`.)
  - TODO — wire the coverage assertion as a failing test (Phase 1, with the renderer): a CI test
    that every `documented:false` symbol is a known gap and that no page names an unknown symbol.
- **Phase 1 — Pipeline & renderer. DONE (verified in-browser).**
  - `compile-docs.js` now also walks `src/docs/reference/**/*.md`, parses YAML-subset frontmatter,
    and emits `src/referenceCatalog.ts` (`REFERENCE_PAGES: ReferencePage[]` with name/slug/category/
    summary/related/examples/tags/references/body). `npm run compile-docs` runs it + the manifest.
  - `HelpPage.tsx`: `ReferencePageView` renders a page (monospace title + category badge, summary,
    tag badges, KaTeX body via the existing `MarkdownRenderer`, frontmatter-driven "See also"
    badges that deep-link to sibling pages). New `[Run: id]` tag in `MarkdownRenderer` pulls a
    backend-verified example from `examples.ts` and renders it as a titled, copyable code block.
    Reference pages get auto-generated nav categories ("Reference · <Category>") merged into the
    existing nav + search.
  - `searchIndex.ts` indexes every reference page (name, summary, tags, references, body).
  - `check-doc-coverage.mjs` (+ `npm run check-docs`) enforces: every page names a real backend
    symbol and binds only real example ids; reports documented/total. **Green.**
  - **Verified**: ran a host Vite dev server, opened `/help`, the `hx_effectiveness` page renders
    fully — KaTeX ε-NTU formulas with citations, the `[Run:]` example, all tables, references, and
    See-Also badges. `tsc -b` green; no new console errors (only pre-existing dev 404s).
- **Phase 2 — Reference content (the bulk). IN PROGRESS (10/515 pages).**
  - **Authoring priority = the 75 functions exercised by `examples.ts`** (computed: each gets a
    verified `[Run:]` example — satisfies the interactivity gate). Batch by shared example to
    amortize notebook queries (one query → all functions in that example).
  - DONE — Heat-Transfer seed (4): `hx_effectiveness`, `LMTD`, `fin_efficiency`, `hx_NTU` (Kakaç
    2.28/2.36, Holman 2-38/10-12, Özışık 3-41b, Kays & London Table 2.4); bound to
    `hx-effectiveness-ntu` / `ev-thermal-management`.
  - DONE — Compressible-flow nozzle set (6): `T0_T`, `P0_P`, `mach_A_Astar`, `M2_shock`,
    `P2_P1_shock`, `P02_P01_shock` (Çengel Thermodynamics Eq. 17-18/19/26/38/39, Fig. 17-42,
    Table A-33); all bound to `cd-nozzle-shock`; expected values hand-computed (M1≈2.20, M2≈0.55,
    P2≈514 kPa, P02≈628 kPa).
  - DONE — Radiation view factors + Heisler (5): `viewfactor_disks`, `viewfactor_plates`,
    `viewfactor_perp`, `heisler_temp`, `heisler_q` (Holman Table 8-2 Items 1/3/5, Figs 8-12/14/16;
    Appendix C Eq. C-1/C-7..C-12, Eq. 4-16); bound to `radiation-view-factors` / `heisler-transient`.
    View-factor expecteds hand-computed (≈0.20/0.41/0.83); Heisler one-term values approximate (≈).
  - Coverage gate + `tsc -b` green at each step. **15/515 documented.**
  - NEXT batches (by example): HX correlations → `ev-thermal-management` (htc_*/dp_2phase/ua_hx/
    hx_eta_surf/hx_area_*); view factors + Heisler → `radiation-view-factors` / `heisler-transient`;
    cubic-EOS → `cubic-eos-properties`; control → `cruise-control` / `control-analysis-report`
    (note: control/math/special categories aren't grounded by the Frees notebook — decide sources).
  Author per-function pages, highest-traffic
  categories first: Math → Matrix/Linear Algebra → Control Systems → Thermophysical Properties
  → Units → Uncertainty → CAS/Symbolic → Block constructs → Components. For each page: write the
  Mathematical Formulation in KaTeX and **pull its governing equation + citation from the Frees
  NotebookLM notebook** (`notebooklm ask … --notebook 350fef25 -s <srcid>`); bind to a verified
  example; add any new snippets to the harness test. Drive coverage + math/reference tests green.
- **Phase 3 — Cookbook (intent-based).** Task guides crossing functions/domains: PID by pole
  placement, thermodynamic cycle analysis, aerospace pitch dynamics (ss↔tf), Monte-Carlo
  uncertainty, pump/fan operating-point. Migrate the example catalog embedded in `HelpPage.tsx`
  into these + `examples.ts`.
- **Phase 4 — Error-driven help.** Stable error codes on backend exceptions (syntax,
  dimensional mismatch, singular matrix, solver non-convergence, unit mismatch). `code → anchor`
  map; deep-link frontend error toasts to `/help/errors#code`. `errors/` reference pages.
- **Phase 5 — Polish & guardrails.** Async-load the search index; "Common Errors" present on
  every function page; domain-diversity check on examples; About/version cross-link. CI test:
  every example in a doc page solves clean against the backend.

## Quality gates (CI-enforceable)

- **Coverage**: every backend built-in/procedure/component has a reference page; no page names
  a non-existent symbol (manifest↔docs test).
- **Accuracy**: every `[Run:]`/`[Example:]` id resolves and solves against the backend with
  zero unit warnings (extend the example harness).
- **Error coverage**: every function page has a Common Errors section.
- **Mathematical rigor**: every page implementing a formula/algorithm has a Mathematical
  Formulation section with KaTeX equations, and a non-empty `references` frontmatter; each
  reference must be traceable to a Frees-notebook source (no memory-only citations).
- **Searchability**: every page has valid frontmatter feeding the index.
- **Domain diversity**: examples span ≥3 engineering domains across the reference set.

## Open questions for the user

- Confirm decision #1 (extend existing pipeline vs. MDX) and #4 (defer the isolation sandbox).
- Scope of v1: all ~130 components in Phase 2, or functions/procedures first and components later?
- Should `/help/...` deep-link routes be added (URL anchors per function) for error-toast links?

---

*Parked — prior initiative (Meaningful-Steady solver robustness & initialization) is
substantially DONE and recorded in git history / README.md / CLAUDE.md. Recap: consistent
state init, steady-by-integration, ε-NTU floating-pressure HX, transient property guarding,
and the Amesim-style charge-state closed refrigerant cycle all shipped green. Remaining open
frontier: floating BOTH pressures in ONE topologically-closed loop at cold start (needs a
closed-loop-aware formulation or continuation) — pick back up from the
`feat/twophase-refrigeration-s1` line if resumed.*
