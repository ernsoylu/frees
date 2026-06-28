---
name: PneumaticActuator
category: Component (pneumatic)
summary: A pneumatic cylinder/actuator converting pressure to force.
related: []
examples: []
tags: [pneumaticactuator, component, pneumatic, acausal]
references:
  - "Karnopp, D.C., Margolis, D.L. & Rosenberg, R.C., System Dynamics: Modeling, Simulation, and Control of Mechatronic Systems (5th ed.) — acausal/bond-graph formalism"
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

| Parameter | Type |
| --- | --- |
| `fluid$` | String |
| `area` | Number |
| `Patm` | Number |
| `domain$` | String |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

```
rho     = Density(fluid$, P=in.P, h=in.h)
rod.f   = -(in.P - Patm) * area
in.mdot = rho * area * rod.vel
```

## References

1. Karnopp, D.C., Margolis, D.L. & Rosenberg, R.C., *System Dynamics: Modeling, Simulation, and Control of Mechatronic Systems* (5th ed.) — acausal/bond-graph formalism.
2. ISO 6358 — Pneumatic fluid power: flow-rate characteristics.
