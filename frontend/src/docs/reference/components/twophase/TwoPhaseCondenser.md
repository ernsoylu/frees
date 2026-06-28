---
name: TwoPhaseCondenser
category: Component (twophase)
summary: A two-phase condenser rejecting heat from the refrigerant.
related: []
examples: []
tags: [twophasecondenser, component, twophase, acausal]
references:
  - "the standard literature, D.C., the standard literature, D.L. & Rosenberg, R.C., a standard system-dynamics text (5th ed.) — acausal/bond-graph formalism"
  - "the standard literature, J.G. & the standard literature, J.R., a standard two-phase text (3rd ed.)"
---

# TwoPhaseCondenser

A two-phase condenser rejecting heat from the refrigerant.

## Domain

A reusable **acausal twophase-domain** component — its two-phase refrigerant ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h` (quality/void follow from the properties). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `out`

## Usage

```
TwoPhaseCondenser inst(fluid$, SC_set, dP, domain$)
```

## Parameters

| Parameter | Type |
| --- | --- |
| `fluid$` | String |
| `SC_set` | Number |
| `dP` | Number |
| `domain$` | String |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

```
out.mdot = in.mdot
out.P    = in.P - dP
Tsat     = T_sat(fluid$, P=out.P)
out.h    = Enthalpy(fluid$, P=out.P, T=Tsat - SC_set)
Q        = in.mdot * (in.h - out.h)
```

## References

1. the standard literature, D.C., the standard literature, D.L. & Rosenberg, R.C., *a standard system-dynamics text* (5th ed.) — acausal/bond-graph formalism.
2. the standard literature, J.G. & the standard literature, J.R., *a standard two-phase text* (3rd ed.).
