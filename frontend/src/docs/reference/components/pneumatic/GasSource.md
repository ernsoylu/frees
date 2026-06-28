---
name: GasSource
category: Component (pneumatic)
summary: Acausal pneumatic-domain component GasSource with ports out.
related: []
examples: []
tags: [gassource, component, pneumatic, acausal]
references: []
generated: true
---

# GasSource

Reusable acausal **pneumatic-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
GasSource inst(y, mdot, P, h0)
```

## Ports

`out`

## Parameters

| Parameter | Type |
| --- | --- |
| `y` | Number |
| `mdot` | Number |
| `P` | Number |
| `h0` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
out.y    = y
out.mdot = mdot
out.P    = P
out.h    = h0
```

