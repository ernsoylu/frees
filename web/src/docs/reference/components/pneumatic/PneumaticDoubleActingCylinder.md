---
name: PneumaticDoubleActingCylinder
category: Component (pneumatic)
summary: Acausal pneumatic-domain component PneumaticDoubleActingCylinder with ports a, b, rod.
related: []
examples: []
tags: [pneumaticdoubleactingcylinder, component, pneumatic, acausal]
references: []
generated: true
---

# PneumaticDoubleActingCylinder

Reusable acausal **pneumatic-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
PneumaticDoubleActingCylinder inst(Aa, Ab, R, T, Va0, Vb0, Pa0, Pb0, domain$)
```

## Ports

`a`, `b`, `rod`

## Parameters

| Parameter | Type |
| --- | --- |
| `Aa` | Number |
| `Ab` | Number |
| `R` | Number |
| `T` | Number |
| `Va0` | Number |
| `Vb0` | Number |
| `Pa0` | Number |
| `Pb0` | Number |
| `domain$` | String |

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
PneumaticSupply SUP(fluid$=Air, P=600000, T=300)
PneumaticSupply RET(fluid$=Air, P=100000, T=300)
PneumaticDoubleActingCylinder CYL(Aa=0.004, Ab=0.003, R=287, T=300, Va0=0.0008, Vb0=0.0006, Pa0=600000, Pb0=100000)
TransDamper     DMP(c=40000)
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
