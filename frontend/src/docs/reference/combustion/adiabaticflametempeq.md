---
name: adiabaticflametempeq
category: Combustion
summary: Adiabatic flame temperature with dissociation [K]
related: []
examples: []
tags: [adiabaticflametempeq, combustion]
references:
  - "Turns, S.R., An Introduction to Combustion (3rd ed.), Ch. 2"
---

# adiabaticflametempeq

Adiabatic flame temperature with dissociation [K]


## Syntax

```
AdiabaticFlameTempEq(fuel$, phi, T_react, P)
```

## Description

Adiabatic flame temperature with dissociation [K]

## Mathematical Formulation

$$ H_{\text{react}}(T_r) = H_{\text{prod}}(T_{ad}) \quad\text{with equilibrium dissociation at } (T_{ad}, P) $$

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `fuel$` | String | Yes | String argument. |
| `phi` | Number | Yes | Numeric argument. |
| `T_react` | Number | Yes | Numeric argument. |
| `P` | Number | Yes | Numeric argument. |

## References

1. Turns, S.R., An Introduction to Combustion (3rd ed.).
2. Heywood, J.B., Internal Combustion Engine Fundamentals.

