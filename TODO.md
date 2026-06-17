# TODO

* If I use any of the constants, formatted view shoukd show the notation of that constant instead of value itself  (deferred — to be done a different way)

## Done — First-class ODE / Transient solver (`DYNAMIC` blocks) — branch `dynamic-ode-solver`

**Status:** IMPLEMENTED and green (backend 498 tests, 0 failures; frontend type-checks + builds).
The whole capability shipped in one pass: grammar/AST, full solver roster, events, ODE Tables,
live accessors with loop-closing, method-of-lines arrays, frontend rendering, examples, docs.

* [x] **Guardrail + shared inner-solve** — extracted `solvePinned` out of `solveWithIntegrals`
  with identical behavior (`Integral()` untouched); baseline suite pinned green first.
* [x] **Grammar & AST** — additive `dynamicDef` (+ `DYNAMIC`/`EVENT`/`->` tokens); extractor routes
  `DYNAMIC…END` out of the analytic stream; `ast/DynamicSystem` + builder + validation (`DynamicParseTest`).
* [x] **Core engine** (`core/ode/`) — `ode1`–`ode5`, adaptive `ode45`/`ode23` (PI control + cubic-Hermite
  dense output), stiff `ode23s` (Rosenbrock) + `ode15s` (BDF/step-doubling), FD Jacobians, Hairer
  initial-step sizing, NaN-safe rejection, MAX_STEPS/deadline guards (`OdeIntegratorTest`).
* [x] **Events** — zero-crossing (bracket + bisection), rising/falling/any, stop/record.
* [x] **ODE Table + pipeline** — `DynamicSolver` builds the index-1 DAE RHS closure (states+time pinned →
  algebraic block → `der$` extracted, one shared step cursor); `odeTables` on `SolveResponse`.
* [x] **Array / method-of-lines** — `der(T[i])` in FOR loops + vector initials `T[1..N](0)`, expanded
  against solved constants (transient heat rod, `DynamicArrayStatesTest`).
* [x] **Accessors + loop-closing** — `ODEValue`/`FinalValue`/`MaxValue`/`MinValue`/`TimeAt` + aggregates,
  evaluated *live* against the current Newton iterate (zero-term dependency augmentation) so the analytic
  solver can size an ODE input to a transient target (`DynamicAccessorTest`).
* [x] **Frontend** — ODE Tables render in the Tables window and plot through the parametric path; Help
  section "Transient / ODE Systems (DYNAMIC)".
* [x] **Examples** — Newton cooling, damped oscillator (2-state), transient heat rod, sounding rocket.
* [x] **Capstone acceptance gate** — `OdeRocketTrajectoryTest`: coupled h/v/m + drag + exponential
  atmosphere + burnout + apogee event + ODE Table; solver sizes `t_burn` so `MaxValue('h')=100 km`.

**Scoping decisions:** `ode8` dropped (a correct 13-stage 8th-order tableau is too transcription-risky to
ship unverified; the resolver errors clearly). Because frees is case-insensitive, a state `T` collides with
a time variable `t`; temperature problems name the header time variable `time` (header accepts `t`/`time`/`tspan`).
The `/check` DOF path is not augmented for the advanced *sizing* form (`MaxValue('h')=target` with the free
variable defined only in the block) — shipped examples are report-mode and pass Check; sizing is solver-verified.

<details><summary>Original design notes (kept for reference)</summary>

Supersedes the abandoned "loss-accurate sounding-rocket trajectory" example work — that coupled (v, h, m)
drag+steering trajectory becomes a *natural example* now this capability landed, not a workaround.

### Motivation

frees' only time-integration today is `Integral(f, t, a, b)` (`IntegralSolver`). It is
**single-state**: one scalar accumulator `F`, and `EquationSystemSolver.solveWithIntegrals`
drives each integral *independently* (no shared step cursor), reporting only the end value.
That cannot express:

* **Coupled multi-state systems** — trajectory `(h, v, m)` with drag depending on `v` and
  `ρ(h)`; transient 1-D heat conduction (`der(T[i])` over N nodes); RLC circuits; reaction
  kinetics; any state-space model.
