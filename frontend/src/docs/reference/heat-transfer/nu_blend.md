---
name: nu_blend
category: Heat Transfer
summary: Cubic free+forced blend (Nu1^3+Nu2^3)^(1/3). USE: combine natural + forced Nu on any side
related: []
examples: []
tags: [nu, blend, heat, transfer]
references:
  - "Incropera, F.P. et al., Fundamentals of Heat and Mass Transfer"
---

# nu_blend

Cubic free+forced blend (Nu1^3+Nu2^3)^(1/3). USE: combine natural + forced Nu on any side


## Syntax

```
nu_blend(Nu1, Nu2)
```

## Description

Cubic free+forced blend (Nu1^3+Nu2^3)^(1/3). USE: combine natural + forced Nu on any side

## Mathematical Formulation

$$ Nu = \big(Nu_1^3 + Nu_2^3\big)^{1/3} \quad\text{(free+forced cubic blend)} $$

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `Nu1` | Number | Yes | Numeric argument. |
| `Nu2` | Number | Yes | Numeric argument. |

## References

1. Incropera, F.P. et al., Fundamentals of Heat and Mass Transfer.
2. Kakaç, S. et al., Heat Exchangers: Selection, Rating, and Thermal Design.

