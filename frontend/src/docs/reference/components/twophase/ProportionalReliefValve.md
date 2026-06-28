---
name: ProportionalReliefValve
category: Component (twophase)
summary: A pressure-relief valve whose opening rises proportionally above the set pressure.
related: []
examples: [pressure-cooker]
tags: [proportionalreliefvalve, component, twophase, acausal]
references:
  - "the standard literature, D.C., the standard literature, D.L. & Rosenberg, R.C., a standard system-dynamics text (5th ed.) — acausal/bond-graph formalism"
  - "the standard literature, J.G. & the standard literature, J.R., a standard two-phase text (3rd ed.)"
---

# ProportionalReliefValve

A pressure-relief valve whose opening rises proportionally above the set pressure.

## Domain

A reusable **acausal twophase-domain** component — its two-phase refrigerant ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h` (quality/void follow from the properties). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `out`

## Usage

```
ProportionalReliefValve inst(fluid$, Pcrack, grad, eps, domain$)
```

## Parameters

| Parameter | Type |
| --- | --- |
| `fluid$` | String |
| `Pcrack` | Number |
| `grad` | Number |
| `eps` | Number |
| `domain$` | String |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

```
out.mdot = in.mdot
out.h    = in.h
dpv      = in.P - Pcrack
in.mdot  = grad * 0.5 * (dpv + sqrt(dpv * dpv + eps * eps))
```

## Examples

Instantiated in the verified example below:

[Run: pressure-cooker]

## References

1. the standard literature, D.C., the standard literature, D.L. & Rosenberg, R.C., *a standard system-dynamics text* (5th ed.) — acausal/bond-graph formalism.
2. the standard literature, J.G. & the standard literature, J.R., *a standard two-phase text* (3rd ed.).
