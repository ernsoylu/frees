---
name: HydroTurbine
category: Component (liquid)
summary: "Hydro turbine: shaft power eta·(V̇·ΔP) from the head across it, efficiency from a flow map; the extracted work leaves the stream enthalpy."
related: []
examples: []
tags: [hydroturbine, component, liquid, acausal]
references: []
---

# HydroTurbine

Hydro turbine: shaft power eta·(V̇·ΔP) from the head across it, efficiency from a flow map; the extracted work leaves the stream enthalpy.

Reusable acausal **liquid-domain** component: instantiate it and connect its ports; the constitutive equations below expand into the global system.

> **Generated** from the component library (`crates/frees-core/src/components/library-data/liquid.frees`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
HydroTurbine inst(fluid$, rho, eta$, epsw, domain$)
```

## Ports

`in`, `out`, `shaft`

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `fluid$` | String | Liquid name (e.g. Water, EG50). |
| `rho` | Number | Liquid density [kg/m^3]. |
| `eta$` | String | Name of the efficiency table, mass flow → η. |
| `epsw` | Number | Regularization added to the shaft speed so torque stays finite at rest [rad/s]. |
| `domain$` | String | Connector fluid family — one of `fluid`, `gas`, `oil`, `moistair`, `liquid`, `twophase`. |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
out.mdot &= in.mdot \\
dp &= in.p - out.p \\
pf &= \frac{in.mdot}{rho}\cdot dp \\
eta &= \text{eta\$}\left(in.mdot\right) \\
pm &= eta\cdot pf \\
shaft.tau &= \frac{-pm}{shaft.w + epsw} \\
out.h &= in.h - \frac{pm}{in.mdot}
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// HydroTurbine: 100 kg/s across 5 bar at eta = 0.85 extracts 42.5 kW; the
// 30 rad/s shaft loads -1416.667 N·m and the stream loses 425 J/kg. Steady.
// EXPECT tau_h = -1416.667 tol 0.01
// EXPECT dh_h = -425 tol 0.01

TABLE etamap(m [kg/s]) [-]
  0    0.85
  200  0.85
END
LiquidSource HIN(fluid$=Water, mdot=100 [kg/s], P=600000 [Pa], T=300 [K])
HydroTurbine HT(fluid$=Water, rho=1000 [kg/m^3], eta$=etamap, epsw=1e-6 [rad/s])
LiquidSink   HOUT()
SpeedSource  HS(w=30 [rad/s])
MechGround   HG()
connect(HIN.out, HT.in)
connect(HT.out, HOUT.in)
connect(HT.shaft, HS.a)
connect(HS.b, HG.port)
HT.out.P = 100000
tau_h = HT.shaft.tau
dh_h  = HT.out.h - HT.in.h

{ CHECK dh_h -425 0.000425 }
{ CHECK hg.port.tau 1416.666619 0.001416666619444446 }
{ CHECK hg.port.w 0 1e-8 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
dh_h = -425 [J/kg]
hg.port.tau = 1416.666619
hg.port.w = 0
```

<!-- verified-reference-example:end -->
