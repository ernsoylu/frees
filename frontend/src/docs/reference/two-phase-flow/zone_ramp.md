---
name: zone_ramp
category: Two-Phase Flow
summary: Smooth zone-collapse ramp tanh(L/eps) (moving-boundary §4.8)
related: []
examples: []
tags: [zone, ramp, two, phase, flow]
references:
  - "Collier, J.G. & Thome, J.R., Convective Boiling and Condensation (3rd ed.)"
---

# zone_ramp

Smooth zone-collapse ramp tanh(L/eps) (moving-boundary §4.8)


## Syntax

```
zone_ramp(L, eps)
```

## Description

Smooth zone-collapse ramp tanh(L/eps) (moving-boundary §4.8)

## Mathematical Formulation

$$ r(L) = \tanh\!\left(\frac{L}{\varepsilon}\right) \quad\text{(smooth zone-collapse ramp)} $$

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `L` | Number | Yes | Numeric argument. |
| `eps` | Number | Yes | Numeric argument. |

## References

1. Collier, J.G. & Thome, J.R., Convective Boiling and Condensation (3rd ed.).

