---
name: svd
category: Matrix
summary: Singular value decomposition
related: []
examples: []
tags: [svd, matrix]
references:
  - "Golub, G.H. & Van Loan, C.F., Matrix Computations (4th ed.), §2.4"
---

# svd

Singular value decomposition


## Syntax

```
svd(A : U, S, V)
```

## Description

Singular value decomposition

## Mathematical Formulation

$$ A = U\,\Sigma\,V^\top, \qquad \Sigma = \operatorname{diag}(\sigma_1 \ge \dots \ge \sigma_r > 0) $$

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `A` | Number | Yes | Numeric argument. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `U` | Number/Array | Output value. |
| `S` | Number/Array | Output value. |
| `V` | Number/Array | Output value. |

## References

1. Golub, G.H. & Van Loan, C.F., Matrix Computations (4th ed.).

