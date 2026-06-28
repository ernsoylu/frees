---
name: dp_2phase_avg
category: Heat Transfer
summary: dP [Pa], quality-integrated (n cells). SIDE: two-phase refrigerant along an evaporator/condenser pass
related: []
examples: []
tags: [dp, 2phase, avg, heat, transfer]
references:
  - "Collier, J.G. & Thome, J.R., Convective Boiling and Condensation (3rd ed.)"
---

# dp_2phase_avg

dP [Pa], quality-integrated (n cells). SIDE: two-phase refrigerant along an evaporator/condenser pass


## Syntax

```
dp_2phase_avg(fluid$, P, x_in, x_out, mdot, Dh, Aflow, L, n)
```

## Description

dP [Pa], quality-integrated (n cells). SIDE: two-phase refrigerant along an evaporator/condenser pass

## Mathematical Formulation

$$ \Delta P = \frac{1}{n}\sum_{i=1}^{n} \phi_l^2(x_i)\,\left(\frac{dP}{dz}\right)_{l,i} \Delta z \quad\text{(quality-integrated)} $$

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `fluid$` | String | Yes | String argument. |
| `P` | Number | Yes | Numeric argument. |
| `x_in` | Number | Yes | Numeric argument. |
| `x_out` | Number | Yes | Numeric argument. |
| `mdot` | Number | Yes | Numeric argument. |
| `Dh` | Number | Yes | Numeric argument. |
| `Aflow` | Number | Yes | Numeric argument. |
| `L` | Number | Yes | Numeric argument. |
| `n` | Number | Yes | Numeric argument. |

## References

1. Incropera, F.P. et al., Fundamentals of Heat and Mass Transfer.
2. Kakaç, S. et al., Heat Exchangers: Selection, Rating, and Thermal Design.

