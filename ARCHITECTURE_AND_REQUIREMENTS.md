# Architecture and Agile Requirements

## System Architecture

The application operates on a **Client-Server model**.

1. The **React Frontend** provides a multi-window dashboard representing the Editor, Formatted Report, Solution, Arrays, Residuals, Parametric Tables, Plot, and Diagram windows. The **Editor** is equipped with a vertical line-numbering gutter.
2. The user inputs text containing equations and standard Markdown notes into the Editor Window. Upon pressing "Solve" or "Check", the frontend posts the text string to the **Spring Boot Backend**.
3. The **Backend** extracts equations from markdown lines (preserving text structure), lexes/parses them, builds an Abstract Syntax Tree (AST), checks units, blocks equations via Tarjan's algorithm, and solves them using a numerical Jacobian matrix and Newton's method.
4. The backend returns a JSON payload containing variable solutions, residuals, array tables, compiled LaTeX strings, and a reconstructed formatted report template back to the frontend.
5. The frontend compiles and renders the formatted report, overlaying KaTeX math formulas, inline solution badges, tooltips, and embedding interactive plots dynamically via `[Graph="Diagram Name"] Caption [/Graph]` tags.

### Markdown Equation Extraction

The backend separates equations from prose before parsing (`MarkdownEquationExtractor`):

- **Pure equation lines** — a line whose entire content tokenizes as math (identifiers, numbers, `[unit]` annotations, operators, subscripts) is passed to the parser as-is. Markdown lines (`#`, `-`, `*`, `>` prefixes) and free text are excluded.
- **Multiple equations per line** — semicolon separation is supported: `A[1,1] = 2; A[1,2] = 1; A[1,3] = -1` yields three independent equations. Semicolons inside `{comments}` and `"strings"` are not separators.
- **Inline equations in prose** — sentences like *"the inlet is at T1 = 100 [C]"* have the equation extracted while the surrounding text is preserved for the formatted report. Matrix subscripts (`A[1,2]`) and ranges (`x[1..3]`) are recognized in this mixed-text path too.
- Each extracted equation is paired 1:1 with its compiled LaTeX form so the formatted report can re-render every equation (block or inline) in its original document position.

### Check-before-Solve (Check/Format behavior)

The frontend offers a **Check** action (`POST /api/check`) that runs before solving is allowed:

1. **Syntax check** — the backend parses the equations; on failure it reports the first syntax error found (solving halts at the first error).
2. **Degrees of freedom** — on success it reports *"No syntax errors were detected. There are X equations and Y variables."* If counts differ it reports *"There are X equations and Y variables. The problem is underspecified/overspecified and cannot be solved."*
3. **Structural independence** — a complete equation↔variable bipartite matching must exist; otherwise the system is reported as structurally singular.

The Solve button is enabled only after a successful Check; any edit to the equations invalidates the check.

### Variable Information & Solver Preferences

- **Variable Information window** — per-variable guess value (default 1.0) and lower/upper bounds (default ±infinity), populated from the Check response. Newton iterates are projected onto the bounds; a solution pinned at a bound that cannot meet the residual tolerance is reported as a *constrained solution*. Guess values and bounds are how a specific root is selected when multiple roots exist.
- **Preferences (Stop Criteria)** — the four stop criteria (no. iterations, relative residuals, change in variables, elapsed time), configurable per solve via a Preferences modal and persisted client-side. frees defaults (250, 1e-12, 1e-15, 3600 s) are tighter than the classic 1e-6/1e-9 because the residual scale floors at 1.0, giving high-precision results without a separate polish pass. The modal also hosts the complex-mode toggle and display unit system.

### Units and Dimensional Consistency (Epic 2)

