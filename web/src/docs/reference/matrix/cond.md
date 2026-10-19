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

### Verified example — Condition number of a 2 x 2 matrix

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
A = [4, 1; 2, 3]
c = cond(A)

{ The same number from the singular values: sigma_max / sigma_min. }
[sv] = SingularValues(A)
kappa = sv[1] / sv[2]

{ CHECK c 2.618033989 0.000002618033989 }
{ CHECK kappa 2.618033989 0.000002618033989 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
c = 2.618033989
kappa = 2.618033989
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
| `cond: the matrix is singular, so its condition number is infinite` | `σ_min = 0` | The matrix is singular; check for a repeated or zero row or column. |
