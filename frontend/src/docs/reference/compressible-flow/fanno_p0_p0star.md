---
name: fanno_p0_p0star
category: Compressible Flow
summary: Fanno stagnation-pressure ratio
related: []
examples: []
tags: [fanno, p0, p0star, compressible, flow]
references:
  - "Çengel, Y.A., Boles, M.A. & Kanoğlu, M., Thermodynamics: An Engineering Approach, Ch. 17, Ch. 17 (Fanno)"
---

# fanno_p0_p0star

Fanno stagnation-pressure ratio


## Syntax

```
fanno_P0_P0star(M, k)
```

## Description

Fanno stagnation-pressure ratio

## Mathematical Formulation

$$ \frac{P_0}{P_0^*} = \frac{1}{M}\left[\frac{2 + (k-1)M^2}{k+1}\right]^{(k+1)/[2(k-1)]} $$

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `M` | Number | Yes | Mach number. |
| `k` | Number | Yes | Ratio of specific heats (e.g. 1.4 for air). |

## References

1. Çengel, Y.A., Boles, M.A. & Kanoğlu, M., Thermodynamics: An Engineering Approach, Ch. 17.
2. Anderson, J.D., Modern Compressible Flow (3rd ed.).

