# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**frEES** is a web-based, 100% functional clone of the Engineering Equation Solver (EES). It uses a Java Spring Boot backend for high-performance symbolic compiling and numerical solving, and a React 19/TypeScript frontend for a multi-window dashboard interface.

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

## Core EES Principles

- EES is an **equation solver**, not a sequential programming language. Equations can be entered in any order.
- Variable names are **case-insensitive**.
- The solver groups equations into blocks via Tarjan's algorithm, then solves each block using Newton's method with step-halving.
- Data types are parsed dynamically by naming convention: `$` suffix → string, `#` suffix → constant, `[]` → array, `_r`/`_i` components → complex numbers.
- **All calculations run in SI** (frEES decision, beyond EES): unit-annotated constants are converted to SI at parse time, and computed variables get dimensionally derived SI units. Unit warnings never block solving.

## Architecture Summary

See `ARCHITECTURE_AND_REQUIREMENTS.md` for the full system design and six-Epic Agile plan.

**Client-Server flow:**
1. React frontend collects equation + markdown text → POST to Spring Boot backend on "Solve" / "Check"
2. Backend: extracts equations from markdown lines (preserving text structure), lexes/parses them (ANTLR), performs unit verification, blocks equations via Tarjan SCC, and solves via Newton's method.
3. Backend returns JSON: variable solutions, residuals, array tables, compiled LaTeX strings, and the rebuilt formatted report.
4. Frontend renders each window:
   - **Editor**: Custom monospace text editor with a scroll-synchronized line numbers gutter on the left.
   - **Formatted**: Renders compiled Markdown report combining normal text with LaTeX/KaTeX equations, inline solutions, hover tooltips, and embedded interactive plots via `[Graph="..."]` tag resolution.
   - **Solution, Arrays, Plots, Diagram**: Grid, charts, and overlay layouts built from the JSON payload.

**Check-before-Solve (EES Check/Format):** `POST /api/check` verifies syntax and structural solvability (zero degrees of freedom + complete equation↔variable matching) without solving. The frontend gates the Solve button on a successful check; any edit invalidates it.

**Deployment:** Both servers are containerized (`backend/Dockerfile` multi-stage Gradle build → JRE; `frontend/Dockerfile` Vite build → nginx with `/api` reverse proxy to the `backend` service). `docker-compose.yml` wires them with a TCP healthcheck so the frontend waits for a healthy backend.
