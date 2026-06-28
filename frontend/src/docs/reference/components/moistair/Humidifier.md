---
name: Humidifier
category: Component (moistair)
summary: Acausal moistair-domain component Humidifier with ports in, out.
related: []
examples: []
tags: [humidifier, component, moistair, acausal]
references: []
generated: true
---

# Humidifier

Reusable acausal **moistair-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
Humidifier inst(mdot_w, h_w, domain$)
```

## Ports

`in`, `out`

## Parameters

| Parameter | Type |
| --- | --- |
| `mdot_w` | Number |
| `h_w` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
out.mdot = in.mdot
out.P    = in.P
out.W    = in.W + mdot_w / in.mdot
out.h    = in.h + mdot_w * h_w / in.mdot
```

