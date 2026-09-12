---
name: dp_2phase_avg
category: Heat Transfer
summary: dP [Pa], quality-integrated (n cells). SIDE: two-phase refrigerant along an evaporator/condenser pass
related: []
examples: []
tags: [dp, 2phase, avg, heat, transfer]
---

# dp_2phase_avg

dP [Pa], quality-integrated (n cells). SIDE: two-phase refrigerant along an evaporator/condenser pass


## Syntax

```
dp_2phase_avg(fluid$, P, x_in, x_out, mdot, Dh, Aflow, L, n)
```

## Description

dP [Pa], quality-integrated (n cells). SIDE: two-phase refrigerant along an evaporator/condenser pass

## Mathematical Formulation

$$ \Delta P = \frac{1}{n}\sum_{i=1}^{n} \phi_l^2(x_i)\,\left(\frac{dP}{dz}\right)_{l,i} \Delta z \quad\text{(quality-integrated)} $$

## Applicability

- **Where it applies:** Two-phase refrigerant along an evaporator/condenser pass.
- **Valid when:** Integrates the two-phase multiplier over `n` quality cells from `x_in` to `x_out`.
- **How it's used:** A quality-averaged frictional `ΔP` for a whole pass.

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
| `x_in` | Number | Yes | Inlet vapor quality (0–1). |
| `x_out` | Number | Yes | Outlet vapor quality (0–1). |
| `mdot` | Number | Yes | Mass flow rate [kg/s]. |
| `Dh` | Number | Yes | Hydraulic diameter [m]. |
| `Aflow` | Number | Yes | Free-flow (minimum) cross-sectional area [m²]. |
| `L` | Number | Yes | Length [m]. |
| `n` | Number | Yes | Order / number of terms. |
