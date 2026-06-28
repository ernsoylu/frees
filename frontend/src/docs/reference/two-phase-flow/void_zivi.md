---
name: void_zivi
category: Two-Phase Flow
summary: Zivi void fraction (slip S=(rho_l/rho_g)^(1/3))
related: []
examples: []
tags: [void, zivi, two, phase, flow]
references:
  - "Zivi, S.M. (1964), J. Heat Transfer 86:247"
---

# void_zivi

Zivi void fraction (slip S=(rho_l/rho_g)^(1/3))


## Syntax

```
void_zivi(x, rho_l, rho_g)
```

## Description

Zivi void fraction (slip S=(rho_l/rho_g)^(1/3))

## Mathematical Formulation

$$ \alpha = \frac{1}{1 + \frac{1-x}{x}\left(\frac{\rho_g}{\rho_l}\right)^{2/3}} \quad\text{(slip } S = (\rho_l/\rho_g)^{1/3}) $$

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `x` | Number | Yes | Vapor quality (0–1). |
| `rho_l` | Number | Yes | Saturated-liquid density [kg/m³]. |
| `rho_g` | Number | Yes | Saturated-vapor density [kg/m³]. |

## References

1. Collier, J.G. & Thome, J.R., Convective Boiling and Condensation (3rd ed.).

