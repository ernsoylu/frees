[Topic: started]
# Introduction & Solver Philosophy

Welcome to the **frees** (free solver) documentation. frees is a next-generation, declarative equation-solving environment designed for engineering problems, thermodynamics, multi-domain simulation, and control-systems design (LTI modeling, frequency/time analysis, and LQR/pole-placement/PID synthesis — see *Control Systems & Symbolic CAS*).

## The Declarative Difference
Unlike traditional programming languages (like Python, MATLAB scripts, or C++), where you must explicitly write equations in assignment form (e.g., `x = y + 2` to calculate `x`), frees is **declarative**. You write equations exactly as they appear in engineering textbooks:

```
P * V = m * R * T
```

The compiler parses your equations, determines which variables are unknown, resolves the dependencies, and solves the system simultaneously. The order of equations does not matter.

[Diagram: SolverPipeline]

## The frees Engineering Workflow
1. **Describe System:** Write the governing algebraic, matrix, or differential equations in the editor.
2. **Compile & Bound (F4):** Validate the degrees of freedom (DoF). Set initial guesses and physical bounds (e.g., preventing negative temperature or pressure) in the **Variable Info** panel.
3. **Solve & Sweep (F2):** Run the solver. Construct a **Parametric Table** to sweep variables and view the results on dynamic plots.

[Topic: repl]
# REPL Terminal & Workspace

The **REPL terminal** is a dockable, interactive console window — movable and dockable anywhere like the Editor or Variable Explorer — that evaluates one line at a time against the current **workspace** (every variable from the last solve, plus anything you define in the REPL itself). It is a line-oriented math REPL (not a shell): use it as a unit-aware calculator, to inspect solved values, to try `CALL` routines, and to run symbolic CAS transforms. Up/Down recall history; **Tab** completes variable, function, and command names.

## Meta-commands

These drive the app instead of evaluating an expression:

| Command | Action |
| --- | --- |
| `help` | Show in-terminal usage |
| `clc` | Clear the screen |
| `clear` | Drop **all** REPL-defined overrides |
| `clear <var>` | Drop one REPL variable overlay (e.g. `clear x`) |
| `vars` / `who` / `whos` | List workspace variables with values and units |
| `check` | Run the document Check (degrees-of-freedom / solvability) |
| `solve` | Solve the document with any active REPL overrides |

## Evaluating expressions

Type any expression; a bare result is stored in `ans` and is reusable on the next line. Every built-in math function works (trig, `exp`/`ln`/`sqrt`, `erf`/`gamma`, Bessel, `mod`/`gcd`, complex `real`/`imag`/`angle`, …), as do fluid-property and chemistry functions.

```
2 * sqrt(9) + 4          = 10
Enthalpy('Water', t=400, p=1e5)
```

## Variables: query, assign, solve

- **Query** a workspace value (shown with units and uncertainty): `T_1` → `300 [K]`.
- **Assign** a REPL variable (persists for the session, visible to later lines and to a subsequent `solve`): `x = 42 [m/s]`.
- **Implicit single-unknown solve** — give an equation with exactly one unknown and frees solves it: `P = 50000 * volume` → `volume = 5 [m^3]`.

## Matrices, vectors and ranges

```
A = [2 0; 0 3]          = [2 0; 0 3]
[1:2:7]                  = [1 3 5 7]
A * A                    (matrix product → ans[i,j])
Inverse(A)   Transpose(A)   Dot(u, v)
```

## The CALL library — with auto-sized outputs

The full `CALL` procedure library (eigenvalues, control-systems analysis, partial fractions, decompositions) runs directly in the REPL. **Output lengths are sized automatically from the inputs**, so you can write bare output names — no `[1:n]` annotation needed:

```
CALL Eigenvalues(A : lambda)            lambda = [2 3]
CALL Routh(den : nRHP, stable)
CALL residue(num, den : rr, ri, pr, pi, k)
CALL Bode(num, den, omega : mag, phase)
```

Only genuinely value-dependent counts still take an explicit size: the finite-zero counts of `Zero`/`tf2zp` (e.g. `zr[1:2]`), and the root-locus sweep resolution of `Rlocus` (defaults to 100 points). This auto-sizing applies in the editor document too.

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

When the CAS cannot find a closed form, the REPL reports *"no closed form found"* rather than echoing the call back. These symbolic functions are **REPL-only**; in the editor, symbolic work is done with `SYMBOLIC` identities and `CALL residue` (see *Control Systems & Symbolic CAS*).

## What the REPL does not do

The REPL evaluates a single expression per line, so multi-line block constructs are editor-only: `FUNCTION`/`PROCEDURE`/`MODULE` definitions, `DYNAMIC` ODE systems, `TABLE` blocks, `IF`/`FOR` control flow, and the `SYMBOLIC`/`SOLVE BLOCK` directives. You can *call* a function or read `OdeValue`/`Interpolate`/table accessors that a prior solve produced, you just can't *define* the block from the REPL.

[Topic: shortcuts]
# Keyboard Shortcuts

Use these hotkeys within the editor to accelerate your workflow:

| Hotkey | Action |
| --- | --- |
| `F2` or `Ctrl + Enter` | Solve System (runs the Newton-Raphson solver) |
| `F4` or `Ctrl + K` | Check Syntax (verifies syntax, degrees of freedom, and expands blocks) |
| `Ctrl + I` | Open the **Variable Information** panel |
| `Ctrl + T` | Open the **Parametric Table** panel |
| `F9` | Solve selected block only (ignores all other lines) |

[Topic: reports]
# Markdown & Reports

frees allows you to combine markdown narrative with active solver equations to build automated engineering reports.

## Markdown Syntax in the Editor
- Lines beginning with `//` or comments inside curly braces `{}` are parsed as normal narrative text.
- Standard markdown headings (`# Header`, `## Subheading`), bold (`**text**`), italics (`*text*`), and inline code (`` `code` ``) are supported.
- You can embed live solved variables directly into your narrative using brackets:
  - `[varName]` displays the solved numerical value.
  - `[varName [units]]` displays the solved numerical value formatted with units.

### Example Report Template
```
// # Thermodynamic Boiler Analysis
// The boiler operating pressure is P_high = 8000 [kPa].
// The computed thermal efficiency is [eta_th] %.
```

[Topic: digitizer-fit]
# Graph Digitizer & Curve Fit

frees includes an integrated **Graph Digitizer** and a **Curve Fit Engine** to help you model experimental data or scan charts straight from textbooks.

## Step-by-Step Workflow
1. **Open the Digitizer:** Click the Graph Digitizer icon in the left toolbar and upload an image of your chart.
2. **Calibrate Axes:** Mark two known points on the X-axis and two on the Y-axis to calibrate the coordinate system.
3. **Digitize Points:** Click points along the curve. The coordinates are calculated and added to a table.
4. **Export to Table:** Save the points to an internal table (e.g., `digitized_curve`).
5. **Fit the Curve:** Open the **Curve Fit** panel, select your table, choose a model template (e.g., Linear, Polynomial, Exponential), and perform the fit.
6. **Use in Editor:** Copy the generated equation and paste it directly into your code.

### Example Usage
```
flow_rate = 1.25 [m^3/s]
head_loss [m] = -0.084 * flow_rate^2 + 1.54 * flow_rate + 0.12 [m]
```
