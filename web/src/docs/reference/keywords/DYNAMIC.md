---
name: DYNAMIC
covers: [event]
category: Language Keywords
summary: Integrates a coupled ODE/DAE system in time and publishes its trajectory as an ODE Table.
related: [LINEARIZE, PLOT, FinalValue, TimeAt, ODEValue, MaxValue]
examples: [first-order-motor-step, damping-sensitivity-oscillators]
tags: [keyword, block, transient, ode, dae, event, integrator, time]
references: []
---

# DYNAMIC

Declares a transient system. A variable becomes a **state** the moment `der(X)` appears in the body; each state needs one derivative equation and one initial condition `X(0) = …`. `EVENT` lines inside the block watch zero crossings.

## Syntax

```
DYNAMIC name (method = solver, time = t0 .. tf, points = n)
  der(state) = rate_expression
  state(0)   = initial_value
  auxiliary  = algebraic_expression
  EVENT label: condition -> stop
  EVENT label: lhs = rhs | falling -> record
  EVENT label: lhs = rhs | rising  -> set state = expression
END
```

## Description

The block runs after the analytic equations: top-level values such as rate constants are visible inside it, and the trajectory accessors (`FinalValue`, `TimeAt`, `ODEValue`, `MaxValue`, …) read results back into the top-level solve. Every state, auxiliary and `time` becomes a column of the block's **ODE Table**.

- **Options** — `method` (default `ode45`), the interval `time = t0 .. tf` (also spelled `t` or `tspan`), `points` (output samples), `rtol` and `atol`.
- **`EVENT`** — `stop` ends the run at the crossing, `record` logs it and continues, `set state = expr` reassigns a state and restarts integration. `| rising` / `| falling` filter the crossing direction; give `set` events a direction so they cannot immediately retrigger.
- An **empty** body is valid in a component network: storage components inject their own `der(...)` equations and initial conditions.

## Mathematical Formulation

$$ \dot{\mathbf{x}} = \mathbf{f}(t, \mathbf{x}, \mathbf{z}), \qquad \mathbf{0} = \mathbf{g}(t, \mathbf{x}, \mathbf{z}), \qquad \mathbf{x}(t_0) = \mathbf{x}_0 $$

An event fires where its guard $e(t, \mathbf{x}) = \mathrm{lhs} - \mathrm{rhs}$ changes sign; the crossing time is root-found inside the step.

> **Method:** explicit Runge–Kutta (`ode1`–`ode5`, `ode23`, `ode45`), Rosenbrock (`ode23s`), BDF (`ode15s`), Radau IIA (`radau5`), or the implicit DAE solver `ida` for component networks.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Coffee cooling to a drinkable temperature

Newton's law of cooling with a `stop` event at 60 °C. The analytic crossing time is $\ln(70/40)/0.05 = 11.1923$ s.

```frees
k     = 0.05
T_amb = 20
DYNAMIC cooldown (method = ode45, time = 0 .. 120, points = 121)
  der(T) = -k * (T - T_amb)
  T(0)   = 90
  EVENT drinkable: T = 60 | falling -> stop
END
t_drink = FinalValue('time')
T_end   = FinalValue('T')

{ CHECK t_drink 11.1923157 0.000001 }
{ CHECK T_end 60 0.000001 }
```

Expected output:

```text
t_drink = 11.19232
T_end = 60
```

<!-- verified-reference-example:end -->

## Clauses

| Clause | Required | Description |
| --- | --- | --- |
| `method = name` | No | `ode45` (default), `ode1`–`ode5`, `ode23`, `ode23s`, `ode15s`, `radau5`, `ida`. |
| `time = t0 .. tf` | Yes | Integration interval; `t` and `tspan` are accepted spellings. |
| `points = n` | No | Number of output samples in the ODE Table. |
| `rtol`, `atol` | No | Integrator tolerances. |
| `der(x) = …` | Per state | Derivative equation. |
| `x(0) = …` | Per state | Initial condition. |
| `EVENT label: … -> action` | No | Zero-crossing event; action is `stop`, `record` or `set state = expr`. |

## Common Errors

| Error | Cause | Fix |
| --- | --- | --- |
| `DYNAMIC a: state 'y' has no initial condition (y(0) = …).` | A `der(y)` without `y(0)`. | Add the initial condition. |
| `DYNAMIC: unknown method 'foo'. …` | Misspelled solver name. | Use one of the methods listed above. |
| ``unterminated DYNAMIC a block: expected `END` `` | Missing `END`. | Close the block. |
| `TimeAt: column never reaches 60 in DYNAMIC 'cooldown'.` | A `stop` event ends the run at the level being searched for. | Read `FinalValue('time')` instead, or search for a level the trajectory passes. |
