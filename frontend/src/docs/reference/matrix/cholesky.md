---
name: cholesky
category: Matrix
summary: Cholesky decomposition
related: []
examples: []
tags: [cholesky, matrix]
references:
  - "Golub, G.H. & Van Loan, C.F., Matrix Computations (4th ed.), §4.2"
---

# cholesky

Cholesky decomposition


## Syntax

```
cholesky(A : L)
```

## Description

Cholesky decomposition

## Mathematical Formulation

$$ A = L\,L^\top \quad\text{(} A \text{ symmetric positive-definite)} $$

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `A` | Number | Yes | Square input matrix. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `L` | Number/Array | Length [m]. |

## References

1. Golub, G.H. & Van Loan, C.F., Matrix Computations (4th ed.).

