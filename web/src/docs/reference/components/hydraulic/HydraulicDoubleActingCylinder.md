---
name: HydraulicDoubleActingCylinder
category: Component (hydraulic)
summary: "Double-acting cylinder: two bulk-modulus chambers (piston/rod areas Aa, Ab) and the rod force balance."
related: []
examples: []
tags: [hydraulicdoubleactingcylinder, component, hydraulic, acausal]
references: []
---

# HydraulicDoubleActingCylinder

Double-acting cylinder: two bulk-modulus chambers (piston/rod areas Aa, Ab) and the rod force balance.

Chamber volumes are taken at mid-stroke (Va0, Vb0) — the standard lumped rung.

Reusable acausal **hydraulic-domain** component: instantiate it and connect its ports; the constitutive equations below expand into the global system.

> **Generated** from the component library (`crates/frees-core/src/components/library-data/hydraulic.frees`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
HydraulicDoubleActingCylinder inst(Aa, Ab, rho, beta, Va0, Vb0, Pa0, Pb0, domain$)
```

## Ports

`a`, `b`, `rod`

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `Aa` | Number | Piston area on the cap side (port a) [m^2]. |
| `Ab` | Number | Annulus area on the rod side (port b) [m^2]. |
| `rho` | Number | Oil density [kg/m^3]. |
| `beta` | Number | Oil bulk modulus [Pa]. |
| `Va0` | Number | Chamber volume on side a [m^3]. |
| `Vb0` | Number | Chamber volume on side b [m^3]. |
| `Pa0` | Number | Initial pressure in chamber a [Pa]. |
| `Pb0` | Number | Initial pressure in chamber b [Pa]. |
| `domain$` | String | Connector fluid family — one of `fluid`, `gas`, `oil`, `moistair`, `liquid`, `twophase`. |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
rod.f &= -\left(a.p\cdot aa - b.p\cdot ab\right) \\
\text{der}\left(a.p\right) &= \frac{beta}{va0}\cdot \left(\frac{a.mdot}{rho} - aa\cdot rod.vel\right) \\
\text{init}\left(a.p\right) &= pa0 \\
\text{der}\left(b.p\right) &= \frac{beta}{vb0}\cdot \left(\frac{b.mdot}{rho} + ab\cdot rod.vel\right) \\
\text{init}\left(b.p\right) &= pb0
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Double-acting cylinder at its steady extension speed: cap side on an 80 bar
// supply (Aa = 20 cm2), rod side vented to a 2 bar tank (Ab = 12 cm2), rod on
// a 50 kN.s/m damper. F = 8e6*0.002 - 2e5*0.0012 = 15760 N -> vel = 0.3152 m/s;
// der(P) -> 0 gives the chamber flows rho*A*vel.
HydraulicSupply SUP(P=8000000 [Pa])
HydraulicSupply RODLN(P=200000 [Pa])
HydraulicDoubleActingCylinder CYL(Aa=0.002 [m^2], Ab=0.0012 [m^2], rho=870 [kg/m^3], beta=1.4e9 [Pa], Va0=0.001 [m^3], Vb0=0.0006 [m^3], Pa0=8000000 [Pa], Pb0=200000 [Pa])
TransDamper     DMP(c=50000 [kg/s])
TransGround     GND()
connect(SUP.out, CYL.a)
connect(RODLN.out, CYL.b)
connect(CYL.rod, DMP.a)
connect(DMP.b, GND.port)
v_ext = CYL.rod.vel
q_cap = CYL.a.mdot
q_rod = CYL.b.mdot

{ CHECK cyl.a.h 0 1e-8 }
{ CHECK cyl.a.mdot 0.548448 5.48448e-7 }
{ CHECK cyl.a.p 8000000 8 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
cyl.a.h = 0
cyl.a.mdot = 0.548448
cyl.a.p = 8000000
```

<!-- verified-reference-example:end -->
