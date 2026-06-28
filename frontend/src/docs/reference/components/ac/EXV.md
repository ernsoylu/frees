---
name: EXV
category: Component (ac)
summary: Acausal ac-domain component EXV with ports in, out.
related: []
examples: []
tags: [exv, component, ac, acausal]
references: []
generated: true
---

# EXV

Reusable acausal **ac-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
EXV inst(fluid$, CdA_max, u, domain$)
```

## Ports

`in`, `out`

## Parameters

| Parameter | Type |
| --- | --- |
| `fluid$` | String |
| `CdA_max` | Number |
| `u` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
out.mdot = in.mdot
out.h    = in.h
rho_in   = Density(fluid$, P=in.P, h=in.h)
in.mdot * abs(in.mdot) = (u * CdA_max)^2 * 2 * rho_in * (in.P - out.P)
```

