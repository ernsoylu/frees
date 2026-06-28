---
name: chen_s
category: Two-Phase Flow
summary: Chen flow-boiling nucleate-suppression factor S
related: []
examples: []
tags: [chen, two, phase, flow]
references:
  - "Chen, J.C. (1966), Ind. Eng. Chem. Process Des. Dev. 5:322"
---

# chen_s

Chen flow-boiling nucleate-suppression factor S


## Syntax

```
chen_s(Re_l, F)
```

## Description

Chen flow-boiling nucleate-suppression factor S

## Mathematical Formulation

$$ S = \frac{1}{1 + 2.53\times10^{-6}\,Re_l^{1.17}} \quad\text{(nucleate suppression, Chen)} $$

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `Re_l` | Number | Yes | Numeric argument. |
| `F` | Number | Yes | Numeric argument. |

## References

1. Collier, J.G. & Thome, J.R., Convective Boiling and Condensation (3rd ed.).

