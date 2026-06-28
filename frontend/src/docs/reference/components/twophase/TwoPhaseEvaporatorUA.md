---
name: TwoPhaseEvaporatorUA
category: Component (twophase)
summary: Acausal twophase-domain component TwoPhaseEvaporatorUA with ports in, out, wall.
related: []
examples: []
tags: [twophaseevaporatorua, component, twophase, acausal]
references: []
generated: true
---

# TwoPhaseEvaporatorUA

Reusable acausal **twophase-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
TwoPhaseEvaporatorUA inst(fluid$, UA, dP, SH, domain$)
```

## Ports

`in`, `out`, `wall`

## Parameters

| Parameter | Type |
| --- | --- |
| `fluid$` | String |
| `UA` | Number |
| `dP` | Number |
| `SH` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
out.P     = in.P - dP
Tevap     = T_sat(fluid$, P=in.P)
Q         = frac * UA * (wall.T - Tevap)
out.h     = Enthalpy(fluid$, P=out.P, T=Tevap + SH)
in.mdot   = Q / (out.h - in.h)
out.mdot  = in.mdot
wall.Qdot = Q
```

