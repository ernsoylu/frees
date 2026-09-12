---
name: Eigen
category: Matrix
summary: Eigenvalues and eigenvectors of a square matrix.
related: [Eigenvalues, balreal]
examples: []
tags: [matrix, eigenvalues, eigenvectors, spectral, linear algebra]
---

# Eigen

Returns the **eigenvalues** `lambda` and **eigenvectors** `V` of a square matrix
`A` — the full eigendecomposition `A V = V Λ`. The eigenvectors give the modal
directions; the eigenvalues their rates/frequencies.

## Syntax

```
[lambda, V] = Eigen(A)
[lambda, V] = Eigen(A)
```

## Mathematical Formulation

$$ A\,v_i = \lambda_i\,v_i, \qquad A = V\,\Lambda\,V^{-1} $$

where `Λ = diag(λ_i)` and the columns of `V` are the eigenvectors.

> **Method:** QR algorithm with eigenvector back-substitution.

Eigen supports **real spectra only** (symmetric matrices always qualify) and
stops with an error on complex eigenvalues; for a complex spectrum use
`[re, im] = Eigenvalues(A)`, which returns real/imaginary part vectors.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Analyze a two-channel matrix

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
A = [4, 0; 0, 9]
[result] = eigen(A)

{ CHECK result[1] 4 0.000004 }
{ CHECK result[2] 9 0.000009 }
{ CHECK A[1,1] 4 0.000004 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result[1] = 4
result[2] = 9
A[1,1] = 4
```

<!-- verified-reference-example:end -->

```
{ [lambda, V] = Eigen(A) }
```

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `A` | Matrix | Yes | Square matrix. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `lambda` | Vector | Eigenvalues. |
| `V` | Matrix | Eigenvectors (columns). |
