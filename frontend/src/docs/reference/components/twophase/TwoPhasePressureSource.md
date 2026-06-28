---
name: TwoPhasePressureSource
category: Component (twophase)
summary: A two-phase boundary fixing the pressure (source).
related: []
examples: [ev-thermal-management]
tags: [twophasepressuresource, component, twophase, acausal]
references:
  - "Karnopp, D.C., Margolis, D.L. & Rosenberg, R.C., System Dynamics: Modeling, Simulation, and Control of Mechatronic Systems (5th ed.) — acausal/bond-graph formalism"
  - "Collier, J.G. & Thome, J.R., Convective Boiling and Condensation (3rd ed.)"
---

# TwoPhasePressureSource

A two-phase boundary fixing the pressure (source).

## Domain

A reusable **acausal twophase-domain** component — its two-phase refrigerant ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h` (quality/void follow from the properties). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`out`

## Usage

```
TwoPhasePressureSource inst(fluid$, P, x, domain$)
```

## Parameters

| Parameter | Type |
| --- | --- |
| `fluid$` | String |
| `P` | Number |
| `x` | Number |
| `domain$` | String |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

```
out.P = P
out.h = Enthalpy(fluid$, P=P, x=x)
```

## Examples

Instantiated in the verified example below:

[Run: ev-thermal-management]

## References

1. Karnopp, D.C., Margolis, D.L. & Rosenberg, R.C., *System Dynamics: Modeling, Simulation, and Control of Mechatronic Systems* (5th ed.) — acausal/bond-graph formalism.
2. Collier, J.G. & Thome, J.R., *Convective Boiling and Condensation* (3rd ed.).
