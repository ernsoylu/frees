---
name: LiquidVolume
category: Component (liquid)
summary: A single-phase liquid control volume.
related: []
examples: []
tags: [liquidvolume, component, liquid, acausal]
references:
  - "the standard literature, D.C., the standard literature, D.L. & Rosenberg, R.C., a standard system-dynamics text (5th ed.) — acausal/bond-graph formalism"
  - "the standard literature, F.P. et al., Fundamentals of Heat and Mass Transfer, Ch. 8"
---

# LiquidVolume

A single-phase liquid control volume.

## Domain

A reusable **acausal liquid-domain** component — its single-phase liquid-coolant ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h`. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `out`

## Usage

```
LiquidVolume inst(C, P0, domain$)
```

## Parameters

| Parameter | Type |
| --- | --- |
| `C` | Number |
| `P0` | Number |
| `domain$` | String |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

```
out.h       = in.h
der(in.P)   = (in.mdot - out.mdot) / C
init(in.P)  = P0
```

## References

1. the standard literature, D.C., the standard literature, D.L. & Rosenberg, R.C., *a standard system-dynamics text* (5th ed.) — acausal/bond-graph formalism.
2. the standard literature, F.P. et al., *Fundamentals of Heat and Mass Transfer*, Ch. 8.
