---
name: MoistAirWallHX
category: Component (moistair)
summary: Acausal moistair-domain component MoistAirWallHX with ports in, out, wall.
related: []
examples: []
tags: [moistairwallhx, component, moistair, acausal]
references: []
generated: true
---

# MoistAirWallHX

Reusable acausal **moistair-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
MoistAirWallHX inst(eps, domain$)
```

## Ports

`in`, `out`, `wall`

## Parameters

| Parameter | Type |
| --- | --- |
| `eps` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
out.mdot  = in.mdot
out.P     = in.P
T_in      = Temperature(AirH2O, h=in.h, P=in.P, W=in.W)
T_out     = T_in - eps * (T_in - wall.T)
W_sat     = HumRat(AirH2O, T=T_out, P=in.P, R=1)
out.W     = 0.5 * (in.W + W_sat - sqrt((in.W - W_sat)^2 + 1e-12))
out.h     = Enthalpy(AirH2O, T=T_out, P=in.P, W=out.W)
Q         = in.mdot * (in.h - out.h)
Q_lat     = in.mdot * 2.501e6 * (in.W - out.W)
wall.Qdot = -Q
```

