# Tech Stack and Required Skills

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
| Server lifecycle | `./frees.sh start \| stop \| restart \| status \| logs \| rebuild` |
| CI/CD | GitHub Actions (`.github/workflows/ci.yml`): backend tests + frontend build on every push/PR; Docker images pushed to GHCR on main |
