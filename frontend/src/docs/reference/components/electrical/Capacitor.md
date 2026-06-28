---
name: Capacitor
category: Component (electrical)
summary: Acausal electrical-domain component Capacitor with ports p, n.
related: []
examples: []
tags: [capacitor, component, electrical, acausal]
references: []
generated: true
---

# Capacitor

Reusable acausal **electrical-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
Capacitor inst(C, V0)
```

## Ports

`p`, `n`

## Parameters

| Parameter | Type |
| --- | --- |
| `C` | Number |
| `V0` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
Vc       = p.V - n.V
der(Vc)  = p.I / C
init(Vc) = V0
p.I + n.I = 0
```

