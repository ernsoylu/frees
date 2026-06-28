---
name: CurrentSource
category: Component (electrical)
summary: Acausal electrical-domain component CurrentSource with ports p, n.
related: []
examples: []
tags: [currentsource, component, electrical, acausal]
references: []
generated: true
---

# CurrentSource

Reusable acausal **electrical-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
CurrentSource inst(I)
```

## Ports

`p`, `n`

## Parameters

| Parameter | Type |
| --- | --- |
| `I` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
p.I = -I
p.I + n.I = 0
```

