---
name: dp_gravity
category: Heat Transfer
summary: dP [Pa], static head. SIDE: two-phase refrigerant in a vertical riser/downcomer. HX: evaporator/condenser vertical passes
related: []
examples: []
tags: [dp, gravity, heat, transfer]
references:
  - "Collier, J.G. & Thome, J.R., Convective Boiling and Condensation (3rd ed.)"
---

# dp_gravity

dP [Pa], static head. SIDE: two-phase refrigerant in a vertical riser/downcomer. HX: evaporator/condenser vertical passes


## Syntax

```
dp_gravity(rho_l, rho_g, alpha, L, theta_deg)
```

## Description

dP [Pa], static head. SIDE: two-phase refrigerant in a vertical riser/downcomer. HX: evaporator/condenser vertical passes

## Mathematical Formulation

$$ \Delta P_{\text{grav}} = \big[\alpha\rho_g + (1-\alpha)\rho_l\big]\,g\,L\sin\theta $$

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `rho_l` | Number | Yes | Numeric argument. |
| `rho_g` | Number | Yes | Numeric argument. |
| `alpha` | Number | Yes | Numeric argument. |
| `L` | Number | Yes | Numeric argument. |
| `theta_deg` | Number | Yes | Numeric argument. |

## References

1. Incropera, F.P. et al., Fundamentals of Heat and Mass Transfer.
2. Kakaç, S. et al., Heat Exchangers: Selection, Rating, and Thermal Design.

