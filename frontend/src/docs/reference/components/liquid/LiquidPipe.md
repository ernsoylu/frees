---
name: LiquidPipe
category: Component (liquid)
summary: Acausal liquid-domain component LiquidPipe with ports in, out.
related: []
examples: []
tags: [liquidpipe, component, liquid, acausal]
references: []
generated: true
---

# LiquidPipe

Reusable acausal **liquid-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
LiquidPipe inst(fluid$, L, D, rough, domain$)
```

## Ports

`in`, `out`

## Parameters

| Parameter | Type |
| --- | --- |
| `fluid$` | String |
| `L` | Number |
| `D` | Number |
| `rough` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
out.mdot = in.mdot
out.h    = in.h
rho      = Density(fluid$, P=in.P, h=in.h)
mu       = Viscosity(fluid$, P=in.P, h=in.h)
A        = pi# / 4 * D^2
V        = in.mdot / (rho * A)
Re_d     = reynolds(rho, V, D, mu)
f        = friction_factor(Re_d, rough / D)
out.P    = in.P - f * (L / D) * rho * V^2 / 2
```