- **Unit annotations** — numeric constants take units in square brackets (`P = 140 [kPa]`); variable units are set in the Variable Information window (`kJ/kg-K` style: dash/space/star multiply, one `/` per term, `m2` ≡ `m^2`, `-` = explicitly dimensionless, blank = unspecified wildcard).
- **`Convert(From, To)`** — folds to its constant factor at parse time (`Convert(ft^2, in^2)` → 144); mismatched dimensions are a parse error.
- **Check Units** — runs with `/api/check` and automatically after `/api/solve`, verifying dimensional homogeneity across `=`, `+`, `−`, function arguments (transcendental args must be dimensionless, `sqrt` halves dimensions). Inconsistencies are **warnings shown in the Solution Window — they never block solving**.
- **SI-always calculation** — annotated constants are converted to SI base units at parse time (`120 [lb]` → 54.43 with unit `kg`; `96 [kPa]` → 96000 `Pa`), so mixed-unit inputs can never produce numerically meaningless results. Computed variables get **dimensionally derived SI units** (P = m·g/A → `Pa`), propagated across equation chains to a fixpoint; named SI units (N, Pa, J, W) are preferred, otherwise a composed form like `kg/m-s^2`.
- **Affine temperatures** — `ConvertTemp(From, To, x)` handles C/K/F/R with offsets (folded into the AST); bare `[C]`/`[F]` annotations convert affinely to kelvin (`25 [C]` → 298.15 K). Compound expressions like `kJ/kg-C` use the multiplicative delta scale, and the display system never auto-converts temperatures (a 75 K *difference* is not −198 °C) — absolute °C/°F display is opt-in per variable.
- **Display unit systems (Preferences)** — values are always solved in SI and converted for display only (the Mathcad/SMath model): SI base, Engineering SI (kPa/kJ/kW), or US English (psi/Btu/hp/lbf/lbm/ft). A variable explicitly declared in a unit (e.g. `bar`) displays in that unit.

### Find All Solutions

Newton-based solvers normally converge only to the single root nearest the guess values. frees adds an opt-in all-roots mode (`findAllSolutions` on `/api/solve`, "Find all solutions" checkbox in the UI):

1. **1-variable blocks** — the residual is scanned for sign changes across the variable's bounds (±100 when unbounded) and Brent's method runs on each bracket, finding every crossing root; a plain Newton run from the guess is merged in for tangent roots or roots outside the scan window.
2. **N-variable simultaneous blocks** — multi-start Newton from the guess plus deterministic pseudo-random starts inside the bounds (two scales: near-origin and full box), with a strict polish pass and solution deduplication.
3. **Branching across blocks** — every root of block *k* forks a branch for the remaining blocks, so the result is the full combination set of system solutions (capped to avoid combinatorial explosion).

The Solution Window shows one tab per solution; the stats panel reports the solution count. Variable bounds control the search region.

### Matrix & Vector Algebra (Epic 7)

Matrix support follows a compile-to-scalars philosophy: **everything compiles down to scalar equations at parse time** — there is no runtime matrix type. The Newton/Tarjan pipeline is unchanged.

- **Representation** — `v[i]` (vector) and `A[i,j]` (matrix) elements are ordinary array variables; `A[1..3,1..3]` ranges expand to the element set. Array-literal assignment (`b[1..3] = [8, -11, -3]`) and range broadcasting are supported, and literals may reference variables (`V[1..3] = [V_s1, 0, V_s2]`).
- **Function expansion** (`EquationParser.flatten`) — each matrix/vector call site is replaced by its defining scalar equations:
  - `x[1..n] = SolveLinear(A[1..n,1..n], b[1..n])` → the *n* row equations `Σⱼ A[i,j]·x[j] = b[i]` (the linear system is solved by the regular blocked Newton solver, so `A` and `b` entries may themselves be unknowns).
  - `Inverse(A)` → `A·A⁻¹ = I` element equations; `Transpose(A)` → element swaps; `Determinant(A)` → cofactor expansion; `Dot`, `Cross`, `Norm` → their componentwise definitions.
  - `CALL LUDecompose(A : L, U)`, `CALL EulerRotate(phi, theta, psi : R)`, `CALL EulerDecompose(R : phi, theta, psi)` emit the factorization/rotation equations.
  - Matrix statements mix freely with scalar equations — anything written before or after a matrix call participates in the same system (e.g. post-processing equations on `SolveLinear` results).
