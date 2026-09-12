---
name: htc_cond
category: Heat Transfer
summary: In-tube condensation heat-transfer coefficient — Shah correlation.
related: [htc_evap, htc_1phase, dp_2phase]
examples: [ev-thermal-management]
tags: [heat transfer, condensation, two-phase, shah, refrigerant, film coefficient]
---

# htc_cond

Returns the **in-tube condensation heat-transfer coefficient** `h` [W/m²·K] for a
condensing two-phase refrigerant at quality `x`, using the **Shah**
correlation. Use it for the refrigerant side of a condenser or gas cooler.

## Syntax

```
h = htc_cond(fluid$, P, x, mdot, Dh, Aflow)
```

## Description

Condensation augments the liquid-only coefficient through the thinning liquid film
and vapor shear; Shah's correlation expresses this as a reduced-pressure and
quality-dependent enhancement.

## Mathematical Formulation

With the liquid-only coefficient $h_l$ (Dittus–Boelter), reduced pressure $p_r$,
and $Z = \big(\tfrac{1}{x}-1\big)^{0.8}p_r^{0.4}$,

$$ h_{TP} = h_l\left(1 + \frac{3.8}{Z^{0.95}}\right) $$

> **Method:** liquid-only `h_l` → Shah enhancement from `Z(x, p_r)` → `h_TP` at the
> local quality.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
{ HxCorrelations: the CoolProp-backed correlations, with the underlying
  fluid state dumped alongside so the pure-math half can be checked exactly. }

{ --- Water single phase at 101325 Pa / 320 K --- }
w_mu = Viscosity(Water, P=101325, T=320)
w_k = Conductivity(Water, P=101325, T=320)
w_cp = Cp(Water, P=101325, T=320)
w_rho = Density(Water, P=101325, T=320)
h1p_w = htc_1phase('Water', 101325, 320, 0.05, 0.01, 0.0002)
dp1_w = dp_1phase('Water', 101325, 320, 0.05, 0.01, 0.0002, 2.5)

{ --- Air external cross-flow --- }
a_mu = Viscosity(Air, P=101325, T=300)
a_k = Conductivity(Air, P=101325, T=300)
a_cp = Cp(Air, P=101325, T=300)
a_rho = Density(Air, P=101325, T=300)
hext_a = htc_extair('Air', 101325, 300, 0.4, 0.012, 0.05)
h1p_a = htc_1phase('Air', 101325, 300, 0.4, 0.012, 0.05)
dp1_a = dp_1phase('Air', 101325, 300, 0.4, 0.012, 0.05, 1.2)

{ --- R134a two-phase at 500 kPa --- }
r_mul = Viscosity(R134a, P=500000, Q=0)
r_kl = Conductivity(R134a, P=500000, Q=0)
r_cpl = Cp(R134a, P=500000, Q=0)
r_rhol = Density(R134a, P=500000, Q=0)
r_mug = Viscosity(R134a, P=500000, Q=1)
r_kg = Conductivity(R134a, P=500000, Q=1)
r_cpg = Cp(R134a, P=500000, Q=1)
r_rhog = Density(R134a, P=500000, Q=1)
r_pcrit = P_crit(R134a)

hev_a = htc_evap('R134a', 500000, 0.3, 0.02, 0.008, 0.0001)
hev_b = htc_evap('R134a', 500000, 0.001, 0.02, 0.008, 0.0001)
hev_c = htc_evap('R134a', 500000, 0.999, 0.02, 0.008, 0.0001)
hcd_a = htc_cond('R134a', 500000, 0.7, 0.02, 0.008, 0.0001)
hcd_b = htc_cond('R134a', 500000, 0.0, 0.02, 0.008, 0.0001)
hcd_c = htc_cond('R134a', 500000, 1.0, 0.02, 0.008, 0.0001)

dp2_a = dp_2phase('R134a', 500000, 0.3, 0.02, 0.008, 0.0001, 1.5)
dp2_b = dp_2phase('R134a', 500000, 0.95, 0.02, 0.008, 0.0001, 1.5)
dpms_a = dp_mueller_steinhagen('R134a', 500000, 0.3, 0.02, 0.008, 0.0001, 1.5)
dpms_b = dp_ms('R134a', 500000, 0.0, 0.02, 0.008, 0.0001, 1.5)
dpms_c = dp_ms('R134a', 500000, 1.0, 0.02, 0.008, 0.0001, 1.5)
dp2a_a = dp_2phase_avg('R134a', 500000, 0.1, 0.9, 0.02, 0.008, 0.0001, 1.5, 8)
dp2a_b = dp_2phase_avg('R134a', 500000, 0.1, 0.9, 0.02, 0.008, 0.0001, 1.5, 1)
dp2a_c = dp_2phase_avg('R134a', 500000, 0.1, 0.9, 0.02, 0.008, 0.0001, 1.5, 0)

ua_a = ua_hx(1200, 0.8, 60, 6.5, 0.0002)
ua_b = ua_hx(1, 1, 1, 1, 0)

{ CHECK a_cp 1006.373908 0.0010063739076641026 }
{ CHECK a_k 0.02638446571 2.6384465709828872e-8 }
{ CHECK a_mu 0.00001853734051 1e-8 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
a_cp = 1006.373908 [J/kg-K]
a_k = 0.02638446571 [W/m-K]
a_mu = 0.00001853734051 [Pa-s]
```

<!-- verified-reference-example:end -->

### Example 1 — Condenser refrigerant-side film

[Run: ev-thermal-management]

**Expected:** a condensing film coefficient well above the single-phase liquid
value, decreasing as quality falls toward the subcooled liquid outlet.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `fluid$` | String | Yes | Refrigerant name. |
| `P` | Number | Yes | Pressure [Pa]. |
| `x` | Number | Yes | Vapor quality (0–1). |
| `mdot` | Number | Yes | Mass flow rate [kg/s]. |
| `Dh` | Number | Yes | Hydraulic diameter [m]. |
| `Aflow` | Number | Yes | Free-flow area [m²]. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `h` | Number | Two-phase condensation coefficient [W/m²·K]. |

## Common Errors

| Error | Cause | Fix |
| --- | --- | --- |
| `DOMAIN_ERROR` | `x` outside [0, 1] | Quality must be a mass fraction in [0, 1]. |
