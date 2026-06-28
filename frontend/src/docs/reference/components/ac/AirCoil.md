---
name: AirCoil
category: Component (ac)
summary: Acausal ac-domain component AirCoil with ports ref_in, ref_out, air_in, air_out.
related: []
examples: []
tags: [aircoil, component, ac, acausal]
references: []
generated: true
---

# AirCoil

Reusable acausal **ac-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
AirCoil inst(ref$, U_tp, U_sh, D, L, eps_zone, eps_air)
```

## Ports

`ref_in`, `ref_out`, `air_in`, `air_out`

## Parameters

| Parameter | Type |
| --- | --- |
| `ref$` | String |
| `U_tp` | Number |
| `U_sh` | Number |
| `D` | Number |
| `L` | Number |
| `eps_zone` | Number |
| `eps_air` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
MovingBoundaryEvaporator EV(fluid$=ref$, U_tp=U_tp, U_sh=U_sh, D=D, L=L, eps_zone=eps_zone)
MoistAirWallHX AC(eps=eps_air)
connect(ref_in, EV.in)
connect(EV.out, ref_out)
connect(air_in, AC.in)
connect(AC.out, air_out)
connect(EV.wall, AC.wall)
```

