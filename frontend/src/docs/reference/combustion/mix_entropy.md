---
name: mix_entropy
category: Combustion
summary: Ideal-gas mixture entropy [J/kg-K]
related: []
examples: []
tags: [mix, entropy, combustion]
references:
  - "Turns, S.R., An Introduction to Combustion (3rd ed.)"
---

# mix_entropy

Ideal-gas mixture entropy [J/kg-K]


## Syntax

```
mix_entropy(comp$, T, P)
```

## Description

Ideal-gas mixture entropy [J/kg-K]

## Mathematical Formulation

$$ s = \sum_i Y_i\big[s_i(T) - R_i\ln(y_i P/P_0)\big] $$

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `comp$` | String | Yes | String argument. |
| `T` | Number | Yes | Numeric argument. |
| `P` | Number | Yes | Numeric argument. |

## References

1. Turns, S.R., An Introduction to Combustion (3rd ed.).
2. Heywood, J.B., Internal Combustion Engine Fundamentals.

