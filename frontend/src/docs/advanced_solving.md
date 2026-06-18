[Topic: calculus]
# Numerical Integration (ODEs & Calculus)

frees supports numerical integration of scalar equations using adaptive Runge-Kutta solvers.

## The Integral() Function
`Integral(expr, var, lower, upper)` integrates `expr` with respect to `var` from `lower` to `upper`.

### Definite Integration
```
{ Integrates 3 * x^2 from 0 to 1 -> returns 1.0 }
area = Integral(3 * x^2, x, 0, 1)
```

### The ODE Feedback Pattern
When `expr` contains the result variable itself, frees detects the self-reference and solves the corresponding initial-value ordinary differential equation (ODE) starting from `0` at the lower limit:
```
{ Tank draining: dV/dt = -C * sqrt(V), V(0) = V0 }
V0 = 1.0
C = 0.02
V_t = Integral(-C * sqrt(V_t), t, 0, 60)   { V at t = 60 s }
```

[Topic: dynamic-ode]
# Transient / ODE Systems (DYNAMIC)

For coupled, multi-state ODE systems, frees provides the `DYNAMIC ... END` block.

## DYNAMIC Block Syntax
A variable `X` is classified as a **state** when `der(X)` appears in the block. You must write one derivative equation and one initial condition:
```
DYNAMIC system_name (method = solver, t = t0 .. tf, points = n_samples)
  der(state) = rate_equation
  state(0) = initial_value
  algebraic_aux = calculation
  EVENT event_name: condition -> stop|record
END
```

[Diagram: GuessConvergence]

## Solver Roster
- **Fixed-Step:** `ode1` (Euler), `ode2` (Heun), `ode3`, `ode4` (RK4), `ode5` (Dormand-Prince).
- **Adaptive:** `ode45` (default Dormand-Prince 5(4)), `ode23` (Bogacki-Shampine).
- **Stiff Implicit:** `ode23s` (modified Rosenbrock), `ode15s` (implicit BDF).

## Trajectory Accessors
You can query columns from the compiled ODE Table inside your analytic equations:
- **`FinalValue('col'):`** Last value of column `col`.
- **`MaxValue('col') / MinValue('col'):`** Peak or minimum value.
- **`TimeAt('col', val):`** Time when column `col` crosses `val`.
- **`ODEValue('col', t):`** Value interpolated at time `t`.

### Coupled ODE Example
```
{ Coupled Mass-Spring-Damper }
m = 1.0; k = 20.0; c = 0.5
DYNAMIC mass_spring (method = ode45, t = 0 .. 20, points = 400)
  der(x) = v
  der(v) = -(c/m) * v - (k/m) * x
  x(0) = 1.0
  v(0) = 0.0
END

{ Read results back into main system }
final_displacement = FinalValue('x')
```

[Topic: optimization]
# Optimization & Parametric Sweeps

frees provides systematic parameter sweeps and gradient-based optimization tools.

## Parametric Sweeps in Code
A `PARAMETRIC` block defines variable ranges to drive sweeps:
```
PARAMETRIC sweep_name(var1, var2, ...)
  var1 = start : step : end | Linear
END
```
- **Driven Columns:** Listed variables are overridden with the table values during iteration.
- **Computed Columns:** Other variables are evaluated at each step and filled in.

### Sweep Example
```
v0 = 50
g = 9.81
range_m = v0^2 * sin(2 * theta_deg * pi# / 180) / g

PARAMETRIC trajectory(theta_deg, range_m)
  theta_deg = 15 : 5 : 75 | Linear
END
```

## Minimize / Maximize Optimization
Use **Tools -> Minimize** or **Maximize** (or the sidebar optimization panel) to find optimal values for decision variables under constraints.

[Topic: api]
# Solver Reference & API

Understanding the execution pipeline helps you interpret convergence logs and handle singularities.

## Compilation & Execution Pipeline
1. **Lexing/Parsing (ANTLR4):** Tokenizes variables, symbols, constants, and bracketed units.
2. **AST Construction:** Inlines functions/modules, expands array indices, compiles matrix slices, and converts units to SI base values.
3. **Strongly Connected Components (Tarjan's SCC):** Analyzes the variable-equation graph and groups coupled systems into minimum blocks.
4. **Newton-Raphson Solver:** Solves each coupled block in topological order using finite-difference Jacobians and backtracking line search.
5. **DYNAMIC Pass:** Performs numerical integration of ODE blocks using solved analytic variables as parameters. Accessor values are fed back iteratively until the system converges globally.
