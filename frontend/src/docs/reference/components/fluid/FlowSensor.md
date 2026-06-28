---
name: FlowSensor
category: Component (fluid)
summary: Acausal fluid-domain component FlowSensor with ports in, out.
related: []
examples: []
tags: [flowsensor, component, fluid, acausal]
references: []
generated: true
---

# FlowSensor

Reusable acausal **fluid-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
FlowSensor inst(param = value, ...)
```

## Ports

`in`, `out`

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
out.mdot  = in.mdot
out.P     = in.P
out.h     = in.h
mdot_meas = in.mdot
```

