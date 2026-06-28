---
name: HydraulicCylinder
category: Component (hydraulic)
summary: Acausal hydraulic-domain component HydraulicCylinder with ports in, rod.
related: []
examples: []
tags: [hydrauliccylinder, component, hydraulic, acausal]
references: []
generated: true
---

# HydraulicCylinder

Reusable acausal **hydraulic-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
HydraulicCylinder inst(rho, beta, V0, area, Patm, P0, domain$)
```

## Ports

`in`, `rod`

## Parameters

| Parameter | Type |
| --- | --- |
| `rho` | Number |
| `beta` | Number |
| `V0` | Number |
| `area` | Number |
| `Patm` | Number |
| `P0` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
rod.f      = -(in.P - Patm) * area
der(in.P)  = (beta / V0) * (in.mdot / rho - area * rod.vel)
init(in.P) = P0
```

