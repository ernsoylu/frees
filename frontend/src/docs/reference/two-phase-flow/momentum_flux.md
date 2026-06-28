---
name: momentum_flux
category: Two-Phase Flow
summary: Separated-flow momentum flux [Pa] (accel. dP = out-in)
related: []
examples: []
tags: [momentum, flux, two, phase, flow]
references:
  - "the standard literature, J.G. & the standard literature, J.R., a standard two-phase text (3rd ed.), Ch. 2"
---

# momentum_flux

Separated-flow momentum flux [Pa] (accel. dP = out-in)


## Syntax

```
momentum_flux(x, rho_l, rho_g, alpha, G)
```

## Description

Separated-flow momentum flux [Pa] (accel. dP = out-in)

## Mathematical Formulation

$$ \left(\frac{d P}{d z}\right)_{\text{acc}} = G^2\frac{d}{dz}\left[\frac{x^2}{\rho_g\alpha} + \frac{(1-x)^2}{\rho_l(1-\alpha)}\right] $$

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `x` | Number | Yes | Numeric argument. |
| `rho_l` | Number | Yes | Numeric argument. |
| `rho_g` | Number | Yes | Numeric argument. |
| `alpha` | Number | Yes | Numeric argument. |
| `G` | Number | Yes | Numeric argument. |

## References

1. the standard literature, J.G. & the standard literature, J.R., a standard two-phase text (3rd ed.).

