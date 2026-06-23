# TODO

## Open

### Epic 12: Code Quality & Efficiency
Findings from the 2026-06-23 code-quality review, ranked by gain ÷ effort
(S ≈ hours, M ≈ 1–3 days, L ≈ week+). Work top-down.

1. **[HIGH · L] God classes hurt maintainability.**
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

2. **[MEDIUM · M] `DiagramTab` state sprawl.**
   74 `useState/useEffect/useCallback` in one component — re-render and correctness risk.
   - **Task**: Consolidate into `useReducer` + extracted hooks (subset of item 5).


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

### Epic 15: Asynchronous Compute Architecture (RabbitMQ & Redis)
To decouple the heavy computational workloads from the main API thread and enable horizontal scaling of compute nodes, implement the following phases:

> **Staging decision (2026-06-23):** the async path is gated behind the `api` and
> `compute` Spring profiles. The default profile keeps the original synchronous
> behaviour so local dev (`bootRun`/frontend) and the 730-test unit suite are
> untouched; production runs `SPRING_PROFILES_ACTIVE=api`/`compute`. This lets the
> backend land incrementally before the frontend is taught to poll.

1. ~~**Define the Communication Contract (DTOs)**~~
   - ~~Create `ComputeTask` (jobId, type, payload) for RabbitMQ messages.~~ → `compute/ComputeTask.java` (jobId, taskType, sessionId, requestJson) + queue name `frees.tasks`.
   - ~~Create `JobState` (jobId, status, responseJson, error) for Redis tracking.~~ → `compute/JobState.java` (PENDING/COMPLETED/FAILED, error, result) + `JobTicket` for the 202 body.

2. ~~**Architect the API Node (Producer)**~~
   - ~~Refactor `SolveController` and `OptimizeController` to save `PENDING` state to Redis, push `ComputeTask` to `compute.queue`, and return `202 Accepted` with `jobId`.~~ → `SolveController.solve`, `OptimizeController.optimize`/`curveFit` branch on an injected `ComputeDispatcher` (api profile): synchronous syntax/shape validation (→400), then enqueue + 202. Computation extracted into public `computeSolve`/`computeOptimize`/`computeCurveFit` reused by the worker. `/solve/table` and `/optimize/multi` remain synchronous (see Remaining).
   - ~~Add `JobController` with `GET /api/jobs/{jobId}` for result polling.~~ → `api/JobController.java` (200 JobState / 404).
   - ~~Configure RabbitMQ and Redis connections in `application.properties`.~~ → RabbitMQ host/port/creds + `listener.simple.prefetch=1` + `default-requeue-rejected=false`; Redis host/port.

3. ~~**Architect the Compute Node (Consumer)**~~
   - ~~Create a new headless Spring Boot module (`compute-node`) for `EquationSystemSolver`, `Optimizer`, etc.~~ → Per ORIGINAL_REQUEST R1, kept as a **single Gradle project** split by Spring profiles (`api`/`compute`) rather than a separate module.
   - ~~Add `ComputeTaskListener` (`@RabbitListener`) to process tasks, update Redis `JobState` to `RUNNING` then `COMPLETED`/`FAILED`.~~ → `compute/ComputeTaskListener.java` dispatches SOLVE/OPTIMIZE/CURVE_FIT to the controllers' compute methods; failures (parse/math/numerical) are captured as FAILED, never requeued. (`RUNNING` state omitted — PENDING→COMPLETED/FAILED is sufficient and avoids a race window.)
   - ~~Configure fair load balancing (`spring.rabbitmq.listener.simple.prefetch=1`).~~ → `RabbitConfig` pins a `SimpleRabbitListenerContainerFactory` with `prefetch = 1`, also set in properties.

4. ~~**Generate the Infrastructure (Docker)**~~
   - ~~Write a multi-stage `Dockerfile` to build/run both `api-node` and `compute-node`.~~ → Single `backend/Dockerfile` image reused by both nodes; role selected via `SPRING_PROFILES_ACTIVE`.
   - ~~Add `docker-compose.yml` to orchestrate `api-node`, `compute-node` (replicas: 3), `rabbitmq`, and `redis`.~~ → `docker-compose.yml` has `redis`, `rabbitmq` (with healthchecks), `api-node` (profile `api`), `compute-node` (`deploy.replicas: 3`, profile `compute`).

5. ~~**Update Test Suite for Async Flow**~~
   - ~~Refactor the existing backend test suite to mock RabbitMQ/Redis or use Testcontainers.~~ → Default `test` task excludes `integration/**` and stays broker-free; new `integrationTest` task runs the Testcontainers suite. Existing controller unit tests unchanged (synchronous default profile).
   - ~~Adapt controller integration tests to poll for the `COMPLETED` state instead of expecting a synchronous HTTP response.~~ → `integration/AsynchronousComputeIntegrationTest` (9 cases: solve/optimize/curve-fit submit+poll, REPL, 404 polling, 400 invalid payload, FAILED singular system, concurrent jobs, Rankine cycle). **All 9 pass.** `./gradlew test jacocoTestReport jacocoTestCoverageVerification` green (no regressions).

