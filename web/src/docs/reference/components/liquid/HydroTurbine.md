---
name: HydroTurbine
category: Component (liquid)
summary: Acausal liquid-domain component HydroTurbine with ports in, out, shaft.
related: []
examples: []
tags: [hydroturbine, component, liquid, acausal]
references: []
generated: true
---

# HydroTurbine

Reusable acausal **liquid-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
HydroTurbine inst(fluid$, rho, eta$, epsw, domain$)
```

## Ports

`in`, `out`, `shaft`

## Parameters

| Parameter | Type |
| --- | --- |
| `fluid$` | String |
| `rho` | Number |
| `eta$` | String |
| `epsw` | Number |
| `domain$` | String |

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

TABLE etamap(m)
  0    0.85
  200  0.85
END
LiquidSource HIN(fluid$=Water, mdot=100, P=600000, T=300)
HydroTurbine HT(fluid$=Water, rho=1000, eta$=etamap, epsw=1e-6)
LiquidSink   HOUT()
SpeedSource  HS(w=30)
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
