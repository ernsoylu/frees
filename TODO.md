# TODO

## Done

* ~~New ode implementation blocks are missing from the spotlight and functions menu. Also from editors autocomplete.~~
  → Added a **Dynamics (ODE)** catalog category (`der`, `ODEValue`, `FinalValue`, `MaxValue`, `MinValue`, `TimeAt`, `ODEAvg`, `ODESum`, `ODEStdDev`) plus a **DYNAMIC (ODE) block** scaffold. The catalog is the single source for spotlight, Functions menu, autocomplete and highlighting, so all three are fixed at once. Added `DYNAMIC`/`STATE`/`EVENT` to the editor keyword set.
* ~~ODE tables: should be able to change ode table units; the parametric-table explanation above ODE tables is misleading.~~
  → ODE tables now show an ODE-specific note (not the "PARAMETRIC … END" one) and their column **units are editable as display labels** (the ODE solver runs in SI, so values stay as solved).
* ~~Function and procedure definitions are misleading; support function blocks with multiple outputs (MATLAB-style).~~
  → Added `FUNCTION [a, b] = f(x) … END` (outputs assigned by name with `:=`) consumed MATLAB-style via `[p, q] = f(x)`. Lowered onto the existing procedure machinery. Catalog + Help + tests updated. (Single-output `FUNCTION f(x)` and `PROCEDURE` are unchanged.)
* ~~Arrays: use `1:3` / `0:15` instead of `1..3`.~~
  → Array index ranges now use colons (`A[1:3]`, `speed[1:N]`); `..` is retained only for DYNAMIC time spans (`t = 0 .. 600`). Grammar, builders, examples, help and tests updated.
