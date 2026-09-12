---
name: dp_1phase
category: Heat Transfer
summary: dP [Pa], Darcy. SIDE: single-phase liquid/gas line (coolant, water, air channel, pipe). HX: radiator/CAC fluid channels
related: []
examples: []
tags: [dp, 1phase, heat, transfer]
---

# dp_1phase

dP [Pa], Darcy. SIDE: single-phase liquid/gas line (coolant, water, air channel, pipe). HX: radiator/CAC fluid channels


## Syntax

```
dp_1phase(fluid$, P, T, mdot, Dh, Aflow, L)
```

## Description

dP [Pa], Darcy. SIDE: single-phase liquid/gas line (coolant, water, air channel, pipe). HX: radiator/CAC fluid channels

## Mathematical Formulation

$$ \Delta P = f\,\frac{L}{D_h}\,\frac{G^2}{2\rho}, \qquad G = \dot m / A_{\text{flow}} \quad\text{(Darcy)} $$

## Applicability

- **Where it applies:** A single-phase liquid/gas line (coolant, water, air channel, pipe).
- **Valid when:** Single-phase Darcy flow; turbulent or laminar.
- **How it's used:** Friction `ΔP` for radiator/CAC fluid channels and connecting lines.

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

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `fluid$` | String | Yes | Fluid name (e.g. Water, R134a, Air). |
| `P` | Number | Yes | Pressure [Pa]. |
| `T` | Number | Yes | Temperature [K]. |
| `mdot` | Number | Yes | Mass flow rate [kg/s]. |
| `Dh` | Number | Yes | Hydraulic diameter [m]. |
| `Aflow` | Number | Yes | Free-flow (minimum) cross-sectional area [m²]. |
| `L` | Number | Yes | Length [m]. |
