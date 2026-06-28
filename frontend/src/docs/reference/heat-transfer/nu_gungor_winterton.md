---
name: nu_gungor_winterton
category: Heat Transfer
summary: Nu, Gungor-Winterton flow boiling from liquid-only Nu. SIDE: boiling two-phase refrigerant. HX: evaporator refrigerant side
related: []
examples: []
tags: [nu, gungor, winterton, heat, transfer]
references:
  - "Gungor, K.E. & Winterton, R.H.S. (1986), Int. J. Heat Mass Transfer 29:351"
---

# nu_gungor_winterton

Nu, Gungor-Winterton flow boiling from liquid-only Nu. SIDE: boiling two-phase refrigerant. HX: evaporator refrigerant side


## Syntax

```
nu_gungor_winterton(Nu_l, Xtt, Bo)
```

## Description

Nu, Gungor-Winterton flow boiling from liquid-only Nu. SIDE: boiling two-phase refrigerant. HX: evaporator refrigerant side

## Mathematical Formulation

$$ Nu = Nu_l\big[1 + 3000\,Bo^{0.86} + 1.12(x/(1-x))^{0.75}(\rho_l/\rho_g)^{0.41}\big] \quad\text{(Gungor–Winterton)} $$

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `Nu_l` | Number | Yes | Numeric argument. |
| `Xtt` | Number | Yes | Numeric argument. |
| `Bo` | Number | Yes | Numeric argument. |

## References

1. Incropera, F.P. et al., Fundamentals of Heat and Mass Transfer.
2. Kakaç, S. et al., Heat Exchangers: Selection, Rating, and Thermal Design.

