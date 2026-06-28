---
name: mix_enthalpy
category: Combustion
summary: Ideal-gas mixture enthalpy [J/kg]
related: []
examples: []
tags: [mix, enthalpy, combustion]
references:
  - "Turns, S.R., An Introduction to Combustion (3rd ed.)"
---

# mix_enthalpy

Ideal-gas mixture enthalpy [J/kg]


## Syntax

```
mix_enthalpy(comp$, T)
```

## Description

Ideal-gas mixture enthalpy [J/kg]

## Mathematical Formulation

$$ h = \sum_i Y_i\,h_i(T) \quad\text{(NASA-7 polynomials)} $$

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `comp$` | String | Yes | String argument. |
| `T` | Number | Yes | Numeric argument. |

## References

1. Turns, S.R., An Introduction to Combustion (3rd ed.).
2. Heywood, J.B., Internal Combustion Engine Fundamentals.

