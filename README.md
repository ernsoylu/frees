# frees

**free solver** — a web-based, open-source equation-solving environment for engineers.

Solves systems of non-linear simultaneous equations: ANTLR-parsed equations are decomposed into sequentially solvable blocks (bipartite matching + Tarjan SCC) and solved with Newton's method with step-halving, behind a Spring Boot REST API with a React/TypeScript front end.

## Features

- **Equations & Markdown Editor**: A custom-designed monospace text editor with line numbers, allowing you to write equations intermixed with standard Markdown notes.
- **Formatted Report View**: Automatically extracts and evaluates equations (including inline variables like `T1 = 100 [C]`), rendering them as beautiful LaTeX/KaTeX math blocks alongside standard Markdown text.
- **Embedded Interactive Plots**: Embed active property diagrams, psychrometric charts, or X-Y plots directly in formatted reports using the tag `[Graph="Diagram Name"] Caption [/Graph]`, featuring automatic figure numbering and interactive Plotly controls.
- **Inline Solution Tooltips**: Hover over variables in equations within the Formatted View to inspect their solved values and units dynamically.
- **Robust Math Solver**: Decomposes systems of equations into blocks via bipartite matching + Tarjan SCC, solved with Newton's method and step-halving.
- **Matrix & Vector Algebra**: 2D matrix variables (`A[1,1] = 2; A[1,2] = 1` — multiple equations per line), array literals (`b[1..3] = [8, -11, -3]`), and linear-algebra operations (`SolveLinear`, `Inverse`, `Transpose`, `Determinant`, `Dot`, `Cross`, `Norm`, `LUDecompose`, `Eigenvalues`/`Eigen`, Euler rotations) that expand into scalar equations and solve alongside the rest of the system. Matrices render as grids in the Arrays window and as KaTeX block matrices in reports.
- **Thermodynamic Property Database**: Built-in support for fluid state lookups using CoolProp (and psychrometrics / humid air), overlaid onto interactive property diagrams.
- **Calculus, Complex & Special Functions**: Numerical integration of expressions and first-order ODEs (`Integral`), complex-number arithmetic, a broad special-function library (Bessel `J`/`I`/`Y`/`K` of all orders, error/gamma/beta functions), and statistical functions (Chi-Square CDF `chi_square(x, df)`, normal probability ranges `probability(x1, x2, mean, stdDev)`).
- **Uncertainty Propagation**: Propagates measurement/parameter uncertainties (entered in the Variable Information window) through implicit systems of simultaneous equations using numerical Jacobians and Singular Value Decomposition (SVD). Allows querying calculated uncertainties inside the model using the `UncertaintyOf(X)` accessor function (e.g., `u_T = UncertaintyOf(T)`).
- **Optimization**: Single- and multi-variable minimization/maximization (Brent, Nelder–Mead Simplex, BOBYQA) with bound and constraint handling (log-barrier inequalities, augmented-Lagrangian equalities).
- **Graph Digitizer & Function Tables**: Trace data off a scanned chart and call the resulting curve as a function inside your equations, or define tabulated/interpolated functions.
- **Interactive Diagram Window & Live Dashboards**: A vector schematic editor whose labels, gauges, and embedded Plotly charts read live from the solver — with conditional formatting, animation/flow, parametric-table playback, recording, templates, and SVG/PNG/PDF export.

## Quick start

```bash
./frees.sh start    # build and start both servers in Docker
```

Open <http://localhost:5173>, **Check** your equations, then **Solve**.

```bash
./frees.sh stop     # stop everything
```

## Development

```bash
cd backend && ./gradlew test        # backend tests
cd frontend && npm ci && npm run build   # frontend type-check + build
```

See [CLAUDE.md](CLAUDE.md) for the development workflow and [ARCHITECTURE_AND_REQUIREMENTS.md](ARCHITECTURE_AND_REQUIREMENTS.md) for the architecture and roadmap.

## Deployment

The app is deployed on [Render](https://render.com) as two Docker web services built from this repository's `main` branch:

- **Frontend**: <https://frees.onrender.com> (`frontend/Dockerfile`), calling the backend API directly via `VITE_API_BASE`.
- **Backend**: <https://frees-backend.onrender.com> (`backend/Dockerfile`, Spring Boot).

Cross-origin access to the API is restricted to `http://localhost:5173` and `https://*.onrender.com` by default; set `FREES_CORS_ALLOWED_ORIGINS` (comma-separated origin patterns) on the backend service to allow other origins.

## License

MIT
