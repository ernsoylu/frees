---
name: BlendSource
category: Component (twophase)
summary: A boundary supplying a gas-blend stream of set composition.
related: []
examples: []
tags: [blendsource, component, twophase, acausal]
references:
  - "Karnopp, D.C., Margolis, D.L. & Rosenberg, R.C., System Dynamics: Modeling, Simulation, and Control of Mechatronic Systems (5th ed.) — acausal/bond-graph formalism"
  - "Collier, J.G. & Thome, J.R., Convective Boiling and Condensation (3rd ed.)"
---

# BlendSource

A boundary supplying a gas-blend stream of set composition.

## Domain

A reusable **acausal twophase-domain** component — its two-phase refrigerant ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h` (quality/void follow from the properties). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`out`

## Usage

```
BlendSource inst(fluid$, mdot, P, x, z, domain$)
```

## Parameters

| Parameter | Type |
| --- | --- |
| `fluid$` | String |
| `mdot` | Number |
| `P` | Number |
| `x` | Number |
| `z` | Number |
| `domain$` | String |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

```
out.mdot = mdot
out.P    = P
out.h    = Enthalpy(fluid$, P=P, x=x)
out.z    = z
bubble   = Temperature(fluid$, P=P, x=0)
dew      = Temperature(fluid$, P=P, x=1)
glide    = dew - bubble
```

## References

1. Karnopp, D.C., Margolis, D.L. & Rosenberg, R.C., *System Dynamics: Modeling, Simulation, and Control of Mechatronic Systems* (5th ed.) — acausal/bond-graph formalism.
2. Collier, J.G. & Thome, J.R., *Convective Boiling and Condensation* (3rd ed.).
