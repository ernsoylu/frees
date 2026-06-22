[Topic: started]
# Introduction & Solver Philosophy

Welcome to **frees** — a declarative equation-solving environment for engineering problems: thermodynamics, fluid mechanics, heat transfer, control systems, structural analysis, and multi-domain simulation.

## The declarative difference
In a traditional language you write *assignments* (`x = y + 2` to compute `x`). frees is **declarative**: you write equations exactly as they appear in a textbook, and the compiler figures out what is unknown and in what order to solve it. Equation order does not matter, and any variable on either side can be the unknown:

```
P * V = m * R * T      { solve for m, or for V, or for T — all valid }
```

A few consequences worth knowing up front:
- A single `=` means **mathematical equality**, never assignment. There is no `==`.
- Names are case-insensitive (`Temp`, `TEMP`, `temp` are one variable).
- Implicit multiplication is **not** allowed — write `2 * x`, not `2x`.
- Everything is computed in SI base units internally; you annotate inputs with `[unit]` (see *Units & Consistency*).

[Diagram: SolverPipeline]

## Your first solve
Type this into the editor and press **F2** (Solve). The tank's mass is the unknown, recovered from the implicit ideal-gas equation:

```
{ Mass of air in a rigid tank }
P = 500 [kPa]
Vol = 0.05 [m^3]
T = 25 [C]
R = 0.287 [kJ/kg-K]
P * Vol = m * R * T      { frees solves this for m }
```

Swap one line — `T = 25 [C]` becomes `m = 0.3 [kg]` — and the *same* equation now solves for temperature instead. That is the whole point: you describe the physics, frees decides the calculation order.

## The frees workflow
1. **Describe** the system — algebraic, matrix, or differential equations, in any order.
2. **Check (F4)** — validates syntax and the degrees of freedom (DoF). For nonlinear systems, open the **Variable Info** panel (`Ctrl + I`) and set a guess and physical bounds (e.g. `T ≥ 0`). A good guess is often the difference between convergence and divergence.
3. **Solve (F2)** — runs the Newton-Raphson solver. Results appear in the Solution panel with units and uncertainties.
4. **Sweep** — build a **Parametric Table** (`Ctrl + T`) to vary an input across runs and plot the response.

> **Tip:** If the solver fails to converge, the cause is almost always a missing guess or a wrong unit annotation, not a bug. Check the Solution panel's diagnostics and the Variable Info guesses first.

[Topic: repl]
# REPL Terminal & Workspace

The **REPL terminal** is a dockable, interactive console — move and dock it anywhere like the editor. It evaluates **one line at a time** against the current **workspace** (every variable from the last solve, plus anything you define in the REPL). It's a line-oriented math REPL, not a shell: use it as a unit-aware calculator, to inspect solved values, to try `CALL` routines, and to run symbolic CAS transforms. **Up/Down** recall history; **Tab** completes variable, function, and command names.

## Meta-commands
These drive the app instead of evaluating an expression:

| Command | Action |
| --- | --- |
| `help` | show in-terminal usage |
| `clc` | clear the screen |
| `clear` | drop **all** REPL-defined overrides |
| `clear <var>` | drop one REPL variable overlay (e.g. `clear x`) |
| `vars` / `who` / `whos` | list workspace variables with values and units |
| `check` | run the document Check (DoF / solvability) |
| `solve` | solve the document with any active REPL overrides |

## Expressions
Type any expression; a bare result is stored in `ans` and is reusable on the next line. Every built-in math function works (trig, `exp`/`ln`/`sqrt`, `erf`/`gamma`, Bessel, `mod`/`gcd`, complex `real`/`imag`/`angle`, …), as do fluid-property and chemistry functions.
```
2 * sqrt(9) + 4                    { = 10 }
Enthalpy('Water', t=400, p=1e5)    { J/kg }
```

## Variables: query, assign, solve
- **Query** a workspace value (shown with units and uncertainty): `T_1` → `300 [K]`.
- **Assign** a REPL variable (persists for the session, visible to later lines and a subsequent `solve`): `x = 42 [m/s]`.
- **Implicit single-unknown solve** — give an equation with exactly one unknown and frees solves it: `P = 50000 * volume` → `volume = 5 [m^3]`.

## Matrices, vectors, ranges
```
A = [2 0; 0 3]          { = [2 0; 0 3] }
[1:2:7]                 { = [1 3 5 7] }
A * A                   { matrix product -> ans[i,j] }
Inverse(A)   Transpose(A)   Dot(u, v)
```

## The CALL library (auto-sized outputs)
The full `CALL` procedure library (eigenvalues, control-systems analysis, partial fractions, decompositions) runs in the REPL. **Output lengths are sized automatically from the inputs**, so bare output names work — no `[1:n]` annotation:
```
CALL Eigenvalues(A : lambda)            { lambda = [2 3] }
CALL Routh(den : nRHP, stable)
CALL residue(num, den : rr, ri, pr, pi, k)
CALL Bode(num, den, omega : mag, phase)
```
Only genuinely value-dependent counts take an explicit size: the finite-zero counts of `zero`/`tf2zp` (e.g. `zr[1:2]`), and the root-locus sweep resolution of `rlocus` (defaults to 100 points). This auto-sizing applies in the editor document too.

