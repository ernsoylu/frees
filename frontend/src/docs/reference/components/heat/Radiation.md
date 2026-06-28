---
name: Radiation
category: Component (heat)
summary: Acausal heat-domain component Radiation with ports a, b.
related: []
examples: []
tags: [radiation, component, heat, acausal]
references: []
generated: true
---

# Radiation

Reusable acausal **heat-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
Radiation inst(emis, area)
```

## Ports

`a`, `b`

## Parameters

| Parameter | Type |
| --- | --- |
| `emis` | Number |
| `area` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
Q      = emis * 5.670374419e-8 * area * (a.T^4 - b.T^4)
a.Qdot = Q
b.Qdot = -Q
```

