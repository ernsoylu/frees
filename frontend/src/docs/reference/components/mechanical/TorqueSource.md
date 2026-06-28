---
name: TorqueSource
category: Component (mechanical)
summary: Acausal mechanical-domain component TorqueSource with ports a, b.
related: []
examples: []
tags: [torquesource, component, mechanical, acausal]
references: []
generated: true
---

# TorqueSource

Reusable acausal **mechanical-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
TorqueSource inst(T)
```

## Ports

`a`, `b`

## Parameters

| Parameter | Type |
| --- | --- |
| `T` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
a.tau = -T
a.tau + b.tau = 0
```

