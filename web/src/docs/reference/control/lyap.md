---
name: lyap
category: Control Systems
summary: Solve the continuous Lyapunov equation A·X + X·Aᵀ + Q = 0.
related: [dlyap, dare, gram]
examples: []
tags: [control, lyapunov, stability, gramian, riccati]
---

# lyap

Solves the **continuous Lyapunov equation** for `X`. It underpins stability
analysis (a positive-definite `X` for `Q > 0` certifies stability of `A`) and the
controllability/observability Gramians.

## Syntax

```
[X] = lyap(A, Q)
X = lyap(A, Q)
```

## Mathematical Formulation

$$ A X + X A^\top + Q = 0 $$

For a Hurwitz `A` and `Q = Qᵀ ⪰ 0`, the unique solution is

$$ X = \int_0^\infty e^{A t} Q\, e^{A^\top t}\,dt $$

> **Method:** Bartels–Stewart (Schur-based) solve of the linear Lyapunov system.

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
{ X = lyap(A, Q); X > 0 certifies A is stable when Q > 0 }
```

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `A` | Matrix | Yes | State matrix (stable for a bounded solution). |
| `Q` | Matrix | Yes | Symmetric right-hand side. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `X` | Matrix | Symmetric solution. |

## Common Errors

| Error | Cause | Fix |
| --- | --- | --- |
| `NO_UNIQUE_SOLUTION` | `A` shares eigenvalues with `−Aᵀ` | The Lyapunov operator is singular; check `A`'s spectrum. |
