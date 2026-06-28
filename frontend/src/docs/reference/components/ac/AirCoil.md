---
name: AirCoil
category: Component (ac)
summary: An air-to-refrigerant coil (the air side of an evaporator or condenser).
related: []
examples: []
tags: [aircoil, component, ac, acausal]
references:
  - "Karnopp, D.C., Margolis, D.L. & Rosenberg, R.C., System Dynamics: Modeling, Simulation, and Control of Mechatronic Systems (5th ed.) — acausal/bond-graph formalism"
  - "ASHRAE Handbook — Refrigeration"
---

# AirCoil

An air-to-refrigerant coil (the air side of an evaporator or condenser).

## Domain

A reusable **acausal ac-domain** component — its refrigerant/air ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h`. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`ref_in`, `ref_out`, `air_in`, `air_out`

## Usage

```
AirCoil inst(ref$, U_tp, U_sh, D, L, eps_zone, eps_air)
```

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

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

```
MovingBoundaryEvaporator EV(fluid$=ref$, U_tp=U_tp, U_sh=U_sh, D=D, L=L, eps_zone=eps_zone)
MoistAirWallHX AC(eps=eps_air)
connect(ref_in, EV.in)
connect(EV.out, ref_out)
connect(air_in, AC.in)
connect(AC.out, air_out)
connect(EV.wall, AC.wall)
```

## References

1. Karnopp, D.C., Margolis, D.L. & Rosenberg, R.C., *System Dynamics: Modeling, Simulation, and Control of Mechatronic Systems* (5th ed.) — acausal/bond-graph formalism.
2. ASHRAE Handbook — Refrigeration.
