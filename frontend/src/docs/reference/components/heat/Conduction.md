---
name: Conduction
category: Component (heat)
summary: A conductive thermal resistance (Fourier), Q̇ = (T1 − T2)/R.
related: []
examples: [heat-conduction, transient-heat-rod, heisler-transient, material-conduction]
tags: [conduction, component, heat, acausal]
references:
  - "the standard literature, D.C., the standard literature, D.L. & Rosenberg, R.C., a standard system-dynamics text (5th ed.) — acausal/bond-graph formalism"
  - "the standard literature, F.P. et al., Fundamentals of Heat and Mass Transfer"
---

# Conduction

A conductive thermal resistance (Fourier), `Q̇ = (T1 − T2)/R`.

## Domain

A reusable **acausal heat-domain** component — its thermal ports carry temperature `T` and heat-flow rate `Q̇`; a node enforces equal `T` and `ΣQ̇ = 0`. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`a`, `b`

## Usage

```
Conduction inst(k, area, L)
```

## Parameters

| Parameter | Type |
| --- | --- |
| `k` | Number |
| `area` | Number |
| `L` | Number |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

```
Q      = k * area / L * (a.T - b.T)
a.Qdot = Q
b.Qdot = -Q
```

## Examples

Instantiated in the verified example below:

[Run: heat-conduction]

## References

1. the standard literature, D.C., the standard literature, D.L. & Rosenberg, R.C., *a standard system-dynamics text* (5th ed.) — acausal/bond-graph formalism.
2. the standard literature, F.P. et al., *Fundamentals of Heat and Mass Transfer*.
