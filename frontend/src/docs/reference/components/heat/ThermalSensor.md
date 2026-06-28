---
name: ThermalSensor
category: Component (heat)
summary: Acausal heat-domain component ThermalSensor with ports port.
related: []
examples: []
tags: [thermalsensor, component, heat, acausal]
references: []
generated: true
---

# ThermalSensor

Reusable acausal **heat-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
ThermalSensor inst(param = value, ...)
```

## Ports

`port`

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
port.Qdot = 0
T_meas    = port.T
```

