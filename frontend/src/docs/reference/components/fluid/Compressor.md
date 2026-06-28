---
name: Compressor
category: Component (fluid)
summary: Acausal fluid-domain component Compressor with ports in, out.
related: []
examples: []
tags: [compressor, component, fluid, acausal]
references: []
generated: true
---

# Compressor

Reusable acausal **fluid-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
Compressor inst(eta, fluid$, model$)
```

## Ports

`in`, `out`

## Parameters

| Parameter | Type |
| --- | --- |
| `eta` | Number |
| `fluid$` | String |
| `model$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
s_in     = Entropy(fluid$, P=in.P, h=in.h)
h_s      = Enthalpy(fluid$, P=out.P, s=s_in)
out.mdot = in.mdot
out.h    = in.h + (h_s - in.h) / eta
W        = in.mdot * (out.h - in.h)
```

