---
name: PneumaticActuator
category: Component (pneumatic)
summary: Acausal pneumatic-domain component PneumaticActuator with ports in, rod.
related: []
examples: []
tags: [pneumaticactuator, component, pneumatic, acausal]
references: []
generated: true
---

# PneumaticActuator

Reusable acausal **pneumatic-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
PneumaticActuator inst(fluid$, area, Patm, domain$)
```

## Ports

`in`, `rod`

## Parameters

| Parameter | Type |
| --- | --- |
| `fluid$` | String |
| `area` | Number |
| `Patm` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
rho     = Density(fluid$, P=in.P, h=in.h)
rod.f   = -(in.P - Patm) * area
in.mdot = rho * area * rod.vel
```

