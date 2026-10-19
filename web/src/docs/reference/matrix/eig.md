---
name: eig
category: Matrix
summary: Eigenvalues of a square matrix — the array-language spelling of Eigenvalues.
related: [Eigenvalues, Eigen, eigvec]
examples: []
tags: [eig, eigenvalues, matrix, spectrum]
---

# eig

Returns the **eigenvalues** of a square matrix `A`. `eig` is the array-language
spelling of `Eigenvalues` and behaves identically: one output for a real
spectrum, two (real and imaginary parts) for a complex one.

## Syntax

```
[lambda] = eig(A)
[re, im] = eig(A)
```

## Description

`[lambda] = eig(A)` sizes `lambda` to the order of `A` and returns the
eigenvalues in ascending order. A matrix with complex eigenvalues needs the
two-output form; the one-output form refuses it rather than dropping the
imaginary parts.

## Mathematical Formulation

$$ A v = \lambda v, \qquad \det(A - \lambda I) = 0 $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Eigenvalues of a coupled two-state system

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
A = [4, 1; 2, 3]
[lambda] = eig(A)

{ CHECK lambda[1] 2 0.000002 }
{ CHECK lambda[2] 5 0.000005 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
lambda[1] = 2
lambda[2] = 5
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `A` | Matrix | Yes | Square input matrix. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `lambda` | Vector | Eigenvalues, ascending (real spectrum). |
| `re`, `im` | Vector | Real and imaginary parts (two-output form). |

## Common Errors

| Error | Cause | Fix |
| --- | --- | --- |
| `Matrix has complex eigenvalues; this form supports real spectra only` | `A` has complex eigenvalues and one output was requested | Use `[re, im] = eig(A)`. |
