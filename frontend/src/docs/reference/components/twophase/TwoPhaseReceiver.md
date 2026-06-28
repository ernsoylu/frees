---
name: TwoPhaseReceiver
category: Component (twophase)
summary: Acausal twophase-domain component TwoPhaseReceiver with ports in, out.
related: []
examples: []
tags: [twophasereceiver, component, twophase, acausal]
references: []
generated: true
---

# TwoPhaseReceiver

Reusable acausal **twophase-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
TwoPhaseReceiver inst(fluid$, V, domain$)
```

## Ports

`in`, `out`

## Parameters

| Parameter | Type |
| --- | --- |
| `fluid$` | String |
| `V` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
out.mdot = in.mdot
out.P    = in.P
out.h    = Enthalpy(fluid$, P=in.P, x=0)
rho_l    = Density(fluid$, P=in.P, x=0)
rho_g    = Density(fluid$, P=in.P, x=1)
m        = V * (LL * rho_l + (1 - LL) * rho_g)
```

