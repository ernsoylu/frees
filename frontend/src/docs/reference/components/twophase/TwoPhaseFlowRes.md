---
name: TwoPhaseFlowRes
category: Component (twophase)
summary: Acausal twophase-domain component TwoPhaseFlowRes with ports in, out.
related: []
examples: []
tags: [twophaseflowres, component, twophase, acausal]
references: []
generated: true
---

# TwoPhaseFlowRes

Reusable acausal **twophase-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
TwoPhaseFlowRes inst(fluid$, L, D, domain$)
```

## Ports

`in`, `out`

## Parameters

| Parameter | Type |
| --- | --- |
| `fluid$` | String |
| `L` | Number |
| `D` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
out.mdot = in.mdot
out.h    = in.h
hf       = Enthalpy(fluid$, P=in.P, x=0)
hg       = Enthalpy(fluid$, P=in.P, x=1)
x        = (in.h - hf) / (hg - hf)
rho_l    = Density(fluid$, P=in.P, x=0)
rho_g    = Density(fluid$, P=in.P, x=1)
mu_l     = Viscosity(fluid$, P=in.P, x=0)
mu_g     = Viscosity(fluid$, P=in.P, x=1)
sigma    = SurfaceTension(fluid$, P=in.P)
A        = pi# / 4 * D^2
G        = in.mdot / A
V_lo     = G / rho_l
Re_lo    = reynolds(rho_l, V_lo, D, mu_l)
f_lo     = friction_factor(Re_lo, 0)
dP_lo    = f_lo * (L / D) * rho_l * V_lo^2 / 2
phi2     = friedel_phi2(x, rho_l, rho_g, mu_l, mu_g, G, D, sigma)
out.P    = in.P - phi2 * dP_lo
```

