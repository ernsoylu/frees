---
name: fanno_p_pstar
category: Compressible Flow
summary: Fanno static-pressure ratio
related: []
examples: []
tags: [fanno, pstar, compressible, flow]
references:
  - "Çengel, Y.A., Boles, M.A. & Kanoğlu, M., Thermodynamics: An Engineering Approach, Ch. 17, Ch. 17 (Fanno)"
---

# fanno_p_pstar

Fanno static-pressure ratio


## Syntax

```
fanno_P_Pstar(M, k)
```

## Description

Fanno static-pressure ratio

## Mathematical Formulation

$$ \frac{P}{P^*} = \frac{1}{M}\sqrt{\frac{k+1}{2 + (k-1)M^2}} $$

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `M` | Number | Yes | Mach number. |
| `k` | Number | Yes | Ratio of specific heats (e.g. 1.4 for air). |

## References

1. Çengel, Y.A., Boles, M.A. & Kanoğlu, M., Thermodynamics: An Engineering Approach, Ch. 17.
2. Anderson, J.D., Modern Compressible Flow (3rd ed.).

