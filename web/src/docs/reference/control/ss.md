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


> **Not callable in the current engine:** `ss` is registered but has no implementation, so a call reports *not yet supported: ss*. frees has no state-space object; pass `A, B, C, D` directly to `ss2tf`, `bode`, `lsim`, … — see the example.

## Mathematical Formulation

$$ \dot{\mathbf{x}} = A\mathbf{x} + B\mathbf{u}, \qquad \mathbf{y} = C\mathbf{x} + D\mathbf{u} $$

with transfer function `G(s) = C(sI − A)⁻¹B + D` (see `ss2tf`).

> **Method:** stores the `(A, B, C, D)` quadruple as a state-space model.

## Examples

<!-- verified-reference-example:start -->

### Verified example — A two-state plant

**Current runtime limitation:** this invocation is not supported by the current engine. The diagnostic below is verified, not a successful calculation. Use the working alternative that follows.

```frees error="not yet supported: ss"
A = [-1, 0; 0, -2]
B = [1; 1]
C = [1, 0]
D = [0]
sys = ss(A, B, C, D)
```

Expected diagnostic:

```text
not yet supported: ss
```

Working alternative — paste this complete document into the editor and solve:

```frees
{ Pass the (A, B, C, D) matrices straight to the function that needs
  them — here the transfer function G(s) = (s + 2)/(s^2 + 3s + 2). }
A = [-1, 0; 0, -2]
B = [1; 1]
C = [1, 0]
D = [0]
[num, den] = ss2tf(A, B, C, D)

{ CHECK num[2] 1 0.000001 }
{ CHECK num[3] 2 0.000002 }
{ CHECK den[2] 3 0.000003 }
{ CHECK den[3] 2 0.000002 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
num[2] = 1
num[3] = 2
den[2] = 3
den[3] = 2
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
