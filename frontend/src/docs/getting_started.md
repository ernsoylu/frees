[Topic: started]
# Introduction & Solver Philosophy

Welcome to the **frees** (free solver) documentation. frees is a next-generation, declarative equation-solving environment designed for engineering problems, thermodynamics, and multi-domain simulation.

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
