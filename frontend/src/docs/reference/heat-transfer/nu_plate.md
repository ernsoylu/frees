---
name: nu_plate
category: Heat Transfer
summary: Nu, chevron-angle dependent. SIDE: either single-phase stream in a brazed/gasketed PLATE HX. HX: plate heat exchanger (BPHE)
related: []
examples: []
tags: [nu, plate, heat, transfer]
references:
  - "Shah, R.K. & Sekulić, D.P., Fundamentals of Heat Exchanger Design, Ch. 7"
---

# nu_plate

Nu, chevron-angle dependent. SIDE: either single-phase stream in a brazed/gasketed PLATE HX. HX: plate heat exchanger (BPHE)


## Syntax

```
nu_plate(Re, Pr, beta_deg)
```

## Description

Nu, chevron-angle dependent. SIDE: either single-phase stream in a brazed/gasketed PLATE HX. HX: plate heat exchanger (BPHE)

## Mathematical Formulation

$$ Nu = C(\beta)\,Re^{m}\,Pr^{1/3} \quad\text{(chevron plate, angle } \beta) $$

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `Re` | Number | Yes | Reynolds number. |
| `Pr` | Number | Yes | Prandtl number. |
| `beta_deg` | Number | Yes | Chevron / wave angle [deg]. |

## References

1. Incropera, F.P. et al., Fundamentals of Heat and Mass Transfer.
2. Kakaç, S. et al., Heat Exchangers: Selection, Rating, and Thermal Design.

