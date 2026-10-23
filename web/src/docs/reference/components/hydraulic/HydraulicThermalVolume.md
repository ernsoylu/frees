---
name: HydraulicThermalVolume
category: Component (hydraulic)
summary: Oil volume with pressure AND temperature states plus a heat port — the thermal-hydraulic node for warm-up and cooling-loop studies.
related: []
examples: []
tags: [hydraulicthermalvolume, component, hydraulic, acausal]
references: []
---

# HydraulicThermalVolume

Oil volume with pressure AND temperature states plus a heat port — the thermal-hydraulic node for warm-up and cooling-loop studies.

The cav variant collapses the effective bulk modulus as pressure approaches vapor (aeration/cavitation clamp).

Reusable acausal **hydraulic-domain** component: instantiate it and connect its ports; the constitutive equations below expand into the global system.

> **Generated** from the component library (`crates/frees-core/src/components/library-data/hydraulic.frees`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
HydraulicThermalVolume inst(V, rho, cp_o, beta, hA, P0, T0, Pvap, eps_c, model$, domain$)
```

## Ports

`in`, `out`, `wall`

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `V` | Number | Volume [m^3]. |
| `rho` | Number | Oil density [kg/m^3]. |
| `cp_o` | Number | Oil specific heat [J/kg-K]. |
| `beta` | Number | Oil bulk modulus [Pa]. |
| `hA` | Number | Oil-to-wall conductance [W/K]. |
| `P0` | Number | Initial pressure [Pa]. |
| `T0` | Number | Initial oil temperature [K]. |
| `Pvap` | Number | Vapour pressure where the bulk modulus collapses (`cav`) [Pa]. |
| `eps_c` | Number | Width of the cavitation transition (`cav`) [Pa]. |
| `model$` | String | Variant — `stiff` (default) or `cav`. |
| `domain$` | String | Connector fluid family — one of `fluid`, `gas`, `oil`, `moistair`, `liquid`, `twophase`. |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
\text{der}\left(pm\right) &= \frac{beta_{eff}}{rho\cdot v}\cdot \left(in.mdot - out.mdot\right) \\
\text{init}\left(pm\right) &= p0 \\
t_{in} &= \frac{in.h}{cp_{o}} \\
\text{der}\left(tm\right) &= \frac{in.mdot\cdot cp_{o}\cdot \left(t_{in} - tm\right) + ha\cdot \left(wall.t - tm\right)}{rho\cdot v\cdot cp_{o}} \\
\text{init}\left(tm\right) &= t0 \\
in.p &= pm \\
out.p &= pm \\
out.h &= cp_{o}\cdot tm \\
wall.qdot &= ha\cdot \left(wall.t - tm\right)
\end{aligned}
$$

## Model Variants

Selected via the `model$` parameter; each adds its own equations (and `REQUIRE`d parameters):

### `stiff`

$$
\begin{aligned}
beta_{eff} &= beta
\end{aligned}
$$

### `cav` — requires `Pvap`, `eps_c`

$$
\begin{aligned}
beta_{eff} &= beta\cdot 0.5\cdot \left(1 + \tanh\left(\frac{pm - pvap}{eps_{c}}\right)\right)
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Thermal-hydraulic oil node (stiff variant) in a warm-up loop at steady
// state: 0.5 kg/s of 330 K oil (h = cp_o*T = 1900*330) flows through the
// volume, whose wall convects (hA = 50 W/K) to a 300 K casing. Steady:
// 0.5*1900*(330 - Tm) + 50*(300 - Tm) = 0 -> Tm = 328.5 K. The node pressure
// floats to the downstream orifice's requirement.
function [out] = WarmOilSource(mdot, h, domain$ = oil)
port(out)
  out.mdot = mdot
  out.h    = h
end
WarmOilSource        SRC(mdot=0.5, h=627000)
HydraulicThermalVolume HTV(V=0.004 [m^3], rho=870 [kg/m^3], cp_o=1900 [J/kg-K], beta=1.4e9 [Pa], hA=50 [W/K], P0=1000000 [Pa], T0=300 [K])
HydraulicOrifice     ORF(CdA=1e-5 [m^2], rho=870 [kg/m^3])
HydraulicTank        TNK(P=100000 [Pa])
ThermalSource        CASE(T=300 [K])
connect(SRC.out, HTV.in)
connect(HTV.out, ORF.in)
connect(ORF.out, TNK.port)
connect(HTV.wall, CASE.port)
t_oil  = HTV.Tm
p_node = HTV.Pm
q_wall = HTV.wall.Qdot

{ CHECK case.port.qdot 1425 0.0014249999999999998 }
{ CHECK case.port.t 300 0.0003 }
{ CHECK htv.beta_eff 1400000000 1400 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
case.port.qdot = 1425
case.port.t = 300
htv.beta_eff = 1400000000
```

<!-- verified-reference-example:end -->
