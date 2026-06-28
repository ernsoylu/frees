---
name: mix_cp
category: Combustion
summary: Ideal-gas mixture cp [J/kg-K]
related: []
examples: []
tags: [mix, cp, combustion]
references:
  - "Turns, S.R., An Introduction to Combustion (3rd ed.)"
---

# mix_cp

Ideal-gas mixture cp [J/kg-K]


## Syntax

```
mix_cp(comp$, T)
```

## Description

Ideal-gas mixture cp [J/kg-K]

## Mathematical Formulation

$$ c_p = \sum_i Y_i\,c_{p,i}(T) \quad\text{(mass-weighted, NASA-7)} $$

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `comp$` | String | Yes | String argument. |
| `T` | Number | Yes | Numeric argument. |

## References

1. Turns, S.R., An Introduction to Combustion (3rd ed.).
2. Heywood, J.B., Internal Combustion Engine Fundamentals.

