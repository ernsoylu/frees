---
name: friction_factor
category: Flow Networks
summary: Darcy friction factor (Colebrook-Moody, laminar+turbulent)
related: []
examples: []
tags: [friction, factor, flow, networks]
references:
  - "White, F.M., Fluid Mechanics (8th ed.)"
  - "Colebrook, C.F. (1939), J. Inst. Civ. Eng. 11:133"
---

# friction_factor

Darcy friction factor (Colebrook-Moody, laminar+turbulent)


## Syntax

```
friction_factor(Re, rel_rough)
```

## Description

Darcy friction factor (Colebrook-Moody, laminar+turbulent)

## Mathematical Formulation

$$ \frac{1}{\sqrt{f}} = -2\log_{10}\!\left(\frac{\varepsilon/D}{3.7} + \frac{2.51}{Re\sqrt{f}}\right) \quad\text{(Colebrook; } f = 64/Re \text{ laminar)} $$

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `Re` | Number | Yes | Numeric argument. |
| `rel_rough` | Number | Yes | Numeric argument. |

## References

1. White, F.M., Fluid Mechanics (8th ed.).
2. Idelchik, I.E., Handbook of Hydraulic Resistance.

