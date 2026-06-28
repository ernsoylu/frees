---
name: nu_dittus_boelter
category: Two-Phase Flow
summary: Dittus-Boelter single-phase Nusselt 0.023 Re^0.8 Pr^n
related: []
examples: []
tags: [nu, dittus, boelter, two, phase, flow]
references:
  - "Incropera, F.P. et al., Fundamentals of Heat and Mass Transfer, Eq. (8.60)"
---

# nu_dittus_boelter

Dittus-Boelter single-phase Nusselt 0.023 Re^0.8 Pr^n


## Syntax

```
nu_dittus_boelter(Re, Pr, n)
```

## Description

Dittus-Boelter single-phase Nusselt 0.023 Re^0.8 Pr^n

## Mathematical Formulation

$$ Nu = 0.023\,Re^{0.8}\,Pr^{n} \quad (n = 0.4 \text{ heating},\ 0.3 \text{ cooling}) $$

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `Re` | Number | Yes | Numeric argument. |
| `Pr` | Number | Yes | Numeric argument. |
| `n` | Number | Yes | Numeric argument. |

## References

1. Collier, J.G. & Thome, J.R., Convective Boiling and Condensation (3rd ed.).

