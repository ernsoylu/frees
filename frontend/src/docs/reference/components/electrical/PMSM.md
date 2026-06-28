---
name: PMSM
category: Component (electrical)
summary: A permanent-magnet synchronous motor.
related: []
examples: []
tags: [pmsm, component, electrical, acausal]
references:
  - "the standard literature, D.C., the standard literature, D.L. & Rosenberg, R.C., a standard system-dynamics text (5th ed.) — acausal/bond-graph formalism"
  - "the standard literature, J.W. & the standard literature, S.A., a standard circuits text"
---

# PMSM

A permanent-magnet synchronous motor.

## Domain

A reusable **acausal electrical-domain** component — its electrical ports carry potential `V` and current `I`; a node enforces equal `V` and `ΣI = 0` (Kirchhoff). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`p`, `n`, `shaft`

## Usage

```
PMSM inst(Rs, lambda_pm, poles)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `Rs` | Number | Series resistance [Ω]. |
| `lambda_pm` | Number | PM flux linkage [Wb]. |
| `poles` | Number | Number of magnetic pole pairs. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

```
Kt        = 1.5 * poles * lambda_pm
p.V - n.V = Rs * p.I + Kt * shaft.w
p.I + n.I = 0
shaft.tau = -Kt * p.I
```

## References

1. the standard literature, D.C., the standard literature, D.L. & Rosenberg, R.C., *a standard system-dynamics text* (5th ed.) — acausal/bond-graph formalism.
2. the standard literature, J.W. & the standard literature, S.A., *Electric Circuits* (11th ed.).
