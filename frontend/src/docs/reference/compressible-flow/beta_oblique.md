---
name: beta_oblique
category: Compressible Flow
summary: Oblique-shock wave angle ('weak'|'strong') [rad]
related: []
examples: []
tags: [beta, oblique, compressible, flow]
references:
  - "Anderson, J.D., Modern Compressible Flow (3rd ed.), Ch. 4"
---

# beta_oblique

Oblique-shock wave angle ('weak'|'strong') [rad]


## Syntax

```
beta_oblique(M1, theta, k, branch$)
```

## Description

Oblique-shock wave angle ('weak'|'strong') [rad]

## Mathematical Formulation

$$ \text{solve the } \theta\text{-}\beta\text{-}M \text{ relation for the wave angle } \beta \ (\text{weak/strong root}) $$

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `M1` | Number | Yes | Upstream Mach number (≥ 1). |
| `theta` | Number | Yes | Flow-deflection angle [rad]. |
| `k` | Number | Yes | Ratio of specific heats (e.g. 1.4 for air). |
| `branch$` | String | Yes | Selector — One of `weak`, `strong`. |

## References

1. Çengel, Y.A., Boles, M.A. & Kanoğlu, M., Thermodynamics: An Engineering Approach, Ch. 17.
2. Anderson, J.D., Modern Compressible Flow (3rd ed.).

