---
name: Battery
category: Component (electrical)
summary: Acausal electrical-domain component Battery with ports p, n.
related: []
examples: []
tags: [battery, component, electrical, acausal]
references: []
generated: true
---

# Battery

Reusable acausal **electrical-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
Battery inst(Voc, R0)
```

## Ports

`p`, `n`

## Parameters

| Parameter | Type |
| --- | --- |
| `Voc` | Number |
| `R0` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
p.V - n.V = Voc + R0 * p.I
p.I + n.I = 0
W = (p.V - n.V) * (0 - p.I)
```

