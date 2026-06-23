# TODO

## Open

### Epic 12: Code Quality & Efficiency
Findings from the 2026-06-23 code-quality review, ranked by gain ÷ effort
(S ≈ hours, M ≈ 1–3 days, L ≈ week+). Work top-down.

1. ~~**[CRITICAL · M] `/check` and `/solve` re-parse identical source ~5× per request.**~~
   → **Done.** Added `EquationSystemSolver.parse(source)` and `ParseResult`-accepting
   overloads of `check`/`deriveUnits`/`inferUnits`/`checkUnits` (plus controller-side
   `effectiveUnits`/`unitsByLowerName` overloads), keeping the old `String` signatures as
   delegating wrappers for external callers. `SolveController.check` now parses **once**
   (was 6×: check + effectiveUnits→inferUnits + deriveUnits + inferUnits + checkUnits +
   a standalone `new EquationParser().parseResult`) and `/solve` parses once on the
   controller side (was 5×). Full backend suite green; `compileJava` clean.

2. ~~**[CRITICAL · M] Frontend has zero tests and zero lint config.**~~
   → **Done.** Added ESLint 9 flat config (`eslint.config.mjs`: typescript-eslint +
   react/react-hooks/react-refresh) and a Vitest + React Testing Library + jsdom setup
   (`vitest.config.ts`, `src/test/setup.ts`). Added `lint`/`test`/`test:watch` scripts and
   the dev dependencies. First suite `src/format.test.ts` (10 tests) covers the numeric
   formatter and stable-key helper. Auto-fixed `prefer-const`; registered the react plugin
   so existing inline disables resolve; `allowEmptyCatch` for the intentional fallback
   catches. **Lint gate: 0 errors** (56 warnings surfaced for items 6 & 9). Wired `npm run
   lint` + `npm test` into the `frontend-build` CI job ahead of the build. `npm run build`
   still green.

3. ~~**[HIGH · S–M] Broad exception handling with near-zero logging.**~~
   → **Done.** Added SLF4J loggers to `SolveController`, `ReplEvaluator`, and
   `EquationSystemSolver`. The two genuine server-fault catch-alls (`/check`, `/solve`,
   which returned HTTP 500 with only `e.getMessage()`) now `log.error(…, e)` with the full
   stack trace. Silent swallows that are legitimate fallbacks were given `log.debug(…, e)`
   tracing instead of being invisible: the REPL casing-recovery `// ignore`, the REPL
   expression-eval `RuntimeException` catch, the CoolProp out-of-range NaN fallback, and the
   `checkUnits` non-smooth-block `catch (Exception ignored)`. Backend suite green.
   - **Remaining (optional follow-up):** the three other intentional `catch (Exception
     ignored)` control-flow swallows in `EquationSystemSolver` (already commented) could get
     the same debug tracing if needed.

4. ~~**[HIGH · S] Regex compiled per-call on parse paths.**~~
   → **Done** (smaller than the headline suggested). On audit, almost all of the 21
   `Pattern.compile` hits were already `static final` (multi-line field declarations whose
   continuation line the grep miscounted). The only genuine *constant* per-call compiles
   were two methods in `SolveController` that each rebuilt the identical state-variable-index
   regex (`name_3` / `name[3]`) on every call — hoisted to a single shared
   `STATE_VAR_INDEX` static field. The remaining per-call compiles (`SolveController:669`
   assignment matchers, `ReplEvaluator` casing, `PropertyFunctions` substitution) are
   inherently dynamic — built from `Pattern.quote(runtimeValue)` — so they can't be hoisted
   to constants. Backend suite green.

