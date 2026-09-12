---
name: cond
category: Matrix
summary: Condition number of a matrix (sensitivity to perturbations).
related: [norm, rank, inv, svd]
examples: [ev-thermal-management]
tags: [matrix, condition number, conditioning, svd, linear algebra]
---

# cond

Returns the **condition number** of a matrix `A` — the ratio of its largest to
smallest singular value. It measures how much relative error in the data can be
amplified when solving `Ax = b`; a large value flags near-singularity and
ill-conditioning.

## Syntax

```
c = cond(A)
```

## Description

A condition number near 1 indicates a well-conditioned problem; very large values
mean small input changes can produce large output changes, so solutions should be
treated with caution.

## Mathematical Formulation

$$ \kappa(A) = \|A\|\,\|A^{-1}\| = \frac{\sigma_{\max}(A)}{\sigma_{\min}(A)} $$

where the `σ` are the singular values of `A`.

> **Method:** singular value decomposition; `κ = σ_max/σ_min`.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
TwoPhaseEnthalpySource SRC(mdot=0.02, h=435000)
TwoPhaseCondenserUA COND(fluid$=R134a, UA=400, T_amb=305, V=0.002)
TwoPhaseSink SNK()
connect(SRC.out, COND.in)
connect(COND.out, SNK.in)
COND.m = 1.200000

{ CHECK cond.in.h 435000 0.435 }
{ CHECK cond.in.mdot 0.02 2e-8 }
{ CHECK cond.in.p 1040885.197 1.0408851966633037 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
cond.in.h = 435000
cond.in.mdot = 0.02
cond.in.p = 1040885.197
```

<!-- verified-reference-example:end -->

### Example 1 — Conditioning check in a coupled solve

[Run: ev-thermal-management]

**Expected:** a finite condition number; a very large value would warn that the
linear system is ill-conditioned.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `A` | Matrix | Yes | The matrix to assess. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `c` | Number | Condition number κ(A) ≥ 1. |

## Common Errors

| Error | Cause | Fix |
| --- | --- | --- |
| `SINGULAR_MATRIX` | `σ_min = 0` | The matrix is singular — condition number is infinite. |
