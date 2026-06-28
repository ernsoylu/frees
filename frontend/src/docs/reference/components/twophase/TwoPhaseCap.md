---
name: TwoPhaseCap
category: Component (twophase)
summary: Acausal twophase-domain component TwoPhaseCap with ports in.
related: []
examples: []
tags: [twophasecap, component, twophase, acausal]
references: []
generated: true
---

# TwoPhaseCap

Reusable acausal **twophase-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
TwoPhaseCap inst(domain$)
```

## Ports

`in`

## Parameters

| Parameter | Type |
| --- | --- |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
in.mdot = 0
```

