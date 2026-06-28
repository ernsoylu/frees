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

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `α` | Number | Yes | Numeric argument. |
| `A` | Number | Yes | Numeric argument. |
| `x` | Number | Yes | Numeric argument. |
| `β` | Number | Yes | Numeric argument. |
| `y` | Number | Yes | Numeric argument. |

