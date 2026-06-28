---
name: Resistor
category: Component (electrical)
summary: Acausal electrical-domain component Resistor with ports a, b.
related: []
examples: []
tags: [resistor, component, electrical, acausal]
references: []
generated: true
---

# Resistor

Reusable acausal **electrical-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
Resistor inst(R)
```

## Ports

`a`, `b`

## Parameters

| Parameter | Type |
| --- | --- |
| `R` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
a.V - b.V = R * a.I
a.I + b.I = 0
```