- **Eigendecomposition** — `CALL Eigenvalues(A : lambda)` and `CALL Eigen(A : lambda, V)` are the one exception to pure equation expansion: each output element is bound to a synthetic `eigen$` call carrying the n² matrix entries as arguments, so the Tarjan blocker orders the decomposition after the entries are solved (entries may be unknowns). At solve time Apache Commons Math `EigenDecomposition` computes the spectrum: eigenvalues ascending, eigenvectors as unit columns of `V` with deterministic sign (largest-magnitude component positive). Real spectra only; complex eigenvalues raise a solver error. Unit semantics: matrix entries may be dimensional (e.g. a dynamic matrix `K/m` in `1/s^2`); eigenvalues inherit the entry dimensions (so `omega = sqrt(lambda)` derives correctly) and eigenvector components are dimensionless.
- **Dense linear algebra (Story 7.4)** — the Newton step solves `J·Δx = r` via Apache Commons Math `LUDecomposition`, falling back to SVD pseudoinverse for rank-deficient Jacobians; the same library backs the eigendecomposition. No separate BLAS/LAPACK native binding is used.
- **UI** — the Arrays window renders 2D matrices as spreadsheet grids; the formatted report renders matrix equations with KaTeX block matrices. The help page documents the syntax and includes worked examples (3×3 linear system, DC circuit mesh analysis via `R·I = V`).

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

### Epic 6: The Diagram Window (Interactive Dashboard & Animations)

*Goal: Build a rich, web-first graphical GUI builder dashboard with physics-driven animations, responsive viewports, and custom control components.*

- **Story 6.1: Vector Diagram Editor (Development Mode).** Develop a vector canvas editor (SVG + HTML Layer) with a grid system, snap-to-grid, and toolbar shapes (Line/Arrow, Rectangle, Circle, Rich Label). Create a Component Library containing pre-built vector icons for standard engineering objects (turbines, pumps, valves, heat exchangers, vessels, spring-dampers).
- **Story 6.2: Variable Binding & Form Controls.** Place drag-and-drop form controls on the canvas: Inputs (Mantine NumberInput that overrides solver guess/enforces fixed values), Outputs (read-only text badges linked to solved variables showing values and units), Dropdowns (bound to string selectors like fluid names), and Checkboxes/Sliders.
- **Story 6.3: Web-First Visual Animations.** Link SVG object attributes (X/Y coordinates, rotation angle, width/height, opacity) to calculated solver variables. Implement pipeline path-flow animations using keyframed SVG dashes (`stroke-dashoffset`) where flow velocity is driven by variables. Add node tooltips showing thermodynamic states on hover.
- **Story 6.4: Playback Controls & Embedded Widgets.** Add an animation playback control bar to step, play, pause, and loop through Parametric Table runs, animating the diagram dynamically. Support embedding live resizable chart widgets (Plotly.js diagrams) inside the canvas. Integrate responsive zoom-to-fit viewport layouts.
- **Milestone 6:** *Working software with a fully interactive cycle schematic or dynamics animation (e.g. spring-damper/piston mechanism) whose visual variables, speeds, and states animate in sync with numerical solvers.*

### Epic 7: Matrix & Vector Algebra System

*Goal: Implement comprehensive matrix and vector operations, linear algebra solvers, high-performance BLAS integration, and 2D grid/LaTeX formatting.*

- **Story 7.1: Matrix & Vector Parsing & Representation.** Extend the ANTLR grammar to support 1-dimensional vector variables (e.g., `v[1] = 3`) and 2-dimensional matrix variables (e.g., `A[1,1] = 5`, `A[2,2] = x`), mapping them to vector and 2D matrix representations in the backend solver.
- **Story 7.2: Gauss Elimination & LU Decomposition.** Implement core solvers for linear systems of equations (`A * x = b`) using Gauss elimination and LU decomposition (lower/upper triangular factorizations).
- **Story 7.3: Matrix & Vector Algebra Functions.** Add advanced matrix and vector functions to the parser: Dot Product (`Dot(u,v)`), Cross Product (`Cross(u,v)`), Vector Norm/Magnitude (`Norm(v)`), Inverse (`Inverse(A)`), Transpose (`Transpose(A)`), Determinant (`Determinant(A)`), Eigenvalues/Eigenvectors, and Euler decomposition/rotations.
- **Story 7.4: High-Performance BLAS/LAPACK Solver.** Integrate a high-performance linear algebra library (such as LAPACK/BLAS wrappers using EJML or Apache Commons Math) for solving dense, sparse, and large-scale linear systems.
- **Story 7.5: Matrix Formatting & UI Representation.** Extend the frontend Arrays/Solution windows to render 2D matrices in a spreadsheet-like grid, and format equations using KaTeX block matrices (e.g., `\begin{pmatrix} ... \end{pmatrix}`).
- **Story 7.6: Matrix Help Menu.** Update the help page with matrix syntax, operation guides, and practical examples (e.g., solving structural/state-space linear systems).
- **Milestone 7:** *Working software capable of declaring a 3x3 matrix and vectors, computing their inverse, dot/cross products, resolving a linear system of equations, and displaying the matrix/vector results in the UI.*

