---
name: TwoPhaseSource
category: Component (twophase)
summary: Acausal twophase-domain component TwoPhaseSource with ports out.
related: []
examples: []
tags: [twophasesource, component, twophase, acausal]
references: []
generated: true
---

# TwoPhaseSource

Reusable acausal **twophase-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
TwoPhaseSource inst(fluid$, mdot, P, x, domain$)
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
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
out.mdot = mdot
out.P    = P
out.h    = Enthalpy(fluid$, P=P, x=x)
```

