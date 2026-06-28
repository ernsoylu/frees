---
name: rayleigh_t_tstar
category: Compressible Flow
summary: Rayleigh static-temperature ratio
related: []
examples: []
tags: [rayleigh, tstar, compressible, flow]
references:
  - "Çengel, Y.A., Boles, M.A. & Kanoğlu, M., Thermodynamics: An Engineering Approach, Ch. 17, Ch. 17 (Rayleigh)"
---

# rayleigh_t_tstar

Rayleigh static-temperature ratio


## Syntax

```
rayleigh_T_Tstar(M, k)
```

## Description

Rayleigh static-temperature ratio

## Mathematical Formulation

$$ \frac{T}{T^*} = \left(\frac{(k+1)M}{1 + kM^2}\right)^2 $$

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `M` | Number | Yes | Numeric argument. |
| `k` | Number | Yes | Numeric argument. |

## References

1. Çengel, Y.A., Boles, M.A. & Kanoğlu, M., Thermodynamics: An Engineering Approach, Ch. 17.
2. Anderson, J.D., Modern Compressible Flow (3rd ed.).

