---
name: eos_pressure
category: Properties (EOS)
summary: Pressure [Pa] from (T, specific volume)
related: []
examples: []
tags: [eos, pressure, properties]
references:
  - "Peng, D.-Y. & Robinson, D.B. (1976), Ind. Eng. Chem. Fundam. 15(1):59"
---

# eos_pressure

Pressure [Pa] from (T, specific volume)


## Syntax

```
eos_pressure(fluid$, model$, T, v)
```

## Description

Pressure [Pa] from (T, specific volume)

## Mathematical Formulation

$$ P = \frac{RT}{v-b} - \frac{a\,\alpha(T)}{v(v+b) + b(v-b)} \quad\text{(PR; from } T, v) $$

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `fluid$` | String | Yes | String argument. |
| `model$` | String | Yes | String argument. |
| `T` | Number | Yes | Numeric argument. |
| `v` | Number | Yes | Numeric argument. |

## References

1. Poling, B.E., Prausnitz, J.M. & O’Connell, J.P., The Properties of Gases and Liquids (5th ed.).

