---
name: SteamReliefValve
category: Component (twophase)
summary: Acausal twophase-domain component SteamReliefValve with ports in, out.
related: []
examples: []
tags: [steamreliefvalve, component, twophase, acausal]
references: []
generated: true
---

# SteamReliefValve

Reusable acausal **twophase-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
SteamReliefValve inst(fluid$, A, Pset, Cd, kgas, Rgas, eps, domain$)
```

## Ports

`in`, `out`

## Parameters

| Parameter | Type |
| --- | --- |
| `fluid$` | String |
| `A` | Number |
| `Pset` | Number |
| `Cd` | Number |
| `kgas` | Number |
| `Rgas` | Number |
| `eps` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
out.mdot = in.mdot
out.h    = in.h
opening  = 0.5 * (1 + tanh((in.P - Pset) / eps))
T0v      = Temperature(fluid$, P=in.P, x=1)
PRc      = (2 / (kgas + 1)) ^ (kgas / (kgas - 1))
mdot_ch  = Cd * A * in.P * sqrt(kgas / (Rgas * T0v)) * (2 / (kgas + 1)) ^ ((kgas + 1) / (2 * (kgas - 1)))
ratio    = (min(max(out.P / in.P, PRc), 1) - PRc) / (1 - PRc)
efact    = 1 - ratio ^ 2
in.mdot  = opening * mdot_ch * efact
```

