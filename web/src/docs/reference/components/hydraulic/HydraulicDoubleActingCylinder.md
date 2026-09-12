---
name: HydraulicDoubleActingCylinder
category: Component (hydraulic)
summary: Acausal hydraulic-domain component HydraulicDoubleActingCylinder with ports a, b, rod.
related: []
examples: []
tags: [hydraulicdoubleactingcylinder, component, hydraulic, acausal]
references: []
generated: true
---

# HydraulicDoubleActingCylinder

Reusable acausal **hydraulic-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
HydraulicDoubleActingCylinder inst(Aa, Ab, rho, beta, Va0, Vb0, Pa0, Pb0, domain$)
```

## Ports

`a`, `b`, `rod`

## Parameters

| Parameter | Type |
| --- | --- |
| `Aa` | Number |
| `Ab` | Number |
| `rho` | Number |
| `beta` | Number |
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
HydraulicSupply SUP(P=8000000)
HydraulicSupply RODLN(P=200000)
HydraulicDoubleActingCylinder CYL(Aa=0.002, Ab=0.0012, rho=870, beta=1.4e9, Va0=0.001, Vb0=0.0006, Pa0=8000000, Pb0=200000)
TransDamper     DMP(c=50000)
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
