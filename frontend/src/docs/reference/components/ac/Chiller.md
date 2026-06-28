---
name: Chiller
category: Component (ac)
summary: Acausal ac-domain component Chiller with ports ref_in, ref_out, cool_in, cool_out.
related: []
examples: []
tags: [chiller, component, ac, acausal]
references: []
generated: true
---

# Chiller

Reusable acausal **ac-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
Chiller inst(ref$, cool$, U_tp, U_sh, D, L, eps_zone, UA_cool)
```

## Ports

`ref_in`, `ref_out`, `cool_in`, `cool_out`

## Parameters

| Parameter | Type |
| --- | --- |
| `ref$` | String |
| `cool$` | String |
| `U_tp` | Number |
| `U_sh` | Number |
| `D` | Number |
| `L` | Number |
| `eps_zone` | Number |
| `UA_cool` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
MovingBoundaryEvaporator EV(fluid$=ref$, U_tp=U_tp, U_sh=U_sh, D=D, L=L, eps_zone=eps_zone)
LiquidWallHX CL(fluid$=cool$, UA=UA_cool)
connect(ref_in, EV.in)
connect(EV.out, ref_out)
connect(cool_in, CL.in)
connect(CL.out, cool_out)
connect(EV.wall, CL.wall)
```

