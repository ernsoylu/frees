---
name: Eigenvalues
category: Matrix
summary: Eigenvalues of a square matrix.
related: [Eigen, Determinant, cond]
examples: []
tags: [matrix, eigenvalues, spectrum, linear algebra]
references:
  - "Golub, G.H. & Van Loan, C.F., Matrix Computations (4th ed.), Ch. 7"
---

# Eigenvalues

Returns the **eigenvalues** `lambda` of a square matrix `A` — the scalars `λ` for
which `A v = λ v` has a nonzero solution. They set system stability (continuous:
left half-plane; discrete: inside the unit circle) and modal frequencies.

## Syntax

```
CALL Eigenvalues(A : lambda)
lambda = Eigenvalues(A)
```

## Mathematical Formulation

The eigenvalues are the roots of the characteristic polynomial (Golub & Van Loan Ch. 7):

$$ \det(A - \lambda I) = 0 $$

> **Method:** QR algorithm on the (balanced) matrix.

## Examples

```
{ lambda = Eigenvalues(A) }
```

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `A` | Matrix | Yes | Square matrix. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `lambda` | Vector | Eigenvalues (possibly complex). |

## References

1. Golub, G.H. & Van Loan, C.F. *Matrix Computations* (4th ed.), Ch. 7.
