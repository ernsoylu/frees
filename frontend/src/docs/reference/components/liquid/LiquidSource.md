---
name: LiquidSource
category: Component (liquid)
summary: Acausal liquid-domain component LiquidSource with ports out.
related: []
examples: []
tags: [liquidsource, component, liquid, acausal]
references: []
generated: true
---

# LiquidSource

Reusable acausal **liquid-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
LiquidSource inst(fluid$, mdot, P, T, domain$)
```

## Ports

`out`

## Parameters

| Parameter | Type |
| --- | --- |
| `fluid$` | String |
| `mdot` | Number |
| `P` | Number |
| `T` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
out.mdot = mdot
out.P    = P
out.h    = Enthalpy(fluid$, P=P, T=T)
```

