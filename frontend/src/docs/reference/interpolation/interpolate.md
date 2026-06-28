---
name: interpolate
category: Interpolation
summary: Linear interpolation of table t at x (same as t(x))
related: []
examples: []
tags: [interpolate, interpolation]
references:
  - "Press, W.H. et al., Numerical Recipes (3rd ed.), §3.1"
---

# interpolate

Linear interpolation of table t at x (same as t(x))


## Syntax

```
Interpolate('t', x)
```

## Description

Linear interpolation of table t at x (same as t(x))

## Mathematical Formulation

$$ y = y_i + (y_{i+1}-y_i)\frac{x - x_i}{x_{i+1} - x_i} \quad\text{(linear)} $$

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `'t'` | Number | Yes | Numeric argument. |
| `x` | Number | Yes | Numeric argument. |

## References

1. Press, W.H. et al., Numerical Recipes (3rd ed.), Ch. 3.

