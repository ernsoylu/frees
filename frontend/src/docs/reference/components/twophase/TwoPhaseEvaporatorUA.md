---
name: TwoPhaseEvaporatorUA
category: Component (twophase)
summary: A two-phase evaporator sized by an overall conductance UA.
related: []
examples: [ev-thermal-management]
tags: [twophaseevaporatorua, component, twophase, acausal]
references:
  - "the standard literature, D.C., the standard literature, D.L. & Rosenberg, R.C., a standard system-dynamics text (5th ed.) — acausal/bond-graph formalism"
  - "the standard literature, J.G. & the standard literature, J.R., a standard two-phase text (3rd ed.)"
---

# TwoPhaseEvaporatorUA

A two-phase evaporator sized by an overall conductance `UA`.

## Domain

A reusable **acausal twophase-domain** component — its two-phase refrigerant ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h` (quality/void follow from the properties). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `out`, `wall`

## Usage

```
TwoPhaseEvaporatorUA inst(fluid$, UA, dP, SH, domain$)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `fluid$` | String | Fluid name (e.g. Water, R134a, Air). |
| `UA` | Number | Overall conductance UA [W/K]. |
| `dP` | Number | Nominal pressure drop [Pa]. |
| `SH` | Number | Superheat [K]. |
| `domain$` | String | Connector fluid family — one of `fluid`, `gas`, `oil`, `moistair`, `liquid`, `twophase`. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

```
out.P     = in.P - dP
Tevap     = T_sat(fluid$, P=in.P)
Q         = frac * UA * (wall.T - Tevap)
out.h     = Enthalpy(fluid$, P=out.P, T=Tevap + SH)
in.mdot   = Q / (out.h - in.h)
out.mdot  = in.mdot
wall.Qdot = Q
```

## Examples

Instantiated in the verified example below:

[Run: ev-thermal-management]

## References

1. the standard literature, D.C., the standard literature, D.L. & Rosenberg, R.C., *a standard system-dynamics text* (5th ed.) — acausal/bond-graph formalism.
2. the standard literature, J.G. & the standard literature, J.R., *a standard two-phase text* (3rd ed.).
