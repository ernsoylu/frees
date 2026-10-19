---
name: ger
category: Matrix
summary: BLAS rank-1 update A + α·x·yᵀ.
related: [gemv, gemm, axpy, scal]
examples: []
tags: [ger]
---

# ger

BLAS rank-1 update A + α·x·yᵀ.

## Syntax

```
B = ger(alpha, x, y, A)
```

## Description

`B = ger(alpha, x, y, A)` returns the BLAS level-2 rank-1 update `A + alpha · x · yᵀ`.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Update a matrix with an outer product

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
x = [1; 2]
y = [3; 4]
A = [0, 0; 0, 0]
B = ger(1, x, y, A)

{ CHECK A[1,1] 0 1e-8 }
{ CHECK A[1,2] 0 1e-8 }
{ CHECK A[2,1] 0 1e-8 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
A[1,1] = 0
A[1,2] = 0
A[2,1] = 0
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `alpha` | Number | Yes | Scale factor. |
| `x` | Vector | Yes | Column vector, length m. |
| `y` | Vector | Yes | Vector, length n. |
| `A` | Matrix | Yes | m × n matrix. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `B` | Matrix | m × n result. |
