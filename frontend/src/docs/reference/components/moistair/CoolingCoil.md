---
name: CoolingCoil
category: Component (moistair)
summary: Acausal moistair-domain component CoolingCoil with ports in, out.
related: []
examples: []
tags: [coolingcoil, component, moistair, acausal]
references: []
generated: true
---

# CoolingCoil

Reusable acausal **moistair-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
CoolingCoil inst(Tout, domain$)
```

## Ports

`in`, `out`

## Parameters

| Parameter | Type |
| --- | --- |
| `Tout` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
out.mdot = in.mdot
out.P    = in.P
out.W    = HumRat(AirH2O, T=Tout, P=in.P, R=1)
out.h    = Enthalpy(AirH2O, T=Tout, P=in.P, W=out.W)
Q        = in.mdot * (in.h - out.h)
Q_lat    = in.mdot * 2.501e6 * (in.W - out.W)
```

