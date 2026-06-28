---
name: nu_shah
category: Two-Phase Flow
summary: Shah condensation Nusselt number
related: []
examples: []
tags: [nu, shah, two, phase, flow]
references:
  - "Shah, M.M. (1979), Int. J. Heat Mass Transfer 22:547"
---

# nu_shah

Shah condensation Nusselt number


## Syntax

```
nu_shah(Re_l, Pr_l, x, p_red)
```

## Description

Shah condensation Nusselt number

## Mathematical Formulation

$$ Nu_{TP} = Nu_l\left(1 + \frac{3.8}{Z^{0.95}}\right), \quad Z = (1/x - 1)^{0.8}p_r^{0.4} \quad\text{(Shah)} $$

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `Re_l` | Number | Yes | Numeric argument. |
| `Pr_l` | Number | Yes | Numeric argument. |
| `x` | Number | Yes | Numeric argument. |
| `p_red` | Number | Yes | Numeric argument. |

## References

1. Collier, J.G. & Thome, J.R., Convective Boiling and Condensation (3rd ed.).

