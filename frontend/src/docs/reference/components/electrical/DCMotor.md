---
name: DCMotor
category: Component (electrical)
summary: Acausal electrical-domain component DCMotor with ports p, n, shaft.
related: []
examples: []
tags: [dcmotor, component, electrical, acausal]
references: []
generated: true
---

# DCMotor

Reusable acausal **electrical-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
DCMotor inst(Kt, Ke, R)
```

## Ports

`p`, `n`, `shaft`

## Parameters

| Parameter | Type |
| --- | --- |
| `Kt` | Number |
| `Ke` | Number |
| `R` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
p.V - n.V  = R * p.I + Ke * shaft.w
p.I + n.I  = 0
shaft.tau  = -Kt * p.I
```

