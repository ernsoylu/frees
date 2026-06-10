# Architecture and Agile Requirements

## System Architecture

The application operates on a **Client-Server model**.

1. The **React Frontend** provides a multi-window dashboard representing the Equations, Formatted Equations, Solution, Arrays, Residuals, Parametric Tables, Plot, and Diagram windows.
2. The user inputs text into the Equations Window. Upon pressing "Solve", the frontend posts the text string to the **Spring Boot Backend**.
3. The **Backend** lexes the string, builds an Abstract Syntax Tree (AST), checks units, blocks equations via Tarjan's algorithm, and solves them using a numerical Jacobian matrix and Newton's method.
4. The backend returns a JSON payload containing variable solutions, residuals, array tables, and compiled LaTeX strings back to the frontend for display.

### Check-before-Solve (EES Check/Format behavior)

Mirroring EES, the frontend offers a **Check** action (`POST /api/check`) that runs before solving is allowed:

1. **Syntax check** — the backend parses the equations; on failure it reports the first syntax error found (EES halts at the first error).
2. **Degrees of freedom** — on success it reports *"No syntax errors were detected. There are X equations and Y variables."* If counts differ it reports *"There are X equations and Y variables. The problem is underspecified/overspecified and cannot be solved."*
3. **Structural independence** — a complete equation↔variable bipartite matching must exist; otherwise the system is reported as structurally singular.

The Solve button is enabled only after a successful Check; any edit to the equations invalidates the check.

### Deployment (Docker)

Both servers run as Docker containers orchestrated by Docker Compose and managed via `./frees.sh`:

- **backend** — multi-stage image: `eclipse-temurin:21-jdk` runs the Gradle wrapper `bootJar`, runtime is `eclipse-temurin:21-jre`. Exposes 8080 with a TCP healthcheck.
- **frontend** — multi-stage image: `node:20-alpine` runs the Vite production build, runtime is `nginx:alpine` serving the bundle on port 5173 (host) and reverse-proxying `/api/` to the `backend` service. Starts only after the backend is healthy.
- **Lifecycle** — `./frees.sh start|stop|restart|status|logs|rebuild`; no host processes to find or kill.

---

## Epics and User Stories

### Epic 1: Core Equation Solving Capabilities *(First Iteration)*

*Goal: Build the base mathematical engine capable of solving non-linear simultaneous equations.*

- **Story 1.1: Project Skeleton.** Initialize Spring Boot (Gradle) and React (TypeScript) projects. Establish REST communication.
- **Story 1.2: Lexer & AST Generation.** Use ANTLR to parse case-insensitive equations (e.g., `X^2-3=Z`), handling spaces and curly brace `{}` or quote `""` comments.
- **Story 1.3: Variable Initialization.** Extract all variables, assigning default guess values of 1.0 and bounds of negative/positive infinity.
- **Story 1.4: Tarjan's Blocking Algorithm.** Implement a graph representation of equations/variables to reorder and block equations into sequentially solvable groups (Block 0 for single-variable equations, Block 1+ for simultaneous).
- **Story 1.5: Newton's Method Solver.** Implement the solver for simultaneous blocks, generating a numerical Jacobian matrix and applying step-halving to prevent divergence.
- **Story 1.6: Basic Frontend UI.** Create a basic text editor (Equations Window) and a results grid (Solution Window).
- **Milestone 1:** *Working software that can solve `x+y=3; y=z-4; z=x^2-3`.*

### Epic 2: Unit Evaluation and Dimensional Consistency

*Goal: Ensure variables carry units and equations are dimensionally consistent.*

- **Story 2.1: Unit Parsing.** Parse units assigned to constants in brackets (e.g., `P=140 [kPa]`).
- **Story 2.2: Convert Function.** Implement `Convert('From', 'To')` to automatically supply multiplicative conversion factors (e.g., `Convert(ft^2, in^2)` returns 144).
- **Story 2.3: Unit Consistency Checking.** Implement a backend algorithm that traverses the AST to ensure dimensional homogeneity across equal signs and additions.
- **Story 2.4: Solution Window UI.** Update the frontend to display units alongside variables and flag dimensional errors.
- **Milestone 2:** *Working software capable of flagging `Re=rho*u*D/mu` if dimensions do not resolve to a dimensionless number.*

### Epic 3: Advanced Language Features & Subprograms

*Goal: Support complex algebra, array variables, and multi-paradigm programming.*

- **Story 3.1: Basic Math Functions.** Implement `Abs`, `Exp`, `Ln`, `Max`, `Min`, `Sin`, `Cos`, etc., mapped to the AST.
- **Story 3.2: Array Variables.** Parse `X[1..5]` notation. Treat array elements as completely unique variables internally. Implement the `DUPLICATE` loop syntax.
- **Story 3.3: Complex Numbers.** Add a toggle. When active, split every variable internally into real (`_r`) and imaginary (`_i`) components, solving them as 2N simultaneous equations.
- **Story 3.4: Functions and Procedures.** Implement logic constructs (`If-Then-Else`, `Repeat-Until`) using assignment statements (`:=`) parsed before the main equation body.
- **Story 3.5: Modules.** Implement Modules using equality statements, grafting their AST into the main AST and renaming variables with qualifiers (e.g., `Module\1.X`) to prevent namespace collisions.
- **Milestone 3:** *Working software that solves arrays using `DUPLICATE` loops and calculates factorial using internal Procedures.*

### Epic 4: Data Tables, Visualization, & Optimization

*Goal: Implement parametric studies, curve fitting, and graphing.*

- **Story 4.1: Parametric Tables.** Create a frontend spreadsheet (ag-Grid) where users set independent variables. Implement `Solve Table` to loop the solver through table rows.
- **Story 4.2: Plot Window.** Integrate Plotly.js to generate X-Y plots from table data. Add overlay capabilities.
- **Story 4.3: One-Dimensional Optimization.** Implement Brent's method / Golden Section search to minimize or maximize an objective variable by manipulating one independent variable.
- **Story 4.4: Numerical Integration.** Implement the `Integral(f, t)` function using a second-order predictor-corrector algorithm with adaptive step sizing.
- **Milestone 4:** *Working software capable of generating a table of 10 runs and plotting the results.*

### Epic 5: Thermophysical Properties Database

*Goal: Introduce engineering fluid property capabilities.*

- **Story 5.1: Real Fluids.** Map property calls like `Enthalpy(R134a, T=T1, x=1)` to the CoolProp backend. Support indicators `T=`, `P=`, `H=`, `S=`, `V=`, `X=`.
- **Story 5.2: Ideal Gases.** Map spelled chemical formulas (e.g., `N2`, `CO2`) to JANAF table lookup routines. Calculate enthalpy based on 298K, 1 atm formation reference.
- **Story 5.3: Property Plots.** Use Plotly.js to render built-in T-s, P-h, and psychrometric charts with saturation domes.
- **Milestone 5:** *Working software that analyzes a standard Vapor Compression Cycle.*

### Epic 6: The Diagram Window (Interactive Dashboard)

*Goal: Build the graphical GUI builder overlay.*

- **Story 6.1: Development Mode.** Use Canvas to let users draw primitives, import images, and drop text variables.
- **Story 6.2: Application Mode.** Lock the canvas. Render interactive HTML inputs/outputs and dropdown lists over the Canvas coordinates.
- **Story 6.3: Animation Binding.** Bind frontend Canvas object properties (e.g., `Name.Left`, `Name.Angle`) to calculated backend variables, updating them dynamically during Parametric Table runs.
- **Milestone 6:** *Working software with a fully interactive schematic (like a nozzle or heat exchanger) controlling the solver.*