### Epic 8: Graph Digitizer & Curve Functions

*Goal: Turn published empirical charts (book scans, web images) into solver-callable functions. A user uploads a graph image — e.g. overall heat-transfer coefficient `U [W/m^2-K]` vs Reynolds number `Re [-]` — digitizes its curves, stores them as a Curve Table, and then writes `U = graphfunc(Re)` (or `U = graphfunc(Re, T)` for a family of curves at different temperatures) directly in the Equation Window; the solver evaluates the function by interpolating the table.*

*Design inputs — survey of existing digitizers (starry-digitizer, PlotDigitizer, WebPlotDigitizer/VectorByte review):*
- *Calibration by two points per axis (X1/X2, Y1/Y2) with typed values and per-axis linear/log scale is the de-facto standard; supporting tilted/rotated scans (full 4-point affine mapping) is a differentiator.*
- *A magnifier/zoom panel is the single biggest precision feature (the VectorByte review ranks tools almost entirely by it).*
- *Auto-extraction is color-based flood-fill clustering: a "symbol" mode (centroids of marker-sized blobs, diameter-filtered) and a "line" mode (column-scan averaging of matched pixels); both need a color picker sampling the image, a match threshold, and a paintable/box mask to exclude gridlines, labels, and other curves.*
- *The most-cited gap in every existing tool is handling several curves on one plot as separate datasets — which is exactly the curve-family requirement here, so multiple named datasets with a per-dataset parameter value are first-class from the start.*
- *Math-expression input for calibration values (`2*10^4`, `1/4`, `pi`) and point-count/step control for curve resampling are the most-loved PlotDigitizer extras.*

- **Story 8.1: Digitizer Window — image input & viewport.** Add a "Digitizer" view to the icon rail. Load a graph image by file upload, drag-and-drop, or clipboard paste (book scans are usually screenshots); render it on a pannable, zoomable canvas with a crosshair cursor and an always-on magnifier panel (configurable magnification) that tracks the pointer.
- **Story 8.2: Axis calibration.** Click-to-place X1, X2, Y1, Y2 calibration markers, each with a typed value (math expressions allowed); per-axis linear/log10 toggle; axis names and units (`Re [-]`, `U [W/m^2-K]`). Pixel→value mapping supports tilted scans by solving the X/Y axis lines as a general affine system (port of the starry-digitizer axis calculator, validated against its tests). A live coordinate readout shows the value under the cursor once calibrated.
- **Story 8.3: Manual point extraction & datasets.** Multiple named datasets (one per curve), each with a color and an optional parameter value (e.g. `T = 100`). Click to add a point, drag to adjust, delete points or whole datasets; the point list shows calibrated values, sortable by X; keyboard nudging moves the selected point one pixel.
- **Story 8.4: Automatic extraction.** Color-based extraction into the active dataset: pick the target color from the image, set a match threshold, choose Line trace (column-scan cluster averaging) or Symbol detect (blob centroids with min/max diameter), and optionally restrict to a drawn box mask. Auto-extracted points are resampled to a configurable count/X-step and remain individually editable afterwards.
- **Story 8.5: Export & persistence.** Export any dataset (or all) as CSV/JSON with axis metadata; digitizer state (image, calibration, datasets) persists in the project save/localStorage so a session can be resumed.
- **Story 8.6: Tables window.** Rename "Parametric Table" to **Tables**: a manager pane (like the Plots window) where tables are added, named, and deleted. Two table kinds: **Parametric Table** (the existing run table, now multi-instance) and **Curve Table**.
- **Story 8.7: Curve Tables.** A Curve Table holds a named function: the **table name is the function name** and the **column names are its arguments** — the first column is the lookup argument (e.g. `Re`) and every further column is one curve whose header carries the family parameter value (e.g. `T = 100`, `200`, …). Filled by "Send to Curve Table" from the Digitizer or edited manually, with sort-by-X and a **Fill missing** action that interpolates blank cells from each curve's known points (log-aware) — needed because digitized curves rarely share the same x samples.
- **Story 8.8: Backend curve functions.** Solve/Check requests carry the project's curve tables. A curve-table name becomes a callable function in equations — `U = graphfunc(Re)` for a single curve, `U = graphfunc(Re, T)` for a family: 1-D evaluation uses monotone piecewise-cubic (PCHIP) interpolation with linear fallback, computed in log space for log axes; 2-D evaluation interpolates along the two bracketing curves first, then linearly across their parameter values. Out-of-range arguments clamp to the table edge and raise a unit-style warning (never blocking the solve, consistent with unit checking). Functions participate in Newton residuals like any other intrinsic.
- **Story 8.9: End-to-end verification & docs.** Worked example on the Help page: digitize a `U`–`Re` chart with curves at several temperatures, send to a Curve Table, then solve a heat-transfer balance that calls `graphfunc(Re, T)` inside an equation system. Backend tests cover 1-D/2-D interpolation, log-axis evaluation, clamping warnings, and blocking/Tarjan integration of curve-function calls.
- **Milestone 8:** *Working software where a user uploads a heat-transfer chart image, digitizes four temperature curves, and solves an equation system whose unknown `Re` is determined through `U = graphfunc(Re, T)` — without ever typing the curve data.*

