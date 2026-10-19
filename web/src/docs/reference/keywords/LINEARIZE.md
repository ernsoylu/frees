---
name: LINEARIZE
covers: [input, output]
category: Language Keywords
summary: Numerically linearizes a DYNAMIC block into state-space matrices A, B, C, D.
related: [DYNAMIC, ss2tf, bode, lqr]
examples: []
tags: [keyword, block, linearization, state space, control, plant]
references: []
---

# LINEARIZE

Turns a named `DYNAMIC` block into a linear plant model. `INPUT` lists the exogenous variables to perturb and `OUTPUT` the observed quantities; the result is an ordinary set of matrices the control functions accept directly.

## Syntax

```
LINEARIZE name (block = dynamic_name, a = A, b = B, c = C, d = D)
  INPUT  u1, u2
  OUTPUT y1, inst.port.T
END
```

## Description

States are the `DYNAMIC` block's `der()` variables. The Jacobians are evaluated about the block's **initial state** and the current input values, so pick an initial condition at the operating point you want to design for. Both `INPUT` and `OUTPUT` accept dotted member paths such as `BATT.port.T`. The matrix names default to `A`, `B`, `C`, `D`.

## Mathematical Formulation

$$ A = \frac{\partial \mathbf{f}}{\partial \mathbf{x}}, \quad B = \frac{\partial \mathbf{f}}{\partial \mathbf{u}}, \quad C = \frac{\partial \mathbf{y}}{\partial \mathbf{x}}, \quad D = \frac{\partial \mathbf{y}}{\partial \mathbf{u}} \quad \text{at } (\mathbf{x}_0, \mathbf{u}_0) $$

> **Method:** finite-difference Jacobians of the block's right-hand side and outputs.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Gravity-drained tank at equilibrium

$A_t \dot h = q_{in} - C\sqrt{h}$ at $h_0 = 1$ gives $A = -C/(2A_t\sqrt{h_0}) = -0.1$ and $B = 1/A_t = 0.5$.

```frees
A_t  = 2
C    = 0.4
q_in = 0.4
DYNAMIC tank (time = 0 .. 1)
  der(h) = (q_in - C * sqrt(h)) / A_t
  h(0)   = 1
END
LINEARIZE plant (block = tank, a = A, b = B, c = Cm, d = D)
  INPUT  q_in
  OUTPUT h
END

{ CHECK A[1,1] -0.1 0.000001 }
{ CHECK B[1,1] 0.5 0.000001 }
{ CHECK Cm[1,1] 1 0.000001 }
{ CHECK D[1,1] 0 0.000001 }
```

Expected output:

```text
A[1,1] = -0.1   B[1,1] = 0.5   Cm[1,1] = 1   D[1,1] = 0
```

<!-- verified-reference-example:end -->

## Clauses

| Clause | Required | Description |
| --- | --- | --- |
| `block = name` | Yes | The `DYNAMIC` block to linearize. |
| `a =`, `b =`, `c =`, `d =` | No | Names of the result matrices (default `A`, `B`, `C`, `D`). |
| `INPUT …` | Yes | Comma-separated inputs to perturb. |
| `OUTPUT …` | Yes | Comma-separated observed quantities. |

## Common Errors

| Error | Cause | Fix |
| --- | --- | --- |
| `LINEARIZE p: no DYNAMIC block named 'nope' (it names the transient component network to linearize).` | `block =` names no `DYNAMIC` block. | Use the block's name. |
