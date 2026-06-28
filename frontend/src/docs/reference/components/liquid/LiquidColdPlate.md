---
name: LiquidColdPlate
category: Component (liquid)
summary: Acausal liquid-domain component LiquidColdPlate with ports in, out.
related: []
examples: []
tags: [liquidcoldplate, component, liquid, acausal]
references: []
generated: true
---

# LiquidColdPlate

Reusable acausal **liquid-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
LiquidColdPlate inst(Q, domain$)
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
Q        = in.mdot * (out.h - in.h)
```

