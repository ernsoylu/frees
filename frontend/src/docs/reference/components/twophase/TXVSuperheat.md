---
name: TXVSuperheat
category: Component (twophase)
summary: Acausal twophase-domain component TXVSuperheat with ports in, out, bulb.
related: []
examples: []
tags: [txvsuperheat, component, twophase, acausal]
references: []
generated: true
---

# TXVSuperheat

Reusable acausal **twophase-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
TXVSuperheat inst(fluid$, Kv, SH_set, domain$)
```

## Ports

`in`, `out`, `bulb`

## Parameters

| Parameter | Type |
| --- | --- |
| `fluid$` | String |
| `Kv` | Number |
| `SH_set` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
out.mdot  = in.mdot
out.h     = in.h
bulb.Qdot = 0
T_sat     = Temperature(fluid$, P=out.P, x=1)
SH        = bulb.T - T_sat
in.mdot   = Kv * (SH - SH_set)
```

