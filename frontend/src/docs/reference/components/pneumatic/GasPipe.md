---
name: GasPipe
category: Component (pneumatic)
summary: Acausal pneumatic-domain component GasPipe with ports in, out.
related: []
examples: []
tags: [gaspipe, component, pneumatic, acausal]
references: []
generated: true
---

# GasPipe

Reusable acausal **pneumatic-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
GasPipe inst(param = value, ...)
```

## Ports

`in`, `out`

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
out.mdot = in.mdot
out.P    = in.P
out.h    = in.h
out.y    = in.y
```

