---
name: Resistor
category: Component (electrical)
summary: An Ohmic resistor, V = R·I.
related: []
examples: []
tags: [resistor, component, electrical, acausal]
references:
  - "the standard literature, D.C., the standard literature, D.L. & Rosenberg, R.C., a standard system-dynamics text (5th ed.) — acausal/bond-graph formalism"
  - "the standard literature, J.W. & the standard literature, S.A., a standard circuits text"
---

# Resistor

An Ohmic resistor, `V = R·I`.

## Domain

A reusable **acausal electrical-domain** component — its electrical ports carry potential `V` and current `I`; a node enforces equal `V` and `ΣI = 0` (Kirchhoff). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`a`, `b`

## Usage

```
Resistor inst(R)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `R` | Number | Resistance [Ω]. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

```
a.V - b.V = R * a.I
a.I + b.I = 0
```

## References

1. the standard literature, D.C., the standard literature, D.L. & Rosenberg, R.C., *a standard system-dynamics text* (5th ed.) — acausal/bond-graph formalism.
2. the standard literature, J.W. & the standard literature, S.A., *Electric Circuits* (11th ed.).
