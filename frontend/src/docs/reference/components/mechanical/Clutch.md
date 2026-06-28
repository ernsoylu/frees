---
name: Clutch
category: Component (mechanical)
summary: Acausal mechanical-domain component Clutch with ports a, b.
related: []
examples: []
tags: [clutch, component, mechanical, acausal]
references: []
generated: true
---

# Clutch

Reusable acausal **mechanical-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
Clutch inst(Tmax, eng, eps)
```

## Ports

`a`, `b`

## Parameters

| Parameter | Type |
| --- | --- |
| `Tmax` | Number |
| `eng` | Number |
| `eps` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
dw    = a.w - b.w
a.tau = eng * Tmax * tanh(dw / eps)
a.tau + b.tau = 0
```

