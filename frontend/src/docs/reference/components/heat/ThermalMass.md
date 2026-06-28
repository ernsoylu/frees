---
name: ThermalMass
category: Component (heat)
summary: A lumped thermal capacitance, C dT/dt = Q̇.
related: []
examples: [pressure-cooker]
tags: [thermalmass, component, heat, acausal]
references:
  - "Karnopp, D.C., Margolis, D.L. & Rosenberg, R.C., System Dynamics: Modeling, Simulation, and Control of Mechatronic Systems (5th ed.) — acausal/bond-graph formalism"
  - "Incropera, F.P. et al., Fundamentals of Heat and Mass Transfer"
---

# ThermalMass

A lumped thermal capacitance, `C dT/dt = Q̇`.

## Domain

A reusable **acausal heat-domain** component — its thermal ports carry temperature `T` and heat-flow rate `Q̇`; a node enforces equal `T` and `ΣQ̇ = 0`. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`port`

## Usage

```
ThermalMass inst(C, T0)
```

## Parameters

| Parameter | Type |
| --- | --- |
| `C` | Number |
| `T0` | Number |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

```
der(port.T)  = port.Qdot / C
init(port.T) = T0
```

## Examples

Instantiated in the verified example below:

[Run: pressure-cooker]

## References

1. Karnopp, D.C., Margolis, D.L. & Rosenberg, R.C., *System Dynamics: Modeling, Simulation, and Control of Mechatronic Systems* (5th ed.) — acausal/bond-graph formalism.
2. Incropera, F.P. et al., *Fundamentals of Heat and Mass Transfer*.
