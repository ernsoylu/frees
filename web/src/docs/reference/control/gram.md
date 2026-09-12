---
name: gram
category: Control Systems
summary: Controllability or observability Gramian of a state-space system.
related: [ctrb, obsv, balreal]
examples: [estimator-gramian-balreal]
tags: [control, gramian, controllability, observability, balanced]
---

# gram

Returns the **controllability** (`'c'`) or **observability** (`'o'`) Gramian of a
stable state-space system. The Gramians quantify how strongly each state direction
is excited by the input / observed at the output, and underpin balanced model
reduction (`balreal`).

## Syntax

```
[W] = gram(A, M, 'c')
W = gram(A, M, 'o')
```

## Description

For `type$ = 'c'`, `M = B` and `W` is the controllability Gramian; for `'o'`,
`M = C` and `W` is the observability Gramian. Both are symmetric positive-definite
for a stable, controllable/observable system.

## Mathematical Formulation

The Gramians solve the Lyapunov equations:

$$ A W_c + W_c A^\top + B B^\top = 0, \qquad A^\top W_o + W_o A + C^\top C = 0 $$

equivalently $W_c = \int_0^\infty e^{A t} B B^\top e^{A^\top t}\,dt$.

> **Method:** solve the appropriate Lyapunov equation for `W`.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
A[1,1] = 0; A[1,2] = 1
A[2,1] = -2; A[2,2] = -3
B[1,1] = 0; B[2,1] = 1
C[1,1] = 1; C[1,2] = 0
[Co] = ctrb(A, B)
[Ob] = obsv(A, C)
[rc] = rank(Co)
[ro] = rank(Ob)
[Wc] = gram(A, B, 'c')
[Wo] = gram(A, C, 'o')

{ CHECK Co[1,1] 0 1e-8 }
{ CHECK Co[1,2] 1 0.000001 }
{ CHECK Co[2,1] 1 0.000001 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
Co[1,1] = 0
Co[1,2] = 1
Co[2,1] = 1
```

<!-- verified-reference-example:end -->

### Example 1 — Gramian of a plant

[Run: estimator-gramian-balreal]

**Expected:** a symmetric positive-definite Gramian whose eigenstructure ranks the
state directions by controllability/observability.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `A` | Matrix | Yes | State matrix (must be stable). |
| `M` | Matrix | Yes | `B` for controllability, `C` for observability. |
| `type$` | String | Yes | `'c'` (controllability) or `'o'` (observability). |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `W` | Matrix | The requested Gramian (symmetric). |

## Common Errors

| Error | Cause | Fix |
| --- | --- | --- |
| `NOT_STABLE` | `A` has non-negative eigenvalues | The Gramian integral converges only for a stable `A`. |
