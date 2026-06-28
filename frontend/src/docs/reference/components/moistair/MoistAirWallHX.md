---
name: MoistAirWallHX
category: Component (moistair)
summary: A humid-air-to-wall heat exchanger.
related: []
examples: []
tags: [moistairwallhx, component, moistair, acausal]
references:
  - "Karnopp, D.C., Margolis, D.L. & Rosenberg, R.C., System Dynamics: Modeling, Simulation, and Control of Mechatronic Systems (5th ed.) — acausal/bond-graph formalism"
  - "ASHRAE Handbook — Fundamentals (Psychrometrics)"
---

# MoistAirWallHX

A humid-air-to-wall heat exchanger.

## Domain

A reusable **acausal moistair-domain** component — its humid-air ports carry pressure `P`, dry-air mass-flow `ṁ_da`, enthalpy `h`, and humidity ratio `W`. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `out`, `wall`

## Usage

```
MoistAirWallHX inst(eps, domain$)
```

## Parameters

| Parameter | Type |
| --- | --- |
| `eps` | Number |
| `domain$` | String |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

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

## References

1. Karnopp, D.C., Margolis, D.L. & Rosenberg, R.C., *System Dynamics: Modeling, Simulation, and Control of Mechatronic Systems* (5th ed.) — acausal/bond-graph formalism.
2. ASHRAE Handbook — Fundamentals (Psychrometrics).