### Epic 9: Advanced Math, Computations, Plotting & Optimizations

*Goal: Implement low-level bitwise operations, CS base-conversions/number theory, special functions, advanced multidimensional/least-squares optimizers, and extensive visualization extensions in the Plot Window (Bar, Pie, Histograms, Scatter, and 3D surface charts).*

- **Story 9.1: Bitwise & Logic Operations.** Extend the ANTLR grammar to support double-to-long bitwise functions: AND (`BitAnd`), OR (`BitOr`), XOR (`BitXor`), NOT (`BitNot`), and bitwise shifts (`BitShiftL`, `BitShiftR`).
- **Story 9.2: Computer Science & Base Conversions.** Add floating-point modulo (`Mod`), Greatest Common Divisor (`Gcd`), and Least Common Multiple (`Lcm`) number-theory functions. Implement base string conversions (`BaseConvert`) supporting conversions between bases 2 to 36.
- **Story 9.3: Special Mathematical Functions.** Support special functions with analytical derivative bounds integrated into Jacobian calculations: Error Functions (`Erf`, `Erfc`, `ErfInv`), Gamma functions (`Gamma`, `LogGamma`), Beta function (`Beta`), and Bessel functions (`BesselJ`, `BesselI`).
- **Story 9.4: Multi-Dimensional Optimizers.** Integrate advanced multi-variable optimizers from Apache Commons Math: Nelder-Mead (Simplex) for non-differentiable systems, BOBYQA for bound-constrained non-derivative search, and Levenberg-Marquardt for least-squares parameter fitting (matching model equations to experimental data).
- **Story 9.5: Advanced Visualizations (Plot Window Extensions).** Extend the Plot Window to support diverse plot types beyond X-Y curves using Plotly.js: Bar Charts, Pie Charts, Histograms, Scatter plots (with bubble sizing), and 3D Surface plots. Add user customization options for chart layouts (dual-Y axes, coordinate bounds, gridline formatting, and legend alignments).
- **Story 9.6: Analytical Jacobians for Special Functions.** Integrate analytical derivatives for special functions (`Erf`, `Gamma`, etc.) into the symbolic Jacobian differentiator in the solver backend.
- **Story 9.7: Levenberg-Marquardt Least-Squares Fitter.** Implement backend curve fitting utilizing the Levenberg-Marquardt optimizer and build a corresponding "Curve Fitter" dialog in the UI.
- **Story 9.8: Barrier & Augmented Lagrangian Optimization.** Implement barrier and penalty multiplier methods in the `Optimizer` to manage constraints robustly.
- **Story 9.9: Parser String Literals.** Refactor the ANTLR grammar `Equation.g4` to support string constants in single/double quotes, facilitating variables and function arguments for base conversion (`BaseConvert`).
- **Milestone 9:** *Working software capable of solving transient heat-conduction models, executing bitwise logic calculations, fitting model curves to experimental datasets via least-squares, using string variables in expressions, and visualizing solver data using 3D surface graphs and multi-series bar charts.*
