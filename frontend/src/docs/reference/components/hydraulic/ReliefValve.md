---
name: ReliefValve
category: Component (hydraulic)
summary: A pressure-relief valve that opens above its set pressure.
related: []
examples: []
tags: [reliefvalve, component, hydraulic, acausal]
references:
  - "Karnopp, D.C., Margolis, D.L. & Rosenberg, R.C., System Dynamics: Modeling, Simulation, and Control of Mechatronic Systems (5th ed.) — acausal/bond-graph formalism"
  - "Merritt, H.E., Hydraulic Control Systems"
---

# ReliefValve

A pressure-relief valve that opens above its set pressure.

## Domain

A reusable **acausal hydraulic-domain** component — its oil-hydraulic ports carry pressure `P`, mass-flow `ṁ`, and enthalpy `h`. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `out`

## Usage

```
ReliefValve inst(Pcrack, K, eps, domain$)
```

## Parameters

| Parameter | Type |
| --- | --- |
| `Pcrack` | Number |
| `K` | Number |
| `eps` | Number |
| `domain$` | String |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

```
out.mdot = in.mdot
out.h    = in.h
open     = 0.5 * (1 + tanh((in.P - Pcrack) / eps))
in.mdot  = K * open * (in.P - out.P)
```

## References

1. Karnopp, D.C., Margolis, D.L. & Rosenberg, R.C., *System Dynamics: Modeling, Simulation, and Control of Mechatronic Systems* (5th ed.) — acausal/bond-graph formalism.
2. Merritt, H.E., *Hydraulic Control Systems*.
