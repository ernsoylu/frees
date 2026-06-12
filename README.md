# frEES

**free Engineering Equation Solver** — a web-based, open-source clone of EES.

Solves systems of non-linear simultaneous equations: ANTLR-parsed equations are decomposed into sequentially solvable blocks (bipartite matching + Tarjan SCC) and solved with Newton's method with step-halving, behind a Spring Boot REST API with a React/TypeScript front end.

## Features

- **Equations & Markdown Editor**: A custom-designed monospace text editor with line numbers, allowing you to write equations intermixed with standard Markdown notes.
- **Formatted Report View**: Automatically extracts and evaluates equations (including inline variables like `T1 = 100 [C]`), rendering them as beautiful LaTeX/KaTeX math blocks alongside standard Markdown text.
- **Embedded Interactive Plots**: Embed active property diagrams, psychrometric charts, or X-Y plots directly in formatted reports using the tag `[Graph="Diagram Name"] Caption [/Graph]`, featuring automatic figure numbering and interactive Plotly controls.
- **Inline Solution Tooltips**: Hover over variables in equations within the Formatted View to inspect their solved values and units dynamically.
- **Robust Math Solver**: Decomposes systems of equations into blocks via bipartite matching + Tarjan SCC, solved with Newton's method and step-halving.
- **Matrix & Vector Algebra**: 2D matrix variables (`A[1,1] = 2; A[1,2] = 1` — multiple equations per line, EES-style), array literals (`b[1..3] = [8, -11, -3]`), and linear-algebra operations (`SolveLinear`, `Inverse`, `Transpose`, `Determinant`, `Dot`, `Cross`, `Norm`, `LUDecompose`, `Eigenvalues`/`Eigen`, Euler rotations) that expand into scalar equations and solve alongside the rest of the system. Matrices render as grids in the Arrays window and as KaTeX block matrices in reports.
- **Thermodynamic Property Database**: Built-in support for fluid state lookups using CoolProp, overlaid onto interactive property diagrams.

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

## License

MIT
