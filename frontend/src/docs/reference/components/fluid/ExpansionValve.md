---
name: ExpansionValve
category: Component (fluid)
summary: Throttles a fluid to a lower pressure isenthalpically (Joule–Thomson).
related: []
examples: []
tags: [expansionvalve, component, fluid, acausal]
references:
  - "Karnopp, D.C., Margolis, D.L. & Rosenberg, R.C., System Dynamics: Modeling, Simulation, and Control of Mechatronic Systems (5th ed.) — acausal/bond-graph formalism"
  - "White, F.M., Fluid Mechanics (8th ed.)"
---

# ExpansionValve

Throttles a fluid to a lower pressure isenthalpically (Joule–Thomson).

## Domain

A reusable **acausal fluid-domain** component — its thermofluid ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h`; a node enforces equal `P` and `Σṁ = 0`. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `out`

## Usage

```
ExpansionValve inst(CdA, rho_in)
```

## Parameters

| Parameter | Type |
| --- | --- |
| `CdA` | Number |
| `rho_in` | Number |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

```
out.mdot = in.mdot
out.h    = in.h
in.mdot * abs(in.mdot) = CdA^2 * 2 * rho_in * (in.P - out.P)
```

## References

1. Karnopp, D.C., Margolis, D.L. & Rosenberg, R.C., *System Dynamics: Modeling, Simulation, and Control of Mechatronic Systems* (5th ed.) — acausal/bond-graph formalism.
2. White, F.M., *Fluid Mechanics* (8th ed.).
