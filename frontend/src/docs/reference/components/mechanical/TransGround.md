---
name: TransGround
category: Component (mechanical)
summary: Acausal mechanical-domain component TransGround with ports port.
related: []
examples: []
tags: [transground, component, mechanical, acausal]
references: []
generated: true
---

# TransGround

Reusable acausal **mechanical-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
TransGround inst(param = value, ...)
```

## Ports

`port`

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
port.vel = 0
```

