---
name: Duct
category: Component (fluid)
summary: Acausal fluid-domain component Duct with ports in, out.
related: []
examples: []
tags: [duct, component, fluid, acausal]
references: []
generated: true
---

# Duct

Reusable acausal **fluid-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
Duct inst(rho, mu, L, D, rough)
```

## Ports

`in`, `out`

## Parameters

| Parameter | Type |
| --- | --- |
| `rho` | Number |
| `mu` | Number |
| `L` | Number |
| `D` | Number |
| `rough` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
out.mdot = in.mdot
A        = pi# / 4 * D^2
V        = in.mdot / (rho * A)
Re_d     = reynolds(rho, V, D, mu)
f        = friction_factor(Re_d, rough / D)
out.P    = in.P - f * (L / D) * rho * V^2 / 2
```

