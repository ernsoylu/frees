---
name: rayleigh_p_pstar
category: Compressible Flow
summary: Rayleigh static-pressure ratio
related: []
examples: []
tags: [rayleigh, pstar, compressible, flow]
references:
  - "Çengel, Y.A., Boles, M.A. & Kanoğlu, M., Thermodynamics: An Engineering Approach, Ch. 17, Ch. 17 (Rayleigh)"
---

# rayleigh_p_pstar

Rayleigh static-pressure ratio


## Syntax

```
rayleigh_P_Pstar(M, k)
```

## Description

Rayleigh static-pressure ratio

## Mathematical Formulation

$$ \frac{P}{P^*} = \frac{k+1}{1 + kM^2} $$

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `M` | Number | Yes | Numeric argument. |
| `k` | Number | Yes | Numeric argument. |

## References

1. Çengel, Y.A., Boles, M.A. & Kanoğlu, M., Thermodynamics: An Engineering Approach, Ch. 17.
2. Anderson, J.D., Modern Compressible Flow (3rd ed.).

