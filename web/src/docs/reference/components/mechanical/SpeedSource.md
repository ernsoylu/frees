---
name: SpeedSource
category: Component (mechanical)
summary: A prescribed angular velocity.
related: []
examples: []
tags: [speedsource, component, mechanical, acausal]
---

# SpeedSource

A prescribed angular velocity.

## Domain

A reusable **acausal mechanical-domain** component — its rotational ports carry angular velocity `ω` and torque `τ` (`Στ = 0`); translational ports carry velocity `v` and force `F` (`ΣF = 0`). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`a`, `b`

## Usage

```
SpeedSource inst(w)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `w` | Number | Frequency [rad/s]. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
a.w - b.w &= w \\
a.tau + b.tau &= 0
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
GradeRoadLoad ROAD(Crr=50, Caero=2, m=1500, g=9.81, grade=0.05)
SpeedSource   SS(w=30)
MechGround    G()
connect(SS.a, ROAD.shaft)
connect(SS.b, G.port)

{ CHECK g.port.tau -2585.443476 0.0025854434758180314 }
{ CHECK g.port.w 0 1e-8 }
{ CHECK road.shaft.tau 2585.443476 0.0025854434758180314 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
g.port.tau = -2585.443476
g.port.w = 0
road.shaft.tau = 2585.443476
```

<!-- verified-reference-example:end -->
