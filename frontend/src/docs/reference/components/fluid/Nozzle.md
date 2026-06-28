---
name: Nozzle
category: Component (fluid)
summary: Acausal fluid-domain component Nozzle with ports in, out.
related: []
examples: []
tags: [nozzle, component, fluid, acausal]
references: []
generated: true
---

# Nozzle

Reusable acausal **fluid-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
Nozzle inst(k, R, A_throat, A_exit, P_amb, T0)
```

## Ports

`in`, `out`

## Parameters

| Parameter | Type |
| --- | --- |
| `k` | Number |
| `R` | Number |
| `A_throat` | Number |
| `A_exit` | Number |
| `P_amb` | Number |
| `T0` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
out.mdot = in.mdot
M_exit   = mach_A_Astar(A_exit / A_throat, k, 'supersonic')
out.P    = in.P / P0_P(M_exit, k)
T_exit   = T0 / T0_T(M_exit, k)
V_exit   = M_exit * sqrt(k * R * T_exit)
out.h    = in.h - V_exit^2 / 2
thrust   = in.mdot * V_exit + (out.P - P_amb) * A_exit
```

