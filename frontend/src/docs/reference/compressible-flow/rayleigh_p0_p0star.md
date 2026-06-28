---
name: rayleigh_p0_p0star
category: Compressible Flow
summary: Rayleigh stagnation-pressure ratio
related: []
examples: []
tags: [rayleigh, p0, p0star, compressible, flow]
references:
  - "the standard literature, Y.A., the standard literature, M.A. & Kanoğlu, M., a standard thermodynamics text, Ch. 17, Ch. 17 (Rayleigh)"
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
| `M` | Number | Yes | Numeric argument. |
| `k` | Number | Yes | Numeric argument. |

## References

1. the standard literature, Y.A., the standard literature, M.A. & Kanoğlu, M., a standard thermodynamics text, Ch. 17.
2. Anderson, J.D., Modern Compressible Flow (3rd ed.).

