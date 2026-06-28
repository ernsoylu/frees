---
name: Turbine
category: Component (fluid)
summary: Acausal fluid-domain component Turbine with ports in, out.
related: []
examples: []
tags: [turbine, component, fluid, acausal]
references: []
generated: true
---

# Turbine

Reusable acausal **fluid-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
Turbine inst(eta, fluid$)
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
s_in     = Entropy(fluid$, P=in.P, h=in.h)
h_s      = Enthalpy(fluid$, P=out.P, s=s_in)
out.mdot = in.mdot
out.h    = in.h - eta * (in.h - h_s)
W        = in.mdot * (in.h - out.h)
```

