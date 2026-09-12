---
name: PneumaticActuator
category: Component (pneumatic)
summary: A pneumatic cylinder/actuator converting pressure to force.
related: []
examples: [pneumatic-spring-actuator]
tags: [pneumaticactuator, component, pneumatic, acausal]
references:
  - "ISO 6358 — Pneumatic fluid power: flow-rate characteristics"
---

# PneumaticActuator

A pneumatic cylinder/actuator converting pressure to force.

## Domain

A reusable **acausal pneumatic-domain** component — its compressible-gas ports carry pressure `P`, mass-flow `ṁ`, and enthalpy `h` (ISO 6358 flow). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `rod`

## Usage

```
PneumaticActuator inst(fluid$, area, Patm, domain$)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `fluid$` | String | Fluid name (e.g. Water, R134a, Air). |
| `area` | Number | Area [m²]. |
| `Patm` | Number | Atmospheric pressure [Pa]. |
| `domain$` | String | Connector fluid family — one of `fluid`, `gas`, `oil`, `moistair`, `liquid`, `twophase`. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
rho &= \text{Density}\left(\mathrm{fluid}, =in.p, p=in.h\right) \\
rod.f &= -\left(in.p - patm\right)\cdot area \\
in.mdot &= rho\cdot area\cdot rod.vel
\end{aligned}
$$

## References

1. ISO 6358 — Pneumatic fluid power: flow-rate characteristics.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
PneumaticSupply   SUP(fluid$=Air, P=300000, T=300)
PneumaticActuator ACT(fluid$=Air, area=0.01, Patm=100000)
TransDamper       D(c=1000)
TransGround       G()
connect(SUP.out, ACT.in)
connect(ACT.rod, D.a)
connect(D.b, G.port)

{ CHECK act.in.h 425848.6518 0.425848651817715 }
{ CHECK act.in.mdot 0.06973783779 6.973783778573017e-8 }
{ CHECK act.in.p 300000 0.3 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
act.in.h = 425848.6518
act.in.mdot = 0.06973783779
act.in.p = 300000
```

<!-- verified-reference-example:end -->
