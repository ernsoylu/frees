---
name: Splitter
category: Component (fluid)
summary: Acausal fluid-domain component Splitter with ports in, out1, out2.
related: []
examples: []
tags: [splitter, component, fluid, acausal]
references: []
generated: true
---

# Splitter

Reusable acausal **fluid-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
Splitter inst(param = value, ...)
```

## Ports

`in`, `out1`, `out2`

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
out1.P   = in.P
out2.P   = in.P
out1.h   = in.h
out2.h   = in.h
in.mdot  = out1.mdot + out2.mdot
```

