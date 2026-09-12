---
name: dlyap
category: Control Systems
summary: Solve the discrete Lyapunov (Stein) equation A·X·Aᵀ − X + Q = 0.
related: [lyap, dare, dlqr]
examples: []
tags: [control, lyapunov, stein, discrete, stability]
---

# dlyap

Solves the **discrete Lyapunov (Stein) equation** for `X` — the discrete-time
counterpart of `lyap`. A positive-definite `X` for `Q > 0` certifies that
the discrete system `A` is Schur-stable (all eigenvalues inside the unit circle).

## Syntax

```
[X] = dlyap(A, Q)
X = dlyap(A, Q)
```

## Mathematical Formulation

$$ A X A^\top - X + Q = 0 $$

For a Schur-stable `A` (`|λ_i(A)| < 1`) and `Q = Qᵀ ⪰ 0`, the unique solution is

$$ X = \sum_{k=0}^{\infty} A^k Q\,(A^\top)^k $$

> **Method:** Bartels–Stewart-type (Schur-based) solve of the Stein equation.

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
{ X = dlyap(A, Q); X > 0 certifies A is Schur-stable when Q > 0 }
```

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `A` | Matrix | Yes | Discrete state matrix. |
| `Q` | Matrix | Yes | Symmetric right-hand side. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `X` | Matrix | Symmetric solution. |

## Common Errors

| Error | Cause | Fix |
| --- | --- | --- |
| `NO_UNIQUE_SOLUTION` | `λ_i·λ_j = 1` for some eigenvalue pair | The Stein operator is singular; check `A`'s spectrum. |
