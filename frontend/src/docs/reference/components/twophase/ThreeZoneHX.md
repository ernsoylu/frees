---
name: ThreeZoneHX
category: Component (twophase)
summary: Acausal twophase-domain component ThreeZoneHX with ports hot_in, hot_out, cold_in, cold_out.
related: []
examples: []
tags: [threezonehx, component, twophase, acausal]
references: []
generated: true
---

# ThreeZoneHX

Reusable acausal **twophase-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
ThreeZoneHX inst(UA, hot$, cold$, arr$)
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
HeatExchanger Z1(UA=UA/3, hot$=hot$, cold$=cold$, arr$=arr$)
HeatExchanger Z2(UA=UA/3, hot$=hot$, cold$=cold$, arr$=arr$)
HeatExchanger Z3(UA=UA/3, hot$=hot$, cold$=cold$, arr$=arr$)
connect(hot_in, Z1.hot_in)
connect(Z1.hot_out, Z2.hot_in)
connect(Z2.hot_out, Z3.hot_in)
connect(Z3.hot_out, hot_out)
connect(cold_in, Z3.cold_in)
connect(Z3.cold_out, Z2.cold_in)
connect(Z2.cold_out, Z1.cold_in)
connect(Z1.cold_out, cold_out)
```

