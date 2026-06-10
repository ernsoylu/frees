# frEES

**free Engineering Equation Solver** — a web-based, open-source clone of EES.

Solves systems of non-linear simultaneous equations: ANTLR-parsed equations are decomposed into sequentially solvable blocks (bipartite matching + Tarjan SCC) and solved with Newton's method with step-halving, behind a Spring Boot REST API with a React/TypeScript front end.

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
