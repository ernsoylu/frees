---
name: HydraulicCylinder
category: Component (hydraulic)
summary: A hydraulic actuator converting flow/pressure to motion/force.
related: []
examples: []
tags: [hydrauliccylinder, component, hydraulic, acausal]
references:
  - "Karnopp, D.C., Margolis, D.L. & Rosenberg, R.C., System Dynamics: Modeling, Simulation, and Control of Mechatronic Systems (5th ed.) — acausal/bond-graph formalism"
  - "Merritt, H.E., Hydraulic Control Systems"
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

| Parameter | Type |
| --- | --- |
| `rho` | Number |
| `beta` | Number |
| `V0` | Number |
| `area` | Number |
| `Patm` | Number |
| `P0` | Number |
| `domain$` | String |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

```
rod.f      = -(in.P - Patm) * area
der(in.P)  = (beta / V0) * (in.mdot / rho - area * rod.vel)
init(in.P) = P0
```

## References

1. Karnopp, D.C., Margolis, D.L. & Rosenberg, R.C., *System Dynamics: Modeling, Simulation, and Control of Mechatronic Systems* (5th ed.) — acausal/bond-graph formalism.
2. Merritt, H.E., *Hydraulic Control Systems*.
