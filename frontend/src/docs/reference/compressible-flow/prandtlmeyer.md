---
name: prandtlmeyer
category: Compressible Flow
summary: Prandtl-Meyer angle nu(M) [rad]
related: []
examples: []
tags: [prandtlmeyer, compressible, flow]
references:
  - "Anderson, J.D., Modern Compressible Flow (3rd ed.), Ch. 4"
---

# prandtlmeyer

Prandtl-Meyer angle nu(M) [rad]


## Syntax

```
PrandtlMeyer(M, k)
```

## Description

Prandtl-Meyer angle nu(M) [rad]

## Mathematical Formulation

$$ \nu(M) = \sqrt{\tfrac{k+1}{k-1}}\,\arctan\!\sqrt{\tfrac{k-1}{k+1}(M^2-1)} - \arctan\!\sqrt{M^2-1} $$

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `M` | Number | Yes | Mach number. |
| `k` | Number | Yes | Ratio of specific heats (e.g. 1.4 for air). |

## References

1. Çengel, Y.A., Boles, M.A. & Kanoğlu, M., Thermodynamics: An Engineering Approach, Ch. 17.
2. Anderson, J.D., Modern Compressible Flow (3rd ed.).

