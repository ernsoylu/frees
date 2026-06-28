---
name: MoistAirSource
category: Component (moistair)
summary: Acausal moistair-domain component MoistAirSource with ports out.
related: []
examples: []
tags: [moistairsource, component, moistair, acausal]
references: []
generated: true
---

# MoistAirSource

Reusable acausal **moistair-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
MoistAirSource inst(P, T, W, mdot, domain$)
```

## Ports

`out`

## Parameters

| Parameter | Type |
| --- | --- |
| `P` | Number |
| `T` | Number |
| `W` | Number |
| `mdot` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
out.P    = P
out.mdot = mdot
out.W    = W
out.h    = Enthalpy(AirH2O, T=T, P=P, W=W)
```

