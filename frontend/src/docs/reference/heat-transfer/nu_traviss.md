---
name: nu_traviss
category: Heat Transfer
summary: Nu, Traviss in-tube condensation. SIDE: condensing two-phase refrigerant. HX: tube/microchannel condenser refrigerant side
related: []
examples: []
tags: [nu, traviss, heat, transfer]
references:
  - "Traviss, D.P. et al. (1973), ASHRAE Trans. 79:157"
---

# nu_traviss

Nu, Traviss in-tube condensation. SIDE: condensing two-phase refrigerant. HX: tube/microchannel condenser refrigerant side


## Syntax

```
nu_traviss(Re_l, Pr_l, Xtt)
```

## Description

Nu, Traviss in-tube condensation. SIDE: condensing two-phase refrigerant. HX: tube/microchannel condenser refrigerant side

## Mathematical Formulation

$$ Nu = \frac{Pr_l\,Re_l^{0.9}\,F(X_{tt})}{F_2} \quad\text{(Traviss condensation)} $$

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `Re_l` | Number | Yes | Liquid-only Reynolds number. |
| `Pr_l` | Number | Yes | Liquid Prandtl number. |
| `Xtt` | Number | Yes | Turbulent–turbulent Martinelli parameter. |

## References

1. Incropera, F.P. et al., Fundamentals of Heat and Mass Transfer.
2. Kakaç, S. et al., Heat Exchangers: Selection, Rating, and Thermal Design.

