---
name: qr
category: Matrix
summary: QR decomposition
related: []
examples: []
tags: [qr, matrix]
---

# qr

QR decomposition


## Syntax

```
[Q, R] = qr(A)
```

## Description

QR decomposition

## Mathematical Formulation

$$ A = Q\,R, \qquad Q^\top Q = I,\ R\ \text{upper triangular} $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
A = [12, -51, 4; 6, 167, -68; -4, 24, -41]
[q, r] = qr(A)

{ CHECK A[1,1] 12 0.000012 }
{ CHECK A[1,2] -51 0.000051 }
{ CHECK A[1,3] 4 0.000004 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
A[1,1] = 12
A[1,2] = -51
A[1,3] = 4
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `A` | Number | Yes | Square input matrix. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `Q` | Number/Array | Computed `Q`. |
| `R` | Number/Array | Computed `R`. |
