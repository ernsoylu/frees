---
name: mach_prandtlmeyer
category: Compressible Flow
summary: Mach from Prandtl-Meyer angle [rad]
related: []
examples: []
tags: [mach, prandtlmeyer, compressible, flow]
references:
  - "Anderson, J.D., Modern Compressible Flow (3rd ed.), Ch. 4"
---

# mach_prandtlmeyer

Mach from Prandtl-Meyer angle [rad]


## Syntax

```
mach_PrandtlMeyer(nu, k)
```

## Description

Mach from Prandtl-Meyer angle [rad]

## Mathematical Formulation

$$ \text{solve } \nu(M) = \nu_{\text{target}} \text{ for } M \quad (M \ge 1) $$

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `nu` | Number | Yes | Numeric argument. |
| `k` | Number | Yes | Numeric argument. |

## References

1. Çengel, Y.A., Boles, M.A. & Kanoğlu, M., Thermodynamics: An Engineering Approach, Ch. 17.
2. Anderson, J.D., Modern Compressible Flow (3rd ed.).