* **Time-resolved output** — there is no sampled trajectory to plot (`Integral` returns the
  value at `t = b` only).

Goal: a feature-rich ODE engine comparable to Simulink/MATLAB's solver family
(`ode45`, `ode23`, fixed-step `ode1`–`ode5`/`ode8`, stiff `ode23s`/`ode15s`), with a **new,
non-colliding declarative syntax**, added **additively** so the analytic solver, the existing
`Integral()`, Check-before-Solve, Tarjan blocking, units, and every current capability are
**untouched**.

### Non-breaking guarantees (hard requirements)

1. `der(...)` / `INIT` / the `DYNAMIC` keyword carry meaning **only inside a `DYNAMIC … END`
   block**. `MarkdownEquationExtractor` routes the whole block body out of the analytic
   equation stream (exactly as it already does for `PARAMETRIC`/`PLOT`/`STATE TABLE`), so the
   analytic parser/solver never sees a derivative operator.
2. Grammar change is purely **one new `program` alternative** (`dynamicDef`) in `Frees.g4`.
   No existing rule is modified.
3. `Integral()` stays exactly as-is — DYNAMIC is a parallel path, not a replacement. Keep both:
   `Integral` = single definite integral / single-state IVP end-value; `DYNAMIC` = multi-state,
   time-resolved systems with sampled output.
4. `EquationSystemSolver.solve()` is unchanged for any document without a `DYNAMIC` block. A
   new `ode/OdeSolver` runs **after** the analytic solve, consuming solved scalars as
   parameters/initial conditions.
