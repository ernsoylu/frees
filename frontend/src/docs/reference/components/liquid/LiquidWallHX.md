---
name: LiquidWallHX
category: Component (liquid)
summary: Acausal liquid-domain component LiquidWallHX with ports in, out, wall.
related: []
examples: []
tags: [liquidwallhx, component, liquid, acausal]
references: []
generated: true
---

# LiquidWallHX

Reusable acausal **liquid-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
LiquidWallHX inst(fluid$, UA, domain$)
```

## Ports

`in`, `out`, `wall`

## Parameters

| Parameter | Type |
| --- | --- |
| `fluid$` | String |
| `UA` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
out.mdot  = in.mdot
out.P     = in.P
T_in      = Temperature(fluid$, P=in.P, h=in.h)
Q         = UA * (T_in - wall.T)
out.h     = in.h - Q / in.mdot
wall.Qdot = -Q
```

