---
name: f_fin
category: Heat Transfer
summary: Fanning friction for a compact fin surface. SIDE: air/gas finned side dP (pair with j_fin). HX: same as j_fin
related: []
examples: []
tags: [fin, heat, transfer]
references:
  - "Kays, W.M. & London, A.L., Compact Heat Exchangers (3rd ed.)"
---

# f_fin

Fanning friction for a compact fin surface. SIDE: air/gas finned side dP (pair with j_fin). HX: same as j_fin


## Syntax

```
f_fin(surface$, Re)
```

## Description

Fanning friction for a compact fin surface. SIDE: air/gas finned side dP (pair with j_fin). HX: same as j_fin

## Mathematical Formulation

$$ f = C_f\,Re^{m_f} \quad\text{(Fanning friction for the fin surface)} $$

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `surface$` | String | Yes | String argument. |
| `Re` | Number | Yes | Numeric argument. |

## References

1. Incropera, F.P. et al., Fundamentals of Heat and Mass Transfer.
2. Kakaç, S. et al., Heat Exchangers: Selection, Rating, and Thermal Design.

