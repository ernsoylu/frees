---
name: RotationalSpring
category: Component (mechanical)
summary: Acausal mechanical-domain component RotationalSpring with ports a, b.
related: []
examples: []
tags: [rotationalspring, component, mechanical, acausal]
references: []
generated: true
---

# RotationalSpring

Reusable acausal **mechanical-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
RotationalSpring inst(k, theta0)
```

## Ports

`a`, `b`

## Parameters

| Parameter | Type |
| --- | --- |
| `k` | Number |
| `theta0` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
der(theta)  = a.w - b.w
init(theta) = theta0
a.tau       = k * theta
a.tau + b.tau = 0
```

