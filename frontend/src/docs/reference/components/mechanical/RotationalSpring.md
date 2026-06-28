---
name: RotationalSpring
category: Component (mechanical)
summary: A torsional spring, τ = k·θ.
related: []
examples: []
tags: [rotationalspring, component, mechanical, acausal]
references:
  - "the standard literature, D.C., the standard literature, D.L. & Rosenberg, R.C., a standard system-dynamics text (5th ed.) — acausal/bond-graph formalism"
  - "the standard literature, D.C., the standard literature, D.L. & Rosenberg, R.C., System Dynamics (5th ed.)"
---

# RotationalSpring

A torsional spring, `τ = k·θ`.

## Domain

A reusable **acausal mechanical-domain** component — its rotational ports carry angular velocity `ω` and torque `τ` (`Στ = 0`); translational ports carry velocity `v` and force `F` (`ΣF = 0`). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`a`, `b`

## Usage

```
RotationalSpring inst(k, theta0)
```

## Parameters

| Parameter | Type |
| --- | --- |
| `k` | Number |
| `theta0` | Number |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

```
der(theta)  = a.w - b.w
init(theta) = theta0
a.tau       = k * theta
a.tau + b.tau = 0
```

## References

1. the standard literature, D.C., the standard literature, D.L. & Rosenberg, R.C., *a standard system-dynamics text* (5th ed.) — acausal/bond-graph formalism.
2. the standard literature, D.C., the standard literature, D.L. & Rosenberg, R.C., *System Dynamics* (5th ed.).
