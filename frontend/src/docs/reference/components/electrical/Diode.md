---
name: Diode
category: Component (electrical)
summary: A nonlinear diode with an exponential current–voltage characteristic.
related: []
examples: []
tags: [diode, component, electrical, acausal]
references:
  - "the standard literature, D.C., the standard literature, D.L. & Rosenberg, R.C., a standard system-dynamics text (5th ed.) — acausal/bond-graph formalism"
  - "the standard literature, J.W. & the standard literature, S.A., a standard circuits text"
---

# Diode

A nonlinear diode with an exponential current–voltage characteristic.

## Domain

A reusable **acausal electrical-domain** component — its electrical ports carry potential `V` and current `I`; a node enforces equal `V` and `ΣI = 0` (Kirchhoff). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`p`, `n`

## Usage

```
Diode inst(Gon, eps)
```

## Parameters

| Parameter | Type |
| --- | --- |
| `Gon` | Number |
| `eps` | Number |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

```
vd  = p.V - n.V
p.I = Gon * vd * (0.5 + 0.5 * tanh(vd / eps))
p.I + n.I = 0
```

## References

1. the standard literature, D.C., the standard literature, D.L. & Rosenberg, R.C., *a standard system-dynamics text* (5th ed.) — acausal/bond-graph formalism.
2. the standard literature, J.W. & the standard literature, S.A., *Electric Circuits* (11th ed.).
