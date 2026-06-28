---
name: MoistAirSource
category: Component (moistair)
summary: A humid-air boundary supplying a stream of set state.
related: []
examples: []
tags: [moistairsource, component, moistair, acausal]
references:
  - "Karnopp, D.C., Margolis, D.L. & Rosenberg, R.C., System Dynamics: Modeling, Simulation, and Control of Mechatronic Systems (5th ed.) — acausal/bond-graph formalism"
  - "ASHRAE Handbook — Fundamentals (Psychrometrics)"
---

# MoistAirSource

A humid-air boundary supplying a stream of set state.

## Domain

A reusable **acausal moistair-domain** component — its humid-air ports carry pressure `P`, dry-air mass-flow `ṁ_da`, enthalpy `h`, and humidity ratio `W`. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`out`

## Usage

```
MoistAirSource inst(P, T, W, mdot, domain$)
```

## Parameters

| Parameter | Type |
| --- | --- |
| `P` | Number |
| `T` | Number |
| `W` | Number |
| `mdot` | Number |
| `domain$` | String |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

```
out.P    = P
out.mdot = mdot
out.W    = W
out.h    = Enthalpy(AirH2O, T=T, P=P, W=W)
```

## References

1. Karnopp, D.C., Margolis, D.L. & Rosenberg, R.C., *System Dynamics: Modeling, Simulation, and Control of Mechatronic Systems* (5th ed.) — acausal/bond-graph formalism.
2. ASHRAE Handbook — Fundamentals (Psychrometrics).
