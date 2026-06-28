---
name: Chiller
category: Component (ac)
summary: A refrigerant-to-coolant chiller transferring heat between the two loops.
related: []
examples: []
tags: [chiller, component, ac, acausal]
references:
  - "Karnopp, D.C., Margolis, D.L. & Rosenberg, R.C., System Dynamics: Modeling, Simulation, and Control of Mechatronic Systems (5th ed.) — acausal/bond-graph formalism"
  - "ASHRAE Handbook — Refrigeration"
---

# Chiller

A refrigerant-to-coolant chiller transferring heat between the two loops.

## Domain

A reusable **acausal ac-domain** component — its refrigerant/air ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h`. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`ref_in`, `ref_out`, `cool_in`, `cool_out`

## Usage

```
Chiller inst(ref$, cool$, U_tp, U_sh, D, L, eps_zone, UA_cool)
```

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

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

```
MovingBoundaryEvaporator EV(fluid$=ref$, U_tp=U_tp, U_sh=U_sh, D=D, L=L, eps_zone=eps_zone)
LiquidWallHX CL(fluid$=cool$, UA=UA_cool)
connect(ref_in, EV.in)
connect(EV.out, ref_out)
connect(cool_in, CL.in)
connect(CL.out, cool_out)
connect(EV.wall, CL.wall)
```

## References

1. Karnopp, D.C., Margolis, D.L. & Rosenberg, R.C., *System Dynamics: Modeling, Simulation, and Control of Mechatronic Systems* (5th ed.) — acausal/bond-graph formalism.
2. ASHRAE Handbook — Refrigeration.
