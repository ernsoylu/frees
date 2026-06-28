---
name: SteamReliefValve
category: Component (twophase)
summary: A steam relief valve venting above the set pressure.
related: []
examples: []
tags: [steamreliefvalve, component, twophase, acausal]
references:
  - "the standard literature, D.C., the standard literature, D.L. & Rosenberg, R.C., a standard system-dynamics text (5th ed.) — acausal/bond-graph formalism"
  - "the standard literature, J.G. & the standard literature, J.R., a standard two-phase text (3rd ed.)"
---

# SteamReliefValve

A steam relief valve venting above the set pressure.

## Domain

A reusable **acausal twophase-domain** component — its two-phase refrigerant ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h` (quality/void follow from the properties). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `out`

## Usage

```
SteamReliefValve inst(fluid$, A, Pset, Cd, kgas, Rgas, eps, domain$)
```

## Parameters

| Parameter | Type |
| --- | --- |
| `fluid$` | String |
| `A` | Number |
| `Pset` | Number |
| `Cd` | Number |
| `kgas` | Number |
| `Rgas` | Number |
| `eps` | Number |
| `domain$` | String |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

```
out.mdot = in.mdot
out.h    = in.h
opening  = 0.5 * (1 + tanh((in.P - Pset) / eps))
T0v      = Temperature(fluid$, P=in.P, x=1)
PRc      = (2 / (kgas + 1)) ^ (kgas / (kgas - 1))
mdot_ch  = Cd * A * in.P * sqrt(kgas / (Rgas * T0v)) * (2 / (kgas + 1)) ^ ((kgas + 1) / (2 * (kgas - 1)))
ratio    = (min(max(out.P / in.P, PRc), 1) - PRc) / (1 - PRc)
efact    = 1 - ratio ^ 2
in.mdot  = opening * mdot_ch * efact
```

## References

1. the standard literature, D.C., the standard literature, D.L. & Rosenberg, R.C., *a standard system-dynamics text* (5th ed.) — acausal/bond-graph formalism.
2. the standard literature, J.G. & the standard literature, J.R., *a standard two-phase text* (3rd ed.).
