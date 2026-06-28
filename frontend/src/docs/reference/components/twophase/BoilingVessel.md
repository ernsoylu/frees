---
name: BoilingVessel
category: Component (twophase)
summary: Acausal twophase-domain component BoilingVessel with ports vent, wall.
related: []
examples: []
tags: [boilingvessel, component, twophase, acausal]
references: []
generated: true
---

# BoilingVessel

Reusable acausal **twophase-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
BoilingVessel inst(fluid$, V, m0, T0, domain$)
```

## Ports

`vent`, `wall`

## Parameters

| Parameter | Type |
| --- | --- |
| `fluid$` | String |
| `V` | Number |
| `m0` | Number |
| `T0` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
der(mass)  = -vent.mdot
init(mass) = m0
der(Utot)  = wall.Qdot - vent.mdot * vent.h
init(Utot) = m0 * IntEnergy(fluid$, T=T0, x=0)
rho_cv = mass / V
u_cv   = Utot / mass
vent.P = Pressure(fluid$, d=rho_cv, u=u_cv)      { (rho,u) flash -> pressure }
T_cv   = Temperature(fluid$, d=rho_cv, u=u_cv)
x_cv   = Quality(fluid$, d=rho_cv, u=u_cv)        { vapour mass fraction }
vent.h = Enthalpy(fluid$, P=vent.P, x=1)          { vented stream is sat. vapour }
wall.T = T_cv
```

