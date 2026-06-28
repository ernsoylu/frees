---
name: fanno_t_tstar
category: Compressible Flow
summary: Fanno static-temperature ratio
related: []
examples: []
tags: [fanno, tstar, compressible, flow]
references:
  - "Çengel, Y.A., Boles, M.A. & Kanoğlu, M., Thermodynamics: An Engineering Approach, Ch. 17, Ch. 17 (Fanno)"
---

# fanno_t_tstar

Fanno static-temperature ratio


## Syntax

```
fanno_T_Tstar(M, k)
```

## Description

Fanno static-temperature ratio

## Mathematical Formulation

$$ \frac{T}{T^*} = \frac{k+1}{2 + (k-1)M^2} $$

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `M` | Number | Yes | Numeric argument. |
| `k` | Number | Yes | Numeric argument. |

## References

1. Çengel, Y.A., Boles, M.A. & Kanoğlu, M., Thermodynamics: An Engineering Approach, Ch. 17.
2. Anderson, J.D., Modern Compressible Flow (3rd ed.).

