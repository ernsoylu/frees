---
name: HydraulicCylinder
category: Component (hydraulic)
summary: A hydraulic actuator converting flow/pressure to motion/force.
related: []
examples: [hydraulic-spring-actuator]
tags: [hydrauliccylinder, component, hydraulic, acausal]
---

# HydraulicCylinder

A hydraulic actuator converting flow/pressure to motion/force.

## Domain

A reusable **acausal hydraulic-domain** component — its oil-hydraulic ports carry pressure `P`, mass-flow `ṁ`, and enthalpy `h`. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `rod`

## Usage

```
HydraulicCylinder inst(rho, beta, V0, area, Patm, P0, domain$)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `rho` | Number | Density [kg/m³]. |
| `beta` | Number | Chevron angle [deg] / coefficient. |
| `V0` | Number | Initial voltage / volume. |
| `area` | Number | Area [m²]. |
| `Patm` | Number | Atmospheric pressure [Pa]. |
| `P0` | Number | Reference/initial pressure [Pa]. |
| `domain$` | String | Connector fluid family — one of `fluid`, `gas`, `oil`, `moistair`, `liquid`, `twophase`. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
rod.f &= -\left(in.p - patm\right)\cdot area \\
\text{der}\left(in.p\right) &= \frac{beta}{v0}\cdot \left(\frac{in.mdot}{rho} - area\cdot rod.vel\right) \\
\text{init}\left(in.p\right) &= p0
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
HydraulicSupply   SUP(P=10000000)
HydraulicOrifice  ORI(CdA=1e-5, rho=850)
HydraulicCylinder CYL(rho=850, beta=1.5e9, V0=1e-4, area=0.001, Patm=100000, P0=100000)
TransGround       G()
connect(SUP.out, ORI.in)
connect(ORI.out, CYL.in)
connect(CYL.rod, G.port)

{ CHECK cyl.in.h 0 1e-8 }
{ CHECK cyl.in.mdot 0 1e-8 }
{ CHECK cyl.in.p 10000000 10 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
cyl.in.h = 0
cyl.in.mdot = 0
cyl.in.p = 10000000
```

<!-- verified-reference-example:end -->
