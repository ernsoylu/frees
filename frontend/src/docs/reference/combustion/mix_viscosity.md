---
name: mix_viscosity
category: Combustion
summary: Ideal-gas mixture viscosity [Pa-s] (Chapman-Enskog/Wilke)
related: []
examples: []
tags: [mix, viscosity, combustion]
references:
  - "Wilke, C.R. (1950), J. Chem. Phys. 18:517"
---

# mix_viscosity

Ideal-gas mixture viscosity [Pa-s] (Chapman-Enskog/Wilke)


## Syntax

```
mix_viscosity(comp$, T)
```

## Description

Ideal-gas mixture viscosity [Pa-s] (Chapman-Enskog/Wilke)

## Mathematical Formulation

$$ \mu = \sum_i \frac{y_i \mu_i}{\sum_j y_j \phi_{ij}} \quad\text{(Wilke)} $$

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `comp$` | String | Yes | String argument. |
| `T` | Number | Yes | Numeric argument. |

## References

1. Turns, S.R., An Introduction to Combustion (3rd ed.).
2. Heywood, J.B., Internal Combustion Engine Fundamentals.

