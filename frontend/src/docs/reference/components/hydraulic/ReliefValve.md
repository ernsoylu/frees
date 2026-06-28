---
name: ReliefValve
category: Component (hydraulic)
summary: Acausal hydraulic-domain component ReliefValve with ports in, out.
related: []
examples: []
tags: [reliefvalve, component, hydraulic, acausal]
references: []
generated: true
---

# ReliefValve

Reusable acausal **hydraulic-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
ReliefValve inst(Pcrack, K, eps, domain$)
```

## Ports

`in`, `out`

## Parameters

| Parameter | Type |
| --- | --- |
| `Pcrack` | Number |
| `K` | Number |
| `eps` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
out.mdot = in.mdot
out.h    = in.h
open     = 0.5 * (1 + tanh((in.P - Pcrack) / eps))
in.mdot  = K * open * (in.P - out.P)
```

