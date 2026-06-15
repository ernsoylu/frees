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
./frees.sh rebuild    # force clean image rebuild
```

After start: frontend at http://localhost:5173 (nginx, proxies `/api` to the backend container), backend API at http://localhost:8080/api.

### Build stamping (commit shown in the About dialog)

The frontend bundle is stamped with the git commit it was built from, surfaced in the **About** dialog (with a link to that commit on GitHub) so you can confirm which revision a deployment — local or on Render — is actually running.

- The commit flows in as the Vite env var `VITE_COMMIT_HASH` (read via `import.meta.env.VITE_COMMIT_HASH` in `AboutModal.tsx`).
- **Local/Docker:** `frees.sh` exports `VITE_COMMIT_HASH=$(git rev-parse --short HEAD)`; `docker-compose.yml` passes it as a build arg to `frontend/Dockerfile`.
- **Render:** the Dockerfile falls back to Render's built-in `RENDER_GIT_COMMIT` build arg, so the deployed About dialog tracks the live commit with no extra config. (If a Render plan doesn't expose it at build time, add a `VITE_COMMIT_HASH` env var in the service settings.)
- Absent both, it falls back to `dev` and the About dialog shows "dev (local build)" with no link.

**Rule:** keep this chain intact — any change to how the frontend is built (Dockerfile, compose, `frees.sh`, or the env-var name) must preserve the commit stamp so the About dialog always reflects the running revision.

**Tests and local development** (run on the host, not in Docker):

```bash
# Backend
cd backend && ./gradlew test        # run all backend tests
cd backend && ./gradlew test --tests "com.frees.backend.core.EquationSystemSolverTest"  # single class
cd backend && ./gradlew bootRun     # dev-only: run backend on host

# Frontend
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
- **All calculations run in SI** (frees decision): unit-annotated constants are converted to SI at parse time, and computed variables get dimensionally derived SI units. Unit warnings never block solving.
- **Uncertainty Propagation**: Computes system-wide first-order error propagation using finite-difference numerical Jacobians and an SVD solver. Propagated errors are combined via root-sum-square (RSS) and displayed as `val ± unc` in solutions. GUI inputs allow absolute or relative percentage values (which calculate each other). Users can also specify uncertainties directly in code using equations of the form `UncertaintyOf(X) = <expr>`, which are evaluated at the solved state before error propagation. When `UncertaintyOf(X)` queries are present in active equations, a second-solve pass resolves them w.r.t the computed uncertainties.

## Architecture Summary

See `ARCHITECTURE_AND_REQUIREMENTS.md` for the full system design and six-Epic Agile plan.

**Client-Server flow:**
1. React frontend collects equation + markdown text → POST to Spring Boot backend on "Solve" / "Check"
2. Backend: extracts equations from markdown lines (preserving text structure; multiple `;`-separated equations per line are supported), lexes/parses them (ANTLR), expands matrix/vector operations (`SolveLinear`, `Inverse`, `Dot`, …) into scalar equations, performs unit verification, blocks equations via Tarjan SCC, and solves via Newton's method.
3. Backend returns JSON: variable solutions, residuals, array tables, compiled LaTeX strings, and the rebuilt formatted report.
4. Frontend renders each window:
   - **Editor**: Custom monospace text editor with a scroll-synchronized line numbers gutter on the left.
   - **Formatted**: Renders compiled Markdown report combining normal text with LaTeX/KaTeX equations, inline solutions, hover tooltips, and embedded interactive plots via `[Graph="..."]` tag resolution.
   - **Solution, Arrays, Plots, Diagram**: Grid, charts, and overlay layouts built from the JSON payload.

**Check-before-Solve (Check/Format):** `POST /api/check` verifies syntax and structural solvability (zero degrees of freedom + complete equation↔variable matching) without solving. The frontend gates the Solve button on a successful check; any edit invalidates it.

**Deployment:** Both servers are containerized (`backend/Dockerfile` multi-stage Gradle build → JRE; `frontend/Dockerfile` Vite build → nginx with `/api` reverse proxy to the `backend` service). `docker-compose.yml` wires them with a TCP healthcheck so the frontend waits for a healthy backend.
