---
name: SpeedSource
category: Component (mechanical)
summary: A prescribed angular velocity.
related: []
examples: []
tags: [speedsource, component, mechanical, acausal]
references:
  - "Karnopp, D.C., Margolis, D.L. & Rosenberg, R.C., System Dynamics: Modeling, Simulation, and Control of Mechatronic Systems (5th ed.) — acausal/bond-graph formalism"
  - "Karnopp, D.C., Margolis, D.L. & Rosenberg, R.C., System Dynamics (5th ed.)"
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

| Parameter | Type |
| --- | --- |
| `w` | Number |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

```
a.w - b.w = w
a.tau + b.tau = 0
```

## References

1. Karnopp, D.C., Margolis, D.L. & Rosenberg, R.C., *System Dynamics: Modeling, Simulation, and Control of Mechatronic Systems* (5th ed.) — acausal/bond-graph formalism.
2. Karnopp, D.C., Margolis, D.L. & Rosenberg, R.C., *System Dynamics* (5th ed.).
