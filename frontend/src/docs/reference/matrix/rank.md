---
name: rank
category: Matrix
summary: Matrix rank
related: []
examples: []
tags: [rank, matrix]
references:
  - "Golub, G.H. & Van Loan, C.F., Matrix Computations (4th ed.)"
---

# rank

Matrix rank


## Syntax

```
rank(A)
```

## Description

Matrix rank

## Mathematical Formulation

$$ \operatorname{rank}(A) = \#\{\sigma_i > \text{tol}\} \quad\text{(numerical, via SVD)} $$

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `A` | Number | Yes | Numeric argument. |

## References

1. Golub, G.H. & Van Loan, C.F., Matrix Computations (4th ed.).

