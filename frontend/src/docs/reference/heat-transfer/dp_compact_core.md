---
name: dp_compact_core
category: Heat Transfer
summary: dP [Pa], Kays-London core (entrance/accel/core-friction/exit). SIDE: air/gas through a compact finned core. HX: fin-and-tube/plate-fin radiator, condenser, CAC air side
related: []
examples: []
tags: [dp, compact, core, heat, transfer]
references:
  - "Kays, W.M. & London, A.L., Compact Heat Exchangers (3rd ed.), Ch. 2"
---

# dp_compact_core

dP [Pa], Kays-London core (entrance/accel/core-friction/exit). SIDE: air/gas through a compact finned core. HX: fin-and-tube/plate-fin radiator, condenser, CAC air side


## Syntax

```
dp_compact_core(G, rho_in, rho_out, rho_mean, sigma, f, AoverAc, Kc, Ke)
```

## Description

dP [Pa], Kays-London core (entrance/accel/core-friction/exit). SIDE: air/gas through a compact finned core. HX: fin-and-tube/plate-fin radiator, condenser, CAC air side

## Mathematical Formulation

$$ \frac{\Delta P}{P_1} = \frac{G^2}{2\rho_1 P_1}\left[(1+\sigma^2)\!\left(\tfrac{\rho_1}{\rho_2}-1\right) + f\tfrac{A}{A_c}\tfrac{\rho_1}{\rho_m}\right] \quad\text{(Kays–London core)} $$

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `G` | Number | Yes | Numeric argument. |
| `rho_in` | Number | Yes | Numeric argument. |
| `rho_out` | Number | Yes | Numeric argument. |
| `rho_mean` | Number | Yes | Numeric argument. |
| `sigma` | Number | Yes | Numeric argument. |
| `f` | Number | Yes | Numeric argument. |
| `AoverAc` | Number | Yes | Numeric argument. |
| `Kc` | Number | Yes | Numeric argument. |
| `Ke` | Number | Yes | Numeric argument. |

## References

1. Incropera, F.P. et al., Fundamentals of Heat and Mass Transfer.
2. Kakaç, S. et al., Heat Exchangers: Selection, Rating, and Thermal Design.

