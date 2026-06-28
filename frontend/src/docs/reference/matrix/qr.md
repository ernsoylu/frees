---
name: qr
category: Matrix
summary: QR decomposition
related: []
examples: []
tags: [qr, matrix]
references:
  - "Golub, G.H. & Van Loan, C.F., Matrix Computations (4th ed.), §5.2"
---

# qr

QR decomposition


## Syntax

```
qr(A : Q, R)
```

## Description

QR decomposition

## Mathematical Formulation

$$ A = Q\,R, \qquad Q^\top Q = I,\ R\ \text{upper triangular} $$

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `A` | Number | Yes | Numeric argument. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `Q` | Number/Array | Output value. |
| `R` | Number/Array | Output value. |

## References

1. Golub, G.H. & Van Loan, C.F., Matrix Computations (4th ed.).

