---
name: Turbocharger
category: Component (fluid)
summary: Acausal fluid-domain component Turbocharger with ports t_in, t_out, c_in, c_out.
related: []
examples: []
tags: [turbocharger, component, fluid, acausal]
references: []
generated: true
---

# Turbocharger

Reusable acausal **fluid-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
Turbocharger inst(cp, eta_t, eta_c, gam)
```

## Ports

`t_in`, `t_out`, `c_in`, `c_out`

## Parameters

| Parameter | Type |
| --- | --- |
| `cp` | Number |
| `eta_t` | Number |
| `eta_c` | Number |
| `gam` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
PRt        = t_in.P / t_out.P
t_out.T    = t_in.T * (1 - eta_t * (1 - PRt^((1 - gam) / gam)))
t_out.mdot = t_in.mdot
Wt         = t_in.mdot * cp * (t_in.T - t_out.T)
PRc        = c_out.P / c_in.P
c_out.T    = c_in.T * (1 + (PRc^((gam - 1) / gam) - 1) / eta_c)
c_out.mdot = c_in.mdot
Wc         = c_in.mdot * cp * (c_out.T - c_in.T)
Wt         = Wc
```

