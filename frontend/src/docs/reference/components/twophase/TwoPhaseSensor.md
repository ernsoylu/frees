---
name: TwoPhaseSensor
category: Component (twophase)
summary: Acausal twophase-domain component TwoPhaseSensor with ports in, out.
related: []
examples: []
tags: [twophasesensor, component, twophase, acausal]
references: []
generated: true
---

# TwoPhaseSensor

Reusable acausal **twophase-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
TwoPhaseSensor inst(fluid$, domain$)
```

## Ports

`in`, `out`

## Parameters

| Parameter | Type |
| --- | --- |
| `fluid$` | String |
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
T        = Temperature(fluid$, P=in.P, h=in.h)
Tsat     = T_sat(fluid$, P=in.P)
SH       = T - Tsat
rho_l    = Density(fluid$, P=in.P, x=0)
rho_g    = Density(fluid$, P=in.P, x=1)
alpha    = void_zivi(x, rho_l, rho_g)
```

