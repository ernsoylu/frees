---
name: ProportionalReliefValve
category: Component (twophase)
summary: Acausal twophase-domain component ProportionalReliefValve with ports in, out.
related: []
examples: []
tags: [proportionalreliefvalve, component, twophase, acausal]
references: []
generated: true
---

# ProportionalReliefValve

Reusable acausal **twophase-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
ProportionalReliefValve inst(fluid$, Pcrack, grad, eps, domain$)
```

## Ports

`in`, `out`

## Parameters

| Parameter | Type |
| --- | --- |
| `fluid$` | String |
| `Pcrack` | Number |
| `grad` | Number |
| `eps` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
out.mdot = in.mdot
out.h    = in.h
dpv      = in.P - Pcrack
in.mdot  = grad * 0.5 * (dpv + sqrt(dpv * dpv + eps * eps))
```

