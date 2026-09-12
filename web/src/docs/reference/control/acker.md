---
name: acker
category: Control Systems
summary: Single-input pole placement via Ackermann's formula.
related: [place, ctrb, lqr]
examples: []
tags: [control, pole placement, ackermann, state feedback]
---

# acker

Returns the **state-feedback gain** `K` for a single-input system using
**Ackermann's formula**, placing the closed-loop poles of `(A, B)` at the desired
locations `pr ± j·pi`. It is the explicit closed-form counterpart of
`place`.

## Syntax

```
[K] = acker(A, B, pr, pi)
K = acker(A, B, pr, pi)
```

## Description

Ackermann's formula gives `K` directly from the desired characteristic polynomial
and the controllability matrix; it is exact for single-input systems but
numerically sensitive for high order.

## Mathematical Formulation

With desired characteristic polynomial `Φ(s) = Π(s − p_i)` and controllability
matrix `C = [B AB … Aⁿ⁻¹B]`:

$$ K = \begin{bmatrix} 0 & \cdots & 0 & 1 \end{bmatrix}\,\mathcal{C}^{-1}\,\Phi(A) $$

> **Method:** Ackermann's formula evaluated from `Φ(A)` and `ctrb(A, B)`.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
{ Pole placement two ways on the same plant. }
A[1,1] = 0; A[1,2] = 1
A[2,1] = -2; A[2,2] = -3
B[1] = 0; B[2] = 1
pd_r = [-4, -5]
pd_i = [0, 0]
[Kp] = place(A, B, pd_r, pd_i)
[Ka] = acker(A, B, pd_r, pd_i)
Acl[1,1] = A[1,1]-B[1]*Kp[1]; Acl[1,2] = A[1,2]-B[1]*Kp[2]
Acl[2,1] = A[2,1]-B[2]*Kp[1]; Acl[2,2] = A[2,2]-B[2]*Kp[2]
[cr, ci] = pole(Acl)

{ CHECK Acl[1,1] 0 1e-8 }
{ CHECK Acl[1,2] 1 0.000001 }
{ CHECK Acl[2,1] -20 0.000019999999999999998 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
Acl[1,1] = 0
Acl[1,2] = 1
Acl[2,1] = -20
```

<!-- verified-reference-example:end -->

```
{ K = acker(A, B, [-2,-2], [1,-1]) for a single-input controllable plant }
```

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `A` | Matrix | Yes | State matrix. |
| `B` | Vector | Yes | Single-input matrix. |
| `pr` | Vector | Yes | Real parts of the desired poles. |
| `pi` | Vector | Yes | Imaginary parts of the desired poles. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `K` | Vector | State-feedback gain (`u = −Kx`). |

## Common Errors

| Error | Cause | Fix |
| --- | --- | --- |
| `NOT_CONTROLLABLE` | `ctrb(A, B)` singular | Ackermann needs a controllable single-input pair. |
