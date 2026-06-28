---
name: dp_mueller_steinhagen
category: Heat Transfer
summary: dP [Pa], Mueller-Steinhagen-Heck. SIDE: two-phase refrigerant (alt to dp_2phase). HX: evaporator/condenser refrigerant line
related: []
examples: []
tags: [dp, mueller, steinhagen, heat, transfer]
references:
  - "Müller-Steinhagen, H. & Heck, K. (1986), Chem. Eng. Process. 20:297"
---

# dp_mueller_steinhagen

dP [Pa], Mueller-Steinhagen-Heck. SIDE: two-phase refrigerant (alt to dp_2phase). HX: evaporator/condenser refrigerant line


## Syntax

```
dp_mueller_steinhagen(fluid$, P, x, mdot, Dh, Aflow, L)
```

## Description

dP [Pa], Mueller-Steinhagen-Heck. SIDE: two-phase refrigerant (alt to dp_2phase). HX: evaporator/condenser refrigerant line

## Mathematical Formulation

$$ \frac{dP}{dz} = G_{ms}(1-x)^{1/3} + B\,x^3, \quad G_{ms} = A + 2(B-A)x \quad\text{(Müller-Steinhagen–Heck)} $$

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `fluid$` | String | Yes | String argument. |
| `P` | Number | Yes | Numeric argument. |
| `x` | Number | Yes | Numeric argument. |
| `mdot` | Number | Yes | Numeric argument. |
| `Dh` | Number | Yes | Numeric argument. |
| `Aflow` | Number | Yes | Numeric argument. |
| `L` | Number | Yes | Numeric argument. |

## References

1. Incropera, F.P. et al., Fundamentals of Heat and Mass Transfer.
2. Kakaç, S. et al., Heat Exchangers: Selection, Rating, and Thermal Design.

