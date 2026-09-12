---
name: axpy
category: Math
summary: BLAS: αx + y
related: []
examples: []
tags: [axpy, math]
references: []
---

# axpy

BLAS: αx + y


## Syntax

```
axpy(α, x, y)
```

## Description

BLAS: αx + y

## Mathematical Formulation

$$ y \leftarrow \alpha x + y \quad\text{(BLAS level 1)} $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
v1[1:3] = [1, 2, 3]
v2[1:3] = [4, 5, 6]
result[1:3] = axpy(2.5, v1[1:3], v2[1:3])   { 2.5*v1 + v2 }

{ CHECK result[1] 6.5 0.0000065 }
{ CHECK result[2] 10 0.000009999999999999999 }
{ CHECK result[3] 13.5 0.0000135 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result[1] = 6.5
result[2] = 10
result[3] = 13.5
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `α` | Number | Yes | Scalar coefficient α. |
| `x` | Number | Yes | Vapor quality (0–1). |
| `y` | Number | Yes | Value / second coordinate. |
