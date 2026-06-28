---
name: TwoPhasePipe
category: Component (twophase)
summary: Acausal twophase-domain component TwoPhasePipe with ports in, out.
related: []
examples: []
tags: [twophasepipe, component, twophase, acausal]
references: []
generated: true
---

# TwoPhasePipe

Reusable acausal **twophase-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
TwoPhasePipe inst(fluid$, L, D, rough, x, rho_l, rho_g, mu_l, mu_g)
```

## Ports

`in`, `out`

## Parameters

| Parameter | Type |
| --- | --- |
| `fluid$` | String |
| `L` | Number |
| `D` | Number |
| `rough` | Number |
| `x` | Number |
| `rho_l` | Number |
| `rho_g` | Number |
| `mu_l` | Number |
| `mu_g` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
out.mdot = in.mdot
out.h    = in.h
A        = pi# / 4 * D^2
V_l      = in.mdot * (1 - x) / (rho_l * A)
Re_l     = reynolds(rho_l, V_l, D, mu_l)
f_l      = friction_factor(Re_l, rough / D)
dP_l     = f_l * (L / D) * rho_l * V_l^2 / 2
X_tt     = lm_martinelli_tt(x, rho_l, rho_g, mu_l, mu_g)
phi2     = lm_phi2(X_tt, 20)
out.P    = in.P - phi2 * dP_l
```

