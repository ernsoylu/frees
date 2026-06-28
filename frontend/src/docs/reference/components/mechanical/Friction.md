---
name: Friction
category: Component (mechanical)
summary: Acausal mechanical-domain component Friction with ports a, b.
related: []
examples: []
tags: [friction, component, mechanical, acausal]
references: []
generated: true
---

# Friction

Reusable acausal **mechanical-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
Friction inst(Fc, Fs, vs, bv, eps)
```

## Ports

`a`, `b`

## Parameters

| Parameter | Type |
| --- | --- |
| `Fc` | Number |
| `Fs` | Number |
| `vs` | Number |
| `bv` | Number |
| `eps` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
dw    = a.w - b.w
a.tau = (Fc + (Fs - Fc) * exp(-(dw / vs)^2)) * tanh(dw / eps) + bv * dw
a.tau + b.tau = 0
```

