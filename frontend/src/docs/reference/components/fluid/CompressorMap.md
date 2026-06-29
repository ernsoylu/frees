---
name: CompressorMap
category: Component (fluid)
summary: A compressor whose isentropic efficiency comes from a tabulated map (eta vs pressure ratio).
related: []
examples: []
tags: [compressormap, compressor, map, component, fluid, acausal]
references:
  - "Karnopp, D.C., Margolis, D.L. & Rosenberg, R.C., System Dynamics: Modeling, Simulation, and Control of Mechatronic Systems (5th ed.) — acausal/bond-graph formalism"
  - "Moran, M.J. et al., Fundamentals of Engineering Thermodynamics (9th ed.)"
---

# CompressorMap

A compressor whose isentropic efficiency comes from a tabulated map (eta vs pressure ratio).

## Domain

A reusable **acausal fluid-domain** component — its thermofluid ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h`. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `out`

## Usage

```
CompressorMap inst(fluid$, map_eta$)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `fluid$` | String | Fluid name (e.g. R134a, Air). |
| `map_eta$` | String | Name of a TABLE/FUNCTION giving isentropic efficiency (0–1) vs pressure ratio (out.P/in.P). |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

```
s_in     = Entropy(fluid$, P=in.P, h=in.h)
h_s      = Enthalpy(fluid$, P=out.P, s=s_in)
PR       = out.P / in.P
eta      = map_eta$(PR)
out.mdot = in.mdot
out.h    = in.h + (h_s - in.h) / eta
W        = in.mdot * (out.h - in.h)
```

## References

1. Karnopp, D.C., Margolis, D.L. & Rosenberg, R.C., *System Dynamics: Modeling, Simulation, and Control of Mechatronic Systems* (5th ed.) — acausal/bond-graph formalism.
2. Moran, M.J. et al., *Fundamentals of Engineering Thermodynamics* (9th ed.).
