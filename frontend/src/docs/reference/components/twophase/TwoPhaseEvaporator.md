---
name: TwoPhaseEvaporator
category: Component (twophase)
summary: Acausal twophase-domain component TwoPhaseEvaporator with ports in, out.
related: []
examples: []
tags: [twophaseevaporator, component, twophase, acausal]
references: []
generated: true
---

# TwoPhaseEvaporator

Reusable acausal **twophase-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
TwoPhaseEvaporator inst(fluid$, SH_set, dP, domain$)
```

## Ports

`in`, `out`

## Parameters

| Parameter | Type |
| --- | --- |
| `fluid$` | String |
| `SH_set` | Number |
| `dP` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
out.mdot = in.mdot
out.P    = in.P - dP
Tsat     = T_sat(fluid$, P=out.P)
out.h    = Enthalpy(fluid$, P=out.P, T=Tsat + SH_set)
Q        = in.mdot * (out.h - in.h)
```

