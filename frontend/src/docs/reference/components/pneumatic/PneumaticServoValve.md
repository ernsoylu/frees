---
name: PneumaticServoValve
category: Component (pneumatic)
summary: A pneumatic servo valve with a commanded spool position.
related: []
examples: []
tags: [pneumaticservovalve, component, pneumatic, acausal]
references:
  - "Karnopp, D.C., Margolis, D.L. & Rosenberg, R.C., System Dynamics: Modeling, Simulation, and Control of Mechatronic Systems (5th ed.) — acausal/bond-graph formalism"
  - "ISO 6358 — Pneumatic fluid power: flow-rate characteristics"
---

# PneumaticServoValve

A pneumatic servo valve with a commanded spool position.

## Domain

A reusable **acausal pneumatic-domain** component — its compressible-gas ports carry pressure `P`, mass-flow `ṁ`, and enthalpy `h` (ISO 6358 flow). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `out`

## Usage

```
PneumaticServoValve inst(fluid$, Cmax, b, u, domain$)
```

## Parameters

| Parameter | Type |
| --- | --- |
| `fluid$` | String |
| `Cmax` | Number |
| `b` | Number |
| `u` | Number |
| `domain$` | String |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

```
out.h    = in.h
T_in     = Temperature(fluid$, P=in.P, h=in.h)
in.mdot  = iso6358(u * Cmax, b, in.P, T_in, out.P)
out.mdot = in.mdot
```

## References

1. Karnopp, D.C., Margolis, D.L. & Rosenberg, R.C., *System Dynamics: Modeling, Simulation, and Control of Mechatronic Systems* (5th ed.) — acausal/bond-graph formalism.
2. ISO 6358 — Pneumatic fluid power: flow-rate characteristics.
