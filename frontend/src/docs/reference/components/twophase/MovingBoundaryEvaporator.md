---
name: MovingBoundaryEvaporator
category: Component (twophase)
summary: Acausal twophase-domain component MovingBoundaryEvaporator with ports in, out, wall.
related: []
examples: []
tags: [movingboundaryevaporator, component, twophase, acausal]
references: []
generated: true
---

# MovingBoundaryEvaporator

Reusable acausal **twophase-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
MovingBoundaryEvaporator inst(fluid$, U_tp, U_sh, D, L, eps_zone, domain$)
```

## Ports

`in`, `out`, `wall`

## Parameters

| Parameter | Type |
| --- | --- |
| `fluid$` | String |
| `U_tp` | Number |
| `U_sh` | Number |
| `D` | Number |
| `L` | Number |
| `eps_zone` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
out.mdot  = in.mdot
out.P     = in.P
Tsat      = T_sat(fluid$, P=in.P)
hg        = Enthalpy(fluid$, P=in.P, x=1)
L_need    = in.mdot * (hg - in.h) / (U_tp * pi# * D * (wall.T - Tsat))
L_tp      = 0.5 * (L_need + L - sqrt((L_need - L)^2 + eps_zone^2))
Q_tp      = U_tp * pi# * D * L_tp * (wall.T - Tsat)
L_sh      = L - L_tp
r_sh      = zone_ramp(L_sh, eps_zone)
T_out     = Temperature(fluid$, P=out.P, h=out.h)
Q_sh      = U_sh * pi# * D * L_sh * (wall.T - 0.5 * (Tsat + T_out)) * r_sh
out.h     = in.h + (Q_tp + Q_sh) / in.mdot
Q         = Q_tp + Q_sh
wall.Qdot = Q
SH        = T_out - Tsat
```

