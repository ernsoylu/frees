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

Returns the **nucleate-boiling suppression factor `S`** of the Chen flow-boiling model — the factor that throttles the pool-boiling nucleate term as the bulk velocity rises.

## Mathematical Formulation

$$ S = \frac{1}{1 + 2.53\times10^{-6}\,Re_l^{1.17}} \quad\text{(nucleate suppression, Chen)} $$

## Applicability

- **Where it applies:** Saturated flow boiling of a refrigerant in evaporator tubes.
- **Valid when:** Saturated flow boiling; `S ≤ 1`, falling as the two-phase Reynolds number increases.
- **How it's used:** Used with `chen_f` in the Chen superposition `h = F·h_conv + S·h_nb`.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `Re_l` | Number | Yes | Liquid-only Reynolds number. |
| `F` | Number | Yes | Convective enhancement factor. |

## References

1. Collier, J.G. & Thome, J.R., Convective Boiling and Condensation (3rd ed.).

