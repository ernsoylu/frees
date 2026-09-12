---
name: TransGround
category: Component (mechanical)
summary: The translational reference (v = 0).
related: []
examples: [pneumatic-spring-actuator, hydraulic-spring-actuator, damped-actuator-motion]
tags: [transground, component, mechanical, acausal]
---

# TransGround

The translational reference (`v = 0`).

## Domain

A reusable **acausal mechanical-domain** component — its rotational ports carry angular velocity `ω` and torque `τ` (`Στ = 0`); translational ports carry velocity `v` and force `F` (`ΣF = 0`). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`port`

## Usage

```
TransGround inst(...)
```

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
port.vel &= 0
\end{aligned}
$$

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
