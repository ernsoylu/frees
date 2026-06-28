---
name: RoadLoad
category: Component (powertrain)
summary: A vehicle road load (aerodynamic drag + rolling resistance).
related: []
examples: []
tags: [roadload, component, powertrain, acausal]
references:
  - "the standard literature, D.C., the standard literature, D.L. & Rosenberg, R.C., a standard system-dynamics text (5th ed.) — acausal/bond-graph formalism"
  - "the standard literature, L. & the standard literature, A., a standard propulsion text"
---

# RoadLoad

A vehicle road load (aerodynamic drag + rolling resistance).

## Domain

A reusable **acausal powertrain-domain** component — its rotational ports carry angular velocity `ω` and torque `τ`, with vehicle-level speed/force signals. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`shaft`

## Usage

```
RoadLoad inst(Crr, Caero)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `Crr` | Number | Rolling-resistance coefficient. |
| `Caero` | Number | Aerodynamic drag term ½ρCdA [kg/m]. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

```
shaft.tau = Crr + Caero * shaft.w^2
```

## References

1. the standard literature, D.C., the standard literature, D.L. & Rosenberg, R.C., *a standard system-dynamics text* (5th ed.) — acausal/bond-graph formalism.
2. the standard literature, L. & the standard literature, A., *Vehicle Propulsion Systems* (3rd ed.).
