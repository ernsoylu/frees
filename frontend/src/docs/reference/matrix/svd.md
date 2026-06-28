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
| `A` | Number | Yes | Square input matrix. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `U` | Number/Array | Computed `U`. |
| `S` | Number/Array | Nucleate-suppression factor. |
| `V` | Number/Array | Velocity [m/s]. |

## References

1. Golub, G.H. & Van Loan, C.F., Matrix Computations (4th ed.).

