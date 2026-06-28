---
name: eos_entropy
category: Properties (EOS)
summary: Specific entropy [J/kg-K] (SRK/PR)
related: []
examples: []
tags: [eos, entropy, properties]
references:
  - "the standard literature, the standard literature, H.C. & the standard literature, a standard chemical-thermodynamics text, Ch. 6"
---

# eos_entropy

Specific entropy [J/kg-K] (SRK/PR)


## Syntax

```
eos_entropy(fluid$, model$, T, P, phase$)
```

## Description

Specific entropy [J/kg-K] (SRK/PR)

## Mathematical Formulation

$$ s(T,P) = s^{\text{ig}}(T,P) + (s - s^{\text{ig}})_{T,P} \quad\text{(ideal-gas + EOS departure)} $$

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `fluid$` | String | Yes | String argument. |
| `model$` | String | Yes | String argument. |
| `T` | Number | Yes | Numeric argument. |
| `P` | Number | Yes | Numeric argument. |
| `phase$` | String | Yes | String argument. |

## References

1. the standard literature, B.E., the standard literature, J.M. & O’Connell, J.P., The Properties of Gases and Liquids (5th ed.).

