---
name: TwoPhaseVolume
category: Component (twophase)
summary: Acausal twophase-domain component TwoPhaseVolume with ports in, out.
related: []
examples: []
tags: [twophasevolume, component, twophase, acausal]
references: []
generated: true
---

# TwoPhaseVolume

Reusable acausal **twophase-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
TwoPhaseVolume inst(fluid$, V, C, P0, domain$)
```

## Ports

`in`, `out`

## Parameters

| Parameter | Type |
| --- | --- |
| `fluid$` | String |
| `V` | Number |
| `C` | Number |
| `P0` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
out.P       = in.P
out.h       = in.h
der(in.P)   = (in.mdot - out.mdot) / C
init(in.P)  = P0
hf          = Enthalpy(fluid$, P=in.P, x=0)
hg          = Enthalpy(fluid$, P=in.P, x=1)
x           = (in.h - hf) / (hg - hf)
rho_l       = Density(fluid$, P=in.P, x=0)
rho_g       = Density(fluid$, P=in.P, x=1)
alpha       = void_zivi(x, rho_l, rho_g)
rho_mix     = alpha * rho_g + (1 - alpha) * rho_l
m           = V * rho_mix
```

