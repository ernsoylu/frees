---
name: HydraulicSupply
category: Component (hydraulic)
summary: Acausal hydraulic-domain component HydraulicSupply with ports out.
related: []
examples: []
tags: [hydraulicsupply, component, hydraulic, acausal]
references: []
generated: true
---

# HydraulicSupply

Reusable acausal **hydraulic-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
HydraulicSupply inst(P, domain$)
```

## Ports

`out`

## Parameters

| Parameter | Type |
| --- | --- |
| `P` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
out.P = P
out.h = 0
```

