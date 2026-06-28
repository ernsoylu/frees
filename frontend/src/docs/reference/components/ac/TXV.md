---
name: TXV
category: Component (ac)
summary: Acausal ac-domain component TXV with ports in, out, bulb.
related: []
examples: []
tags: [txv, component, ac, acausal]
references: []
generated: true
---

# TXV

Reusable acausal **ac-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
TXV inst(fluid$, Kv, SH_set, CdA0, tau_valve, tau_bulb, domain$)
```

## Ports

`in`, `out`, `bulb`

## Parameters

| Parameter | Type |
| --- | --- |
| `fluid$` | String |
| `Kv` | Number |
| `SH_set` | Number |
| `CdA0` | Number |
| `tau_valve` | Number |
| `tau_bulb` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
out.mdot   = in.mdot
out.h      = in.h
bulb.Qdot  = 0
Tsat       = T_sat(fluid$, P=out.P)
SH_sensed  = bulb.T - Tsat
der(SH_b)  = (SH_sensed - SH_b) / tau_bulb
init(SH_b) = SH_set
CdA_t      = CdA0 + Kv * (SH_b - SH_set)
der(CdA)   = (CdA_t - CdA) / tau_valve
init(CdA)  = CdA0
rho_in     = Density(fluid$, P=in.P, h=in.h)
in.mdot * abs(in.mdot) = CdA^2 * 2 * rho_in * (in.P - out.P)
```

