---
name: fanno_fld
category: Compressible Flow
summary: Fanno friction parameter 4*f*Lmax/D
related: []
examples: []
tags: [fanno, fld, compressible, flow]
references:
  - "Çengel, Y.A., Boles, M.A. & Kanoğlu, M., Thermodynamics: An Engineering Approach, Ch. 17, Ch. 17 (Fanno)"
---

# fanno_fld

Fanno friction parameter 4*f*Lmax/D


## Syntax

```
fanno_fLD(M, k)
```

## Description

Fanno friction parameter 4*f*Lmax/D

## Mathematical Formulation

$$ \frac{4 f L^*}{D} = \frac{1-M^2}{kM^2} + \frac{k+1}{2k}\ln\frac{(k+1)M^2}{2 + (k-1)M^2} $$

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `M` | Number | Yes | Numeric argument. |
| `k` | Number | Yes | Numeric argument. |

## References

1. Çengel, Y.A., Boles, M.A. & Kanoğlu, M., Thermodynamics: An Engineering Approach, Ch. 17.
2. Anderson, J.D., Modern Compressible Flow (3rd ed.).

