---
name: Pump
category: Component (fluid)
summary: Acausal fluid-domain component Pump with ports in, out.
related: []
examples: [ev-thermal-management, rankine-cycle]
tags: [pump, component, fluid, acausal]
references: []
generated: true
---

# Pump

Reusable acausal **fluid-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
Pump inst(eta, fluid$)
```

## Ports

`in`, `out`

## Parameters

| Parameter | Type |
| --- | --- |
| `eta` | Number |
| `fluid$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
v        = Volume(fluid$, P=in.P, h=in.h)
out.mdot = in.mdot
out.h    = in.h + v * (out.P - in.P) / eta
W        = in.mdot * (out.h - in.h)
```

