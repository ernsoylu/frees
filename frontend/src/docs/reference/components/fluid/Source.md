---
name: Source
category: Component (fluid)
summary: Acausal fluid-domain component Source with ports out.
related: []
examples: []
tags: [source, component, fluid, acausal]
references: []
generated: true
---

# Source

Reusable acausal **fluid-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
Source inst(fluid$, mdot, P, T)
```

## Ports

`out`

## Parameters

| Parameter | Type |
| --- | --- |
| `fluid$` | String |
| `mdot` | Number |
| `P` | Number |
| `T` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
out.mdot = mdot
out.P    = P
out.h    = Enthalpy(fluid$, P=P, T=T)
```

