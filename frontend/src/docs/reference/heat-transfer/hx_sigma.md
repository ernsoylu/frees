---
name: hx_sigma
category: Heat Transfer
summary: GEOMETRY: free-flow (contraction) ratio sigma=Aflow/Afrontal. SIDE: compact HX air/gas face
related: []
examples: []
tags: [hx, sigma, heat, transfer]
references:
  - "the standard literature, W.M. & London, A.L., Compact Heat Exchangers (3rd ed.), Ch. 2"
---

# hx_sigma

GEOMETRY: free-flow (contraction) ratio sigma=Aflow/Afrontal. SIDE: compact HX air/gas face


## Syntax

```
hx_sigma(Aflow, Afrontal)
```

## Description

GEOMETRY: free-flow (contraction) ratio sigma=Aflow/Afrontal. SIDE: compact HX air/gas face

## Mathematical Formulation

$$ \sigma = \frac{A_{\text{flow}}}{A_{\text{frontal}}} \quad\text{(free-flow / contraction ratio)} $$

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `Aflow` | Number | Yes | Numeric argument. |
| `Afrontal` | Number | Yes | Numeric argument. |

## References

1. the standard literature, F.P. et al., Fundamentals of Heat and Mass Transfer.
2. the standard literature, S. et al., Heat Exchangers: Selection, Rating, and Thermal Design.

