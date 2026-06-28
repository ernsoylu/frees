---
name: MovingBoundaryCondenser
category: Component (twophase)
summary: Acausal twophase-domain component MovingBoundaryCondenser with ports in, out, wall.
related: []
examples: []
tags: [movingboundarycondenser, component, twophase, acausal]
references: []
generated: true
---

# MovingBoundaryCondenser

Reusable acausal **twophase-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
MovingBoundaryCondenser inst(fluid$, U_cond, U_sc, D, L, eps_zone, domain$)
```

## Ports

`in`, `out`, `wall`

## Parameters

| Parameter | Type |
| --- | --- |
| `fluid$` | String |
| `U_cond` | Number |
| `U_sc` | Number |
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
hf        = Enthalpy(fluid$, P=in.P, x=0)
L_need    = in.mdot * (in.h - hf) / (U_cond * pi# * D * (Tsat - wall.T))
L_cond    = 0.5 * (L_need + L - sqrt((L_need - L)^2 + eps_zone^2))
Q_cond    = U_cond * pi# * D * L_cond * (Tsat - wall.T)
L_sc      = L - L_cond
r_sc      = zone_ramp(L_sc, eps_zone)
T_out     = Temperature(fluid$, P=out.P, h=out.h)
Q_sc      = U_sc * pi# * D * L_sc * (0.5 * (Tsat + T_out) - wall.T) * r_sc
out.h     = in.h - (Q_cond + Q_sc) / in.mdot
Q         = Q_cond + Q_sc
wall.Qdot = -Q
SC        = Tsat - T_out
```

