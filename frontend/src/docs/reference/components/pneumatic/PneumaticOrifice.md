---
name: PneumaticOrifice
category: Component (pneumatic)
summary: Acausal pneumatic-domain component PneumaticOrifice with ports in, out.
related: []
examples: []
tags: [pneumaticorifice, component, pneumatic, acausal]
references: []
generated: true
---

# PneumaticOrifice

Reusable acausal **pneumatic-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
PneumaticOrifice inst(fluid$, C, b, domain$)
```

## Ports

`in`, `out`

## Parameters

| Parameter | Type |
| --- | --- |
| `fluid$` | String |
| `C` | Number |
| `b` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
out.h    = in.h
T_in     = Temperature(fluid$, P=in.P, h=in.h)
in.mdot  = iso6358(C, b, in.P, T_in, out.P)
out.mdot = in.mdot
```

