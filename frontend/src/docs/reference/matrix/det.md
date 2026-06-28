---
name: det
category: Matrix
summary: Matrix determinant
related: []
examples: []
tags: [det, matrix]
references:
  - "Golub, G.H. & Van Loan, C.F., Matrix Computations (4th ed.)"
---

# det

Matrix determinant


## Syntax

```
det(A)
```

## Description

Matrix determinant

## Mathematical Formulation

$$ \det(A) = \pm\prod_i U_{ii} \quad\text{(from } PA = LU\text{)} $$

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `A` | Number | Yes | Numeric argument. |

## References

1. Golub, G.H. & Van Loan, C.F., Matrix Computations (4th ed.).

