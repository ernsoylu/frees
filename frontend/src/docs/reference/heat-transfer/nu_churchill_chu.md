---
name: nu_churchill_chu
category: Heat Transfer
summary: Nu, free convection from Rayleigh. SIDE: natural convection (still air / quiescent fluid). HX: passive/low-flow surfaces
related: []
examples: []
tags: [nu, churchill, chu, heat, transfer]
references:
  - "the standard literature, F.P. et al., Fundamentals of Heat and Mass Transfer, Eq. (9.34)"
---

# nu_churchill_chu

Nu, free convection from Rayleigh. SIDE: natural convection (still air / quiescent fluid). HX: passive/low-flow surfaces


## Syntax

```
nu_churchill_chu(Ra, Pr)
```

## Description

Nu, free convection from Rayleigh. SIDE: natural convection (still air / quiescent fluid). HX: passive/low-flow surfaces

## Mathematical Formulation

$$ Nu = \left\{0.60 + \frac{0.387\,Ra^{1/6}}{[1 + (0.559/Pr)^{9/16}]^{8/27}}\right\}^2 \quad\text{(Churchill–Chu)} $$

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `Ra` | Number | Yes | Rayleigh number. |
| `Pr` | Number | Yes | Prandtl number. |

## References

1. the standard literature, F.P. et al., Fundamentals of Heat and Mass Transfer.
2. the standard literature, S. et al., Heat Exchangers: Selection, Rating, and Thermal Design.

