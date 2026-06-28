---
name: Planetary
category: Component (mechanical)
summary: Acausal mechanical-domain component Planetary with ports sun, ring, carrier.
related: []
examples: []
tags: [planetary, component, mechanical, acausal]
references: []
generated: true
---

# Planetary

Reusable acausal **mechanical-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
Planetary inst(g)
```

## Ports

`sun`, `ring`, `carrier`

## Parameters

| Parameter | Type |
| --- | --- |
| `g` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
sun.w + g * ring.w = (1 + g) * carrier.w
ring.tau           = g * sun.tau
sun.tau + ring.tau + carrier.tau = 0
```

