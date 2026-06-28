---
name: TransGround
category: Component (mechanical)
summary: The translational reference (v = 0).
related: []
examples: []
tags: [transground, component, mechanical, acausal]
references:
  - "Karnopp, D.C., Margolis, D.L. & Rosenberg, R.C., System Dynamics: Modeling, Simulation, and Control of Mechatronic Systems (5th ed.) — acausal/bond-graph formalism"
  - "Karnopp, D.C., Margolis, D.L. & Rosenberg, R.C., System Dynamics (5th ed.)"
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

```
port.vel = 0
```

## References

1. Karnopp, D.C., Margolis, D.L. & Rosenberg, R.C., *System Dynamics: Modeling, Simulation, and Control of Mechatronic Systems* (5th ed.) — acausal/bond-graph formalism.
2. Karnopp, D.C., Margolis, D.L. & Rosenberg, R.C., *System Dynamics* (5th ed.).
