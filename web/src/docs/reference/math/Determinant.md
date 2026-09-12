---
name: Determinant
category: Math
summary: Determinant
related: []
examples: []
tags: [determinant, math]
---

# Determinant

Determinant


## Syntax

```
Determinant(A)
```

## Description

Determinant

## Mathematical Formulation

$$ \det(A) = \sum_{\sigma} \operatorname{sgn}(\sigma)\prod_i A_{i,\sigma(i)} = \pm\prod_i U_{ii} $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// VALIDATION: Determinant of a triangular matrix (LU intrinsic path)
// AREA: Linear algebra
// BASIS: The determinant of a triangular matrix is the product of its
// diagonal: 1*2*3*4*5 = 120. A 5x5 exercises the runtime LU path (above 3x3
// the closed-form cofactor expansion is not used).
// EXPECT d = 120 tol 1e-8
A = [1 1 1 1 1; 0 2 1 1 1; 0 0 3 1 1; 0 0 0 4 1; 0 0 0 0 5]
d = Determinant(A[1:5,1:5])

{ CHECK d 120 0.00011999999999999999 }
{ CHECK A[1,1] 1 0.000001 }
{ CHECK A[1,2] 1 0.000001 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
d = 120
A[1,1] = 1
A[1,2] = 1
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `A` | Number | Yes | Matrix. |
