[Topic: lang-overview]
The frees language is small and declarative: equations are constraints, names are case-insensitive, and everything is computed in SI. These pages cover the grammar and the everyday building blocks — variables and the guesses that make nonlinear solves converge, units, arrays, complex numbers, strings, uncertainty, and the differentiable math functions. Start with *Equation Syntax & Rules* if you are new; the function pages list the most-used calls and link to the per-symbol Reference for full signatures.

[Topic: matrix-overview]
frees uses an array-language-style syntax for matrices and vectors. Declare a shape with a slice suffix, then add, multiply, transpose, or solve linear systems with the standard operators. For heavy numerics there are low-level OpenBLAS primitives and higher-level decompositions (LU, eigenvalues). Transfer-function coefficient arrays for control work are just vectors — see *Modeling & Solving*.

[Topic: prog-overview]
When a model repeats or grows, factor it out. `FUNCTION` and `PROCEDURE` blocks add reusable, imperative-bodied routines; `MODULE` encapsulates a whole equation subsystem you can instantiate many times. `TABLE` blocks hold tabulated data callable like a function, and the lookup/interpolation and parametric-table accessors read that data back into a solve.

[Topic: fluids-overview]
frees ships high-precision property data so you never hand-look-up a state. CoolProp covers real fluids (water, refrigerants, ammonia, …); ideal-gas species use NASA polynomials; `AirH2O` handles humid air from three coordinates; and a built-in database carries bulk properties for common solids. Every property function returns SI base units. Group a circuit's state points with a `STATE TABLE` to isolate fluids and overlay cycles on property charts.

[Topic: modeling-overview]
Beyond algebra, frees integrates differential systems, designs and analyzes control systems, runs optimization and parametric sweeps, and draws schematics and plots. A single `DYNAMIC` block integrates coupled, stiff, event-driven ODEs; the control suite covers transfer functions, state space, frequency response, and pole placement; and `PLOT` blocks declare figures in code. The last page explains the solver pipeline so you can read convergence diagnostics.

[Topic: tools-overview]
These are the tools around the editor that make modeling faster: a dockable **REPL** console that evaluates expressions against the last solved session (with the full `CALL` library and symbolic CAS), the **keyboard shortcuts** for Solve/Check, the **Markdown report** system that weaves live values and plots into a formatted document, and the **Graph Digitizer & Curve Fit** tools that turn a chart image or a table into a fitted equation.
