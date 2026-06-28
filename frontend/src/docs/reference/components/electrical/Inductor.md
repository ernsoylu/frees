---
name: Inductor
category: Component (electrical)
summary: Acausal electrical-domain component Inductor with ports p, n.
related: []
examples: []
tags: [inductor, component, electrical, acausal]
references: []
generated: true
---

# Inductor

Reusable acausal **electrical-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
Inductor inst(L, I0)
```

## Ports

`p`, `n`

## Parameters

| Parameter | Type |
| --- | --- |
| `L` | Number |
| `I0` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
der(IL)  = (p.V - n.V) / L
init(IL) = I0
p.I = IL
p.I + n.I = 0
```

