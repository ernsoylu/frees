---
name: MovingBoundaryCondenser
category: Component (twophase)
summary: A moving-boundary condenser tracking the two-phase/subcooled zone lengths.
related: []
examples: []
tags: [movingboundarycondenser, component, twophase, acausal]
references:
  - "Karnopp, D.C., Margolis, D.L. & Rosenberg, R.C., System Dynamics: Modeling, Simulation, and Control of Mechatronic Systems (5th ed.) — acausal/bond-graph formalism"
  - "Collier, J.G. & Thome, J.R., Convective Boiling and Condensation (3rd ed.)"
---

# MovingBoundaryCondenser

A moving-boundary condenser tracking the two-phase/subcooled zone lengths.

## Domain

A reusable **acausal twophase-domain** component — its two-phase refrigerant ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h` (quality/void follow from the properties). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `out`, `wall`

## Usage

```
MovingBoundaryCondenser inst(fluid$, U_cond, U_sc, D, L, eps_zone, domain$)
```

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

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

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

## References

1. Karnopp, D.C., Margolis, D.L. & Rosenberg, R.C., *System Dynamics: Modeling, Simulation, and Control of Mechatronic Systems* (5th ed.) — acausal/bond-graph formalism.
2. Collier, J.G. & Thome, J.R., *Convective Boiling and Condensation* (3rd ed.).
