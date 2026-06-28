---
name: dp_1phase
category: Heat Transfer
summary: dP [Pa], Darcy. SIDE: single-phase liquid/gas line (coolant, water, air channel, pipe). HX: radiator/CAC fluid channels
related: []
examples: []
tags: [dp, 1phase, heat, transfer]
references:
  - "White, F.M., Fluid Mechanics (8th ed.)"
---

# dp_1phase

dP [Pa], Darcy. SIDE: single-phase liquid/gas line (coolant, water, air channel, pipe). HX: radiator/CAC fluid channels


## Syntax

```
dp_1phase(fluid$, P, T, mdot, Dh, Aflow, L)
```

## Description

dP [Pa], Darcy. SIDE: single-phase liquid/gas line (coolant, water, air channel, pipe). HX: radiator/CAC fluid channels

## Mathematical Formulation

$$ \Delta P = f\,\frac{L}{D_h}\,\frac{G^2}{2\rho}, \qquad G = \dot m / A_{\text{flow}} \quad\text{(Darcy)} $$

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `fluid$` | String | Yes | String argument. |
| `P` | Number | Yes | Numeric argument. |
| `T` | Number | Yes | Numeric argument. |
| `mdot` | Number | Yes | Numeric argument. |
| `Dh` | Number | Yes | Numeric argument. |
| `Aflow` | Number | Yes | Numeric argument. |
| `L` | Number | Yes | Numeric argument. |

## References

1. Incropera, F.P. et al., Fundamentals of Heat and Mass Transfer.
2. Kakaç, S. et al., Heat Exchangers: Selection, Rating, and Thermal Design.

