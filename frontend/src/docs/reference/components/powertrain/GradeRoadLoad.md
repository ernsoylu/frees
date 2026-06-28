---
name: GradeRoadLoad
category: Component (powertrain)
summary: Acausal powertrain-domain component GradeRoadLoad with ports shaft.
related: []
examples: []
tags: [graderoadload, component, powertrain, acausal]
references: []
generated: true
---

# GradeRoadLoad

Reusable acausal **powertrain-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
GradeRoadLoad inst(Crr, Caero, m, g, grade)
```

## Ports

`shaft`

## Parameters

| Parameter | Type |
| --- | --- |
| `Crr` | Number |
| `Caero` | Number |
| `m` | Number |
| `g` | Number |
| `grade` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
shaft.tau = Crr + Caero * shaft.w^2 + m * g * sin(grade)
```

