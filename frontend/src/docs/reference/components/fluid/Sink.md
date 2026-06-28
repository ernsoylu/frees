---
name: Sink
category: Component (fluid)
summary: Acausal fluid-domain component Sink with ports in.
related: []
examples: []
tags: [sink, component, fluid, acausal]
references: []
generated: true
---

# Sink

Reusable acausal **fluid-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
Sink inst(param = value, ...)
```

## Ports

`in`

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
mdot = in.mdot
P    = in.P
h    = in.h
```

