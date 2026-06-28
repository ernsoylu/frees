---
name: TwoPhaseChamber
category: Component (twophase)
summary: Acausal twophase-domain component TwoPhaseChamber with ports in, out, wall.
related: []
examples: []
tags: [twophasechamber, component, twophase, acausal]
references: []
generated: true
---

# TwoPhaseChamber

Reusable acausal **twophase-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
TwoPhaseChamber inst(fluid$, V, C, UA, P0, h0, domain$)
```

## Ports

`in`, `out`, `wall`

## Parameters

| Parameter | Type |
| --- | --- |
| `fluid$` | String |
| `V` | Number |
| `C` | Number |
| `UA` | Number |
| `P0` | Number |
| `h0` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
der(in.P)  = (in.mdot - out.mdot) / C
init(in.P) = P0
rho        = Density(fluid$, P=in.P, h=hcv)
Q          = UA * (wall.T - Tcv)
der(hcv)   = (in.mdot * (in.h - hcv) + Q) / (rho * V)
init(hcv)  = h0
out.P     = in.P
out.h     = hcv
Tcv       = Temperature(fluid$, P=in.P, h=hcv)
wall.Qdot = Q
m         = rho * V
```