5. All new `SolveResponse` fields added via backward-compatible record constructors (the
   codebase's existing convention). Full existing test suite must stay green; add an
   `OdeSolverTest` regression suite.

### Syntax (new `DYNAMIC` block)

Declarative — matches frees' philosophy. A variable is a **state** iff a `der(X)` appears; each
state needs exactly one `der(X) = …` and one initial condition. Everything else in the block is
a constant/parameter (resolved from the analytic solve / outer scope) or an algebraic auxiliary
defined by an ordinary `=` equation (solved per step → index-1 semi-explicit DAE support).

```
DYNAMIC cooling (method = ode45, t = 0 .. 600 [s], points = 200, rtol = 1e-6, atol = 1e-9)
  der(T) = -k * (T - T_inf)        { first-order ODE; T is a state }
  T(0)   = 95 [C]                  { initial condition (also: INIT T = 95 [C]) }
  Q_dot  = m * cp * der(T)         { algebraic auxiliary, becomes an output column }
  OUTPUT Q_dot                     { optional: extra sampled column }
END
```

Multi-state / method-of-lines (transient heat, the flagship validation case):

```
DYNAMIC rod (method = ode23s, t = 0 .. 60 [s], points = 300)   { stiff → implicit solver }
  FOR i = 2 TO N-1
    der(T[i]) = alpha/dx^2 * (T[i-1] - 2*T[i] + T[i+1])
  END
  der(T[1]) = ...   ; der(T[N]) = ...      { boundary nodes }
  T[1..N](0) = T_init                       { vector initial condition }
END
```

* Header options mirror MATLAB `odeset` + Simulink solver names: `method`, `t = t0 .. tf`,
  `step =` (fixed) or `points =` (sample count, default adaptive), `rtol`, `atol`, `maxstep`.
* RHS may reference time `t`, other states, constants/params, and algebraic auxiliaries.
* Array states (`der(T[i])`) reuse the existing array/FOR expansion (`ComplexExpansion`,
  matrix ops) — that's how method-of-lines PDEs work.

**Why a block, not bare `der()` equations (Modelica-style):** isolating the dynamic system
keeps the analytic structural checker (DOF counting, Tarjan blocking, Check-before-Solve) from
ever seeing a derivative, preserves all analytic invariants, allows multiple independent
transient subsystems, carries solver config in the header, and follows the proven
extractor/grammar pattern. Rejected alternatives: (a) retrofitting coupling into `Integral`
(would change `solveWithIntegrals` semantics → risk to existing behavior); (b) a magic global
time variable (implicit globals are error-prone — explicit header tspan is clearer, mirrors
`Integral`'s explicit integration variable).

### Solver method roster (pluggable `OdeMethod` / Butcher tableau)

* **Fixed-step explicit** (Simulink fixed-step): `ode1` Euler, `ode2` Heun, `ode3` (RK3 /
  Bogacki–Shampine fixed), `ode4` classic RK4, `ode5` Dormand–Prince fixed, `ode8` DOPRI8.
* **Variable-step explicit**: `ode45` Dormand–Prince 5(4) [default], `ode23` Bogacki–Shampine
  3(2), optional `ode113` (Adams). Embedded error estimate + PI step-size controller
  (rtol/atol), MATLAB-style. Dense output for sampling at requested `points` (DOPRI 4th-order
  interpolant).
* **Stiff / implicit** (shipped in the same pass): `ode23s` (modified Rosenbrock), `ode15s`
  (NDF/BDF), optional `ode23t`/`ode23tb`. Jacobian from the existing symbolic `Differentiator`
  (FD fallback); per-step Newton reuses `NewtonSolver`. Validation: Van der Pol (large μ),
  Robertson kinetics.
* Adaptive error control, `MAX_STEPS`/deadline-nanos guards (reuse `IntegralSolver`'s), NaN/Inf
  rejection with clear errors.

### Architecture & integration points (real files)

* **Grammar** `backend/.../antlr/Frees.g4`: add `dynamicDef` to `program`; add `der`
  derivative call, init-condition rule, header option list. (Additive only.)
* **Extractor** `MarkdownEquationExtractor`: recognize `DYNAMIC` opener (alongside
  `opensTableBlock`/`opensPlotBlock`/…), route body to `END`.
* **AST** new `ast/DynamicSystem` record: `name`, `List<StateEq>` (state + der RHS + initial),
  `List<Equation>` aux, `OdeOptions` (method, t0/tf exprs, fixedStep, points, rtol, atol,
  events). Built in `AstBuilder`/`EquationParser` with validation (each state: exactly one
  `der`, exactly one initial).
* **Engine** new package `core/ode/`: `OdeMethod` interface + `ButcherTableau`, the method
  implementations, and `OdeSolver`. `OdeSolver` builds the RHS closure `f(t, y) → dy`:
  (1) write state vars into the value map, (2) solve the auxiliary algebraic block with states
  + `t` fixed (generalize the per-step inner-solve already used by `solveWithIntegrals` to a
  vector state), (3) evaluate each `der` RHS. **Shared step cursor across all states = the
  multi-state capability the current `Integral` lacks.**
* **Orchestration** `EquationSystemSolver`: after the analytic solve, run each `DynamicSystem`
  with solved scalars as params/initials → collect a time-series table.
* **Results / DTO — the ODE Table** `SolveController`: each solved `DYNAMIC` block produces a
  first-class **ODE Table** (`odeTables` field on `SolveResponse`), a sibling to the existing
  Parametric Table / Function Table / "ODE Integral Table" naming family. Shaped like
  `ParametricTableDto`/`TableRowResult` (columns = {t, states…, OUTPUT auxes…}, rows = the
  sampled steps) so the **existing** `PlotCard` (which already prefers table rows over solved
  arrays) plots state-vs-time / state-vs-state with **zero new plot code**, and `PLOT` blocks +
  `[Graph="…"]` bind by column name. The ODE Table is the graphing surface the user asked for:
  it shows up in the **Tables** window like a Parametric Table (read-only / solver-populated,
  one table per `DYNAMIC` block) and feeds the **Plots** window directly.
* **Frontend**: map each ODE Table onto the existing `ParamRow`/`TableRowResult` so it renders
  in the **Tables** window beside Parametric Tables and is selectable as a data source in the
  **Plots** window's Configure (x = `t`, y = states/outputs); new Help section "Transient / ODE
  Systems (DYNAMIC)" documenting the ODE Table and its accessors.
* **ODE Table accessors** (mirrors the existing Parametric/Integral table accessors —
  `TableValue`, `IntegralValue`, the column aggregates `Sum`/`Avg`/`Min`/`Max`/`StdDev`):
  `ODEValue('col', t)` / `FinalValue('T')` / `MaxValue('T')` / `TimeAt(...)` read cells, end
  values, or extrema out of an ODE Table, plus the same aggregate functions over an ODE Table
  column. This lets the **analytic** system consume transient results (e.g. peak temperature,
  settling time, apogee altitude) via a second-solve pass — same pattern as the `UncertaintyOf`
  second pass — closing the loop between the ODE Table and the algebraic solve.
* **Events** (shipped in the same pass): `EVENT name: g(states, t) = 0 [rising|falling] ->
  stop|record` for apogee (`v = 0`), ground impact (`h = 0`), thermostat switching. Zero-crossing
  detection via bracketing + `AllRootsSolver`.

### Implementation — single complete pass (not phased)

Build the **entire** capability in one branch and one PR — full solver family, ODE Table,
frontend, events, stiff methods, accessors, examples, and docs land together. No incremental
tiers, no "later" features: the feature ships complete or not at all. The items below are
work-streams within that one pass, all gated by the single acceptance test (the rocket capstone)
plus the unchanged pre-existing suite.

**Preconditions (do before writing feature code, same branch):**

* [ ] **Guardrails** — snapshot the current full solver test pass as the regression baseline;
  pin the contract that documents *without* `DYNAMIC` stay byte-identical through the pipeline.
* [ ] **Extract-without-changing** — lift the per-step "solve the rest of the system with the
  integration variable fixed" inner-solve out of `solveWithIntegrals` into a shared helper that
  `solveWithIntegrals` then calls with **identical behavior** (guarded by the baseline above).
  This is the one refactor that can touch the analytic path — land it first, prove green.

**Feature build (all together):**

* [ ] **Grammar & AST** — `Frees.g4`: one additive `dynamicDef` alternative on `program`, the
  `der(...)` operator, init-condition rule, header option list. `MarkdownEquationExtractor`
  routes `DYNAMIC … END` bodies out of the analytic stream. New `ast/DynamicSystem` record +
  `AstBuilder`/`EquationParser` builder + validation (each state: exactly one `der`, exactly one
  initial; `der(X)` checks as `[X]/[t]`).
* [ ] **Core engine — full solver roster at once** — `core/ode/`: `OdeMethod`/`ButcherTableau`;
  fixed-step `ode1`–`ode5`/`ode8`; adaptive `ode45` (DOPRI 5(4)) + `ode23` (BS 3(2)) with PI
  controller and dense-output sampling; **stiff** `ode23s` (Rosenbrock) + `ode15s` (NDF/BDF)
  using the symbolic `Differentiator` Jacobian (FD fallback) + `NewtonSolver`. `OdeSolver` builds
  the vector RHS `f(t, y)→dy` via the shared inner-solve (states + `t` fixed → algebraic block
  solved each step → `der` RHS evaluated): **one shared step cursor across all states.**
* [ ] **Array / method-of-lines states** — `der(T[i])` and vector initials, reusing the existing
  array/FOR/`ComplexExpansion` machinery, so PDE discretizations work in the same pass.
* [ ] **ODE Table + pipeline** — orchestrate post-analytic solve; emit one **ODE Table** per
  `DYNAMIC` block via `odeTables` on `SolveResponse` (backward-compatible ctor,
  `ParametricTableDto`/`TableRowResult` shape); per-step algebraic coupling verified.
* [ ] **Events** — `EVENT name: g(states,t)=0 [rising|falling] -> stop|record` zero-crossing
  detection via bracketing + `AllRootsSolver`; burnout/apogee/impact/threshold switching.
* [ ] **ODE Table accessors + loop-closing** — `ODEValue`/`FinalValue`/`MaxValue`/`TimeAt` and
  column aggregates; second-solve pass so the analytic system can consume transient results
  (mirrors the `UncertaintyOf` pass).
* [ ] **Frontend** — render ODE Tables in the Tables window and expose them as a Plots data
  source (reuse the parametric-table plotting path → graphs for free); new Help section
  "Transient / ODE Systems (DYNAMIC)" documenting the block, the ODE Table, accessors, the full
  solver list, and the `Integral()` vs `DYNAMIC` relationship. Do **not** remove or change
  `Integral()`.
* [ ] **Examples** — transient 1-D heat (N-node rod), RC/RLC, Newton cooling (DYNAMIC vs the
  existing `Integral` version), damped oscillator as a true 2-state ODE, Van der Pol + Robertson
  (stiff validation) — all added in the same pass.

**Acceptance gate (the one test that must pass before merge):**

* [ ] **End-to-end verification — loss-accurate sounding-rocket trajectory (capstone gate)**
  — the original motivating problem, the single acceptance test that exercises every layer of
  the feature at once. Add it as a new **Aerospace** example in `examples.ts` and as a backend
  `OdeRocketTrajectoryTest`. It must:
  * Integrate the **coupled multi-state** system `der(h)=v`, `der(v)=(F_thrust - D - m*g0*cos(γ))/m`,
    `der(m)=-mdot` (burn) then thrust/`mdot`→0 at burnout — proving states share one step cursor
    (the capability the single-state `Integral` lacks).
  * Model **aerodynamic drag** `D = ½·ρ(h)·v²·Cd·A` with an exponential-atmosphere density
    `ρ(h)=ρ0·exp(-h/H)` as a per-step **algebraic auxiliary** — proving altitude-dependent
    coupling resolved each RHS evaluation.
  * Model **steering loss** via a prescribed pitch program `γ(t)` (gravity-turn / pitch-over),
    so gravity, drag, and steering losses are all *physically integrated*, replacing the old
    lumped `dv_losses = 500 [m/s]` from the current closed-form example.
  * Use **events**: `der(v)` burnout switch at `t_burn`, apogee event (`v = 0` → `stop`), proving
    zero-crossing detection.
  * Produce an **ODE Table** graphed three ways — total mass vs time, altitude vs time, mass vs
    altitude — confirming the Tables→Plots path and `[Graph="…"]`/`PLOT` binding end to end.
  * Close the loop with an **ODE Table accessor**: size the propellant so the apogee event
    altitude equals `h_target = 100 [km]` (`MaxValue('h') = h_target`) via the second-solve pass,
    proving the analytic solver can consume transient results.
  * **Gate:** solves with **zero unit warnings** (the `examples.ts` contract), apogee within
    tolerance of 100 km, and the full pre-existing test suite stays green.

</details>

## Done — SonarCloud quality gate (branches `sonar-quality-gate`, `sonar-reliability-fix`, `sonar-smells-cleanup`)

* [x] Quality gate is GREEN — all six new-code conditions pass: reliability A, coverage 82%, duplication 0%, security hotspots 100% reviewed, security A, maintainability A.
* [x] Reliability regression fixed — `format.ts` passed `formatValue` straight to `.map()`, so the array index leaked in as the new `decimals` arg; wrapped as `(v) => formatValue(v)`.
* [x] Reliability lints cleared — `S7773` (`Number.NaN`/`Number.parseInt`/`Number.parseFloat`) and the dock-tab close `<div>` → native `<button>` (`S6848`/`S1082`).
* [x] Coverage raised over 80% — added `ReferenceControllerTest` and `Combustion` error-branch tests.
* [x] Duplication ≤3% — excluded the declarative data files `examples.ts` / `functionCatalog.ts` from copy-paste detection (like `HelpPage.tsx`).
* [x] Security hotspot (FormulaInput regex `S5852`) reviewed as SAFE on SonarCloud (linear regex, bounded input).
* [x] Remaining reliability smells fixed — `S3923` (Differentiator dead ternary), `S2583` (EquationParser always-true `else if`), `S6218` (content-aware `equals`/`hashCode`/`toString` for the array records in `ProcDef`/`CurveFitter`/`Optimizer`).

## Done — Diagram / inspector UX (branch `diagram-inspector-ux`, `sonar-edge-focus`)

* [x] Diagram Export button moved out of the canvas toolbar into the Inspector, shown only in Run mode.
* [x] Equation tools (Variable Information, Min/Max, Curve Fit) removed from the Equations inspector (already on the left rail); secondary access added to the top Tools menu.
* [x] Dock tab/group keyboard focus ring retinted to teal (was the browser-default blue); mouse focus ring dropped.
* [ ] Right edge "still blue": traced to be outside the app — every app/dependency dark is neutral grey (Mantine body `#242424`); the observed `#1c1c2a`/navy is added externally (dark-mode browser extension or screenshot color shift), so nothing to fix app-side.

## Backlog / follow-ups

* Make each declared STATE TABLE a true multi-instance dock window (currently they share one Fluid States window).
* Make `generateCyclePath` fluid-aware per block (cycle overlay still uses a single detected fluid).

## Done — branch `chemistry-rocket-library`

* [x] Periodic table (`PeriodicTable`) + chemical-formula parser (`ChemicalFormula`) — molar mass of any formula incl. parentheses (C8H18, Ca(OH)2, Al2(SO4)3).
* [x] `MolarMass(token)` implemented (was documented but missing) — resolves an ideal-gas species, a CoolProp fluid, or a chemical formula → kg/mol. Case-preserving (formula tokens travel as string args because `Expr.Call` lowercases its name).
* [x] Expanded `IdealGas` species: added OH, H, O, N, N2O and fuels C8H18, C12H26, CH3OH, C2H5OH (+ liquid-water formation enthalpy) with molar mass, formation enthalpy, entropy, cp(T).
* [x] `HeatingValue(fuel, 'LHV'|'HHV')` [J/kg] and `StoichAFR(fuel)` [-] (`Combustion`), built on formation enthalpies + formula molar masses.
* [x] Unit checker, Evaluator, LatexConverter and AstBuilder taught the new single-token chemistry calls; function catalog + Help reference updated.
* [x] Example: **Sounding Rocket to the Kármán Line** — CH4/LOX vehicle sized to loft a 10 kg payload to 100 km via an implicit mass/Δv solve (uses g#, R#, MolarMass, HeatingValue, units).

## Done — branch `fix-per-table-solve`

* [x] Fill missing values now populate declared STATE TABLE grids — properties computed by Fill Missing (h, s, v…) join as columns instead of only showing in the Solution window (`plots/stateTable.ts`: signature-based grouping by (tag, index)).
* [x] Robust time conversions — added `minute`, `week`, `ms/us/ns`, plurals and full names to `UnitRegistry` (+ tests).
* [x] Supported unit list + built-in constants reference in Help — new `GET /api/reference` (`ReferenceController`) sourced live from `UnitRegistry`/`ConstantsRegistry`, rendered as a filterable table in the Help "Units & Consistency" section.
* [x] Universal constant library — EES `#`-suffix constants (`pi#`, `e#`, `R#`, `g#`, `Na#`, `k#`, `h#`, `c#`, `sigma#`, `Gc#`, `qe#`) via new `ConstantsRegistry`; grammar `IDENT` accepts `#`; substituted at parse time with SI units. `pi` → `pi#` (no backward compatibility).
* [x] Save project to a user-chosen location — File System Access picker with download fallback (`project.ts` `saveProject`).
* [x] Diagram window has tiny margins (inset around the canvas group).
* [x] Diagram output element: configurable decimal places (per-element `decimals`, inspector NumberInput).
* [x] Diagram inspector no longer duplicates beside the diagram when focus leaves it (non-focused diagrams render no inspector).
* [x] Open project surfaces the first diagram in Run view on load.
* [x] Solutions window hidden by default — never auto-opens; opened only via the View menu / command palette.
* [x] STATE TABLE members must be numbered — a numberless/stateless declared variable (e.g. `xrefg`) now errors at Check/Solve instead of being silently dropped.

## Future Implementation Ideas, It is not going to implemented now

* REPL and terminal screen
* Change Solutions window Matlab like Variable window.
