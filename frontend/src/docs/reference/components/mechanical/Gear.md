---
name: Gear
category: Component (mechanical)
summary: Acausal mechanical-domain component Gear with ports in, out.
related: []
examples: []
tags: [gear, component, mechanical, acausal]
references: []
generated: true
---

# Gear

Reusable acausal **mechanical-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
Gear inst(ratio)
```

## Ports

`in`, `out`

## Parameters

| Parameter | Type |
| --- | --- |
| `ratio` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
in.w    = ratio * out.w
out.tau = -ratio * in.tau
```

