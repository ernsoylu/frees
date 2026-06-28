---
name: Diode
category: Component (electrical)
summary: Acausal electrical-domain component Diode with ports p, n.
related: []
examples: []
tags: [diode, component, electrical, acausal]
references: []
generated: true
---

# Diode

Reusable acausal **electrical-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
Diode inst(Gon, eps)
```

## Ports

`p`, `n`

## Parameters

| Parameter | Type |
| --- | --- |
| `Gon` | Number |
| `eps` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
vd  = p.V - n.V
p.I = Gon * vd * (0.5 + 0.5 * tanh(vd / eps))
p.I + n.I = 0
```

