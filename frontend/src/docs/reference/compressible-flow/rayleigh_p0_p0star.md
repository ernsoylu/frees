---
name: rayleigh_p0_p0star
category: Compressible Flow
summary: Rayleigh stagnation-pressure ratio
related: []
examples: []
tags: [rayleigh, p0, p0star, compressible, flow]
references:
  - "Çengel, Y.A., Boles, M.A. & Kanoğlu, M., Thermodynamics: An Engineering Approach, Ch. 17, Ch. 17 (Rayleigh)"
---

# rayleigh_p0_p0star

Rayleigh stagnation-pressure ratio


## Syntax

```
rayleigh_P0_P0star(M, k)
```

## Description

Rayleigh stagnation-pressure ratio

## Mathematical Formulation

$$ \frac{P_0}{P_0^*} = \frac{k+1}{1+kM^2}\left[\frac{2 + (k-1)M^2}{k+1}\right]^{k/(k-1)} $$

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `M` | Number | Yes | Mach number. |
| `k` | Number | Yes | Ratio of specific heats (e.g. 1.4 for air). |

## References

1. Çengel, Y.A., Boles, M.A. & Kanoğlu, M., Thermodynamics: An Engineering Approach, Ch. 17.
2. Anderson, J.D., Modern Compressible Flow (3rd ed.).

