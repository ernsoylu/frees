---
name: Conduction
category: Component (heat)
summary: Acausal heat-domain component Conduction with ports a, b.
related: []
examples: [heat-conduction, transient-heat-rod, heisler-transient, material-conduction]
tags: [conduction, component, heat, acausal]
references: []
generated: true
---

# Conduction

Reusable acausal **heat-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
Conduction inst(k, area, L)
```

## Ports

`a`, `b`

## Parameters

| Parameter | Type |
| --- | --- |
| `k` | Number |
| `area` | Number |
| `L` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
Q      = k * area / L * (a.T - b.T)
a.Qdot = Q
b.Qdot = -Q
```

