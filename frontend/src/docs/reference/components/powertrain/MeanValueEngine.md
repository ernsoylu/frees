---
name: MeanValueEngine
category: Component (powertrain)
summary: Acausal powertrain-domain component MeanValueEngine with ports shaft.
related: []
examples: []
tags: [meanvalueengine, component, powertrain, acausal]
references: []
generated: true
---

# MeanValueEngine

Reusable acausal **powertrain-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
MeanValueEngine inst(throttle, Tpeak, w_peak, FMEP_a, FMEP_b)
```

## Ports

`shaft`

## Parameters

| Parameter | Type |
| --- | --- |
| `throttle` | Number |
| `Tpeak` | Number |
| `w_peak` | Number |
| `FMEP_a` | Number |
| `FMEP_b` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
T_wot     = Tpeak * (1 - ((shaft.w - w_peak) / w_peak)^2)
T_ind     = throttle * T_wot
T_fric    = FMEP_a + FMEP_b * shaft.w
shaft.tau = -(T_ind - T_fric)
```

