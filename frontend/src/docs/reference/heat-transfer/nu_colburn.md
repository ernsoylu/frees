---
name: nu_colburn
category: Heat Transfer
summary: Nu=j*Re*Pr^(1/3). SIDE: air/gas through a compact finned surface. HX: plate-fin/louvered-fin air side
related: []
examples: []
tags: [nu, colburn, heat, transfer]
references:
  - "Incropera, F.P. et al., Fundamentals of Heat and Mass Transfer"
---

# nu_colburn

Nu=j*Re*Pr^(1/3). SIDE: air/gas through a compact finned surface. HX: plate-fin/louvered-fin air side


## Syntax

```
nu_colburn(j, Re, Pr)
```

## Description

Nu=j*Re*Pr^(1/3). SIDE: air/gas through a compact finned surface. HX: plate-fin/louvered-fin air side

## Mathematical Formulation

$$ Nu = j\,Re\,Pr^{1/3} \quad\text{(Colburn } j\text{-factor)} $$

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `j` | Number | Yes | Colburn j-factor. |
| `Re` | Number | Yes | Reynolds number. |
| `Pr` | Number | Yes | Prandtl number. |

## References

1. Incropera, F.P. et al., Fundamentals of Heat and Mass Transfer.
2. Kakaç, S. et al., Heat Exchangers: Selection, Rating, and Thermal Design.

