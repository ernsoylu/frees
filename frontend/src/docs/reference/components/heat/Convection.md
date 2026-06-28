---
name: Convection
category: Component (heat)
summary: Acausal heat-domain component Convection with ports a, b.
related: []
examples: []
tags: [convection, component, heat, acausal]
references: []
generated: true
---

# Convection

Reusable acausal **heat-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
Convection inst(htc, area)
```

## Ports

`a`, `b`

## Parameters

| Parameter | Type |
| --- | --- |
| `htc` | Number |
| `area` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
Q      = htc * area * (a.T - b.T)
a.Qdot = Q
b.Qdot = -Q
```

