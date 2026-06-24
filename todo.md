# frEES Backend Scilab Parity Improvements

## Completed Tasks (earlier work)
* **MIMO Control System Upgrades:**
  * Upgraded `ControllerDesign` and `PolynomialHelpers` to fully support `double[][]` state space representations (MIMO).
  * Replaced Apache Commons Math implementations internally with Jama for robustness (eigen decomposition, Schur decomposition via Apache/Jama wrappers).
* **Scilab Control Functions Integration:**
  * Supported continuous-time LQR/Lyapunov functions: `lqr`, `lyap`.
  * Supported discrete-time LQR/Lyapunov functions: `dlqr`, `dare`, `dlyap`.
  * Supported pole placement (Ackermann's formula): `place`.
  * Supported Controllability/Observability matrices: `ctrb`, `obsv`.
  * Supported Singular Value Decomposition: `svd`.
* **Parser Upgrades for MIMO Operations:**
  * Updated `ControlSystemsFlattener` to evaluate dynamically sized state matrices up to `n x m` output arrays for MIMO outputs.
  * Corrected evaluation contexts for 1D arrays vs 2D arrays within the `EquationParser` to accommodate vectorized inputs transparently.
* **Function Registry Integration:**
  * Created `FunctionRegistry.java` to catalogue and map backend computation capabilities to frontend documentation and autocomplete.
  * Exposed backend control formulas (lqr, place, rlocus, ctrb, obsv, etc.) under `/api/reference` via `ReferenceController.java`.

## Completed — Tier 4 Scilab Parity (backend)
* **New functions** (full pipeline: FunctionRegistry → autosize → flatten → evaluator prefix → CAS math, each with end-to-end tests):
  * **`acker(A, B, pr, pi : K)`** — Ackermann pole placement, aliased to `place` (reuses the `place$` evaluator).
  * **`lqe(A, G, C, Q, R : L)`** — continuous Kalman estimator gain via dual Riccati: `L = lqr(A', C', G·Q·G', R)'`.
  * **`gram(A, M, type$ : W)`** — controllability (`'c'`, M=B) / observability (`'o'`, M=C) gramian via the Lyapunov solver.
  * **`balreal(A, B, C : Ab, Bb, Cb)`** — internally-balanced realization (Laub's method: gramians → Cholesky → SVD balancing transform). Multi-output, mirrors `svd`.
* **7 new end-to-end tests** in `ControlSystemDesignTest` (acker, lyap, dlyap, dare+dlqr, lqe, gram, balreal invariants), all hand-verified. Full backend suite green.

## Completed — Bugs Found & Fixed
* **Unwired control dispatch (backend, runtime bug):** `dlqr`/`dare`/`lyap`/`dlyap` had `eval*` methods in `ControlSystemsEvaluator` and flatten dispatch, but the `Evaluator.java` prefix router only handled `lqr$`/`place$`/`ctrb$`/`obsv$`. So `CALL dlqr/dare/lyap/dlyap` would have failed at runtime — the existing tests only exercised the CAS layer directly (`ControllerDesign.*`), never end-to-end. Now wired + regression-tested.
* **Editor autocomplete excluded ALL CALL functions (frontend):** `EquationEditor` derived built-in names from each catalog snippet's *leading* identifier, so every `CALL <fn>(…)` resolved to `CALL` (filtered as a keyword). No control/linear-algebra function was ever completable or function-highlighted. Fixed by extracting the callee after `CALL`.
* **REPL Tab-completion inserted descriptive labels (frontend):** `replFunctionNames` passed full menu labels (e.g. `'lqr (LQR optimal gain)'`) as completion candidates, so accepting one inserted the whole string. Fixed to use bare names.
* Both autocomplete fixes consolidated into a shared `catalogFunctionNames()` helper in `functionCatalog.ts` (callee-after-CALL or leading identifier, minus block keywords), used by the editor and the REPL.

## Completed — Frontend Wireup (Tier 4 + previously-hidden functions)
Surfaced all 8 control functions — the 4 new ones plus `dlqr`/`dare`/`lyap`/`dlyap`, which were in the backend registry but had never appeared in the UI:
* **Functions menu / insert snippets** — `functionCatalog.ts` (8 entries with snippet, description, sample usage).
* **Help page** — `helpReference.ts` (8 entries, categorized Design/Analysis/Linear).
* **Examples** — `examples.ts` new worked example: *"Estimator, Gramians & Balanced Realization"* (lqe + gram ×2 + balreal).
* **Editor autocomplete + syntax highlighting** — `EquationEditor.tsx`.
* **REPL Tab-completion** — `App.tsx`.
* **Spotlight / Ctrl+K palette** — automatic (data-driven from `FUNCTION_CATEGORIES`).
* Frontend builds green (`tsc` + Vite).

## Completed — Housekeeping
* Deleted 19 throwaway `*.py` codegen scaffolding scripts from the repo root.
* Deleted `ControllerDesignExt.java` — unreferenced duplicate of `ctrb`/`obsv`/`lyap`/`dlyap` (everything uses `ControllerDesign`).
* Deleted `src/main/java/.../parser/LatexConverterTest.java` — a do-nothing `main()` stub; the real JUnit test lives in `src/test/java/...`.

## Future Work / Known Limitations
* **`kalman` (deferred by design):** Scilab's `kalman` is the online filter time/measurement update (iterative, system-returning) — doesn't fit frees' static-solve model. `lqe` covers the steady-state estimator gain observer design needs. Revisit only for a transient/online filter, which would pair with the DYNAMIC solver.
* **Model-reduction follow-ons:** now that `balreal` + `gram` exist, natural next additions are `hsvd` (Hankel singular values), `balred`/`modred` (truncate a balanced realization to order r). Would reuse the `balreal` transform.
* **`dare` robustness:** uses `EigenDecomposition` of the symplectic matrix and selects eigenvalues with magnitude < 1, throwing if it can't find `n` stable ones (see comment in `ControllerDesign.dare`). Not robust for borderline/defective spectra — consider an ordered (real) Schur form, as `lqr` already uses the matrix-sign iteration.
* **`balreal`/`gram` preconditions:** `gram` requires a stable `A` (Lyapunov); `balreal` additionally needs minimal (controllable+observable) so the gramians are SPD for Cholesky. Non-minimal/unstable inputs currently surface as a raw decomposition exception rather than a friendly message — add explicit precondition checks/messages.
* **Catalog label inconsistency (cosmetic):** math functions use bare labels (`'round'`) while control functions use descriptive labels (`'lqr (LQR optimal gain)'`). Completion is now normalized via `catalogFunctionNames()`, but the menu labels themselves remain mixed; consider standardizing.
* **Frontend deep-render polish:** matrix-valued CALL outputs already resolve through the Solution/Arrays windows; consider a dedicated state-space/system viewer for the new design outputs (gains, gramians, balanced systems).
