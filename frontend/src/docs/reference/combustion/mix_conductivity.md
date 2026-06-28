---
name: mix_conductivity
category: Combustion
summary: Ideal-gas mixture conductivity [W/m-K]
related: []
examples: []
tags: [mix, conductivity, combustion]
references:
  - "Mason, E.A. & Saxena, S.C. (1958), Phys. Fluids 1:361"
---

# mix_conductivity

Ideal-gas mixture conductivity [W/m-K]


## Syntax

```
mix_conductivity(comp$, T)
```

## Description

Ideal-gas mixture conductivity [W/m-K]

## Mathematical Formulation

$$ \lambda = \sum_i \frac{y_i \lambda_i}{\sum_j y_j \phi_{ij}} \quad\text{(Wassiljewa/Wilke)} $$

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `comp$` | String | Yes | Mixture composition string, e.g. 'N2:0.79,O2:0.21'. |
| `T` | Number | Yes | Temperature [K]. |

## References

1. Turns, S.R., An Introduction to Combustion (3rd ed.).
2. Heywood, J.B., Internal Combustion Engine Fundamentals.

