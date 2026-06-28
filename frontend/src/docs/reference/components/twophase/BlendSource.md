---
name: BlendSource
category: Component (twophase)
summary: Acausal twophase-domain component BlendSource with ports out.
related: []
examples: []
tags: [blendsource, component, twophase, acausal]
references: []
generated: true
---

# BlendSource

Reusable acausal **twophase-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
BlendSource inst(fluid$, mdot, P, x, z, domain$)
```

## Ports

`out`

## Parameters

| Parameter | Type |
| --- | --- |
| `fluid$` | String |
| `mdot` | Number |
| `P` | Number |
| `x` | Number |
| `z` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
out.mdot = mdot
out.P    = P
out.h    = Enthalpy(fluid$, P=P, x=x)
out.z    = z
bubble   = Temperature(fluid$, P=P, x=0)
dew      = Temperature(fluid$, P=P, x=1)
glide    = dew - bubble
```

