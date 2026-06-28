---
name: Valve
category: Component (fluid)
summary: Acausal fluid-domain component Valve with ports in, out.
related: []
examples: []
tags: [valve, component, fluid, acausal]
references: []
generated: true
---

# Valve

Reusable acausal **fluid-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
Valve inst(Cv, rho)
```

## Ports

`in`, `out`

## Parameters

| Parameter | Type |
| --- | --- |
| `Cv` | Number |
| `rho` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
out.mdot = in.mdot
out.h    = in.h
in.mdot * abs(in.mdot) = Cv^2 * rho * (in.P - out.P)
```

