---
name: BatteryRC
category: Component (electrical)
summary: A battery with one RC branch for first-order transient terminal behavior.
related: []
examples: []
tags: [batteryrc, component, electrical, acausal]
references:
  - "Karnopp, D.C., Margolis, D.L. & Rosenberg, R.C., System Dynamics: Modeling, Simulation, and Control of Mechatronic Systems (5th ed.) — acausal/bond-graph formalism"
  - "Nilsson, J.W. & Riedel, S.A., Electric Circuits (11th ed.)"
---

# BatteryRC

A battery with one RC branch for first-order transient terminal behavior.

## Domain

A reusable **acausal electrical-domain** component — its electrical ports carry potential `V` and current `I`; a node enforces equal `V` and `ΣI = 0` (Kirchhoff). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`p`, `n`

## Usage

```
BatteryRC inst(Voc, R0, R1, C1, Vrc0)
```

## Parameters

| Parameter | Type |
| --- | --- |
| `Voc` | Number |
| `R0` | Number |
| `R1` | Number |
| `C1` | Number |
| `Vrc0` | Number |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

```
p.V - n.V = Voc + R0 * p.I - Vrc
der(Vrc)  = -p.I / C1 - Vrc / (R1 * C1)
init(Vrc) = Vrc0
p.I + n.I = 0
```

## References

1. Karnopp, D.C., Margolis, D.L. & Rosenberg, R.C., *System Dynamics: Modeling, Simulation, and Control of Mechatronic Systems* (5th ed.) — acausal/bond-graph formalism.
2. Nilsson, J.W. & Riedel, S.A., *Electric Circuits* (11th ed.).
