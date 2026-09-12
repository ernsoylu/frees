---
name: det
category: Matrix
summary: Matrix determinant
related: []
examples: []
tags: [det, matrix]
---

# det

Matrix determinant


## Syntax

```
det(A)
```

## Description

Matrix determinant

## Mathematical Formulation

$$ \det(A) = \pm\prod_i U_{ii} \quad\text{(from } PA = LU\text{)} $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
A = [4 0; 0 5]
C = inv(A)
d = det(A)

{ CHECK d 20 0.000019999999999999998 }
{ CHECK A[1,1] 4 0.000004 }
{ CHECK A[1,2] 0 1e-8 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
d = 20
A[1,1] = 4
A[1,2] = 0
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `A` | Number | Yes | Square input matrix. |
