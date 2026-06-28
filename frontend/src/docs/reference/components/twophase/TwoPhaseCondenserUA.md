---
name: TwoPhaseCondenserUA
category: Component (twophase)
summary: A two-phase condenser sized by an overall conductance UA.
related: []
examples: []
tags: [twophasecondenserua, component, twophase, acausal]
references:
  - "the standard literature, D.C., the standard literature, D.L. & Rosenberg, R.C., a standard system-dynamics text (5th ed.) — acausal/bond-graph formalism"
  - "the standard literature, J.G. & the standard literature, J.R., a standard two-phase text (3rd ed.)"
---

# TwoPhaseCondenserUA

A two-phase condenser sized by an overall conductance `UA`.

## Domain

A reusable **acausal twophase-domain** component — its two-phase refrigerant ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h` (quality/void follow from the properties). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `out`

## Usage

```
TwoPhaseCondenserUA inst(fluid$, UA, T_amb, V, domain$)
```

## Parameters

| Parameter | Type |
| --- | --- |
| `fluid$` | String |
| `UA` | Number |
| `T_amb` | Number |
| `V` | Number |
| `domain$` | String |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

```
out.mdot = in.mdot
out.P    = in.P
Tcond    = T_sat(fluid$, P=in.P)
Q        = UA * (Tcond - T_amb)
Q        = in.mdot * (in.h - out.h)
rho_in   = Density(fluid$, P=in.P, h=in.h)
rho_out  = Density(fluid$, P=out.P, h=out.h)
m        = V * 0.5 * (rho_in + rho_out)
SC       = Tcond - Temperature(fluid$, P=out.P, h=out.h)
```

## References

1. the standard literature, D.C., the standard literature, D.L. & Rosenberg, R.C., *a standard system-dynamics text* (5th ed.) — acausal/bond-graph formalism.
2. the standard literature, J.G. & the standard literature, J.R., *a standard two-phase text* (3rd ed.).
