---
name: Fan
category: Component (fluid)
summary: Adds a pressure rise to a gas/air stream, computing the fan work.
related: []
examples: []
tags: [fan, component, fluid, acausal]
references:
  - "Karnopp, D.C., Margolis, D.L. & Rosenberg, R.C., System Dynamics: Modeling, Simulation, and Control of Mechatronic Systems (5th ed.) — acausal/bond-graph formalism"
  - "White, F.M., Fluid Mechanics (8th ed.)"
---

# Fan

Adds a pressure rise to a gas/air stream, computing the fan work.

## Domain

A reusable **acausal fluid-domain** component — its thermofluid ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h`; a node enforces equal `P` and `Σṁ = 0`. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `out`

## Usage

```
Fan inst(fluid$, dP0, Q0, eta)
```

## Parameters

| Parameter | Type |
| --- | --- |
| `fluid$` | String |
| `dP0` | Number |
| `Q0` | Number |
| `eta` | Number |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

```
rho      = Density(fluid$, P=in.P, h=in.h)
Q        = in.mdot / rho
dP       = dP0 * (1 - (Q / Q0)^2)
out.mdot = in.mdot
out.P    = in.P + dP
out.h    = in.h + dP / (rho * eta)
```

## References

1. Karnopp, D.C., Margolis, D.L. & Rosenberg, R.C., *System Dynamics: Modeling, Simulation, and Control of Mechatronic Systems* (5th ed.) — acausal/bond-graph formalism.
2. White, F.M., *Fluid Mechanics* (8th ed.).
