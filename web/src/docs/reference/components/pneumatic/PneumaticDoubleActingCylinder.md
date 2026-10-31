---
name: PneumaticDoubleActingCylinder
category: Component (pneumatic)
summary: "Double-acting pneumatic cylinder: two isothermal ideal-gas chambers at mid-stroke volumes and the rod force balance."
related: []
examples: [pneumatic-cylinder-stall-force]
tags: [pneumaticdoubleactingcylinder, component, pneumatic, acausal]
references: []
---

# PneumaticDoubleActingCylinder

Double-acting pneumatic cylinder: two isothermal ideal-gas chambers at mid-stroke volumes and the rod force balance.

Reusable acausal **pneumatic-domain** component: instantiate it and connect its ports; the constitutive equations below expand into the global system.

> **Generated** from the component library (`crates/frees-core/src/components/library-data/pneumatic.frees`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
PneumaticDoubleActingCylinder inst(Aa, Ab, R, T, Va0, Vb0, Pa0, Pb0, domain$)
```

## Ports

`a`, `b`, `rod`

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `Aa` | Number | Piston area on the cap side (port a) [m^2]. |
| `Ab` | Number | Annulus area on the rod side (port b) [m^2]. |
| `R` | Number | Specific gas constant [J/kg-K]. |
| `T` | Number | Gas temperature, held isothermal [K]. |
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
\text{der}\left(a.p\right) &= \frac{r\cdot t\cdot a.mdot - a.p\cdot aa\cdot rod.vel}{va0} \\
\text{init}\left(a.p\right) &= pa0 \\
\text{der}\left(b.p\right) &= \frac{r\cdot t\cdot b.mdot + b.p\cdot ab\cdot rod.vel}{vb0} \\
\text{init}\left(b.p\right) &= pb0
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Double-acting pneumatic cylinder at its steady extension speed: cap side on
// 6 bar (Aa = 40 cm2), rod side on a 1 bar return line (Ab = 30 cm2), rod on
// a 40 kN.s/m damper. F = 6e5*0.004 - 1e5*0.003 = 2100 N -> vel = 0.0525 m/s;
// der(P) -> 0 gives the isothermal chamber flows P*A*vel/(R*T).
PneumaticSupply SUP(fluid$=Air, P=600000 [Pa], T=300 [K])
PneumaticSupply RET(fluid$=Air, P=100000 [Pa], T=300 [K])
PneumaticDoubleActingCylinder CYL(Aa=0.004 [m^2], Ab=0.003 [m^2], R=287 [J/kg-K], T=300 [K], Va0=0.0008 [m^3], Vb0=0.0006 [m^3], Pa0=600000 [Pa], Pb0=100000 [Pa])
TransDamper     DMP(c=40000 [kg/s])
TransGround     GND()
connect(SUP.out, CYL.a)
connect(RET.out, CYL.b)
connect(CYL.rod, DMP.a)
connect(DMP.b, GND.port)
v_ext = CYL.rod.vel
m_cap = CYL.a.mdot
m_rod = CYL.b.mdot

{ CHECK cyl.a.h 425173.9515 0.4251739514504108 }
{ CHECK cyl.a.mdot 0.001463414634 1e-8 }
{ CHECK cyl.a.p 600000 0.6 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
cyl.a.h = 425173.9515
cyl.a.mdot = 0.001463414634
cyl.a.p = 600000
```

<!-- verified-reference-example:end -->
