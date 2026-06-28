---
name: HydraulicPump
category: Component (hydraulic)
summary: Acausal hydraulic-domain component HydraulicPump with ports in, out, shaft.
related: []
examples: []
tags: [hydraulicpump, component, hydraulic, acausal]
references: []
generated: true
---

# HydraulicPump

Reusable acausal **hydraulic-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
HydraulicPump inst(disp, rho, eta_v, eta_m, domain$)
```

## Ports

`in`, `out`, `shaft`

## Parameters

| Parameter | Type |
| --- | --- |
| `disp` | Number |
| `rho` | Number |
| `eta_v` | Number |
| `eta_m` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
n_rev     = shaft.w / (2 * pi#)
out.mdot  = rho * disp * n_rev * eta_v
in.mdot   = out.mdot
out.h     = in.h
shaft.tau = -(disp * (out.P - in.P) / (2 * pi#)) / eta_m
```

