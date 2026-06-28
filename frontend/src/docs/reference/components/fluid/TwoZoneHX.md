---
name: TwoZoneHX
category: Component (fluid)
summary: Acausal fluid-domain component TwoZoneHX with ports hot_in, hot_out, cold_in, cold_out.
related: []
examples: []
tags: [twozonehx, component, fluid, acausal]
references: []
generated: true
---

# TwoZoneHX

Reusable acausal **fluid-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
TwoZoneHX inst(UA, hot$, cold$, arr$)
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
HeatExchanger C1(UA=UA/2, hot$=hot$, cold$=cold$, arr$=arr$)
HeatExchanger C2(UA=UA/2, hot$=hot$, cold$=cold$, arr$=arr$)
connect(hot_in, C1.hot_in)
connect(C1.hot_out, C2.hot_in)
connect(C2.hot_out, hot_out)
connect(cold_in, C2.cold_in)
connect(C2.cold_out, C1.cold_in)
connect(C1.cold_out, cold_out)
```

