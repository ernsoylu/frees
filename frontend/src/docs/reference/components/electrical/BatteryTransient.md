---
name: BatteryTransient
category: Component (electrical)
summary: Acausal electrical-domain component BatteryTransient with ports p, n, heat.
related: []
examples: []
tags: [batterytransient, component, electrical, acausal]
references: []
generated: true
---

# BatteryTransient

Reusable acausal **electrical-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
BatteryTransient inst(Voc, R0, Q0, C_th, SOC0, T0)
```

## Ports

`p`, `n`, `heat`

## Parameters

| Parameter | Type |
| --- | --- |
| `Voc` | Number |
| `R0` | Number |
| `Q0` | Number |
| `C_th` | Number |
| `SOC0` | Number |
| `T0` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
p.V - n.V = Voc + R0 * p.I
p.I + n.I = 0
Qgen      = R0 * p.I^2
heat.T    = T
der(T)    = (Qgen + heat.Qdot) / C_th
init(T)   = T0
der(SOC)  = p.I / (3600 * Q0)
init(SOC) = SOC0
```

