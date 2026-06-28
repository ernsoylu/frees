---
name: nu_gnielinski
category: Two-Phase Flow
summary: Gnielinski single-phase Nusselt number
related: []
examples: []
tags: [nu, gnielinski, two, phase, flow]
references:
  - "the standard literature, F.P. et al., Fundamentals of Heat and Mass Transfer, Eq. (8.62)"
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
| `Re` | Number | Yes | Reynolds number. |
| `Pr` | Number | Yes | Prandtl number. |

## References

1. the standard literature, J.G. & the standard literature, J.R., a standard two-phase text (3rd ed.).

