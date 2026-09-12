---
name: hx_NTU
category: Heat Transfer
summary: Number of transfer units NTU(ε, Cr) — the inverse of hx_effectiveness.
related: [hx_effectiveness, LMTD]
examples: [hx-effectiveness-ntu]
tags: [heat exchanger, ntu, effectiveness, sizing, counterflow]
---

# hx_NTU

Returns the **number of transfer units** `NTU` required to achieve a target
effectiveness `ε` at capacity ratio `Cr` for a given flow arrangement — the
inverse of `hx_effectiveness`. Use it to **size** an exchanger:
from a required duty you back out `ε`, then `NTU`, then `UA = NTU·C_min`.

## Syntax

```
NTU = hx_NTU(type$, eps, Cr)
```

## Description

Rating asks "what duty for this `UA`?" (effectiveness from NTU); sizing asks the
reverse — "what `UA` for this duty?". `hx_NTU` closes the sizing loop by inverting
the `ε`(NTU, Cr) relation analytically per arrangement.

## Mathematical Formulation

With $NTU = UA/C_{min}$ and $C_r = C_{min}/C_{max}$:

**Counterflow** ($C_r < 1$):

$$ NTU = \frac{1}{C_r - 1}\,\ln\!\left(\frac{\varepsilon - 1}{\varepsilon\,C_r - 1}\right) $$

**Counterflow, balanced** ($C_r = 1$):

$$ NTU = \frac{\varepsilon}{1 - \varepsilon} $$

**Condenser / evaporator limit** ($C_r \to 0$; arrangement-independent):

$$ NTU = -\ln(1 - \varepsilon) $$

> **Method:** direct evaluation of the inverse relation for the selected
> arrangement; the $C_r \to 0$ form is used for condensers/evaporators.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
{ HeatExchanger: effectiveness-NTU for every arrangement. }
cf_a = hx_effectiveness('counterflow', 1.5, 0.6)
cf_b = hx_effectiveness('counterflow', 0.25, 0.95)
cf_c = hx_effectiveness('counterflow', 3.0, 1.0)
cf_d = hx_effectiveness('counterflow', 3.0, 0.99999999995)
cf_e = hx_effectiveness('counterflow', 3.0, 0.999999999)
cf_f = hx_effectiveness('counterflow', 2.0, 0)
cf_g = hx_effectiveness('counterflow', 0, 0.5)
cf_h = hx_effectiveness('counterflow', 12.0, 0.3)

pf_a = hx_effectiveness('parallelflow', 1.5, 0.6)
pf_b = hx_effectiveness('parallel', 0.4, 0.2)
pf_c = hx_effectiveness('cocurrent', 5.0, 1.0)
pf_d = hx_effectiveness('coflow', 2.0, 0)

xbu_a = hx_effectiveness('crossflow', 1.5, 0.6)
xbu_b = hx_effectiveness('crossflowbothunmixed', 0.3, 0.1)
xbu_c = hx_effectiveness('crossbothunmixed', 4.0, 1.0)
xbu_d = hx_effectiveness('crossflowunmixed', 0.05, 0.75)
xbu_e = hx_effectiveness('bothunmixed', 8.0, 0.45)

xmax_a = hx_effectiveness('crossflowcmaxmixed', 1.5, 0.6)
xmax_b = hx_effectiveness('cmaxmixed', 0.8, 0.25)
xmax_c = hx_effectiveness('crossflowcminunmixed', 6.0, 1.0)

xmin_a = hx_effectiveness('crossflowcminmixed', 1.5, 0.6)
xmin_b = hx_effectiveness('cminmixed', 0.8, 0.25)
xmin_c = hx_effectiveness('crossflowcmaxunmixed', 6.0, 1.0)

st_a = hx_effectiveness('shelltube', 1.5, 0.6)
st_b = hx_effectiveness('shellandtube', 0.7, 0.35)
st_c = hx_effectiveness('shell', 4.0, 1.0)
st_d = hx_effectiveness('shellandtube1', 2.5, 0.5)
st_e = hx_effectiveness('shelltube1', 0.2, 0.9)

