---
name: Convection
category: Component (heat)
summary: A convective link (Newton’s law of cooling), Q̇ = h·A·ΔT.
related: []
examples: [pressure-cooker]
tags: [convection, component, heat, acausal]
references:
  - "the standard literature, D.C., the standard literature, D.L. & Rosenberg, R.C., a standard system-dynamics text (5th ed.) — acausal/bond-graph formalism"
  - "the standard literature, F.P. et al., Fundamentals of Heat and Mass Transfer"
---

# Convection

A convective link (Newton’s law of cooling), `Q̇ = h·A·ΔT`.

## Domain

A reusable **acausal heat-domain** component — its thermal ports carry temperature `T` and heat-flow rate `Q̇`; a node enforces equal `T` and `ΣQ̇ = 0`. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`a`, `b`

## Usage

```
Convection inst(htc, area)
```

## Parameters

| Parameter | Type |
| --- | --- |
| `htc` | Number |
| `area` | Number |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

```
Q      = htc * area * (a.T - b.T)
a.Qdot = Q
b.Qdot = -Q
```

## Examples

Instantiated in the verified example below:

[Run: pressure-cooker]

## References

1. the standard literature, D.C., the standard literature, D.L. & Rosenberg, R.C., *a standard system-dynamics text* (5th ed.) — acausal/bond-graph formalism.
2. the standard literature, F.P. et al., *Fundamentals of Heat and Mass Transfer*.
