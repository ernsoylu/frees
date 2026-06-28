---
name: SolveLinear
category: Math
summary: Solve A·x = b (same as A \\ b)
related: []
examples: []
tags: [solvelinear, math]
references:
  - "Golub, G.H. & Van Loan, C.F., Matrix Computations (4th ed.), §3.2"
---

# SolveLinear

Solve A·x = b (same as A \\ b)


## Syntax

```
SolveLinear(A, b)
```

## Description

Solve A·x = b (same as A \\ b)

## Mathematical Formulation

$$ A\,x = b \;\Rightarrow\; x = A^{-1}b \quad\text{(via } PA = LU\text{, forward/back substitution)} $$

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `A` | Number | Yes | Numeric argument. |
| `b` | Number | Yes | Numeric argument. |

## References

1. Golub, G.H. & Van Loan, C.F., *Matrix Computations* (4th ed.), §3.2.
