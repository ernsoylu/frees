---
name: nu_cavallini_zecchin
category: Two-Phase Flow
summary: Cavallini-Zecchin condensation Nusselt number
related: []
examples: []
tags: [nu, cavallini, zecchin, two, phase, flow]
references:
  - "Cavallini, A. & Zecchin, R. (1974), 5th Int. Heat Transfer Conf."
---

# nu_cavallini_zecchin

Cavallini-Zecchin condensation Nusselt number


## Syntax

```
nu_cavallini_zecchin(Re_l, Pr_l, x, rho_l, rho_g)
```

## Description

Cavallini-Zecchin condensation Nusselt number

## Mathematical Formulation

$$ Nu = 0.05\,Re_{eq}^{0.8}\,Pr_l^{0.33} \quad\text{(Cavallini–Zecchin condensation)} $$

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `Re_l` | Number | Yes | Numeric argument. |
| `Pr_l` | Number | Yes | Numeric argument. |
| `x` | Number | Yes | Numeric argument. |
| `rho_l` | Number | Yes | Numeric argument. |
| `rho_g` | Number | Yes | Numeric argument. |

## References

1. Collier, J.G. & Thome, J.R., Convective Boiling and Condensation (3rd ed.).

