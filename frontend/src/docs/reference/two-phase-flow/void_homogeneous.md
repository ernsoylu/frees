---
name: void_homogeneous
category: Two-Phase Flow
summary: Homogeneous (no-slip) void fraction
related: []
examples: []
tags: [void, homogeneous, two, phase, flow]
references:
  - "Collier, J.G. & Thome, J.R., Convective Boiling and Condensation (3rd ed.), Ch. 2"
---

# void_homogeneous

Homogeneous (no-slip) void fraction


## Syntax

```
void_homogeneous(x, rho_l, rho_g)
```

## Description

Homogeneous (no-slip) void fraction

## Mathematical Formulation

$$ \alpha = \frac{1}{1 + \frac{1-x}{x}\frac{\rho_g}{\rho_l}} \quad\text{(no slip)} $$

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `x` | Number | Yes | Vapor quality (0–1). |
| `rho_l` | Number | Yes | Saturated-liquid density [kg/m³]. |
| `rho_g` | Number | Yes | Saturated-vapor density [kg/m³]. |

## References

1. Collier, J.G. & Thome, J.R., Convective Boiling and Condensation (3rd ed.).

