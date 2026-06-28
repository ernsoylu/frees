---
name: DCMotor
category: Component (electrical)
summary: A DC motor — an electrical-to-mechanical transducer (back-EMF and torque constants).
related: []
examples: []
tags: [dcmotor, component, electrical, acausal]
references:
  - "Karnopp, D.C., Margolis, D.L. & Rosenberg, R.C., System Dynamics: Modeling, Simulation, and Control of Mechatronic Systems (5th ed.) — acausal/bond-graph formalism"
  - "Nilsson, J.W. & Riedel, S.A., Electric Circuits (11th ed.)"
---

# DCMotor

A DC motor — an electrical-to-mechanical transducer (back-EMF and torque constants).

## Domain

A reusable **acausal electrical-domain** component — its electrical ports carry potential `V` and current `I`; a node enforces equal `V` and `ΣI = 0` (Kirchhoff). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`p`, `n`, `shaft`

## Usage

```
DCMotor inst(Kt, Ke, R)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `Kt` | Number | Torque constant [N·m/A]. |
| `Ke` | Number | Back-EMF constant [V·s/rad]. |
| `R` | Number | Resistance [Ω]. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

```
p.V - n.V  = R * p.I + Ke * shaft.w
p.I + n.I  = 0
shaft.tau  = -Kt * p.I
```

## References

1. Karnopp, D.C., Margolis, D.L. & Rosenberg, R.C., *System Dynamics: Modeling, Simulation, and Control of Mechatronic Systems* (5th ed.) — acausal/bond-graph formalism.
2. Nilsson, J.W. & Riedel, S.A., *Electric Circuits* (11th ed.).
