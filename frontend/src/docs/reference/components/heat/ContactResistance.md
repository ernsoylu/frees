---
name: ContactResistance
category: Component (heat)
summary: Acausal heat-domain component ContactResistance with ports a, b.
related: []
examples: []
tags: [contactresistance, component, heat, acausal]
references: []
generated: true
---

# ContactResistance

Reusable acausal **heat-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
ContactResistance inst(Rth)
```

## Ports

`a`, `b`

## Parameters

| Parameter | Type |
| --- | --- |
| `Rth` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
Q      = (a.T - b.T) / Rth
a.Qdot = Q
b.Qdot = -Q
```

