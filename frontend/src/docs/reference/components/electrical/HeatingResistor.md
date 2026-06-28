---
name: HeatingResistor
category: Component (electrical)
summary: Acausal electrical-domain component HeatingResistor with ports p, n, heat.
related: []
examples: []
tags: [heatingresistor, component, electrical, acausal]
references: []
generated: true
---

# HeatingResistor

Reusable acausal **electrical-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
HeatingResistor inst(R)
```

## Ports

`p`, `n`, `heat`

## Parameters

| Parameter | Type |
| --- | --- |
| `R` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
p.V - n.V = R * p.I
p.I + n.I = 0
Q         = (p.V - n.V) * p.I
heat.Qdot = -Q
```

