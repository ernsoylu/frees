---
name: gemv
category: Math
summary: BLAS L2: αAx + βy
related: []
examples: []
tags: [gemv, math]
references: []
---

# gemv

BLAS L2: αAx + βy


## Syntax

```
gemv(α, A, x, β, y)
```

## Description

BLAS L2: αAx + βy

## Mathematical Formulation

$$ y \leftarrow \alpha A x + \beta y \quad\text{(BLAS level 2)} $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Apply a linear measurement transform

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
A = [1, 2; 3, 4]
x = [2; 1]
y = [0; 0]
z = gemv(1, A, x, 0, y)

{ CHECK A[1,1] 1 0.000001 }
{ CHECK A[1,2] 2 0.000002 }
{ CHECK A[2,1] 3 0.000003 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
A[1,1] = 1
A[1,2] = 2
A[2,1] = 3
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `α` | Number | Yes | Scalar coefficient α. |
| `A` | Number | Yes | Matrix. |
| `x` | Number | Yes | Vapor quality (0–1). |
| `β` | Number | Yes | Scalar coefficient β. |
| `y` | Number | Yes | Value / second coordinate. |
