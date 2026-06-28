---
name: nu_zukauskas
category: Heat Transfer
summary: Nu, tube-bank cross-flow. SIDE: air/gas over a tube bank. HX: fin-and-tube radiator/condenser air side
related: []
examples: []
tags: [nu, zukauskas, heat, transfer]
references:
  - "Žukauskas, A. (1972), Adv. Heat Transfer 8:93"
---

# nu_zukauskas

Nu, tube-bank cross-flow. SIDE: air/gas over a tube bank. HX: fin-and-tube radiator/condenser air side


## Syntax

```
nu_zukauskas(Re, Pr)
```

## Description

Nu, tube-bank cross-flow. SIDE: air/gas over a tube bank. HX: fin-and-tube radiator/condenser air side

## Mathematical Formulation

$$ Nu = C\,Re_{\max}^{m}\,Pr^{0.36}\,(Pr/Pr_w)^{1/4} \quad\text{(tube bank)} $$

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `Re` | Number | Yes | Numeric argument. |
| `Pr` | Number | Yes | Numeric argument. |

## References

1. Incropera, F.P. et al., Fundamentals of Heat and Mass Transfer.
2. Kakaç, S. et al., Heat Exchangers: Selection, Rating, and Thermal Design.

