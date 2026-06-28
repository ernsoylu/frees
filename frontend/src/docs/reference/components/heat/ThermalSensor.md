---
name: ThermalSensor
category: Component (heat)
summary: A temperature sensor (pass-through).
related: []
examples: []
tags: [thermalsensor, component, heat, acausal]
references:
  - "Karnopp, D.C., Margolis, D.L. & Rosenberg, R.C., System Dynamics: Modeling, Simulation, and Control of Mechatronic Systems (5th ed.) — acausal/bond-graph formalism"
  - "Incropera, F.P. et al., Fundamentals of Heat and Mass Transfer"
---

# ThermalSensor

A temperature sensor (pass-through).

## Domain

A reusable **acausal heat-domain** component — its thermal ports carry temperature `T` and heat-flow rate `Q̇`; a node enforces equal `T` and `ΣQ̇ = 0`. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`port`

## Usage

```
ThermalSensor inst(...)
```

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

```
port.Qdot = 0
T_meas    = port.T
```

## References

1. Karnopp, D.C., Margolis, D.L. & Rosenberg, R.C., *System Dynamics: Modeling, Simulation, and Control of Mechatronic Systems* (5th ed.) — acausal/bond-graph formalism.
2. Incropera, F.P. et al., *Fundamentals of Heat and Mass Transfer*.