{ Alias resolution ignores case, spaces and punctuation. }
al_a = hx_epsilon('Counter-Flow', 1.5, 0.6)
al_b = hx_epsilon('COUNTER FLOW', 1.5, 0.6)
al_c = hx_epsilon('countercurrent', 1.5, 0.6)
al_d = hx_epsilon('Shell & Tube', 1.5, 0.6)
al_e = hx_epsilon('Cross Flow', 1.5, 0.6)

{ Inverse NTU(eps, Cr). }
n_cf_a = hx_ntu('counterflow', 0.6726995772651676, 0.6)
n_cf_b = hx_ntu('counterflow', 0.75, 1.0)
n_cf_c = hx_ntu('counterflow', 0.5, 0)
n_pf_a = hx_ntu('parallelflow', 0.5, 0.6)
n_xbu_a = hx_ntu('crossflow', 0.6401932091181524, 0.6)
n_xbu_b = hx_ntu('crossflow', 0.2, 0.9)
n_xbu_c = hx_ntu('bothunmixed', 0.95, 0.25)
n_xmax_a = hx_ntu('cmaxmixed', 0.6, 0.6)
n_xmin_a = hx_ntu('cminmixed', 0.6, 0.6)
n_st_a = hx_ntu('shelltube', 0.6, 0.6)
n_st_b = hx_ntu('shelltube', 0.4, 0.2)

{ LMTD and fin efficiency. }
lm_a = lmtd(50, 20)
lm_b = lmtd(30, 30)
lm_c = lmtd(30, 30.00000000000001)
lm_d = lmtd(1e-3, 500)
fe_a = fin_efficiency(0)
fe_b = fin_efficiency(1e-9)
fe_c = fin_efficiency(1e-8)
fe_d = fin_efficiency(0.5)
fe_e = fin_efficiency(1)
fe_f = fin_efficiency(3.5)
fe_g = fin_efficiency(50)

{ CHECK al_a 0.6726995773 6.726995772651676e-7 }
{ CHECK al_b 0.6726995773 6.726995772651676e-7 }
{ CHECK al_c 0.6726995773 6.726995772651676e-7 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
al_a = 0.6726995773
al_b = 0.6726995773
al_c = 0.6726995773
```

<!-- verified-reference-example:end -->

### Example 1 — NTU of a counterflow exchanger

The effectiveness–NTU rating example forms `NTU = UA/C_min` directly; `hx_NTU`
performs the reverse map `ε → NTU` for the same arrangement when sizing to a
target effectiveness.

[Run: hx-effectiveness-ntu]

**Expected:** for `ε ≈ 0.711`, `Cr = 0.75`, `hx_NTU('counterflow', 0.711, 0.75) ≈ 1.91`
(recovering the example's `NTU = UA/C_min`).

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `type$` | String | Yes | Flow arrangement: `'counterflow'`, `'parallel'`. A condenser/evaporator is the `Cr = 0` case. |
| `eps` | Number | Yes | Target effectiveness ε ∈ [0, 1). Must satisfy `ε < 1/(1+Cr)` for parallel flow. |
| `Cr` | Number | Yes | Capacity ratio `C_min/C_max` ∈ [0, 1]. Use `0` for a condenser/evaporator. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `NTU` | Number | Number of transfer units (≥ 0); `UA = NTU·C_min`. |

## Common Errors

| Error | Cause | Fix |
| --- | --- | --- |
| `INFEASIBLE_EFFECTIVENESS` | `ε` at or above the arrangement's ceiling (e.g. `ε ≥ 1/(1+Cr)` for parallel flow) | No finite `NTU` reaches it — lower the target or switch to counterflow. |
| `UNKNOWN_HX_TYPE` | `type$` not recognized | Use `'counterflow'` or `'parallel'`; pass `Cr = 0` for a condenser/evaporator. |
