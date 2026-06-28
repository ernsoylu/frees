---
name: HeatExchanger
category: Component (fluid)
summary: Acausal fluid-domain component HeatExchanger with ports hot_in, hot_out, cold_in, cold_out.
related: []
examples: []
tags: [heatexchanger, component, fluid, acausal]
references: []
generated: true
---

# HeatExchanger

Reusable acausal **fluid-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
HeatExchanger inst(UA, hot$, cold$, arr$)
```

## Ports

`hot_in`, `hot_out`, `cold_in`, `cold_out`

## Parameters

| Parameter | Type |
| --- | --- |
| `UA` | Number |
| `hot$` | String |
| `cold$` | String |
| `arr$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
hot_out.mdot  = hot_in.mdot
hot_out.P     = hot_in.P
cold_out.mdot = cold_in.mdot
cold_out.P    = cold_in.P
Th   = Temperature(hot$,  P=hot_in.P,  h=hot_in.h)
Tc   = Temperature(cold$, P=cold_in.P, h=cold_in.h)
C_h  = hot_in.mdot  * Cp(hot$,  P=hot_in.P,  h=hot_in.h)
C_c  = cold_in.mdot * Cp(cold$, P=cold_in.P, h=cold_in.h)
Cmin = min(C_h, C_c)
Cmax = max(C_h, C_c)
eps  = hx_effectiveness(arr$, UA / Cmin, Cmin / Cmax)
Q    = eps * Cmin * (Th - Tc)
hot_out.h  = hot_in.h  - Q / hot_in.mdot
cold_out.h = cold_in.h + Q / cold_in.mdot
```

