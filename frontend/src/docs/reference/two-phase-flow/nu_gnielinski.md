---
name: nu_gnielinski
category: Two-Phase Flow
summary: Gnielinski single-phase Nusselt number
related: []
examples: []
tags: [nu, gnielinski, two, phase, flow]
references:
  - "Incropera, F.P. et al., Fundamentals of Heat and Mass Transfer, Eq. (8.62)"
---

# nu_gnielinski

Gnielinski single-phase Nusselt number


## Syntax

```
nu_gnielinski(Re, Pr)
```

## Description

Gnielinski single-phase Nusselt number

## Mathematical Formulation

$$ Nu = \frac{(f/8)(Re-1000)Pr}{1 + 12.7\sqrt{f/8}\,(Pr^{2/3}-1)} $$

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `Re` | Number | Yes | Numeric argument. |
| `Pr` | Number | Yes | Numeric argument. |

## References

1. Collier, J.G. & Thome, J.R., Convective Boiling and Condensation (3rd ed.).

