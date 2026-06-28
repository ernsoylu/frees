---
name: chen_f
category: Two-Phase Flow
summary: Chen flow-boiling convective enhancement factor F
related: []
examples: []
tags: [chen, two, phase, flow]
references:
  - "Chen, J.C. (1966), Ind. Eng. Chem. Process Des. Dev. 5:322"
---

# chen_f

Chen flow-boiling convective enhancement factor F


## Syntax

```
chen_f(X_tt)
```

## Description

Chen flow-boiling convective enhancement factor F

## Mathematical Formulation

$$ F = \big[1 + X_{tt}^{-1}\big]^{0.736} \text{-type convective enhancement (Chen)} $$

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `X_tt` | Number | Yes | Turbulent–turbulent Martinelli parameter. |

## References

1. Collier, J.G. & Thome, J.R., Convective Boiling and Condensation (3rd ed.).

