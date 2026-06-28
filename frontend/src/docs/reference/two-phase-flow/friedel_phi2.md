---
name: friedel_phi2
category: Two-Phase Flow
summary: Friedel two-phase frictional multiplier on the liquid-only drop
related: []
examples: []
tags: [friedel, phi2, two, phase, flow]
references:
  - "Collier, J.G. & Thome, J.R., Convective Boiling and Condensation (3rd ed.), §2.5"
---

# friedel_phi2

Friedel two-phase frictional multiplier on the liquid-only drop


## Syntax

```
friedel_phi2(x, rho_l, rho_g, mu_l, mu_g, G, D, sigma)
```

## Description

Friedel two-phase frictional multiplier on the liquid-only drop

## Mathematical Formulation

$$ \phi_{lo}^2 = E + \frac{3.24\,F H}{Fr^{0.045}We^{0.035}} \quad\text{(Friedel)} $$

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `x` | Number | Yes | Numeric argument. |
| `rho_l` | Number | Yes | Numeric argument. |
| `rho_g` | Number | Yes | Numeric argument. |
| `mu_l` | Number | Yes | Numeric argument. |
| `mu_g` | Number | Yes | Numeric argument. |
| `G` | Number | Yes | Numeric argument. |
| `D` | Number | Yes | Numeric argument. |
| `sigma` | Number | Yes | Numeric argument. |

## References

1. Collier, J.G. & Thome, J.R., Convective Boiling and Condensation (3rd ed.).

