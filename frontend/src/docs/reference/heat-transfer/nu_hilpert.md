---
name: nu_hilpert
category: Heat Transfer
summary: Nu, single-cylinder cross-flow. SIDE: air/gas over a single tube. HX: bare-tube / sparse-bank air side
related: []
examples: []
tags: [nu, hilpert, heat, transfer]
references:
  - "Incropera, F.P. et al., Fundamentals of Heat and Mass Transfer, Eq. (7.52)"
---

# nu_hilpert

Nu, single-cylinder cross-flow. SIDE: air/gas over a single tube. HX: bare-tube / sparse-bank air side


## Syntax

```
nu_hilpert(Re, Pr)
```

## Description

Nu, single-cylinder cross-flow. SIDE: air/gas over a single tube. HX: bare-tube / sparse-bank air side

## Mathematical Formulation

$$ Nu = C\,Re^{m}\,Pr^{1/3} \quad\text{(single cylinder, Hilpert)} $$

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `Re` | Number | Yes | Reynolds number. |
| `Pr` | Number | Yes | Prandtl number. |

## References

1. Incropera, F.P. et al., Fundamentals of Heat and Mass Transfer.
2. Kakaç, S. et al., Heat Exchangers: Selection, Rating, and Thermal Design.

