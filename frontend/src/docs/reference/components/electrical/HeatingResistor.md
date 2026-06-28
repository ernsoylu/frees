---
name: HeatingResistor
category: Component (electrical)
summary: A resistor that dissipates its electrical power as heat (electrical→thermal transducer).
related: []
examples: [pressure-cooker]
tags: [heatingresistor, component, electrical, acausal]
references:
  - "Karnopp, D.C., Margolis, D.L. & Rosenberg, R.C., System Dynamics: Modeling, Simulation, and Control of Mechatronic Systems (5th ed.) — acausal/bond-graph formalism"
  - "Nilsson, J.W. & Riedel, S.A., Electric Circuits (11th ed.)"
---

# HeatingResistor

A resistor that dissipates its electrical power as heat (electrical→thermal transducer).

## Domain

A reusable **acausal electrical-domain** component — its electrical ports carry potential `V` and current `I`; a node enforces equal `V` and `ΣI = 0` (Kirchhoff). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`p`, `n`, `heat`

## Usage

```
HeatingResistor inst(R)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `R` | Number | Resistance [Ω]. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

```
p.V - n.V = R * p.I
p.I + n.I = 0
Q         = (p.V - n.V) * p.I
heat.Qdot = -Q
```

## Examples

Instantiated in the verified example below:

[Run: pressure-cooker]

## References

1. Karnopp, D.C., Margolis, D.L. & Rosenberg, R.C., *System Dynamics: Modeling, Simulation, and Control of Mechatronic Systems* (5th ed.) — acausal/bond-graph formalism.
2. Nilsson, J.W. & Riedel, S.A., *Electric Circuits* (11th ed.).
