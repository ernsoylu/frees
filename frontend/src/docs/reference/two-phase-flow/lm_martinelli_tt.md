---
name: lm_martinelli_tt
category: Two-Phase Flow
summary: Turbulent-turbulent Martinelli parameter X_tt
related: []
examples: []
tags: [lm, martinelli, tt, two, phase, flow]
references:
  - "Collier, J.G. & Thome, J.R., Convective Boiling and Condensation (3rd ed.), §2.4"
---

# lm_martinelli_tt

Turbulent-turbulent Martinelli parameter X_tt


## Syntax

```
lm_martinelli_tt(x, rho_l, rho_g, mu_l, mu_g)
```

## Description

Turbulent-turbulent Martinelli parameter X_tt

## Mathematical Formulation

$$ X_{tt} = \left(\frac{1-x}{x}\right)^{0.9}\left(\frac{\rho_g}{\rho_l}\right)^{0.5}\left(\frac{\mu_l}{\mu_g}\right)^{0.1} $$

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `x` | Number | Yes | Numeric argument. |
| `rho_l` | Number | Yes | Numeric argument. |
| `rho_g` | Number | Yes | Numeric argument. |
| `mu_l` | Number | Yes | Numeric argument. |
| `mu_g` | Number | Yes | Numeric argument. |

## References

1. Collier, J.G. & Thome, J.R., Convective Boiling and Condensation (3rd ed.).

