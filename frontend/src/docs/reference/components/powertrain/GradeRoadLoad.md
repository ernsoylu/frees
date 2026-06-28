---
name: GradeRoadLoad
category: Component (powertrain)
summary: A vehicle road load including the road-grade contribution.
related: []
examples: []
tags: [graderoadload, component, powertrain, acausal]
references:
  - "Karnopp, D.C., Margolis, D.L. & Rosenberg, R.C., System Dynamics: Modeling, Simulation, and Control of Mechatronic Systems (5th ed.) — acausal/bond-graph formalism"
  - "Guzzella, L. & Sciarretta, A., Vehicle Propulsion Systems (3rd ed.)"
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

```
shaft.tau = Crr + Caero * shaft.w^2 + m * g * sin(grade)
```

## References

1. Karnopp, D.C., Margolis, D.L. & Rosenberg, R.C., *System Dynamics: Modeling, Simulation, and Control of Mechatronic Systems* (5th ed.) — acausal/bond-graph formalism.
2. Guzzella, L. & Sciarretta, A., *Vehicle Propulsion Systems* (3rd ed.).
