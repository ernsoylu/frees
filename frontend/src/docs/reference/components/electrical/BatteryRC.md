---
name: BatteryRC
category: Component (electrical)
summary: Acausal electrical-domain component BatteryRC with ports p, n.
related: []
examples: []
tags: [batteryrc, component, electrical, acausal]
references: []
generated: true
---

# BatteryRC

Reusable acausal **electrical-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
BatteryRC inst(Voc, R0, R1, C1, Vrc0)
```

## Ports

`p`, `n`

## Parameters

| Parameter | Type |
| --- | --- |
| `Voc` | Number |
| `R0` | Number |
| `R1` | Number |
| `C1` | Number |
| `Vrc0` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
p.V - n.V = Voc + R0 * p.I - Vrc
der(Vrc)  = -p.I / C1 - Vrc / (R1 * C1)
init(Vrc) = Vrc0
p.I + n.I = 0
```

