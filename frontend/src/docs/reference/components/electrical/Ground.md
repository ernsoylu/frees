---
name: Ground
category: Component (electrical)
summary: The electrical reference node (V = 0).
related: []
examples: [pressure-cooker]
tags: [ground, component, electrical, acausal]
references:
  - "the standard literature, D.C., the standard literature, D.L. & Rosenberg, R.C., a standard system-dynamics text (5th ed.) — acausal/bond-graph formalism"
  - "the standard literature, J.W. & the standard literature, S.A., a standard circuits text"
---

# Ground

The electrical reference node (`V = 0`).

## Domain

A reusable **acausal electrical-domain** component — its electrical ports carry potential `V` and current `I`; a node enforces equal `V` and `ΣI = 0` (Kirchhoff). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`port`

## Usage

```
Ground inst(...)
```

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

```
port.V = 0
```

## Examples

Instantiated in the verified example below:

[Run: pressure-cooker]

## References

1. the standard literature, D.C., the standard literature, D.L. & Rosenberg, R.C., *a standard system-dynamics text* (5th ed.) — acausal/bond-graph formalism.
2. the standard literature, J.W. & the standard literature, S.A., *Electric Circuits* (11th ed.).
