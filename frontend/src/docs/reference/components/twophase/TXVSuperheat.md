---
name: TXVSuperheat
category: Component (twophase)
summary: A thermostatic expansion valve that meters flow to hold a target superheat.
related: []
examples: []
tags: [txvsuperheat, component, twophase, acausal]
references:
  - "Karnopp, D.C., Margolis, D.L. & Rosenberg, R.C., System Dynamics: Modeling, Simulation, and Control of Mechatronic Systems (5th ed.) — acausal/bond-graph formalism"
  - "Collier, J.G. & Thome, J.R., Convective Boiling and Condensation (3rd ed.)"
---

# TXVSuperheat

A thermostatic expansion valve that meters flow to hold a target superheat.

## Domain

A reusable **acausal twophase-domain** component — its two-phase refrigerant ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h` (quality/void follow from the properties). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `out`, `bulb`

## Usage

```
TXVSuperheat inst(fluid$, Kv, SH_set, domain$)
```

## Parameters

| Parameter | Type |
| --- | --- |
| `fluid$` | String |
| `Kv` | Number |
| `SH_set` | Number |
| `domain$` | String |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

```
out.mdot  = in.mdot
out.h     = in.h
bulb.Qdot = 0
T_sat     = Temperature(fluid$, P=out.P, x=1)
SH        = bulb.T - T_sat
in.mdot   = Kv * (SH - SH_set)
```

## References

1. Karnopp, D.C., Margolis, D.L. & Rosenberg, R.C., *System Dynamics: Modeling, Simulation, and Control of Mechatronic Systems* (5th ed.) — acausal/bond-graph formalism.
2. Collier, J.G. & Thome, J.R., *Convective Boiling and Condensation* (3rd ed.).