## Symbolic CAS (REPL only)
The REPL exposes the embedded **Symja** computer-algebra engine as functions that return a transformed expression as text. Free variables stay symbolic, so no solved context is needed:

| Function | Example → result |
| --- | --- |
| `Factor(expr)` | `Factor(x^2 - 1)` → `(-1+x)*(1+x)` |
| `Expand(expr)` | `Expand((x+1)^3)` → `1+3*x+3*x^2+x^3` |
| `Simplify(expr)` | algebraic simplification |
| `Together(expr)` / `Cancel(expr)` | common denominator / cancel common factors |
| `Numerator(expr)` / `Denominator(expr)` | split a rational expression |
| `Collect(expr, var)` | group by powers of a variable |
| `Diff(expr, var)` | `Diff(x^3 + x^2, x)` → `2*x+3*x^2` |
| `Integrate(expr, var)` | `Integrate(x^2, x)` → `x^3/3` |
| `Apart(expr, var)` | `Apart((s+3)/(s^2+3*s+2), s)` → `2/(1+s)-1/(2+s)` |
| `Laplace(f, t, s)` | Laplace transform |
| `InverseLaplace(F, s, t)` | `InverseLaplace(1/(s+2), s, t)` → `E^(-2*t)` |

When the CAS can't find a closed form, the REPL reports *"no closed form found"* rather than echoing the call. These symbolic functions are **REPL-only**; in the editor, symbolic work uses `SYMBOLIC` identities and `CALL residue` (see *Control Systems & Symbolic CAS*).

## What the REPL does not do
The REPL evaluates a single expression per line, so multi-line block constructs are editor-only: `FUNCTION`/`PROCEDURE`/`MODULE` definitions, `DYNAMIC` ODE systems, `TABLE` blocks, `IF`/`FOR` control flow, and the `SYMBOLIC`/`SOLVE BLOCK` directives. You can *call* a function or read `ODEValue`/`Interpolate`/table accessors that a prior solve produced — you just can't *define* the block from the REPL.

[Topic: shortcuts]
# Keyboard Shortcuts

| Hotkey | Action |
| --- | --- |
| `F2` or `Ctrl + Enter` | **Solve** — runs the Newton-Raphson solver |
| `F4` or `Ctrl + K` | **Check** — validates syntax, degrees of freedom, and expands blocks |
| `Ctrl + I` | Open the **Variable Information** panel (guesses & bounds) |
| `Ctrl + T` | Open the **Parametric Table** panel |
| `F9` | **Solve selected block only** — ignores all other lines |

> **Tip:** make `F4` (Check) a habit before `F2` (Solve). It reports the DoF and any unit mismatches instantly, so you fix problems before the solver runs. For parametric-table examples, use **Solve Table** in the Tables tab instead of `F2`.

[Topic: reports]
# Markdown & Reports

Combine narrative with live solver equations to build automated engineering reports. After solving, open the **Formatted** tab to read the rendered document with solved values and embedded plots inline.

## Mixing narrative and equations
- A line starting with `//`, or any text inside `{ }`, is a comment. `//` at the start of a line is also treated as markdown narrative.
- Markdown headings (`#`, `##`), bold (`**`), italics (`*`), and inline code (`` ` ``) are all supported.
- Embed a solved value inline with `[varName]`, or with units as `[varName [units]]`.

## Embedding plots inline
A `PLOT ... END` block (see *Plots in Code*) produces a named figure. Reference it anywhere in your narrative with a graph tag and it renders as a live chart in the Formatted view:

```
[Graph="Boiler Cycle"] Temperature–entropy diagram of the power cycle [/Graph]
```

## Example report
```
// # Boiler Analysis
// The boiler runs at P_high = **[P_high [kPa]]**.
// At a firing temperature of [T_boiler [C]] the thermal
// efficiency is **[eta_th] %**.
//
// [Graph="Rankine T-s"] Cycle on a T-s diagram [/Graph]

P_high = 8000 [kPa]
T_boiler = 500 [C]
eta_th = 36.9
```
Press Solve (F2), then switch to the **Formatted** tab to see the values and the chart woven into the prose.

[Topic: digitizer-fit]
# Graph Digitizer & Curve Fit

Two integrated tools turn data — measured or read off a chart — into usable equations: the **Graph Digitizer** extracts (x, y) points from an image, and the **Curve Fit Engine** fits a model to a table and writes the equation for you.

## Digitizer workflow
1. **Open** the Graph Digitizer icon in the left toolbar and upload an image of your chart.
2. **Calibrate** — mark two known points on the X-axis and two on the Y-axis to set the coordinate system.
3. **Digitize** — click points along the curve; their coordinates are computed and added to a table.
4. **Export** to an internal table (e.g. `digitized_curve`).

## Curve fit workflow
5. Open the **Curve Fit** panel, select your table, choose a model template (Linear, Polynomial, Exponential, …), and fit.
6. Copy the generated equation into the editor. The fit is returned as a plain frees expression you can paste straight in:

```
{ Fit of pump head vs flow, from a digitized catalog curve }
flow_rate = 1.25 [m^3/s]
head_loss [m] = -0.084 * flow_rate^2 + 1.54 * flow_rate + 0.12 [m]
```

> **Tip:** you can also define the data inline with a `TABLE` block (see *Custom Tables*) and fit against that — handy for reproducing a textbook table without an image. The statistics example in the Examples Library shows exactly this route.
