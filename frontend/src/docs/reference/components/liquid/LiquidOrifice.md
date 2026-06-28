---
name: LiquidOrifice
category: Component (liquid)
summary: Acausal liquid-domain component LiquidOrifice with ports in, out.
related: []
examples: []
tags: [liquidorifice, component, liquid, acausal]
references: []
generated: true
---

# LiquidOrifice

Reusable acausal **liquid-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
LiquidOrifice inst(CdA, rho, domain$, model$)
```

## Ports

`in`, `out`

## Parameters

| Parameter | Type |
| --- | --- |
| `CdA` | Number |
| `rho` | Number |
| `domain$` | String |
| `model$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
out.mdot = in.mdot
out.h    = in.h
  in.mdot * abs(in.mdot) = CdA^2 * 2 * rho * (in.P - out.P)
```