6. **Observability & Performance Testing (OpenTelemetry)** *(remaining)*
   - `opentelemetry-spring-boot-starter` dependency is on the classpath (auto-instruments HTTP/RabbitMQ/Redis), but explicit trace-context injection/extraction over RabbitMQ headers and a `k6`/`JMeter` benchmark are not yet done.

**Remaining to close Epic 15:**
- ~~**Frontend async adaptation:** `frontend/src/api.ts` still expects synchronous 200 bodies from `/solve`/`/optimize`/`/curve-fit`.~~ → **Done (2026-06-23).** `solve`/`optimize`/`curveFit` now branch on `import.meta.env.VITE_ASYNC_API`: when set, they submit via `runCompute` (POST → 202 `{jobId}` → poll `GET /api/jobs/{id}` until COMPLETED/FAILED), mapping the `result`/`error` to the same response types the sync path returns. Synchronous 4xx validation rejections still surface immediately as failure responses. The sync path is unchanged when the flag is unset, so local dev and existing behaviour are untouched. Data→response mappers extracted (`mapSolveData`/`mapOptimizeData`/`mapCurveFitData`) so both paths share them. Added `src/api.async.test.ts` (4 cases: PENDING→COMPLETED polling, FAILED mapping, 4xx rejection, network failure) — vitest green; lint 0 errors; `tsc -b` + `npm run build` green.
- ~~**Redis-backed REPL session store (PROJECT.md M2):** `SolveContextCache` is still in-memory.~~ → **Done (2026-06-23).** `SolveContextCache` now mirrors the solved snapshot to Redis under `session:<sessionId>` under the `api`/`compute` profiles (in-memory stays primary within a JVM); an api node hydrates a session from Redis when it isn't in memory, so the REPL sees the compute node's solve result across JVMs. The REPL overlay remains api-node-local (captured at solve time; mid-session overlay mutations are not written back) — a documented follow-up for multi-api-node deployments. AST types (`Expr`/`ProcDef`/`ProcStatement`/`Statement`/`Session`/`ReplVar`) marked `Serializable`. Full suite (730 + 9 integration) green.
- ~~**Async the remaining endpoints:** `/api/solve/table` and `/api/optimize/multi` are still synchronous~~ → **Done (2026-06-23).** Both now branch on `ComputeDispatcher`: `SolveController.solveTable` → `computeSolveTable` (task `SOLVE_TABLE`), `OptimizeController.optimizeMulti` → `computeOptimizeMulti` (task `OPTIMIZE_MULTI`); `ComputeTaskListener` dispatches both. Frontend `solveTable`/`optimizeMulti` gained the `VITE_ASYNC_API` submit→poll branch (mappers extracted: `mapSolveTableData`/`mapParetoData`). Added 2 integration cases (`testSolveTableJob`, `testOptimizeMultiJob`) — integration suite now 11/11; default suite (730) + JaCoCo green; frontend lint/tsc/test green.
- ~~**Headless compute node:** set `spring.main.web-application-type=none` for the compute profile (currently starts an idle web server).~~ → **Done (2026-06-23).** Applied as a per-container env var (`SPRING_MAIN_WEB_APPLICATION_TYPE=none`) on the `compute-node` service in `docker-compose.yml` rather than a profile property, so the integration test (which runs `api`+`compute` in one JVM and needs MockMvc) keeps the web server while production compute replicas start headless.
- ~~**`docker-compose up --build` verification:**~~ → **Done (2026-06-23).** `docker compose config` validates (7 services resolve: redis, rabbitmq, otel-collector, jaeger, api-node, compute-node×3, frontend). Smoke-tested the infra tier (`docker compose up -d rabbitmq redis jaeger otel-collector`): all healthy, Jaeger UI (16686) + RabbitMQ mgmt (15672) + Redis (PONG) respond, OTel collector OTLP/gRPC (4317) reachable and ready. Full image build/run left as an environment-specific follow-up (needs the backend build context + CoolProp native lib).
- ~~**OpenTelemetry Phase 6** as above.~~ → **Done (2026-06-23).** Added `config/TraceContextInjector` (producer `MessagePostProcessor`) + consumer-side `TextMapGetter` extraction in `ComputeTaskListener`, wrapping each task in a `compute-task` CONSUMER span that is a child of the API request span via the W3C `traceparent` header — so HTTP→RabbitMQ→compute joins into one trace (the auto-starter doesn't ship Spring-AMQP instrumentation, hence hand-wired). `otel-collector` + `jaeger` services added to compose; both nodes export OTLP/gRPC (`OTEL_SERVICE_NAME`/`OTEL_EXPORTER_OTLP_ENDPOINT`). Integration suite (11) + default suite (730) + JaCoCo green with OTel active. Added `observability/k6-async-benchmark.js` (ramping load, submit→poll, `job_latency_ms` p(95)<2s threshold) and `observability/README.md`.
