---
name: dlqr
category: Control Systems
summary: Discrete-time LQR optimal state-feedback gain (via the DARE).
related: [lqr, dare, place]
examples: []
tags: [control, lqr, discrete, optimal, state feedback, riccati]
---

# dlqr

Returns the **discrete-time LQR gain** `K` — the discrete counterpart of
`lqr`. The control `u_k = −K x_k` minimizes a summed quadratic cost on the
states and effort.

## Syntax

```
[K] = dlqr(A, B, Q, R)
K = dlqr(A, B, Q, R)
```

## Mathematical Formulation

Minimizing `J = Σ (xₖᵀQxₖ + uₖᵀRuₖ)` gives

$$ K = (R + B^\top X B)^{-1} B^\top X A $$

where `X` is the stabilizing solution of the discrete algebraic Riccati equation
(`dare`).

> **Method:** solve the DARE for `X`, then form `K`.

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
{ K = dlqr(A, B, Q, R); discrete optimal regulator gain }
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
| `K` | Matrix | Discrete state-feedback gain (`u = −Kx`). |

## Common Errors

| Error | Cause | Fix |
| --- | --- | --- |
| `NOT_STABILIZABLE` | `(A, B)` not stabilizable | The pair must be stabilizable. |
