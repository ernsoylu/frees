---
name: RadiationTwoSurface
category: Component (heat)
summary: "Two-surface radiation enclosure: surface resistances (1−ε)/(εA) in series with the view-factor space resistance 1/(A1·F12), on the σ(T⁴−T⁴) potential."
related: []
examples: []
tags: [radiationtwosurface, component, heat, acausal]
references: []
---

# RadiationTwoSurface

Two-surface radiation enclosure: surface resistances (1−ε)/(εA) in series with the view-factor space resistance 1/(A1·F12), on the σ(T⁴−T⁴) potential.

Reusable acausal **heat-domain** component: instantiate it and connect its ports; the constitutive equations below expand into the global system.

> **Generated** from the component library (`crates/frees-core/src/components/library-data/heat.frees`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
RadiationTwoSurface inst(e1, e2, A1, A2, F12)
```

## Ports

`a`, `b`

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `e1` | Number | Emissivity of surface 1 [-]. |
| `e2` | Number | Emissivity of surface 2 [-]. |
| `A1` | Number | Area of surface 1 [m^2]. |
| `A2` | Number | Area of surface 2 [m^2]. |
| `F12` | Number | View factor from surface 1 to surface 2 [-]. |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
rrad &= \frac{1 - e1}{e1\cdot a1} + \frac{1}{a1\cdot f12} + \frac{1 - e2}{e2\cdot a2} \\
a.qdot &= \frac{5.670374419E-8\,\left[kg/s^3-K^4\right]\,\left(a.t^{4} - b.t^{4}\right)}{rrad} \\
a.qdot + b.qdot &= 0
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Two-surface radiation enclosure (e=0.8 both, F12=1, unit areas): R = 1.5,
// Q = sigma*(600^4-300^4)/1.5 = 4593.003 W. Heat pipe saturates at Qmax.
// Thermal switch: shut cold, G*dT hot. Peltier at I=5 A between 320/300 K:
// V = 11 V, Qc = 40 W, Qh = 95 W (Qh - Qc = I*V).
// EXPECT q_rad = 4593.003 tol 0.01
// EXPECT q_hp = 50 tol 1e-6
// EXPECT q_sw0 = 0 tol 1e-6
// EXPECT q_sw1 = 500 tol 0.01
// EXPECT v_tec = 11 tol 1e-6
// EXPECT qc_tec = 40 tol 1e-6
// EXPECT qh_tec = 95 tol 1e-6
ThermalSource A1(T=600 [K])
ThermalSource B1(T=300 [K])
RadiationTwoSurface RD(e1=0.8, e2=0.8, A1=1 [m^2], A2=1 [m^2], F12=1)
connect(A1.port, RD.a)
connect(RD.b, B1.port)
q_rad = RD.a.Qdot

ThermalSource A2(T=310 [K])
ThermalSource B2(T=300 [K])
HeatPipe HP(G=100 [W/K], Qmax=50 [W])
connect(A2.port, HP.a)
connect(HP.b, B2.port)
q_hp = HP.a.Qdot

ThermalSource A3(T=340 [K])
ThermalSource B3(T=300 [K])
ThermalSwitch SW0(G=50 [W/K], Ton=360 [K], band=1 [K])
connect(A3.port, SW0.a)
connect(SW0.b, B3.port)
q_sw0 = SW0.a.Qdot
ThermalSource A4(T=380 [K])
ThermalSource B4(T=370 [K])
ThermalSwitch SW1(G=50 [W/K], Ton=360 [K], band=1 [K])
connect(A4.port, SW1.a)
connect(SW1.b, B4.port)
q_sw1 = SW1.a.Qdot

PeltierTEC    TEC(Sab=0.05 [V/K], Rel=2 [ohm], Kth=0.5 [W/K])
CurrentSource CI(I=5 [A])
Ground        GT()
ThermalSource TH(T=320 [K])
ThermalSource TC(T=300 [K])
connect(TEC.p, CI.p)
connect(TEC.n, CI.n, GT.port)
connect(TEC.hot, TH.port)
connect(TEC.cold, TC.port)
v_tec  = TEC.p.V - TEC.n.V
qc_tec = TEC.Qc
qh_tec = TEC.Qh

{ CHECK a1.port.qdot -4593.003279 0.00459300327939 }
{ CHECK a1.port.t 600 0.0006 }
{ CHECK a2.port.qdot -50 0.000049999999999999996 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
a1.port.qdot = -4593.003279
a1.port.t = 600
a2.port.qdot = -50
```

<!-- verified-reference-example:end -->
