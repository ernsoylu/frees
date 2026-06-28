---
name: TransMass
category: Component (mechanical)
summary: Acausal mechanical-domain component TransMass with ports port.
related: []
examples: []
tags: [transmass, component, mechanical, acausal]
references: []
generated: true
---

# TransMass

Reusable acausal **mechanical-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
TransMass inst(m, v0)
```

## Ports

`port`

## Parameters

| Parameter | Type |
| --- | --- |
| `m` | Number |
| `v0` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
der(port.vel)  = port.f / m
init(port.vel) = v0
```

