---
name: dare
category: Control Systems
summary: Solve the discrete algebraic Riccati equation.
related: [dlqr, lqr, dlyap]
examples: []
tags: [control, riccati, discrete, optimal, dare]
---

# dare

Solves the **discrete algebraic Riccati equation** (DARE) for the stabilizing
solution `X`. It is the core of discrete optimal control — `dlqr` builds its
gain from this `X`.

## Syntax

```
[X] = dare(A, B, Q, R)
X = dare(A, B, Q, R)
```

## Mathematical Formulation

$$ X = A^\top X A - A^\top X B\,(R + B^\top X B)^{-1} B^\top X A + Q $$

with `Q ⪰ 0` (state weight) and `R ≻ 0` (input weight); the stabilizing `X ⪰ 0`
is the one for which the closed loop is Schur-stable.

> **Method:** Schur / structured-eigenvector solve of the symplectic pencil.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
{ Lyapunov and Riccati solvers. }
A[1,1] = -1; A[1,2] = 0
A[2,1] = 1;  A[2,2] = -2
Qm[1,1] = 1; Qm[1,2] = 0
Qm[2,1] = 0; Qm[2,2] = 1
[P] = lyap(A, Qm)
Ad[1,1] = 0.5; Ad[1,2] = 0.1
Ad[2,1] = 0.0; Ad[2,2] = 0.8
[Pd] = dlyap(Ad, Qm)
Bd[1,1] = 0; Bd[2,1] = 1
Rd[1,1] = 1
[S] = dare(Ad, Bd, Qm, Rd)
[Kd] = dlqr(Ad, Bd, Qm, Rd)

{ CHECK Ad[1,1] 0.5 5e-7 }
{ CHECK Ad[1,2] 0.1 1e-7 }
{ CHECK Ad[2,1] 0 1e-8 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
Ad[1,1] = 0.5
Ad[1,2] = 0.1
Ad[2,1] = 0
```

<!-- verified-reference-example:end -->

```
{ X = dare(A, B, Q, R); the LQR-optimal cost-to-go matrix }
```

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `A` | Matrix | Yes | Discrete state matrix. |
| `B` | Matrix | Yes | Input matrix. |
| `Q` | Matrix | Yes | State weight (⪰ 0). |
| `R` | Matrix | Yes | Input weight (≻ 0). |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `X` | Matrix | Stabilizing symmetric solution. |

## Common Errors

| Error | Cause | Fix |
| --- | --- | --- |
| `NOT_STABILIZABLE` | `(A, B)` not stabilizable | A stabilizing solution requires a stabilizable pair. |
