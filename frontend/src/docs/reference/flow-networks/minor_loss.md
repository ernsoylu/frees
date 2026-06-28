---
name: minor_loss
category: Flow Networks
summary: Minor (fitting) pressure loss K*0.5*rho*V^2 [Pa]
related: []
examples: []
tags: [minor, loss, flow, networks]
references:
  - "White, F.M., Fluid Mechanics (8th ed.)"
---

# minor_loss

Minor (fitting) pressure loss K*0.5*rho*V^2 [Pa]


## Syntax

```
minor_loss(K, rho, V)
```

## Description

Minor (fitting) pressure loss K*0.5*rho*V^2 [Pa]

## Mathematical Formulation

$$ \Delta P = K\,\tfrac12\rho V^2 $$

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `K` | Number | Yes | Numeric argument. |
| `rho` | Number | Yes | Numeric argument. |
| `V` | Number | Yes | Numeric argument. |

## References

1. White, F.M., Fluid Mechanics (8th ed.).
2. Idelchik, I.E., Handbook of Hydraulic Resistance.

