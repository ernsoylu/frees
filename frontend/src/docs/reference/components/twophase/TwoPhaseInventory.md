---
name: TwoPhaseInventory
category: Component (twophase)
summary: Acausal twophase-domain component TwoPhaseInventory with ports in, out.
related: []
examples: []
tags: [twophaseinventory, component, twophase, acausal]
references: []
generated: true
---

# TwoPhaseInventory

Reusable acausal **twophase-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
TwoPhaseInventory inst(fluid$, V, domain$)
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
out.h    = in.h
hf       = Enthalpy(fluid$, P=in.P, x=0)
hg       = Enthalpy(fluid$, P=in.P, x=1)
x        = (in.h - hf) / (hg - hf)
rho_l    = Density(fluid$, P=in.P, x=0)
rho_g    = Density(fluid$, P=in.P, x=1)
alpha    = void_zivi(x, rho_l, rho_g)
rho_mix  = alpha * rho_g + (1 - alpha) * rho_l
m        = V * rho_mix
```

