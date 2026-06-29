---
name: hx_effectiveness
category: Heat Transfer
summary: Heat-exchanger effectiveness ε(NTU, Cr) for a given flow arrangement.
related: [hx_NTU, LMTD, fin_efficiency]
examples: [hx-effectiveness-ntu]
tags: [heat exchanger, effectiveness, ntu, epsilon, counterflow, parallelflow, crossflow, shell and tube, evaporator, condenser]
references:
  - "Kays, W.M. & London, A.L., Compact Heat Exchangers (3rd ed.), Ch. 2, Eq. (2-13), (2-13a), (2-13b), (2-14), (2-15), (2-16), (2-19)"
  - "Kakaç, S. et al., Heat Exchangers: Selection, Rating, and Thermal Design, §2.6, Eq. (2.46), (2.47), (2.50) and Table 2.2"
  - "Holman, J.P., Heat Transfer (10th ed.), §10-6, Eq. (10-26), (10-27) and Table 10-3"
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
first. `type$` selects the arrangement — `'counterflow'`, `'parallelflow'`, the three
**crossflow** variants (both fluids unmixed, or one of the two mixed), and a 1-shell-pass
**shell-and-tube** — and any `type$` collapses to the same `ε = 1 - e^{-NTU}` boiling/
condensing limit when `Cr = 0` (one stream isothermal). Pair it with `hx_NTU`
(the inverse, for sizing) and `LMTD`.

## Mathematical Formulation

With heat-capacity rates $C = \dot m\,c_p$, define $C_{min}=\min(C_h,C_c)$,
$C_{max}=\max(C_h,C_c)$, and

$$ \varepsilon = \frac{Q}{Q_{max}}, \qquad NTU = \frac{UA}{C_{min}}, \qquad C_r = \frac{C_{min}}{C_{max}} $$

where $Q_{max}=C_{min}(T_{h,in}-T_{c,in})$ is the duty of an infinite-area counterflow
exchanger (Kays & London Ch. 2; Kakaç §2.6; Holman §10-6).

**Counterflow** (Kays & London Eq. 2-13; Kakaç Eq. 2.46; Holman Eq. 10-27), with the
$C_r = 1$ limit (Kays & London Eq. 2-13b; Holman Table 10-3, "Counterflow, C = 1"):

$$ \varepsilon = \frac{1-\exp\!\big[-NTU\,(1-C_r)\big]}{1-C_r\,\exp\!\big[-NTU\,(1-C_r)\big]}, \qquad \varepsilon = \frac{NTU}{1+NTU}\ \text{ when } C_r = 1 $$

(the $C_r = 1$ form is the removable limit of the general relation.)

**Parallel flow** (Kays & London Eq. 2-14; Kakaç Eq. 2.47; Holman Eq. 10-26):

$$ \varepsilon = \frac{1-\exp\!\big[-NTU\,(1+C_r)\big]}{1+C_r} $$

**Crossflow, both fluids unmixed** — standard approximate correlation; the exact
analytic solution has no closed form (Kays & London give a series solution, not this
relation). The approximation is tabulated in Kakaç Table 2.2 and Holman Table 10-3:

$$ \varepsilon = 1 - \exp\!\left[\frac{NTU^{0.22}}{C_r}\Big(e^{-C_r\,NTU^{0.78}}-1\Big)\right] $$

**Crossflow, $C_{max}$ mixed / $C_{min}$ unmixed** (Kays & London Eq. 2-16; Kakaç Table 2.2; Holman Table 10-3):

$$ \varepsilon = \frac{1}{C_r}\Big(1-\exp\!\big[-C_r\,(1-e^{-NTU})\big]\Big) $$

**Crossflow, $C_{min}$ mixed / $C_{max}$ unmixed** (Kays & London Eq. 2-15; Kakaç Table 2.2; Holman Table 10-3):

