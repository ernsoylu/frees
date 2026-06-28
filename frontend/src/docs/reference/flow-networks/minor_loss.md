---
name: minor_loss
category: Flow Networks
summary: Minor (fitting) pressure loss K*0.5*rho*V^2 [Pa]
related: []
examples: []
tags: [minor, loss, flow, networks]
references:
  - "the standard literature, a standard fluids text"
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

1. the standard literature, a standard fluids text.
2. the standard literature, I.E., Handbook of Hydraulic Resistance.

