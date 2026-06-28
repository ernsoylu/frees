---
name: nu_tubebank
category: Heat Transfer
summary: Nu, Zukauskas tube bank (arr$=inline|staggered, Re-band C,m). SIDE: air/gas over a tube bank. HX: fin-and-tube radiator/condenser air side
related: []
examples: []
tags: [nu, tubebank, heat, transfer]
references:
  - "Žukauskas, A. (1972), Adv. Heat Transfer 8:93"
---

# nu_tubebank

Nu, Zukauskas tube bank (arr$=inline|staggered, Re-band C,m). SIDE: air/gas over a tube bank. HX: fin-and-tube radiator/condenser air side


## Syntax

```
nu_tubebank(arr$, Re, Pr)
```

## Description

Nu, Zukauskas tube bank (arr$=inline|staggered, Re-band C,m). SIDE: air/gas over a tube bank. HX: fin-and-tube radiator/condenser air side

## Mathematical Formulation

$$ Nu = C\,Re_{\max}^{m}\,Pr^{0.36}\,(Pr/Pr_w)^{1/4} \quad (C, m \text{ by arrangement/Re band}) $$

## Applicability

- **Where it applies:** Air/gas over an in-line or staggered tube bank.
- **Valid when:** Cross-flow; `arr---
name: nu_tubebank
category: Heat Transfer
summary: Nu, Zukauskas tube bank (arr$=inline|staggered, Re-band C,m). SIDE: air/gas over a tube bank. HX: fin-and-tube radiator/condenser air side
related: []
examples: []
tags: [nu, tubebank, heat, transfer]
references:
  - "Žukauskas, A. (1972), Adv. Heat Transfer 8:93"
---

# nu_tubebank

Nu, Zukauskas tube bank (arr$=inline|staggered, Re-band C,m). SIDE: air/gas over a tube bank. HX: fin-and-tube radiator/condenser air side


## Syntax

```
nu_tubebank(arr$, Re, Pr)
```

## Description

Nu, Zukauskas tube bank (arr$=inline|staggered, Re-band C,m). SIDE: air/gas over a tube bank. HX: fin-and-tube radiator/condenser air side

## Mathematical Formulation

$$ Nu = C\,Re_{\max}^{m}\,Pr^{0.36}\,(Pr/Pr_w)^{1/4} \quad (C, m \text{ by arrangement/Re band}) $$
 selects the arrangement and the Reynolds-band coefficients.
- **How it's used:** Air-side `h` for a fin-and-tube core.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `arr$` | String | Yes | Selector — One of `inline`, `staggered`. |
| `Re` | Number | Yes | Reynolds number. |
| `Pr` | Number | Yes | Prandtl number. |

## References

1. Incropera, F.P. et al., Fundamentals of Heat and Mass Transfer.
2. Kakaç, S. et al., Heat Exchangers: Selection, Rating, and Thermal Design.

