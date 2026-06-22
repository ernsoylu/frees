[Topic: calculus]
# Numerical Integration (ODEs & Calculus)

`Integral(expr, var, lower, upper)` integrates `expr` with respect to `var` from `lower` to `upper`. Use it both for plain definite integrals and — via the self-reference trick below — for scalar first-order ODEs.

## Definite integration
```
{ Integrates 3*x^2 from 0 to 1 -> 1.0 }
area = Integral(3 * x^2, x, 0, 1)
```

## The ODE feedback pattern (scalar, first-order)
When `expr` contains the result variable itself, frees detects the self-reference and integrates the corresponding initial-value ODE **starting from 0 at the lower limit**. Because the integral always starts at 0, you integrate the *change* and rebuild the quantity of interest:

```
{ Tank draining: dV/dt = -C*sqrt(V), V(0) = V0 }
V0 = 1.0
C = 0.02
{ integrate the DROP from 0..60 s, then rebuild V }
drop = Integral(-C * sqrt(V0 - drop), t, 0, 60)
V   = V0 - drop          { water volume at t = 60 s }
```

> **When to use this vs. `DYNAMIC`:** `Integral()` handles a single first-order ODE. For coupled, multi-state, stiff, or event-driven systems, use the `DYNAMIC` block on the next page instead.

[Topic: dynamic-ode]
# Transient / ODE Systems (DYNAMIC)

The `DYNAMIC ... END` block integrates coupled, multi-state ODE systems. A variable becomes a **state** the moment `der(X)` appears; each state needs one derivative equation and one initial condition. Algebraic auxiliaries (any equation without a `der`) are recomputed every step and become extra columns you can plot.

```
DYNAMIC name (method = solver, t = t0 .. tf, points = n_samples)
  der(state) = rate_equation
  state(0)   = initial_value
  auxiliary  = algebraic_calc      { an extra output column }
  EVENT name: condition -> stop | record
END
```

[Diagram: GuessConvergence]

## Choosing a solver
| Need | Method | Notes |
| --- | --- | --- |
| General, non-stiff | `ode45` (default) | Dormand–Prince 5(4) adaptive. Start here. |
| Mildly stiff / cheaper | `ode23` | Bogacki–Shampine 3(2) adaptive. |
| Fixed-step teaching | `ode1`–`ode5` | Euler, Heun, RK3, RK4, Dormand–Prince. Use many points. |
| Stiff | `ode23s` / `ode15s` | Implicit Rosenbrock / BDF. Use when `ode45` needs tiny steps or stalls. |

Stiffness shows up when rates differ by orders of magnitude (e.g. fast chemistry alongside slow dynamics). If `ode45` runs slowly or the trajectory looks jagged, switch to `ode15s`.

## Trajectory accessors
Query columns of the compiled ODE Table from your analytic equations:
- **`FinalValue('col')`** — last value of column `col`.
- **`MaxValue('col')` / `MinValue('col')`** — peak / minimum.
- **`TimeAt('col', val)`** — time when `col` crosses `val`.
- **`ODEValue('col', t)`** — value interpolated at time `t`.

These let an ODE result feed back into the analytic solve — e.g. close a sizing loop with `MaxValue('h') = h_target`.

## Coupled two-state example
```
m = 1.0; k = 20.0; c = 0.5
DYNAMIC mass_spring (method = ode45, t = 0 .. 20, points = 400)
  der(x) = v
  der(v) = -(c/m) * v - (k/m) * x
  energy = 0.5*m*v^2 + 0.5*k*x^2      { auxiliary column, decays }
  x(0) = 1.0
  v(0) = 0.0
END

final_displacement = FinalValue('x')   { read back into the analytic solve }
```

> **Name clash tip:** the time variable and a state named `T` are case-insensitively the same. Name the block's time axis `time` (or rename the state) to avoid the collision.

[Topic: optimization]
# Optimization & Parametric Sweeps

## Parametric sweeps
A `PARAMETRIC` block drives one or more variables across a range. Variables listed in the header with a range are **driven** (overridden each run); the rest are **computed** outputs. Open the **Tables** tab and click **Solve Table** (not the main Solve) to fill it in.

```
PARAMETRIC sweep_name(var1, var2, ...)
  var1 = start : step : end | Linear
END
```

### Sweep example
```
v0 = 50
g = 9.81
range_m = v0^2 * sin(2 * theta_deg * pi# / 180) / g

PARAMETRIC trajectory(theta_deg, range_m)
  theta_deg = 15 : 5 : 75 | Linear
END
```
Use the `| Log` suffix instead of `| Linear` for logarithmic spacing (handy for Bode frequency sweeps). Whole-table aggregates like `TableAvg('range_m')` or `IntegralValue('P','t')` are computed once and are identical in every row.

## Single-objective optimization
**Tools → Minimize / Maximize** (or the sidebar optimization panel) finds the value of one decision variable that minimizes or maximizes an objective, subject to your equation system. Set bounds on the decision variable in Variable Info (`Ctrl + I`) to keep the search in a physical region.

## Multi-objective optimization (Pareto front)
When objectives conflict (minimise mass *and* maximise efficiency, say) there is no single optimum — only a **Pareto front** of non-dominated trade-offs. frees traces it with **NSGA-II**: supply two or more objectives (each flagged minimise or maximise) plus the decision variables and their bounds. Each candidate solves the equation system with the decisions fixed; the result is a list of `(decisions, objectives)` points where no objective improves without worsening another. Plot one objective against the other to see the trade-off curve.

[Topic: api]
# Solver Reference & API

Knowing the execution pipeline helps you read convergence diagnostics and diagnose singular systems.

## Compilation & execution pipeline
1. **Lex/parse (ANTLR4)** — tokenizes variables, symbols, constants, and `[unit]` annotations.
2. **AST construction** — inlines functions/modules, expands array indices and matrix slices, and converts every unit to its SI base value.
3. **Dependency analysis (Tarjan SCC)** — builds the variable↔equation graph and groups coupled variables into minimal strongly-connected blocks.
4. **Newton–Raphson solve** — solves each block in topological order using finite-difference Jacobians and backtracking line search. Guesses (Variable Info) seed the iteration; bounds keep it physical.
5. **DYNAMIC pass** — integrates ODE blocks using the solved analytic variables as parameters. Accessor values feed back and the system re-solves until it converges globally.

## Reading convergence output
- **"Singular Jacobian"** — two equations are effectively dependent, or a guess landed on a flat region. Check for duplicate/redundant equations and adjust guesses.
- **"Max iterations"** — the solver didn't converge. Almost always a guess or bound problem; try a guess closer to the expected magnitude.
- **DoF ≠ 0** — too few or too many equations. F4 (Check) reports the imbalance before you solve.
