---
name: Accumulator
category: Component (fluid)
summary: Acausal fluid-domain component Accumulator with ports in, out.
related: []
examples: []
tags: [accumulator, component, fluid, acausal]
references: []
generated: true
---

# Accumulator

Reusable acausal **fluid-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
Accumulator inst(C, P0)
```

## Ports

`in`, `out`

## Parameters

| Parameter | Type |
| --- | --- |
| `C` | Number |
| `P0` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
out.P       = in.P
out.h       = in.h
der(in.P)   = (in.mdot - out.mdot) / C
init(in.P)  = P0
```

