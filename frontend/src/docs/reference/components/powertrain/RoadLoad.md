---
name: RoadLoad
category: Component (powertrain)
summary: Acausal powertrain-domain component RoadLoad with ports shaft.
related: []
examples: []
tags: [roadload, component, powertrain, acausal]
references: []
generated: true
---

# RoadLoad

Reusable acausal **powertrain-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
RoadLoad inst(Crr, Caero)
```

## Ports

`shaft`

## Parameters

| Parameter | Type |
| --- | --- |
| `Crr` | Number |
| `Caero` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
shaft.tau = Crr + Caero * shaft.w^2
```