5. **[HIGH · L] God classes hurt maintainability.**
   `DiagramTab.tsx` (6,241 LOC, 74 hooks), `EquationParser.java` (3,665),
   `Evaluator.java` (2,468), `SolveController.java` (1,944 / 32 endpoints).
   - **Task**: Decompose incrementally as files are touched — split `SolveController`
     into Solve/Check/Optimize/Repl controllers; extract `DiagramTab` sub-editors and
     the shape library into child components/hooks (see item 8).
   - **Progress (2026-06-23):** Three of the four god classes decomposed; only
     `DiagramTab.tsx` (item 8) remains.
     * `SolveController.java` 1,975 → 573 LOC (just `/solve` + `/solve/table`):
       thermodynamic cycle-path/property-resolution (~570 lines) → `CyclePathResolver`;
       check endpoint → `CheckController`; optimize/curve-fit → `OptimizeController`;
       shared solve-budget/unit-display/REPL-override helpers → `SolverApiSupport`;
       wire DTOs → `SolveDtos`. (`ReplController` already existed.)
     * `Evaluator.java` 2,468 → 1,308 LOC: the ~1,160-line control-systems
       intrinsic block (`series`/`parallel`/`feedback`, `pole`/`zero`, `bode`/
       `nyquist`/`margin`/`nichols`/`routh`, `residue`, `step`/`impulse`/`lsim`,
       `lqr`/`place`/`pidtune`, `ctrb`/`obsv`/`rank`, SS interconnection,
       `stepinfo`/`pade`/`rlocus`, `discretize`/`errorconst`/`mason` + helpers)
       → `ControlSystemsEvaluator` (1,188 LOC). The block was self-contained —
       its only cross-class dependency was the public `Evaluator.eval` — so the
       move is behaviour-preserving; `evalBuiltin` dispatches each call there.
     * `EquationParser.java` 3,665 → 2,161 LOC: the ~1,500-line control-systems
       CALL-flattening block → `ControlSystemsFlattener` (1,556 LOC), reached via
       a `csFlattener` field; it shares only five parser helpers
       (`evalIndexExpr`/`expandExpr`/`parseMatrixInfo`/`parseVectorInfo`/
       `registerShape`, widened to package-private) and the `FlattenContext`/
       `MatrixInfo`/`VectorInfo` inner types. `flattenCallProc` dispatches each
       control-systems CALL there.
     Backend suite (730 tests, 0 failures) + JaCoCo gate green throughout;
     control-systems tests (`ControlSystemInterconnection`/`Design`/`Frequency`,
     31 cases) run unskipped. Only the two internal `SolveControllerTest`
     symbol references were repointed to `SolverApiSupport`. Remaining:
     `DiagramTab.tsx` (item 8).

6. ~~**[MEDIUM · S] TypeScript `any` escape hatches.**~~
   → **Done.** Eliminated all 20 `no-explicit-any` sites (now **0**; total lint warnings
   56 → 36, remainder are unrelated hook-deps/array-key/refresh rules). Approach per site:
   extended the hand-rolled Plotly types (`plotly-dist.d.ts` gained `range`/`dtick`/
   `overlaying`/`side`) to drop `(layout as any)` casts; removed redundant bar-trace `val as
   any` maps; deleted move-handler `(el as any).x` casts that TypeScript already narrows past
   the `connector`/`line` branches; typed the diagram-import deserializer as `unknown` +
   record views; narrowed Mantine `Select` onChange to the real string-literal unions; typed
   `onVarDraftsChange` as `Record<string, VariableDraft>` (completing the partial default
   draft); and gave the SVG dash helper `React.SVGAttributes<SVGElement>`. `tsc -b`, lint
   (exit 0), Vitest, and `npm run build` all green.

7. ~~**[MEDIUM · S] No JaCoCo coverage gate.**~~
   → **Done.** Added `jacocoTestCoverageVerification` with a floor of 78% instruction /
   62% branch (current is ~83% / ~69%, so there's headroom for churn but a real regression
   fails). Wired into `gradle check` and the CI test step (`./gradlew test jacocoTestReport
   jacocoTestCoverageVerification`). Verification passes today.

