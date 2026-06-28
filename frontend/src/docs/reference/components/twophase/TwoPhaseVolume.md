---
name: TwoPhaseVolume
category: Component (twophase)
summary: A finite-volume two-phase control volume with mass and energy states ((p, h) states).
related: []
examples: []
tags: [twophasevolume, component, twophase, acausal]
references:
  - "the standard literature, D.C., the standard literature, D.L. & Rosenberg, R.C., a standard system-dynamics text (5th ed.) — acausal/bond-graph formalism"
  - "the standard literature, J.G. & the standard literature, J.R., a standard two-phase text (3rd ed.)"
---

# TwoPhaseVolume

A finite-volume two-phase control volume with mass and energy states (`(p, h)` states).

## Domain

A reusable **acausal twophase-domain** component — its two-phase refrigerant ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h` (quality/void follow from the properties). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `out`

## Usage

```
TwoPhaseVolume inst(fluid$, V, C, P0, domain$)
```

## Parameters

| Parameter | Type |
| --- | --- |
| `fluid$` | String |
| `V` | Number |
| `C` | Number |
| `P0` | Number |
| `domain$` | String |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

```
out.P       = in.P
out.h       = in.h
der(in.P)   = (in.mdot - out.mdot) / C
init(in.P)  = P0
hf          = Enthalpy(fluid$, P=in.P, x=0)
hg          = Enthalpy(fluid$, P=in.P, x=1)
x           = (in.h - hf) / (hg - hf)
rho_l       = Density(fluid$, P=in.P, x=0)
rho_g       = Density(fluid$, P=in.P, x=1)
alpha       = void_zivi(x, rho_l, rho_g)
rho_mix     = alpha * rho_g + (1 - alpha) * rho_l
m           = V * rho_mix
```

## References

1. the standard literature, D.C., the standard literature, D.L. & Rosenberg, R.C., *a standard system-dynamics text* (5th ed.) — acausal/bond-graph formalism.
2. the standard literature, J.G. & the standard literature, J.R., *a standard two-phase text* (3rd ed.).