$$ \varepsilon = 1 - \exp\!\left[-\frac{1}{C_r}\big(1-e^{-C_r\,NTU}\big)\right] $$

**Shell-and-tube**, one shell pass and 2, 4, … tube passes (Kays & London Eq. 2-19,
"parallel-counterflow, shell fluid mixed"; Kakaç Table 2.2, TEMA E 1-2; Holman Table 10-3),
with $\Lambda = \sqrt{1+C_r^{2}}$:

$$ \varepsilon = 2\left[\,1 + C_r + \Lambda\,\frac{1+e^{-NTU\,\Lambda}}{1-e^{-NTU\,\Lambda}}\,\right]^{-1} $$

**Condenser / evaporator limit** $C_r\to 0$ (one stream isothermal; arrangement-independent —
Kays & London Eq. 2-13a; Kakaç Eq. 2.50; Holman Table 10-3):

$$ \varepsilon = 1 - e^{-NTU} $$

> **Method:** direct evaluation of the closed-form relation for the selected
> arrangement; the $C_r\to 0$ form is used as the limit for condensers/evaporators,
> and the $C_r = 1$ counterflow form is taken as the removable limit.

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
| `type$` | String | Yes | Flow arrangement (case/space/punctuation-insensitive). See the table below for accepted values. A condenser/evaporator is the `Cr = 0` case of any arrangement. |
| `NTU` | Number | Yes | Number of transfer units, `UA/C_min` (dimensionless, ≥ 0). |
| `Cr` | Number | Yes | Capacity ratio `C_min/C_max` ∈ [0, 1]. Use `0` for a condenser/evaporator. |

**Accepted `type$` values** (matching ignores case, spaces and punctuation):

| Arrangement | Canonical | Aliases |
| --- | --- | --- |
| Counterflow | `'counterflow'` | `counter`, `countercurrent` |
| Parallel flow | `'parallelflow'` | `parallel`, `cocurrent`, `coflow` |
| Crossflow, both unmixed | `'crossflow_both_unmixed'` | `crossflow`, `bothunmixed`, `crossflowunmixed` |
| Crossflow, C_max mixed (C_min unmixed) | `'crossflow_cmax_mixed'` | `cmaxmixed`, `crossflowcminunmixed` |
| Crossflow, C_min mixed (C_max unmixed) | `'crossflow_cmin_mixed'` | `cminmixed`, `crossflowcmaxunmixed` |
| Shell-and-tube (1 shell pass; 2, 4, … tube passes) | `'shell&tube'` | `shell`, `shelltube`, `shellandtube1` |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `eps` | Number | Effectiveness ε ∈ [0, 1]. |

## Common Errors

| Error | Cause | Fix |
| --- | --- | --- |
| `UNKNOWN_HX_TYPE` | `type$` is not a recognized arrangement | Use one of `'counterflow'`, `'parallelflow'`, `'crossflow_both_unmixed'`, `'crossflow_cmax_mixed'`, `'crossflow_cmin_mixed'`, `'shell&tube'`; pass `Cr = 0` for a condenser/evaporator. |
| `DOMAIN_ERROR` | `Cr` outside [0, 1] or `NTU < 0` | Ensure `C_min = min(C_h, C_c)` so `Cr ≤ 1`; check `UA` and flow rates. |

## References

1. Kays, W.M. & London, A.L. *Compact Heat Exchangers* (3rd ed.), Ch. 2, Eq. (2-13), (2-13a), (2-13b), (2-14), (2-15), (2-16), (2-19).
2. Kakaç, S., Liu, H. & Pramuanjaroenkij, A. *Heat Exchangers: Selection, Rating, and Thermal Design*, §2.6, Eq. (2.46), (2.47), (2.50) and Table 2.2 (crossflow and 1-2 shell-and-tube arrangements).
3. Holman, J.P. *Heat Transfer* (10th ed.), §10-6, Eq. (10-26), (10-27), and Table 10-3 (crossflow and shell-and-tube arrangements).
