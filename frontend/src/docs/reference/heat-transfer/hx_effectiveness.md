---
name: hx_effectiveness
category: Heat Transfer
summary: Heat-exchanger effectiveness ε(NTU, Cr) for a given flow arrangement.
related: [hx_NTU, LMTD, fin_efficiency]
examples: [hx-effectiveness-ntu]
tags: [heat exchanger, effectiveness, ntu, epsilon, counterflow, evaporator, condenser]
references:
  - "Kays, W.M. & London, A.L., Compact Heat Exchangers (3rd ed.), Ch. 2, Eq. (2-13), (2-14), (2-13a)"
  - "Kakaç, S. et al., Heat Exchangers: Selection, Rating, and Thermal Design, §2.6, Eq. (2.46), (2.47), (2.50)"
  - "Holman, J.P., Heat Transfer (10th ed.), §10-6, Eq. (10-26), (10-27), Table 10-3"
---

# hx_effectiveness

Returns the **effectiveness** `ε` of a heat exchanger — the fraction of the
thermodynamically maximum heat duty actually transferred — from its `NTU`, capacity
ratio `Cr`, and flow arrangement. Use it to **rate** an exchanger (find the duty and
outlet temperatures) when `UA` is known but the outlet states are not, avoiding the
iteration the LMTD method would require.

## Syntax

```
eps = hx_effectiveness(type$, NTU, Cr)
```

## Description

The effectiveness–NTU method characterizes an exchanger by three dimensionless groups
and a closed-form `ε(NTU, Cr)` relation per flow arrangement, so the duty follows
directly from the inlet states without solving for the (unknown) outlet temperatures
first. `type$` selects the arrangement: `'counterflow'`, `'parallel'`, and the
condenser/evaporator limit. Pair it with `hx_NTU` (the inverse, for sizing)
and `LMTD`.

## Mathematical Formulation

With heat-capacity rates $C = \dot m\,c_p$, define $C_{min}=\min(C_h,C_c)$,
$C_{max}=\max(C_h,C_c)$, and

$$ \varepsilon = \frac{Q}{Q_{max}}, \qquad NTU = \frac{UA}{C_{min}}, \qquad C_r = \frac{C_{min}}{C_{max}} $$

where $Q_{max}=C_{min}(T_{h,in}-T_{c,in})$ is the duty of an infinite-area counterflow
exchanger (Kays & London Ch. 2; Kakaç §2.6; Holman §10-6).

**Counterflow** (Kays & London Eq. 2-13; Kakaç Eq. 2.46; Holman Eq. 10-27):

$$ \varepsilon = \frac{1-\exp\!\big[-NTU\,(1-C_r)\big]}{1-C_r\,\exp\!\big[-NTU\,(1-C_r)\big]} $$

**Parallel flow** (Kays & London Eq. 2-14; Kakaç Eq. 2.47; Holman Eq. 10-26):

$$ \varepsilon = \frac{1-\exp\!\big[-NTU\,(1+C_r)\big]}{1+C_r} $$

**Condenser / evaporator limit** $C_r\to 0$ (one stream isothermal; arrangement-independent —
Kays & London Eq. 2-13a; Kakaç Eq. 2.50; Holman Table 10-3):

$$ \varepsilon = 1 - e^{-NTU} $$

> **Method:** direct evaluation of the closed-form relation for the selected
> arrangement; the $C_r\to 0$ form is used as the limit for condensers/evaporators.

## Examples

### Example 1 — Counterflow water-to-water exchanger (rating)

A counterflow exchanger with `UA = 12 kW/K` heats 1.5 kg/s of water against 2.0 kg/s of
hot water — solve for the duty and both outlet temperatures.

[Run: hx-effectiveness-ntu]

**Expected:** `Cr = 0.75`, `NTU ≈ 1.91`, `ε ≈ 0.711`, `Q ≈ 312 kW`,
`Th_out ≈ 323 K`, `Tc_out ≈ 340 K`.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `type$` | String | Yes | Flow arrangement: `'counterflow'`, `'parallel'`. A condenser/evaporator is the `Cr = 0` case. |
| `NTU` | Number | Yes | Number of transfer units, `UA/C_min` (dimensionless, ≥ 0). |
| `Cr` | Number | Yes | Capacity ratio `C_min/C_max` ∈ [0, 1]. Use `0` for a condenser/evaporator. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `eps` | Number | Effectiveness ε ∈ [0, 1]. |

## Common Errors

| Error | Cause | Fix |
| --- | --- | --- |
| `UNKNOWN_HX_TYPE` | `type$` is not a recognized arrangement | Use `'counterflow'` or `'parallel'`; pass `Cr = 0` for a condenser/evaporator. |
| `DOMAIN_ERROR` | `Cr` outside [0, 1] or `NTU < 0` | Ensure `C_min = min(C_h, C_c)` so `Cr ≤ 1`; check `UA` and flow rates. |

## References

1. Kays, W.M. & London, A.L. *Compact Heat Exchangers* (3rd ed.), Ch. 2, Eq. (2-13), (2-14), (2-13a).
2. Kakaç, S., Liu, H. & Pramuanjaroenkij, A. *Heat Exchangers: Selection, Rating, and Thermal Design*, §2.6, Eq. (2.46), (2.47), (2.50).
3. Holman, J.P. *Heat Transfer* (10th ed.), §10-6, Eq. (10-26), (10-27), Table 10-3.
