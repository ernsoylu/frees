---
name: HeatingCoil
category: Component (moistair)
summary: Acausal moistair-domain component HeatingCoil with ports in, out.
related: []
examples: []
tags: [heatingcoil, component, moistair, acausal]
references: []
generated: true
---

# HeatingCoil

Reusable acausal **moistair-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
HeatingCoil inst(Q, domain$)
```

## Ports

`in`, `out`

## Parameters

| Parameter | Type |
| --- | --- |
| `Q` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
out.mdot = in.mdot
out.P    = in.P
out.W    = in.W
out.h    = in.h + Q / in.mdot
```

