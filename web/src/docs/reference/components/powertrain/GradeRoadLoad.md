---
name: GradeRoadLoad
category: Component (powertrain)
summary: A vehicle road load including the road-grade contribution.
related: []
examples: []
tags: [graderoadload, component, powertrain, acausal]
---

# GradeRoadLoad

A vehicle road load including the road-grade contribution.

## Domain

A reusable **acausal powertrain-domain** component — its rotational ports carry angular velocity `ω` and torque `τ`, with vehicle-level speed/force signals. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`shaft`

## Usage

```
GradeRoadLoad inst(Crr, Caero, m, g, grade)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `Crr` | Number | Rolling-resistance coefficient. |
| `Caero` | Number | Aerodynamic drag term ½ρCdA [kg/m]. |
| `m` | Number | Mass [kg]. |
| `g` | Number | Gravitational acceleration [m/s²]. |
| `grade` | Number | Road grade (rise/run). |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
shaft.tau &= crr + caero\cdot shaft.w^{2} + m\cdot g\cdot \sin\left(grade\right)
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
