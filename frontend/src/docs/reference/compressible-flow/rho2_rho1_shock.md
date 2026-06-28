---
name: rho2_rho1_shock
category: Compressible Flow
summary: Normal-shock density ratio
related: []
examples: []
tags: [rho2, rho1, shock, compressible, flow]
references:
  - "Çengel, Y.A., Boles, M.A. & Kanoğlu, M., Thermodynamics: An Engineering Approach, Ch. 17, Eq. (17-36)"
---

# rho2_rho1_shock

Normal-shock density ratio


## Syntax

```
rho2_rho1_shock(M1, k)
```

## Description

Normal-shock density ratio

## Mathematical Formulation

$$ \frac{\rho_2}{\rho_1} = \frac{(k+1)M_1^2}{2 + (k-1)M_1^2} $$

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `M1` | Number | Yes | Upstream Mach number (≥ 1). |
| `k` | Number | Yes | Ratio of specific heats (e.g. 1.4 for air). |

## References

1. Çengel, Y.A., Boles, M.A. & Kanoğlu, M., Thermodynamics: An Engineering Approach, Ch. 17.
2. Anderson, J.D., Modern Compressible Flow (3rd ed.).

