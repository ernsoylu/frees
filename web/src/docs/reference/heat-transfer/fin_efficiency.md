---
name: fin_efficiency
category: Heat Transfer
summary: Efficiency of a straight fin with an insulated tip.
related: [hx_effectiveness, hx_eta_surf]
examples: [ev-thermal-management]
tags: [fin, efficiency, extended surface, tanh, conduction]
---

# fin_efficiency

Returns the **efficiency of a straight fin** with an insulated tip from its
dimensionless parameter `mL` — the ratio of the heat the fin actually dissipates
to what it would dissipate if its entire surface were at the base temperature.
Use it when sizing extended surfaces (fin-and-tube and plate-fin cores), typically
combined with `hx_eta_surf` into an overall surface efficiency.

## Syntax

```
eta = fin_efficiency(mL)
```

## Description

A real fin's temperature falls along its length as it sheds heat, so it is less
effective than an isothermal fin. The single group `mL` captures the competition
between convection off the surface and conduction along the fin. The result drops
from 1 (short/high-conductivity fin) toward 0 (long/poorly-conducting fin).

## Mathematical Formulation

For a straight fin of length $L$ with an insulated (adiabatic) tip,

$$ \eta_f = \frac{\tanh(mL)}{mL} $$

where the fin parameter follows from the 1-D fin energy balance,

$$ m = \sqrt{\frac{h\,P}{k\,A_c}} $$

for convection coefficient $h$, fin perimeter $P$, thermal conductivity $k$, and
cross-sectional area $A_c$.

> **Method:** direct evaluation; as $mL \to 0$, $\eta_f \to 1$.

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

### Example 1 — Air-side fin efficiency in an EV condenser/radiator

The thermal-management sizing computes a fin parameter `mL` for each air-side
core and feeds `fin_efficiency(mL)` into the overall surface efficiency
`hx_eta_surf(...)` before forming `UA = h·A·η`.

[Run: ev-thermal-management]

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `mL` | Number | Yes | Fin parameter–length product `m·L` (dimensionless, ≥ 0), with `m = sqrt(h·P/(k·Ac))`. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `eta` | Number | Fin efficiency η ∈ (0, 1]. |

## Common Errors

| Error | Cause | Fix |
| --- | --- | --- |
| `DOMAIN_ERROR` | `mL` negative | `m` and `L` are positive; check `h`, `P`, `k`, `Ac` in `m = sqrt(h·P/(k·Ac))`. |
