---
name: j_fin
category: Heat Transfer
summary: Colburn j for a compact fin surface (plain|wavy|louvered|offset). SIDE: air/gas finned side. HX: plate-fin/louvered/offset-strip radiator, condenser, CAC
related: []
examples: []
tags: [fin, heat, transfer]
references:
  - "Kays, W.M. & London, A.L., Compact Heat Exchangers (3rd ed.)"
---

# j_fin

Colburn j for a compact fin surface (plain|wavy|louvered|offset). SIDE: air/gas finned side. HX: plate-fin/louvered/offset-strip radiator, condenser, CAC


## Syntax

```
j_fin(surface$, Re)
```

## Description

Colburn j for a compact fin surface (plain|wavy|louvered|offset). SIDE: air/gas finned side. HX: plate-fin/louvered/offset-strip radiator, condenser, CAC

## Mathematical Formulation

$$ j = St\,Pr^{2/3} = C\,Re^{m} \quad\text{(Colburn } j \text{ for the fin surface)} $$

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `surface$` | String | Yes | Selector — One of `plain`, `wavy`, `louvered`, `offset`. |
| `Re` | Number | Yes | Reynolds number. |

## References

1. Incropera, F.P. et al., Fundamentals of Heat and Mass Transfer.
2. Kakaç, S. et al., Heat Exchangers: Selection, Rating, and Thermal Design.

