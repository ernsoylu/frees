---
name: HeatSource
category: Component (heat)
summary: Acausal heat-domain component HeatSource with ports port.
related: []
examples: []
tags: [heatsource, component, heat, acausal]
references: []
generated: true
---

# HeatSource

Reusable acausal **heat-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
HeatSource inst(Q)
```

## Ports

`port`

## Parameters

| Parameter | Type |
| --- | --- |
| `Q` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
port.Qdot = -Q
```

