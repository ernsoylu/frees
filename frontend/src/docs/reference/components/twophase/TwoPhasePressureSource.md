---
name: TwoPhasePressureSource
category: Component (twophase)
summary: Acausal twophase-domain component TwoPhasePressureSource with ports out.
related: []
examples: []
tags: [twophasepressuresource, component, twophase, acausal]
references: []
generated: true
---

# TwoPhasePressureSource

Reusable acausal **twophase-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
TwoPhasePressureSource inst(fluid$, P, x, domain$)
```

## Ports

`out`

## Parameters

| Parameter | Type |
| --- | --- |
| `fluid$` | String |
| `P` | Number |
| `x` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
out.P = P
out.h = Enthalpy(fluid$, P=P, x=x)
```

