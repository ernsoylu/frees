---
name: matexp
category: Matrix
summary: Matrix exponential
related: []
examples: []
tags: [matexp, matrix]
references:
  - "Golub, G.H. & Van Loan, C.F., Matrix Computations (4th ed.), §9.3"
---

# matexp

Matrix exponential


## Syntax

```
matexp(A)
```

## Description

Matrix exponential

## Mathematical Formulation

$$ e^{A} = \sum_{k=0}^{\infty} \frac{A^{k}}{k!} $$

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `A` | Number | Yes | Square input matrix. |

## References

1. Golub, G.H. & Van Loan, C.F., Matrix Computations (4th ed.).

