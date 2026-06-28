---
name: HydraulicPump
category: Component (hydraulic)
summary: A hydraulic pump delivering flow against pressure.
related: []
examples: []
tags: [hydraulicpump, component, hydraulic, acausal]
references:
  - "Karnopp, D.C., Margolis, D.L. & Rosenberg, R.C., System Dynamics: Modeling, Simulation, and Control of Mechatronic Systems (5th ed.) — acausal/bond-graph formalism"
  - "Merritt, H.E., Hydraulic Control Systems"
---

# HydraulicPump

A hydraulic pump delivering flow against pressure.

## Domain

A reusable **acausal hydraulic-domain** component — its oil-hydraulic ports carry pressure `P`, mass-flow `ṁ`, and enthalpy `h`. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `out`, `shaft`

## Usage

```
HydraulicPump inst(disp, rho, eta_v, eta_m, domain$)
```

## Parameters

| Parameter | Type |
| --- | --- |
| `disp` | Number |
| `rho` | Number |
| `eta_v` | Number |
| `eta_m` | Number |
| `domain$` | String |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

```
n_rev     = shaft.w / (2 * pi#)
out.mdot  = rho * disp * n_rev * eta_v
in.mdot   = out.mdot
out.h     = in.h
shaft.tau = -(disp * (out.P - in.P) / (2 * pi#)) / eta_m
```

## References

1. Karnopp, D.C., Margolis, D.L. & Rosenberg, R.C., *System Dynamics: Modeling, Simulation, and Control of Mechatronic Systems* (5th ed.) — acausal/bond-graph formalism.
2. Merritt, H.E., *Hydraulic Control Systems*.
