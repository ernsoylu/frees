---
name: friedel_phi2
category: Two-Phase Flow
summary: Friedel two-phase frictional multiplier on the liquid-only drop
related: []
examples: []
tags: [friedel, phi2, two, phase, flow]
references:
  - "the standard literature, J.G. & the standard literature, J.R., a standard two-phase text (3rd ed.), §2.5"
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
| `x` | Number | Yes | Vapor quality (0–1). |
| `rho_l` | Number | Yes | Saturated-liquid density [kg/m³]. |
| `rho_g` | Number | Yes | Saturated-vapor density [kg/m³]. |
| `mu_l` | Number | Yes | Liquid dynamic viscosity [Pa·s]. |
| `mu_g` | Number | Yes | Vapor dynamic viscosity [Pa·s]. |
| `G` | Number | Yes | Mass flux G = ṁ/Aflow [kg/m²·s]. |
| `D` | Number | Yes | Diameter [m]. |
| `sigma` | Number | Yes | Surface tension [N/m]. |

## References

1. the standard literature, J.G. & the standard literature, J.R., a standard two-phase text (3rd ed.).

