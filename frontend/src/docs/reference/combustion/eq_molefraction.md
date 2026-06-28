---
name: eq_molefraction
category: Combustion
summary: Equilibrium product mole fraction (dissociation)
related: []
examples: []
tags: [eq, molefraction, combustion]
references:
  - "Turns, S.R., An Introduction to Combustion (3rd ed.), Ch. 2"
---

# eq_molefraction

Equilibrium product mole fraction (dissociation)


## Syntax

```
eq_molefraction(fuel$, phi, T, P, species$)
```

## Description

Equilibrium product mole fraction (dissociation)

## Mathematical Formulation

$$ \text{species mole fraction from chemical equilibrium } \big(\min G \text{ at } T, P\big) $$

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `fuel$` | String | Yes | String argument. |
| `phi` | Number | Yes | Numeric argument. |
| `T` | Number | Yes | Numeric argument. |
| `P` | Number | Yes | Numeric argument. |
| `species$` | String | Yes | String argument. |

## References

1. Turns, S.R., An Introduction to Combustion (3rd ed.).
2. Heywood, J.B., Internal Combustion Engine Fundamentals.

