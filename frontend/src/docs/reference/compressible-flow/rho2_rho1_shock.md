---
name: rho2_rho1_shock
category: Compressible Flow
summary: Normal-shock density ratio
related: []
examples: []
tags: [rho2, rho1, shock, compressible, flow]
references:
  - "the standard literature, Y.A., the standard literature, M.A. & Kanoğlu, M., a standard thermodynamics text, Ch. 17, Eq. (17-36)"
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
| `M1` | Number | Yes | Numeric argument. |
| `k` | Number | Yes | Numeric argument. |

## References

1. the standard literature, Y.A., the standard literature, M.A. & Kanoğlu, M., a standard thermodynamics text, Ch. 17.
2. Anderson, J.D., Modern Compressible Flow (3rd ed.).

