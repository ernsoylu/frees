---
name: ss
category: Control Systems
summary: Create a state-space model from (A, B, C, D).
related: [ss2tf, tf2ss, ss2ss]
examples: []
tags: [control, state space, model, ss]
---

# ss

Builds a **state-space model** from the matrices `(A, B, C, D)` — the time-domain
representation `ẋ = Ax + Bu`, `y = Cx + Du` on which modern (state-feedback,
observer, LQR/LQE) design operates.

## Syntax

```
sys = ss(A, B, C, D)
```

## Mathematical Formulation

$$ \dot{\mathbf{x}} = A\mathbf{x} + B\mathbf{u}, \qquad \mathbf{y} = C\mathbf{x} + D\mathbf{u} $$

with transfer function `G(s) = C(sI − A)⁻¹B + D` (see `ss2tf`).

> **Method:** stores the `(A, B, C, D)` quadruple as a state-space model.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
GradeRoadLoad ROAD(Crr=50, Caero=2, m=1500, g=9.81, grade=0.05)
SpeedSource   SS(w=30)
MechGround    G()
connect(SS.a, ROAD.shaft)
connect(SS.b, G.port)

{ CHECK g.port.tau -2585.443476 0.0025854434758180314 }
{ CHECK g.port.w 0 1e-8 }
{ CHECK road.shaft.tau 2585.443476 0.0025854434758180314 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
g.port.tau = -2585.443476
g.port.w = 0
road.shaft.tau = 2585.443476
```

<!-- verified-reference-example:end -->

```
{ sys = ss(A, B, C, D) }
```

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `A` | Matrix | Yes | State matrix. |
| `B` | Matrix | Yes | Input matrix. |
| `C` | Matrix | Yes | Output matrix. |
| `D` | Number/Matrix | Yes | Feedthrough. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `sys` | State-space | The model `(A, B, C, D)`. |
