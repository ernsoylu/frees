---
name: TwoPhaseCondenserFloat
category: Component (twophase)
summary: Acausal twophase-domain component TwoPhaseCondenserFloat with ports in, out.
related: []
examples: []
tags: [twophasecondenserfloat, component, twophase, acausal]
references: []
generated: true
---

# TwoPhaseCondenserFloat

Reusable acausal **twophase-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
TwoPhaseCondenserFloat inst(fluid$, UA, T_amb, domain$)
```

## Ports

`in`, `out`

## Parameters

| Parameter | Type |
| --- | --- |
| `fluid$` | String |
| `UA` | Number |
| `T_amb` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
out.mdot = in.mdot
out.P    = in.P
Tcond    = T_sat(fluid$, P=in.P)
out.h    = Enthalpy(fluid$, P=in.P, x=0)
Q        = in.mdot * (in.h - out.h)
Q        = UA * (Tcond - T_amb)
```

