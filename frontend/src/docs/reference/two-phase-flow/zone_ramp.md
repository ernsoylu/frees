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

Returns a **smooth `tanh(L/ε)` ramp** that fades a moving-boundary zone in/out as its length `L` approaches zero. It is a numerical `C¹` smoothing, not a physical correlation.

## Mathematical Formulation

$$ r(L) = \tanh\!\left(\frac{L}{\varepsilon}\right) \quad\text{(smooth zone-collapse ramp)} $$

## Applicability

- **Where it applies:** Moving-boundary heat-exchanger models (subcooled / two-phase / superheat zones).
- **Valid when:** Whenever a zone length can shrink to zero during a solve/transient.
- **How it's used:** Blends a zone's contribution smoothly so the corrector does not chatter at a regime switch.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `L` | Number | Yes | Length [m]. |
| `eps` | Number | Yes | Effectiveness ε (0–1). |

## References

1. Collier, J.G. & Thome, J.R., Convective Boiling and Condensation (3rd ed.).

