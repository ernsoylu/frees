---
name: Planetary
category: Component (mechanical)
summary: A planetary gearset relating sun, ring, and carrier speeds.
related: []
examples: []
tags: [planetary, component, mechanical, acausal]
references:
  - "the standard literature, D.C., the standard literature, D.L. & Rosenberg, R.C., a standard system-dynamics text (5th ed.) — acausal/bond-graph formalism"
  - "the standard literature, D.C., the standard literature, D.L. & Rosenberg, R.C., System Dynamics (5th ed.)"
---

# Planetary

A planetary gearset relating sun, ring, and carrier speeds.

## Domain

A reusable **acausal mechanical-domain** component — its rotational ports carry angular velocity `ω` and torque `τ` (`Στ = 0`); translational ports carry velocity `v` and force `F` (`ΣF = 0`). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`sun`, `ring`, `carrier`

## Usage

```
Planetary inst(g)
```

## Parameters

| Parameter | Type |
| --- | --- |
| `g` | Number |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

```
sun.w + g * ring.w = (1 + g) * carrier.w
ring.tau           = g * sun.tau
sun.tau + ring.tau + carrier.tau = 0
```

## References

1. the standard literature, D.C., the standard literature, D.L. & Rosenberg, R.C., *a standard system-dynamics text* (5th ed.) — acausal/bond-graph formalism.
2. the standard literature, D.C., the standard literature, D.L. & Rosenberg, R.C., *System Dynamics* (5th ed.).
