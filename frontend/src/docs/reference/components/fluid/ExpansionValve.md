---
name: ExpansionValve
category: Component (fluid)
summary: Acausal fluid-domain component ExpansionValve with ports in, out.
related: []
examples: []
tags: [expansionvalve, component, fluid, acausal]
references: []
generated: true
---

# ExpansionValve

Reusable acausal **fluid-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
ExpansionValve inst(CdA, rho_in)
```

## Ports

`in`, `out`

## Parameters

| Parameter | Type |
| --- | --- |
| `CdA` | Number |
| `rho_in` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
out.mdot = in.mdot
out.h    = in.h
in.mdot * abs(in.mdot) = CdA^2 * 2 * rho_in * (in.P - out.P)
```

