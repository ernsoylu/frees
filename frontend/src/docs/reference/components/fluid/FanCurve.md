---
name: FanCurve
category: Component (fluid)
summary: A fan whose pressure rise follows a tabulated pressure–flow performance curve.
related: []
examples: []
tags: [fancurve, component, fluid, acausal]
references:
  - "Karnopp, D.C., Margolis, D.L. & Rosenberg, R.C., System Dynamics: Modeling, Simulation, and Control of Mechatronic Systems (5th ed.) — acausal/bond-graph formalism"
  - "White, F.M., Fluid Mechanics (8th ed.)"
---

# FanCurve

A fan whose pressure rise follows a tabulated pressure–flow performance curve.

## Domain

A reusable **acausal fluid-domain** component — its thermofluid ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h`; a node enforces equal `P` and `Σṁ = 0`. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `out`

## Usage

```
FanCurve inst(rho, dP0, Q0)
```

## Parameters

| Parameter | Type |
| --- | --- |
| `rho` | Number |
| `dP0` | Number |
| `Q0` | Number |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

```
Q        = in.mdot / rho
dP       = dP0 * (1 - (Q / Q0)^2)
out.mdot = in.mdot
out.P    = in.P + dP
```

## References

1. Karnopp, D.C., Margolis, D.L. & Rosenberg, R.C., *System Dynamics: Modeling, Simulation, and Control of Mechatronic Systems* (5th ed.) — acausal/bond-graph formalism.
2. White, F.M., *Fluid Mechanics* (8th ed.).
