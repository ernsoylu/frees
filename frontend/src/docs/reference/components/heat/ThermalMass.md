---
name: ThermalMass
category: Component (heat)
summary: Acausal heat-domain component ThermalMass with ports port.
related: []
examples: []
tags: [thermalmass, component, heat, acausal]
references: []
generated: true
---

# ThermalMass

Reusable acausal **heat-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
ThermalMass inst(C, T0)
```

## Ports

`port`

## Parameters

| Parameter | Type |
| --- | --- |
| `C` | Number |
| `T0` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
der(port.T)  = port.Qdot / C
init(port.T) = T0
```