* ~~Symbolic CAS layer + Laplace partial fractions (branch `cas-symja-integration`).~~
  → Embedded the pure-Java **Symja** CAS (`org.matheclipse:matheclipse-core:3.0.0`) in a new
  `com.frees.backend.cas` package: `CasEngine` (`factor`/`expand`/`simplify`/`apart`),
  `TransferFunction` (coeff-array → `num(s)/den(s)` fraction + `tf(num,den)` shorthand),
  `CasIdentity` (solve an identity for its coefficients). New **`SYMBOLIC s`** keyword:
  an equation that contains a symbolic variable is treated as an identity that must hold for
  all values of that variable, and `EquationParser.flattenEq` routes it to the CAS, emitting
  `name = value` residue equations so the **residues become ordinary solved variables in the
  Solution window**. Example: `SYMBOLIC s` / `tf([1,3],[1,3,2]) = A/(s+1) + B/(s+2)` → `A=2`,
  `B=-1`. Catalog ("Control Systems (CAS)" category), `examples.ts` ("Partial Fractions
  (Laplace)"), Help topic (`symbolic-cas`), and tests at every layer; full backend suite green,
  `npm run build` clean. **Not yet merged to `main`.**

## Open

### Control System Design and Calculations Capability

Implement LTI modeling, system interconnection, linear time/frequency analysis, and
state-feedback controller design in the `frees` equation solver.

**Goal:** Bring MATLAB-Control-Toolbox-style workflows (TF/SS/ZPK models, interconnection,
Bode/Nyquist/step analysis, LQR/pole-placement/PID design) into frees as native,
order-independent equations with interactive plots.

#### Architectural decisions (grounding for all phases)

These keep the work aligned with how frees already does matrix math, so we reuse machinery
instead of inventing parallel paths.

- **Model representation = named array/matrix variables, no new data type.** A TF is a pair
  of coefficient arrays (`num[]`, `den[]`); a SS model is matrices `A`, `B`, `C`, `D`; a ZPK
  model is `z[]`, `p[]`, `k`. This piggybacks on the existing array/complex-number variable
  types and SI-unit handling — no changes to the type system.
- **Multi-output functions go through the existing `CALL Name(inputs : outputs)` path.**
  `EquationParser.flattenCallProc` already dispatches by name to `flatten*`/`emit*` helpers
  that expand matrix ops into scalar equations — this is exactly how `SolveLinear`, `Inverse`,
  `Transpose`, and `Eigen`/`Eigenvalues` work today. New control functions are added as
  additional dispatch cases there. **No new grammar is required for multiple outputs**;
  MATLAB-style bracket destructuring (`[mag, phase] = bode(...)`) is a later ergonomics layer
  only if `CALL` form proves awkward (the `FUNCTION [a,b]=f(x)` destructuring landed
  previously and can be reused).
- **Two complementary engines, meeting at the `num[]`/`den[]` coefficient arrays.**
  *Numeric analysis* (frequency/time response, high-order roots, controller synthesis) uses
  **Apache Commons Math `EigenDecomposition`** (commons-math3 3.6.1, already a dependency, used
  by `Optimizer.java`) on companion matrices — symbolic methods explode on big/floating-point
  systems. *Symbolic work* (display as a Laplace fraction, partial fractions / residues,
  factoring, symbolic `ss↔tf`, interconnection algebra) uses the embedded **Symja** CAS
  (`matheclipse-core:3.0.0`, **landed** — this amends the original "no new dependencies"
  note). `Together`/`CoefficientList` bridge the symbolic expression and the coefficient
  arrays, so both engines operate on the same representation.
- **A TF also has a symbolic view.** Besides the `num[]`/`den[]` arrays, a transfer function is
  a rational expression in a declared `SYMBOLIC` variable (`s`) — the form the CAS manipulates.
  `tf(num,den)` constructs it; `Apart`/coefficient-matching decompose it.
- **Time responses route through `OdeIntegrator.java`** (RK/BDF/Rosenbrock already exist).
  Commons Math3 has no matrix exponential, so state-space propagation uses either
  eigendecomposition of `A` or direct ODE integration — prefer the ODE route to reuse a
  tested solver.
- **Plots:** backend `PlotDef` is a generic `key→values` map (decoupled from presentation),
  so new diagram types are added purely in the frontend by introducing new `PlotSpec.kind`s
  (`bode`, `nyquist`, `polezero`) in `PlotCard.tsx`/`PlotlyChart.tsx`. `[Graph='name']` report
  tags resolve against `PlotDef` unchanged.
- **Catalog is the single source** for spotlight, Functions menu, autocomplete and
  highlighting (per the ODE work). Each phase registers its functions in
  `functionCatalog.ts` under a new **Control Systems** category as it ships, so capabilities
  are discoverable the moment they land.

**Definition of Done (every phase):** backend solver + unit tests green first
(Agile rule #2/#3), functions registered in the catalog, at least one runnable example in
`examples.ts`, and `npm run build` + `./gradlew test` clean. Each phase is an independently
shippable vertical slice.

---

#### Phase 0 (LANDED) — Symbolic CAS layer + Laplace partial fractions

Shipped on `cas-symja-integration` (see the Done list above). Provides the symbolic half of
the two-engine plan: `CasEngine` (factor/expand/simplify/apart), `TransferFunction`
(coeff-array → fraction, `tf(num,den)` shorthand), `CasIdentity` (coefficient matching), and
the `SYMBOLIC s` keyword that turns an identity into solved residue variables.

**Missing / next, to finish this slice and connect it to the phases below:**

- **Formatted-view rendering of the TF as a Laplace fraction (and the decomposition).** Blocked
  by `MarkdownEquationExtractor.generateFormattedReport`'s strict 1-source-line ↔ 1-equation
  mapping: a `SYMBOLIC` identity consumes one source line but emits N residue equations, so such
  documents fall back to plain text in the Formatted window (same limitation array/matrix
  documents already have). Needs either a *display-equations vs. solve-equations* split in
  `ParseResult`, or a separate "symbolic results" response channel (like `definedPlots`/
  `codeTables`) rendered by the frontend. The Solution-window residues are unaffected and work
  today.
- **`tf(num,den)` outside an identity / with non-literal coefficients.** Today `tf` only resolves
  inside a `SYMBOLIC` identity and requires constant array literals. Standalone display and
  variable/solver-computed coefficients are not handled yet.
- **`LatexConverter` rendering of `tf(...)`** as `\frac{num}{den}` (preparation for the
  Formatted-view work above).
- **Repeated and complex poles** in the partial-fraction workflow: the named-residue identity
  handles them if the user writes the right template (`A/(s+1)^2`, complex residues), but there
  is no helper that auto-builds the template or auto-names residues.
- **More CAS verbs as first-class language directives** (`factor`/`expand`/`simplify`/`apart`,
  `solve`, `integrate`, `limit`, `series`): the engine exists but is not yet reachable from
  editor syntax — needs the same "render result into the report" channel as the first bullet.
- **`SolveAlways`-style symbolic `ss2tf`** (`C(sI−A)^{-1}B + D` via Symja symbolic `Inverse`/
  `CharacteristicPolynomial`) — the symbolic counterpart to the numeric Phase 1 conversion.
- **Merge `cas-symja-integration` to `main`.**

#### Phase 1 — LTI foundation: models, conversions, units (backend)

Establishes the representation and the math primitives every later phase depends on.

- Document the array/matrix conventions for TF (`num`/`den`), SS (`A`,`B`,`C`,`D`), and ZPK
  (`z`,`p`,`k`) models.
- Polynomial helpers (multiply, add, roots-from-coeffs via companion-matrix
  `EigenDecomposition`, coeffs-from-roots expansion) as a reusable backend utility class.
- Conversions via `CALL` dispatch: `tf2ss`, `ss2tf`, `zp2tf`, `tf2zp` — wired into
  `EquationParser.flattenCallProc` alongside `flattenEigen` et al.
- Units: add `rad/s`, `Hz`, `dB`, `deg` to `UnitRegistry` and teach `UnitChecker` to ground
  control variables (frequency vectors, margins). Unit warnings never block solving.
- Tests: round-trip conversions (`tf2ss`→`ss2tf`), known-system pole/root checks.

#### Phase 2 — Interconnection (backend)

Composing models, the smallest useful end-to-end win on top of Phase 1.

- `series(sys1, sys2)` / `parallel(sys1, sys2)` / `feedback(sys1, sys2)` (and explicit
  `*_tf(num1,den1,num2,den2)` forms) producing TF coefficient arrays via the polynomial
  helpers.
- Tests: unity and non-unity feedback against hand-computed closed-loop TFs.
- Catalog: register interconnection functions.

#### Phase 3 — Frequency analysis + Bode/Nyquist/pole-zero plots (backend + first UI)

First user-visible graphical payoff; backend-first then plotting (Agile rule #2).

- Backend solvers: `bode`/`bode_tf` (magnitude `20·log10|G(jω)|` dB, phase in degrees with
  unwrapping), `nyquist` (real/imag parts), `margin`/`margin_tf` (GM/PM and crossover
  frequencies `ω_cg`, `ω_cp`), `pole`/`zero` (via `EigenDecomposition`).
- Frontend: new `PlotSpec.kind`s in `PlotCard.tsx`/`PlotlyChart.tsx`:
  - **Bode** — stacked dual-axes (log ω vs. magnitude dB / phase deg).
  - **Nyquist** — real vs. imaginary, with the critical point `−1 + j0` marked.
  - **Pole-Zero map** — s-plane scatter (poles `×`, zeros `○`).
- Tests: magnitude/phase at known frequencies; pole/zero locations for a reference plant.
- Examples + catalog registration.

#### Phase 4 — Time-domain responses (backend, reuses xy plotting)

- `step`/`step_tf`, `impulse`, `lsim(sys, u, t)` — state-space propagation via
  `OdeIntegrator` (preferred) or eigendecomposition; outputs are time/value arrays.
- Plots reuse the existing **xy** plot kind (minimal new UI).
- Tests: first/second-order step response vs. analytic settling/overshoot.
- Examples + catalog registration.

#### Phase 5 — Controller design solvers (backend)

The most numerically involved phase; deliberately last so it builds on validated analysis.

- `lqr(A, B, Q, R)` — continuous-time ARE via Hamiltonian-matrix eigen/Schur decomposition →
  optimal gain `K`.
- `place(A, B, poles)` — pole placement (SISO Ackermann; robust multi-input as a stretch).
- `pidtune(plant, type$)` — auto-tune `Kp`/`Ki`/`Kd` balancing target bandwidth and phase
  margin (reuses Phase 3 `margin`).
- Tests: `lqr`/`place` closed-loop poles match requested specs; `pidtune` stabilizes a
  reference plant with the requested margin.
- Examples (mass-spring-damper PID tuning, LQR state-space regulation) + catalog registration.

#### Phase 6 — Polish, docs, presets

- Round out the **Control Systems** catalog category: snippet shortcuts, usage examples,
  highlighting, Help docs.
- Curated preset templates in `examples.ts` spanning all phases.
- End-to-end report examples combining equations + `[Graph='…']` Bode/Nyquist/PZ tags in the
  Formatted view.
