---
name: LiquidWallHX
category: Component (liquid)
summary: A liquid-to-wall heat exchanger.
related: []
examples: [ev-thermal-management]
tags: [liquidwallhx, component, liquid, acausal]
references:
  - "the standard literature, D.C., the standard literature, D.L. & Rosenberg, R.C., a standard system-dynamics text (5th ed.) — acausal/bond-graph formalism"
  - "the standard literature, F.P. et al., Fundamentals of Heat and Mass Transfer, Ch. 8"
---

# LiquidWallHX

A liquid-to-wall heat exchanger.

## Domain

A reusable **acausal liquid-domain** component — its single-phase liquid-coolant ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h`. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `out`, `wall`

## Usage

```
LiquidWallHX inst(fluid$, UA, domain$)
```

## Parameters

| Parameter | Type |
| --- | --- |
| `fluid$` | String |
| `UA` | Number |
| `domain$` | String |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

```
out.mdot  = in.mdot
out.P     = in.P
T_in      = Temperature(fluid$, P=in.P, h=in.h)
Q         = UA * (T_in - wall.T)
out.h     = in.h - Q / in.mdot
wall.Qdot = -Q
```

## Examples

Instantiated in the verified example below:

[Run: ev-thermal-management]

## References

1. the standard literature, D.C., the standard literature, D.L. & Rosenberg, R.C., *a standard system-dynamics text* (5th ed.) — acausal/bond-graph formalism.
2. the standard literature, F.P. et al., *Fundamentals of Heat and Mass Transfer*, Ch. 8.
