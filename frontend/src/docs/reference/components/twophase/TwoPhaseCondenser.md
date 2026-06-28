---
name: TwoPhaseCondenser
category: Component (twophase)
summary: Acausal twophase-domain component TwoPhaseCondenser with ports in, out.
related: []
examples: []
tags: [twophasecondenser, component, twophase, acausal]
references: []
generated: true
---

# TwoPhaseCondenser

Reusable acausal **twophase-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
TwoPhaseCondenser inst(fluid$, SC_set, dP, domain$)
```

## Ports

`in`, `out`

## Parameters

| Parameter | Type |
| --- | --- |
| `fluid$` | String |
| `SC_set` | Number |
| `dP` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
out.mdot = in.mdot
out.P    = in.P - dP
Tsat     = T_sat(fluid$, P=out.P)
out.h    = Enthalpy(fluid$, P=out.P, T=Tsat - SC_set)
Q        = in.mdot * (in.h - out.h)
```

