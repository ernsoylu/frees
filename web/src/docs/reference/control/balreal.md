---
name: balreal
category: Control Systems
summary: Internally-balanced state-space realization for model reduction.
related: [gram, ctrb, obsv, ss2tf]
examples: [estimator-gramian-balreal]
tags: [control, balanced realization, model reduction, gramian, hankel]
---

# balreal

Returns an **internally-balanced realization** `(Ab, Bb, Cb)` of a state-space
system — a coordinate transform in which the controllability and observability
Gramians are equal and diagonal (the Hankel singular values). States with small
Hankel values can then be truncated for model reduction.

## Syntax

```
[Ab, Bb, Cb] = balreal(A, B, C)
[Ab, Bb, Cb] = balreal(A, B, C)
```

## Description

Balancing ranks the state directions by their joint input-output energy, so a
reduced model that drops the least-significant states keeps the dominant dynamics.

## Mathematical Formulation

Find `T` such that the transformed Gramians satisfy:

$$ \tilde W_c = \tilde W_o = \Sigma = \mathrm{diag}(\sigma_1 \ge \sigma_2 \ge \dots), \qquad (A_b, B_b, C_b) = (T^{-1}AT,\ T^{-1}B,\ CT) $$

where the `σ_i` are the Hankel singular values.

> **Method:** compute the Gramians, form the balancing transform from their joint
> eigenstructure, and apply it.

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
G[1,1] = 1; G[1,2] = 0
G[2,1] = 0; G[2,2] = 1
Qn[1,1] = 1; Qn[1,2] = 0
Qn[2,1] = 0; Qn[2,2] = 1
Rn = 0.1
[L] = lqe(A, G, C, Qn, Rn)
[Wc] = gram(A, B, 'c')
[Ab, Bb, Cb] = balreal(A, B, C)

{ CHECK ab[1,1] -0.4085896873 4.0858968733650153e-7 }
{ CHECK ab[1,2] -0.9701425001 9.70142500145332e-7 }
{ CHECK ab[2,1] 0.9701425001 9.701425001453318e-7 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
ab[1,1] = -0.4085896873
ab[1,2] = -0.9701425001
ab[2,1] = 0.9701425001
```

<!-- verified-reference-example:end -->

### Example 1 — Balanced realization of a plant

[Run: estimator-gramian-balreal]

**Expected:** a realization whose equal, diagonal Gramians expose the Hankel
singular values for truncation.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `A` | Matrix | Yes | State matrix (stable). |
| `B` | Matrix | Yes | Input matrix. |
| `C` | Matrix | Yes | Output matrix. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `Ab` | Matrix | Balanced state matrix. |
| `Bb` | Matrix | Balanced input matrix. |
| `Cb` | Matrix | Balanced output matrix. |

## Common Errors

| Error | Cause | Fix |
| --- | --- | --- |
| `NOT_MINIMAL` | system not controllable/observable | Balancing requires a minimal (or stable) realization. |
