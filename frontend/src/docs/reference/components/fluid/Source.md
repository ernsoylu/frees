---
name: Source
category: Component (fluid)
summary: A fluid boundary that supplies a stream at set conditions.
related: []
examples: []
tags: [source, component, fluid, acausal]
references:
  - "Karnopp, D.C., Margolis, D.L. & Rosenberg, R.C., System Dynamics: Modeling, Simulation, and Control of Mechatronic Systems (5th ed.) — acausal/bond-graph formalism"
  - "White, F.M., Fluid Mechanics (8th ed.)"
---

# Source

A fluid boundary that supplies a stream at set conditions.

## Domain

A reusable **acausal fluid-domain** component — its thermofluid ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h`; a node enforces equal `P` and `Σṁ = 0`. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`out`

## Usage

```
Source inst(fluid$, mdot, P, T)
```

## Parameters

| Parameter | Type |
| --- | --- |
| `fluid$` | String |
| `mdot` | Number |
| `P` | Number |
| `T` | Number |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

```
out.mdot = mdot
out.P    = P
out.h    = Enthalpy(fluid$, P=P, T=T)
```

## References

1. Karnopp, D.C., Margolis, D.L. & Rosenberg, R.C., *System Dynamics: Modeling, Simulation, and Control of Mechatronic Systems* (5th ed.) — acausal/bond-graph formalism.
2. White, F.M., *Fluid Mechanics* (8th ed.).