8. **[MEDIUM · M] `DiagramTab` state sprawl.**
   74 `useState/useEffect/useCallback` in one component — re-render and correctness risk.
   - **Task**: Consolidate into `useReducer` + extracted hooks (subset of item 5).

9. ~~**[LOW · S] Stray `console.*` (2 sites).**~~
   → **Done** (nothing to remove). The only two `console.*` calls are legitimate
   `console.error` (KaTeX render failure in `Latex.tsx`, crash logging in `ErrorBoundary.tsx`).
   The `no-console` ESLint rule (added in item 2) allows `error`/`warn` and now blocks any
   future stray `console.log` — **0 `no-console` warnings** today.

10. ~~**[LOW · S] Backend `version` hardcoded `0.0.1` in `build.gradle`.**~~
    → **Done.** `version` now derives from `git describe --tags --always --dirty` via
    Gradle's `providers.exec` (resolves to a tag when present, else the short commit, e.g.
    `d46e243-dirty`). Guarded with a try/catch + empty-output check that falls back to
    `0.0.1` when git is unavailable — the backend Docker build context excludes `.git`, so
    the build must not depend on it.


### Epic 13: Full Textbook Compliance (Nise *Control Systems Engineering*)
To make every analysis and design problem in the textbook solvable, implement the following missing capabilities:

1. **Discrete-Time / Digital Control Systems (Chapter 13)**
   - **Task**: Add discrete LTI representations (discrete TF $H(z)$ and state-space $A_d, B_d, C_d, D_d$). Implement continuous-to-discrete conversion `c2d(A, B, T : Ad, Bd)` using Zero-Order Hold (ZOH). Add discrete step/impulse responses (`dstep`, `dimpulse`) and discrete frequency evaluation (substituting $z = e^{j \omega T}$).
   - **Verification/Test Problem**: *Nise Chapter 13, Example 13.6*: Discretize a continuous plant $G(s) = \frac{10}{s(s+1)}$ with sampling interval $T = 0.5$ seconds using ZOH. Verify the resulting discrete transfer function is $G(z) = \frac{0.9348 z + 0.812}{z^2 - 1.6065 z + 0.6065}$ and plot its discrete step response.


### Epic 14: Full Textbook Compliance (Çengel *Thermodynamics*)
To make every analysis and design problem in the textbook solvable, implement the following missing capabilities:

1. **Compressibility Factor (`compressibility`/`Z`)**
   - **Task**: Expose CoolProp's native compressibility factor output (`Z`) in property functions.
   - **Verification/Test Problem**: *Çengel Chapter 3, Example 3-12*: Determine specific volume of R-134a at 1 MPa and 50°C using Nelson-Obert compressibility factor.
2. **Critical point properties (`criticalTemperature`, `criticalPressure`)**
   - **Task**: Implement critical temperature and critical pressure property retrieval functions for real fluids.
   - **Verification/Test Problem**: *Çengel Chapter 3, Example 3-13*: Retrieve critical parameters of water to calculate reduced variables.
3. **Gibbs Free Energy (`gibbs`/`g`)**
   - **Task**: Expose Gibbs free energy (`Gmass`) from CoolProp for real fluids, and implement $g = h - Ts$ in the `IdealGas` engine.
   - **Verification/Test Problem**: *Çengel Chapter 16, Example 16-1*: Evaluate the dissociation reaction $N_2O_4 \rightleftharpoons 2NO_2$ at 25°C using Gibbs functions.
4. **Stagnation Properties (`stagnationTemp`, `stagnationPres`)**
   - **Task**: Implement stagnation temperature $T_0 = T + V^2 / (2 c_p)$ and stagnation pressure $P_0 = P (T_0 / T)^{k/(k-1)}$ functions.
   - **Verification/Test Problem**: *Çengel Chapter 17, Example 17-1*: Determine stagnation temperature and pressure of air entering a diffuser at 100 kPa and 300 K at 200 m/s.
