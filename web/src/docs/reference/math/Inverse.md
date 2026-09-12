---
name: Inverse
category: Math
summary: Matrix inverse A⁻¹
related: []
examples: []
tags: [inverse, math]
---

# Inverse

Matrix inverse A⁻¹


## Syntax

```
Inverse(A)
```

## Description

Matrix inverse A⁻¹

## Mathematical Formulation

$$ A\,A^{-1} = A^{-1}A = I $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
A = [4 0; 0 5]
C = Inverse(A)

{ CHECK A[1,1] 4 0.000004 }
{ CHECK A[1,2] 0 1e-8 }
{ CHECK A[2,1] 0 1e-8 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
A[1,1] = 4
A[1,2] = 0
A[2,1] = 0
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `A` | Number | Yes | Matrix. |
