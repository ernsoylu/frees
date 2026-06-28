---
name: TwoPhaseCondenserUA
category: Component (twophase)
summary: Acausal twophase-domain component TwoPhaseCondenserUA with ports in, out.
related: []
examples: []
tags: [twophasecondenserua, component, twophase, acausal]
references: []
generated: true
---

# TwoPhaseCondenserUA

Reusable acausal **twophase-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
TwoPhaseCondenserUA inst(fluid$, UA, T_amb, V, domain$)
```

## Ports

`in`, `out`

## Parameters

| Parameter | Type |
| --- | --- |
| `fluid$` | String |
| `UA` | Number |
| `T_amb` | Number |
| `V` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

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

