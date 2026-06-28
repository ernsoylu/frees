---
name: lm_phi2
category: Two-Phase Flow
summary: Chisholm two-phase multiplier 1+C/X+1/X^2 on the liquid-alone drop
related: []
examples: []
tags: [lm, phi2, two, phase, flow]
references:
  - "Collier, J.G. & Thome, J.R., Convective Boiling and Condensation (3rd ed.), Eq. (2.68)"
---

# lm_phi2

Chisholm two-phase multiplier 1+C/X+1/X^2 on the liquid-alone drop


## Syntax

```
lm_phi2(X, C)
```

## Description

Chisholm two-phase multiplier 1+C/X+1/X^2 on the liquid-alone drop

## Mathematical Formulation

$$ \phi_l^2 = 1 + \frac{C}{X} + \frac{1}{X^2} \quad\text{(Chisholm)} $$

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `X` | Number | Yes | Numeric argument. |
| `C` | Number | Yes | Numeric argument. |

## References

1. Collier, J.G. & Thome, J.R., Convective Boiling and Condensation (3rd ed.).

