---
name: Determinant
category: Math
summary: Determinant
related: []
examples: []
tags: [determinant, math]
references:
  - "Golub, G.H. & Van Loan, C.F., Matrix Computations (4th ed.)"
---

# Determinant

Determinant


## Syntax

```
Determinant(A)
```

## Description

Determinant

## Mathematical Formulation

$$ \det(A) = \sum_{\sigma} \operatorname{sgn}(\sigma)\prod_i A_{i,\sigma(i)} = \pm\prod_i U_{ii} $$

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `A` | Number | Yes | Matrix. |

## References

1. Golub, G.H. & Van Loan, C.F., *Matrix Computations* (4th ed.).
