---
name: GradeRoadLoad
category: Component (powertrain)
summary: A vehicle road load including the road-grade contribution.
related: []
examples: []
tags: [graderoadload, component, powertrain, acausal]
references:
  - "the standard literature, D.C., the standard literature, D.L. & Rosenberg, R.C., a standard system-dynamics text (5th ed.) — acausal/bond-graph formalism"
  - "the standard literature, L. & the standard literature, A., a standard propulsion text"
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

| Parameter | Type |
| --- | --- |
| `Crr` | Number |
| `Caero` | Number |
| `m` | Number |
| `g` | Number |
| `grade` | Number |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

```
shaft.tau = Crr + Caero * shaft.w^2 + m * g * sin(grade)
```

## References

1. the standard literature, D.C., the standard literature, D.L. & Rosenberg, R.C., *a standard system-dynamics text* (5th ed.) — acausal/bond-graph formalism.
2. the standard literature, L. & the standard literature, A., *Vehicle Propulsion Systems* (3rd ed.).
