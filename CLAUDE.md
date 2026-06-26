# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**frees** (free solver) is a web-based, declarative equation-solving environment for engineering problems. It uses a Java Spring Boot backend for high-performance symbolic compiling and numerical solving, and a React 19/TypeScript frontend for a multi-window dashboard interface.

**Frontend UI framework:** [Mantine](https://mantine.dev) (component patterns at https://ui.mantine.dev) with the **dark theme** (`MantineProvider defaultColorScheme="dark"`). Build all new UI with Mantine components (Paper, Tabs, Modal, Table, Alert, Group/Stack/Flex); do not write bespoke CSS components.

## Build and Run Commands

**Servers run in Docker** — managed exclusively through `frees.sh` (never start/kill host processes for the servers):

```bash
./frees.sh start      # build images if needed, start backend + frontend containers
./frees.sh stop       # stop and remove containers
./frees.sh restart    # stop + start
./frees.sh status     # container status
./frees.sh logs       # follow logs
./frees.sh build      # force clean image rebuild
```

After start: frontend at http://localhost:5173 (nginx, proxies `/api` to the backend container), backend API at http://localhost:8080/api.

### Build stamping (commit shown in the About dialog)

The frontend bundle is stamped with the git commit it was built from, surfaced in the **About** dialog (with a link to that commit on GitHub) so you can confirm which revision a deployment — local or on Railway — is actually running.

`AboutModal.tsx` resolves the commit in this order: **runtime** stamp `window.__BUILD_COMMIT__` → **build-time** `import.meta.env.VITE_COMMIT_HASH` → `dev`.

- **Runtime (works on Railway):** `frontend/docker-entrypoint.d/40-build-info.sh` runs on container start and writes `window.__BUILD_COMMIT__` into `build-info.js` from `RAILWAY_GIT_COMMIT_SHA` (Railway's built-in, set at runtime) or `BUILD_COMMIT`. `index.html` loads `build-info.js` before the app. This is the reliable path because platforms expose the commit at runtime, not as a Docker build arg.
- **Build-time (local fallback):** `frees.sh` exports `VITE_COMMIT_HASH=$(git rev-parse --short HEAD)`; `docker-compose.yml` passes it as a build arg (baked by Vite) and as the `BUILD_COMMIT` runtime env.
- Absent all, the About dialog shows "dev (local build)" with no link.

**Rule:** keep this chain intact — any change to how the frontend is built or served (Dockerfile, `docker-entrypoint.d`, `index.html`, compose, `frees.sh`, or the env-var names) must preserve the commit stamp so the About dialog always reflects the running revision.

**Tests and local development** (run on the host, not in Docker):

```bash
### Backend
cd backend && ./gradlew test        # run all backend tests
cd backend && ./gradlew test --tests "com.frees.backend.core.EquationSystemSolverTest"  # single class
cd backend && ./gradlew bootRun     # dev-only: run backend on host

### Frontend
cd frontend && npm install && npm run build   # type-check + production build
cd frontend && npm start                      # dev-only: Vite dev server (proxies /api to :8080)
```

## Agile Iteration Rules

1. **Working Software First** — every story must result in a compilable, testable, runnable iteration.
2. **Backend-Driven** — implement AST parsing and mathematical solvers before building the UI for each feature.
3. **Continuous Verification** — write unit tests for the parser and solver (e.g., `x^2+y^3=77` and `x/y=1.23456` solve correctly) before touching React.

## Core Solver Principles

- frees is an **equation solver**, not a sequential programming language. Equations can be entered in any order.
- Variable names are **case-insensitive**.
- The solver groups equations into blocks via Tarjan's algorithm, then solves each block using Newton's method with step-halving.
- Data types are parsed dynamically by naming convention: `$` suffix → string, `#` suffix → constant, `[]` → array, `_r`/`_i` components → complex numbers.
- **All calculations run in SI** (frees decision): unit-annotated constants are converted to SI at parse time, and computed variables get dimensionally derived SI units. Unit warnings never block solving. `TABLE`/`FUNCTION` blocks may declare argument and output units (`TABLE fanCurve(Vair [m^3/s]) [Pa]`, `FUNCTION f(x [m]) [m/s]`); the unit checker uses them to ground lookup/function arguments and results so downstream variables resolve instead of going dimensionless.
- **Uncertainty Propagation**: Computes system-wide first-order error propagation using finite-difference numerical Jacobians and an SVD solver. Propagated errors are combined via root-sum-square (RSS) and displayed as `val ± unc` in solutions. GUI inputs allow absolute or relative percentage values (which calculate each other). Users can also specify uncertainties directly in code using equations of the form `UncertaintyOf(X) = <expr>`, which are evaluated at the solved state before error propagation. When `UncertaintyOf(X)` queries are present in active equations, a second-solve pass resolves them w.r.t the computed uncertainties.

## Component-Based System Modeling (acausal, multi-domain)

On top of the equation solver, frees has an **acausal, multi-domain, component-based system-modeling layer** (a *pseudo bond graph*, the formalism under Modelica.Fluid / Simscape, held deliberately at the 0-D lumped band). A *component* is a reusable parameterized template of acausal equations with typed ports; instantiating and connecting components **expands to scalar equations that flow through the existing Newton/Tarjan solver unchanged** — it is a parser/expander layer, **not** a new solver. This layer is **complete (backend), ~50 components shipped**; the forward plan for the remaining in-scope components lives in `todo.md`.

- **`COMPONENT … END` blocks** (ANTLR grammar, alongside `FUNCTION`/`TABLE`/`DYNAMIC`): `PARAM` (with `$` string params and **strict no-defaults** in the std library), component-local variables (auto-mangled per instance), acausal equations over port members, and named outputs (`inst.Output`). Instantiation looks like a `CALL` but resolves against the component registry (`ast/ComponentDef.java`, `ast/ComponentInst.java`, `parser/ComponentExpander.java`).
- **Port-member access** is dotted (`s2.P`, `s2.h`, `s2.mdot`), mapped to flat solver vars (`s2$P`) and displayed back as `s2.P`; per-port stream→fluid inference resolves derived-property members.
- **Connection** — two surface syntaxes, same expansion: **shared stream name** (terse, for 2-port series chains) and **`connect(a, b, …)`** (Modelica-style, native branching + union-find loop closure). A node emits across-equalities + a single `Σflow=0`.
- **Four domains** via `parser/DomainRegistry.java`, each an `(across, flow)` pair + junction rule: **fluid** `P`/`ṁ` (+ convective `h`: equal at split/pass-through, flow-weighted at a mixer), **heat** `T`/`Q̇` (`ΣQ̇=0`), **electrical** `V`/`I` (`ΣI=0`), **mechanical** rotational `ω`/`τ` and translational `v`/`F` (`Στ=0`/`ΣF=0`). Cross-domain transducers compose networks in one solve (e.g. `HeatingResistor` electrical→thermal).
- **`model$` variant selector** ("one component, many models") — a `VARIANT … REQUIRE …` mechanism picks a physics body by fidelity (e.g. compressor isentropic-η → volumetric-η → map), with per-variant required-parameter validation.
- **Steady ↔ transient from one network** — storage components emit `der(member)=…` + initials, routed into a `DYNAMIC` block's algebraic body (`core/ode/DynamicSolver.java`, stiff `ode23s`); the steady limit recovers the Phase-1 operating point. Shipped storage: `ThermalMass`/`Inertia`/`Capacitor`/`Inductor`/`Accumulator`/battery SOC.
- **Plant → control** — a `LINEARIZE` block produces a numeric FD `(A,B,C,D)` handed to the control suite (`lqr`/`place`/`ss`); closed loops via `DYNAMIC` + controller components (e.g. `PIThermostat`).
- **Diagnostics** — source-mapped (component-named, never mangled scalars) and an auto-generated read-only **Mermaid topology view** (`api/TopologyGraph.java` → frontend `TopologyTab`).
- **Cycle plotting** — `api/CyclePathResolver.java` recognises component stream members (`s1.P`/`s1.h`) and emits the cycle overlay the existing property-plot renderer draws.

## Architecture Summary

See `README.md` for the full system design and Agile plan.

**Client-Server flow (Asynchronous):**
1. React frontend collects equation + markdown text → POST to Spring Boot API node (`api` profile).
2. API Node syntax-checks equations. If valid, pushes a `ComputeTask` to RabbitMQ and returns a `202 Accepted` with a `jobId`.
3. Compute Node (`compute` profile) picks up the task from RabbitMQ, extracts equations from markdown lines (preserving text structure; multiple `;`-separated equations per line are supported), lexes/parses them (ANTLR), expands matrix/vector operations (`SolveLinear`, `Inverse`, `Dot`, …) into scalar equations, performs unit verification, blocks equations via Tarjan SCC, solves via Newton's method, and writes the JSON payload result to Redis.
4. Frontend polls the API node (`GET /api/jobs/{jobId}`) until the state is COMPLETED/FAILED.
5. Frontend renders each window based on the JSON payload:
   - **Editor**: Custom monospace text editor with a scroll-synchronized line numbers gutter on the left.
   - **Formatted**: Renders compiled Markdown report combining normal text with LaTeX/KaTeX equations, inline solutions, hover tooltips, and embedded interactive plots via `[Graph="..."]` tag resolution.
   - **Solution, Arrays, Plots, Diagram**: Grid, charts, and overlay layouts built from the JSON payload.
   - **Whiteboard**: A code-split [Excalidraw](https://github.com/excalidraw/excalidraw) freehand sketch canvas (`whiteboard/WhiteboardTab.tsx`) that complements the solver-bound native Diagram window — a pure drawing surface (hand-drawn shapes, text, imported images) for quick problem-explanation sketches, with no variable binding. Each whiteboard opens as its own dock window (`whiteboard:<id>`, mirroring the Diagram pattern), its scene persisted as opaque JSON (`{elements, appState, files}`) into App state → the `.frees` project file (with a `frees-whiteboards` localStorage fallback), exportable to PNG/SVG. The Excalidraw theme tracks the app color scheme.
   - **REPL Terminal & Workspace**: Dockable console window — movable like the Editor/Variable Explorer (`ReplTerminal.tsx` → `POST /api/repl/evaluate`, handled by `ReplEvaluator`) that evaluates one line against the cached solved session — expressions, variable query/assign, implicit single-unknown solve, the full `CALL` library (outputs auto-sized from inputs via `EquationParser.autoSizeCallOutputs`, so bare output names work in documents and the REPL), and Symja CAS transforms (`Factor`/`Apart`/`Laplace`/`InverseLaplace`/`Diff`/`Integrate`/…, REPL-only). Block constructs (`FUNCTION`/`DYNAMIC`/`TABLE`, `SYMBOLIC`) remain editor-only.

**Check-before-Solve (Check/Format):** `POST /api/check` verifies syntax and structural solvability (zero degrees of freedom + complete equation↔variable matching) without solving. The frontend gates the Solve button on a successful check; any edit invalidates it.

**Deployment:** Both servers are containerized (`backend/Dockerfile` multi-stage Gradle build → JRE; `frontend/Dockerfile` Vite build → nginx with `/api` reverse proxy to the `backend` service). `docker-compose.yml` wires them with a TCP healthcheck so the frontend waits for a healthy backend.

## Tech Stack and Required Skills

## Backend Architecture (Java + Spring Boot)

| Concern | Library / Tool |
|---|---|
| Language | Java JDK 17+ |
| Framework | Spring Boot (REST + WebSocket API) |
| Build tool | Gradle |
| Compiler / Lexer | ANTLR — generates AST from equation strings |
| Graph theory | JGraphT — Tarjan's DFS blocking algorithm |
| Numerical math | Apache Commons Math — Jacobian matrix, Newton-Raphson, Brent's optimization, Predictor-Corrector integration, eigen-decomposition & matrix algebra (control-systems poles/zeros, LQR Riccati) |
| Symbolic algebra (CAS) | Symja (`matheclipse-core`) — symbolic identities, Laplace partial fractions, transfer-function algebra, symbolic `ss↔tf` |
| Thermodynamics | CoolProp (via JNI/JNA) for real fluids; JANAF table equivalents for ideal gases |
| Asynchronous Compute | RabbitMQ (Message Broker) + Redis (State Cache & Job Store) |
| Observability | OpenTelemetry + Jaeger (Distributed Tracing) |

## Frontend Architecture (React + TypeScript)

| Concern | Library / Tool |
|---|---|
| Framework | React 19 + TypeScript |
| UI components | Mantine (https://mantine.dev / https://ui.mantine.dev) — dark theme, `MantineProvider defaultColorScheme="dark"` |
| Equation rendering | KaTeX or MathJax — Formatted Equations window (`_dot`, `_hat`, subscripts) |
| Data grids | ag-Grid or Handsontable — Parametric, Lookup, and Array tables |
| Charting | Plotly.js — X-Y, contour, 3D surface, and thermodynamic property plots |
| Diagram Window | react-konva or Fabric.js (HTML5 Canvas) + CSS absolute-positioned HTML overlays |
| Whiteboard | Excalidraw (`@excalidraw/excalidraw`) — code-split freehand sketch canvas, complementing the solver-bound Diagram window |

## Build & Deployment (Docker)

| Concern | Tool |
|---|---|
| Containerization | Docker (multi-stage builds for both servers) |
| Orchestration | Docker Compose (`docker-compose.yml` at repo root) |
| Backend image | `eclipse-temurin:21-jdk` build stage (Gradle wrapper, `bootJar`) → `eclipse-temurin:21-jre` runtime |
| Frontend image | `node:20-alpine` build stage (Vite) → `nginx:alpine` serving static bundle + `/api` reverse proxy |
| Server lifecycle | `./frees.sh start \| stop \| restart \| status \| logs \| build` |
| CI/CD | GitHub Actions (`.github/workflows/ci.yml`): backend tests + frontend build on every push/PR; Docker images pushed to GHCR on main |
