---
name: FanCurve
category: Component (fluid)
summary: Acausal fluid-domain component FanCurve with ports in, out.
related: []
examples: []
tags: [fancurve, component, fluid, acausal]
references: []
generated: true
---

# FanCurve

Reusable acausal **fluid-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
FanCurve inst(rho, dP0, Q0)
```

## Ports

`in`, `out`

## Parameters

| Parameter | Type |
| --- | --- |
| `rho` | Number |
| `dP0` | Number |
| `Q0` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
Q        = in.mdot / rho
dP       = dP0 * (1 - (Q / Q0)^2)
out.mdot = in.mdot
out.P    = in.P + dP
```

