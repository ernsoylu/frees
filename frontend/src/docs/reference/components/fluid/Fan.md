---
name: Fan
category: Component (fluid)
summary: Acausal fluid-domain component Fan with ports in, out.
related: []
examples: []
tags: [fan, component, fluid, acausal]
references: []
generated: true
---

# Fan

Reusable acausal **fluid-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
Fan inst(fluid$, dP0, Q0, eta)
```

## Ports

`in`, `out`

## Parameters

| Parameter | Type |
| --- | --- |
| `fluid$` | String |
| `dP0` | Number |
| `Q0` | Number |
| `eta` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
rho      = Density(fluid$, P=in.P, h=in.h)
Q        = in.mdot / rho
dP       = dP0 * (1 - (Q / Q0)^2)
out.mdot = in.mdot
out.P    = in.P + dP
out.h    = in.h + dP / (rho * eta)
```

