---
name: hx_dh
category: Heat Transfer
summary: GEOMETRY: hydraulic diameter D_h=4*Aflow*L/Atotal [m] of a compact HX core (any side)
related: []
examples: []
tags: [hx, dh, heat, transfer]
references:
  - "Kays, W.M. & London, A.L., Compact Heat Exchangers (3rd ed.), Ch. 2"
---

# hx_dh

GEOMETRY: hydraulic diameter D_h=4*Aflow*L/Atotal [m] of a compact HX core (any side)


## Syntax

```
hx_dh(Aflow, Atotal, L)
```

## Description

GEOMETRY: hydraulic diameter D_h=4*Aflow*L/Atotal [m] of a compact HX core (any side)

## Mathematical Formulation

$$ D_h = \frac{4\,A_{\text{flow}}\,L}{A_{\text{total}}} $$

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `Aflow` | Number | Yes | Numeric argument. |
| `Atotal` | Number | Yes | Numeric argument. |
| `L` | Number | Yes | Numeric argument. |

## References

1. Incropera, F.P. et al., Fundamentals of Heat and Mass Transfer.
2. Kakaç, S. et al., Heat Exchangers: Selection, Rating, and Thermal Design.

